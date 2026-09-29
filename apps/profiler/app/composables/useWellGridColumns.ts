import type {
  AfterEditEvent,
  BeforeSaveDataDetails,
  ColumnRegular,
  Editors,
  FocusAfterRenderEvent,
} from '@revolist/revogrid';
import {
  BasePlugin,
  VGridVueEditor,
  VGridVueTemplate,
  type PluginProviders,
} from '@revolist/vue3-datagrid';
import { computed, defineComponent, h, type ComputedRef } from 'vue';
import GridCheckboxCell from '~/components/DataGrid/cells/GridCheckboxCell.vue';
import GridColorCell from '~/components/DataGrid/cells/GridColorCell.vue';
import GridColorPickerEditor from '~/components/DataGrid/cells/GridColorPickerEditor.vue';
import GridComboEditor from '~/components/DataGrid/cells/GridComboEditor.vue';
import GridDeleteCell from '~/components/DataGrid/cells/GridDeleteCell.vue';
import GridFormattedCell from '~/components/DataGrid/cells/GridFormattedCell.vue';
import GridHeaderCell from '~/components/DataGrid/cells/GridHeaderCell.vue';
import GridNumberEditor from '~/components/DataGrid/cells/GridNumberEditor.vue';
import GridSelectButtonCell from '~/components/DataGrid/cells/GridSelectButtonCell.vue';
import GridSelectCell from '~/components/DataGrid/cells/GridSelectCell.vue';
import GridSelectEditor from '~/components/DataGrid/cells/GridSelectEditor.vue';
import GridTextEditor from '~/components/DataGrid/cells/GridTextEditor.vue';
import GridTextureSelectCell from '~/components/DataGrid/cells/GridTextureSelectCell.vue';
import GridTextureSelectEditor from '~/components/DataGrid/cells/GridTextureSelectEditor.vue';
import GridUnitCell from '~/components/DataGrid/cells/GridUnitCell.vue';
import GridUnitEditor from '~/components/DataGrid/cells/GridUnitEditor.vue';
import type { WellGridColumn } from '~/components/DataGrid/types';
import { columnStretchPlugin } from '~/utils/columnStretchPlugin';

// ─── Column kinds ──────────────────────────────────────────────────────────
// Declares how each column "kind" renders and edits.
// `resolveColumnKind` decides which kind a column declaration maps to.

type ColumnKind =
  | 'text'
  | 'number'
  | 'length'
  | 'diameter'
  | 'color'
  | 'select'
  | 'select-button'
  | 'combo'
  | 'formatted'
  | 'checkbox'
  | 'texture';

interface ColumnKindDef {
  editor?: (col: WellGridColumn) => string;
  numeric?: boolean;
  readonly?: boolean;
  cellProperties?: (col: WellGridColumn) => ColumnRegular['cellProperties'];
  cellTemplate?: (col: WellGridColumn) => ColumnRegular['cellTemplate'];
}

function resolveColumnKind(col: WellGridColumn): ColumnKind {
  if (col.type === 'texture') return 'texture';
  if (col.type === 'select') return 'select';
  if (col.type === 'select-button') return 'select-button';
  if (col.type === 'combo') return 'combo';
  if (col.type === 'color') return 'color';
  if (col.type === 'checkbox') return 'checkbox';
  if (col.unitType) return col.unitType;
  if (col.formatter) return 'formatted';
  return col.type === 'number' ? 'number' : 'text';
}

function unitEditorFactory(unitType: 'length' | 'diameter') {
  return defineComponent({
    props: ['val', 'save', 'close'],
    setup: (p: any) => () => h(GridUnitEditor, { ...p, unitType }),
  });
}

function selectEditorFactory(options: Array<{ label: string; value: string }>) {
  return defineComponent({
    props: ['val', 'save', 'close'],
    setup: (p: any) => () => h(GridSelectEditor, { ...p, options }),
  });
}

function comboEditorFactory(options: Array<{ label: string; value: string }>) {
  return defineComponent({
    props: ['val', 'save', 'close'],
    setup: (p: any) => () => h(GridComboEditor, { ...p, options }),
  });
}

function textureEditorFactory() {
  return defineComponent({
    props: ['val', 'save', 'close'],
    setup: (p: any) => () => h(GridTextureSelectEditor, p),
  });
}

export interface UseWellGridColumnsOptions {
  columns: ComputedRef<WellGridColumn[]> | (() => WellGridColumn[]);
  onDelete: (rowIndex: number, model: Record<string, unknown>) => void;
  onChange: (rowIndex: number, prop: string, value: unknown) => void;
  /** Include the pinned-start drag-handle column (default true) */
  enableDrag?: boolean;
  /** Include the pinned-end delete-row column (default true) */
  enableDelete?: boolean;
}

/**
 * Shared editor registry, column-kind resolution, and RevoGrid column-builder
 * logic for any well feature grid (flat or grouped).
 */
export function useWellGridColumns(options: UseWellGridColumnsOptions) {
  const {
    onDelete,
    onChange,
    enableDrag = true,
    enableDelete = true,
  } = options;
  const cols = computed(() =>
    typeof options.columns === 'function'
      ? options.columns()
      : options.columns.value,
  );

  const uiStore = useUiStore();
  const { locale } = useI18n();

  // Created during setup so the template captures the app context
  // (i18n, PrimeVue) needed by the InfoPopover it renders.
  const infoHeaderTemplate = VGridVueTemplate(GridHeaderCell);

  const gridEditors = computed(() => {
    const editors: Editors = {
      noop: VGridVueEditor(
        defineComponent({
          props: ['val', 'save', 'close'],
          setup: (p: any) => {
            p.close();
            return () => null;
          },
        }),
      ),
      text: VGridVueEditor(GridTextEditor),
      number: VGridVueEditor(GridNumberEditor),
      color: VGridVueEditor(GridColorPickerEditor),
      length: VGridVueEditor(unitEditorFactory('length')),
      diameter: VGridVueEditor(unitEditorFactory('diameter')),
      texture: VGridVueEditor(textureEditorFactory()),
    };
    for (const col of cols.value) {
      if (col.type === 'select') {
        editors[`select_${col.prop}`] = VGridVueEditor(
          selectEditorFactory(col.options),
        );
      }
      if (col.type === 'combo') {
        editors[`combo_${col.prop}`] = VGridVueEditor(
          comboEditorFactory(col.options),
        );
      }
    }
    return editors;
  });

  const stretchCol = computed(() => cols.value.find(c => c.stretch) ?? null);
  const stretchProp = computed(() => stretchCol.value?.prop ?? null);
  const gridStretch = computed(() => stretchProp.value === null);

  const plugins = computed(() => {
    const list = [];
    if (enableDrag) {
      list.push(
        class HRPlugin extends BasePlugin {
          constructor(r: HTMLRevoGridElement, p: PluginProviders) {
            super(r, p);
            this.addEventListener('rowdragstart', e => {
              const name = e.detail.model?.['name'];
              if (typeof name === 'string' && name) {
                e.detail.text = name;
              }
            });
          }
        },
      );
    }
    if (stretchProp.value !== null) {
      list.push(
        columnStretchPlugin(stretchProp.value, stretchCol.value?.minSize),
      );
    }
    return list;
  });

  const unitLabels: Record<'length' | 'diameter', () => string> = {
    length: () => uiStore.lengthUnit,
    diameter: () =>
      resolveDiameterUnitLabel(uiStore.diameterUnit, locale.value),
  };

  const columnKinds: Record<ColumnKind, ColumnKindDef> = {
    text: {},
    number: { numeric: true },
    length: {
      editor: () => 'length',
      numeric: true,
      cellTemplate: () =>
        VGridVueTemplate(GridUnitCell, { unitType: 'length' }),
    },
    diameter: {
      editor: () => 'diameter',
      numeric: true,
      cellTemplate: () =>
        VGridVueTemplate(GridUnitCell, { unitType: 'diameter' }),
    },
    color: {
      editor: () => 'color',
      cellTemplate: () => VGridVueTemplate(GridColorCell),
    },
    select: {
      editor: col => `select_${col.prop}`,
      cellTemplate: col =>
        VGridVueTemplate(GridSelectCell, {
          options: (col as Extract<WellGridColumn, { type: 'select' }>).options,
        }),
    },
    combo: {
      editor: col => `combo_${col.prop}`,
      // GridSelectCell already falls back to the raw value when it isn't
      // one of the suggested options, which is exactly what free text needs.
      cellTemplate: col =>
        VGridVueTemplate(GridSelectCell, {
          options: (col as Extract<WellGridColumn, { type: 'combo' }>).options,
        }),
    },
    formatted: {
      cellTemplate: col =>
        VGridVueTemplate(GridFormattedCell, { formatter: col.formatter }),
    },
    checkbox: {
      editor: () => 'noop',
      cellProperties: () => () => ({ class: 'well-grid-checkbox-cell' }),
      cellTemplate: col =>
        VGridVueTemplate(GridCheckboxCell, {
          prop: col.prop,
          onToggle: (rowIndex: number, prop: string, value: boolean) =>
            onChange(rowIndex, prop, value),
        }),
    },
    'select-button': {
      editor: () => 'noop',
      cellProperties: () => () => ({ class: 'well-grid-checkbox-cell' }),
      cellTemplate: col =>
        VGridVueTemplate(GridSelectButtonCell, {
          prop: col.prop,
          options: (col as Extract<WellGridColumn, { type: 'select-button' }>)
            .options,
          onChange: (rowIndex: number, prop: string, value: unknown) =>
            onChange(rowIndex, prop, value),
        }),
    },
    texture: {
      editor: () => 'texture',
      cellTemplate: () => VGridVueTemplate(GridTextureSelectCell),
    },
  };

  const revoColumns = computed<ColumnRegular[]>(() => {
    const dataCols: ColumnRegular[] = cols.value.map(col => {
      const kind = columnKinds[resolveColumnKind(col)];
      const unit = col.unitType ? unitLabels[col.unitType]() : null;
      const readonly = col.readonly ?? kind.readonly ?? false;

      return {
        prop: col.prop,
        name: unit ? `${col.label} (${unit})` : col.label,
        autoSize: !col.size && !col.stretch,
        size: col.size,
        readonly,
        editor: readonly
          ? undefined
          : (kind.editor?.(col) ??
            col.editor ??
            (col.type === 'number' ? 'number' : 'text')),
        pin: col.pin,
        cellProperties:
          kind.cellProperties?.(col) ??
          (kind.numeric ? () => ({ class: 'num' }) : undefined),
        cellTemplate: kind.cellTemplate?.(col),
        ...(col.info && {
          info: col.info,
          infoHighlight: col.infoHighlight,
          columnTemplate: infoHeaderTemplate,
        }),
      };
    });

    const result: ColumnRegular[] = [];
    if (enableDrag) {
      result.push({
        prop: '_drag',
        name: '',
        size: 30,
        pin: 'colPinStart',
        rowDrag: true,
        cellProperties: () => ({ class: 'well-grid-drag-cell' }),
      } as ColumnRegular);
    }
    result.push(...dataCols);
    if (enableDelete) {
      result.push({
        prop: '_delete',
        name: '',
        size: 40,
        readonly: true,
        pin: 'colPinEnd',
        cellProperties: () => ({ class: 'well-grid-delete-cell' }),
        cellTemplate: VGridVueTemplate(GridDeleteCell, {
          requestDelete: onDelete,
        }),
      });
    }
    return result;
  });

  function coerceCellValue(prop: string, val: unknown): unknown {
    const col = cols.value.find(c => c.prop === prop);
    if (col?.type === 'checkbox' && typeof val === 'string') {
      return val === 'true' || val === '1' || val.toLowerCase() === 'yes';
    }
    return val;
  }

  // ─── Click-on-focused-cell → enter edit mode ───────────────────────────────
  // `afterfocus` only fires when focus moves to a new cell. A click that
  // triggers such a focus change is suppressed; a second click on the cell
  // that's already focused enters edit mode for it.

  const gridContainerRef = ref<HTMLElement | null>(null);
  const focusedCell = ref<{
    rowIndex: number;
    colIndex: number;
    prop: string;
  } | null>(null);
  let suppressNextClick = false;

  function handleAfterFocus(event: CustomEvent<FocusAfterRenderEvent>) {
    const { rowIndex, colIndex, column } = event.detail;
    focusedCell.value = column
      ? { rowIndex, colIndex, prop: String(column.prop) }
      : null;
    suppressNextClick = true;
  }

  function handleGridMousedown() {
    suppressNextClick = false;
  }

  function handleGridClick(event: MouseEvent) {
    if (suppressNextClick) {
      suppressNextClick = false;
      return;
    }
    const cell = focusedCell.value;
    if (!cell) return;

    const target = (event.target as HTMLElement).closest<HTMLElement>(
      '[data-rgrow][data-rgcol]',
    );
    if (!target) return;
    if (
      Number(target.dataset.rgrow) !== cell.rowIndex ||
      Number(target.dataset.rgcol) !== cell.colIndex
    ) {
      return;
    }

    const col = cols.value.find(c => c.prop === cell.prop);
    if (!col || col.readonly) return;

    const gridEl = gridContainerRef.value?.querySelector('revo-grid') as
      | HTMLRevoGridElement
      | undefined;
    gridEl?.setCellEdit(cell.rowIndex, cell.prop);
  }

  function handleAfterEdit(event: CustomEvent<AfterEditEvent>) {
    const detail = event.detail as Record<string, unknown>;

    // Single-cell edit: detail has rowIndex + prop + val
    if ('rowIndex' in detail) {
      const { rowIndex, prop, val } =
        detail as unknown as BeforeSaveDataDetails;
      onChange(rowIndex, String(prop), coerceCellValue(String(prop), val));
      return;
    }

    // Block edit (paste, range clear, etc.): detail has data keyed by row index
    const blockData = detail.data as
      | Record<string, Record<string, unknown>>
      | undefined;
    if (!blockData) return;

    for (const [rowKey, rowData] of Object.entries(blockData)) {
      const rowIndex = Number(rowKey);
      for (const [prop, val] of Object.entries(rowData)) {
        onChange(rowIndex, prop, coerceCellValue(prop, val));
      }
    }
  }

  return {
    gridEditors,
    revoColumns,
    gridStretch,
    plugins,
    coerceCellValue,
    handleAfterEdit,
    gridContainerRef,
    handleAfterFocus,
    handleGridMousedown,
    handleGridClick,
  };
}
