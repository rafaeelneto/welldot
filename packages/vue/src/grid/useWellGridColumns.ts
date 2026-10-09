import type {
  AfterEditEvent,
  BeforeSaveDataDetails,
  ColumnRegular,
  Editors,
  FocusAfterRenderEvent,
  GridPlugin,
} from '@revolist/revogrid';
import {
  BasePlugin,
  VGridVueEditor,
  type PluginProviders,
} from '@revolist/vue3-datagrid';
import type { LanguageTextInput } from '@welldot/core';
import {
  computed,
  defineComponent,
  h,
  ref,
  toValue,
  type Component,
  type MaybeRefOrGetter,
} from 'vue';
import { useWellText } from '../composables/useWellText';
import type { DisplayUnitType } from '../composables/useWellUnits';
import { resolvePart, useWelldotConfig } from '../config';
import GridCheckboxCell from './cells/GridCheckboxCell.vue';
import GridColorCell from './cells/GridColorCell.vue';
import GridColorPickerEditor from './cells/GridColorPickerEditor.vue';
import GridComboEditor from './cells/GridComboEditor.vue';
import GridDeleteCell from './cells/GridDeleteCell.vue';
import GridDragCell from './cells/GridDragCell.vue';
import GridFormattedCell from './cells/GridFormattedCell.vue';
import GridHeaderCell from './cells/GridHeaderCell.vue';
import GridNumberEditor from './cells/GridNumberEditor.vue';
import GridSelectButtonCell from './cells/GridSelectButtonCell.vue';
import GridSelectCell from './cells/GridSelectCell.vue';
import GridSelectEditor from './cells/GridSelectEditor.vue';
import GridTextEditor from './cells/GridTextEditor.vue';
import GridTextureSelectCell from './cells/GridTextureSelectCell.vue';
import GridTextureSelectEditor from './cells/GridTextureSelectEditor.vue';
import GridUnitCell from './cells/GridUnitCell.vue';
import GridUnitEditor from './cells/GridUnitEditor.vue';
import { columnStretchPlugin } from './columnStretchPlugin';
import {
  useCellTemplate,
  type GridVueTemplate,
} from './composables/useCellTemplate';
import { useUnitSuffix } from './composables/useUnitSuffix';
import WellGridDeleteButton from './parts/WellGridDeleteButton.vue';
import type {
  ResolvedGridOption,
  WellDataGridComponents,
  WellDataGridLabels,
  WellGridColumn,
  WellGridOption,
} from './types';

// ─── Column kinds ──────────────────────────────────────────────────────────
// Declares how each column "kind" renders and edits.
// `resolveColumnKind` decides which kind a column declaration maps to.

type ColumnKind =
  | 'text'
  | 'number'
  | 'unit'
  | 'color'
  | 'select'
  | 'select-button'
  | 'combo'
  | 'formatted'
  | 'checkbox'
  | 'texture';

/** What a kind needs from one column, with its text already resolved. */
interface ResolvedColumn {
  col: WellGridColumn;
  options?: ResolvedGridOption[];
}

interface ColumnKindDef {
  editor?: string;
  numeric?: boolean;
  cellProperties?: ColumnRegular['cellProperties'];
  cellTemplate?: (c: ResolvedColumn) => GridVueTemplate;
  /** Per-column props handed to the editor (read from `column.editorProps`). */
  editorProps?: (c: ResolvedColumn) => Record<string, unknown>;
}

function resolveColumnKind(col: WellGridColumn): ColumnKind {
  if (col.type === 'texture') return 'texture';
  if (col.type === 'select') return 'select';
  if (col.type === 'select-button') return 'select-button';
  if (col.type === 'combo') return 'combo';
  if (col.type === 'color') return 'color';
  if (col.type === 'checkbox') return 'checkbox';
  if (col.unitType) return 'unit';
  if (col.formatter) return 'formatted';
  return col.type === 'number' ? 'number' : 'text';
}

const UNIT_TYPES: readonly DisplayUnitType[] = [
  'length',
  'diameter',
  'flow',
  'power',
  'volume',
];

/** Props RevoGrid hands to every editor (`EditorType`). */
interface GridEditorProps {
  val?: unknown;
  save: (value: unknown, preventFocus?: boolean) => void;
  close: (focusNext?: boolean) => void;
  /** Cell data model; `column.column` is the `ColumnRegular`. */
  column?: { column?: { editorProps?: Record<string, unknown> } };
}

/* eslint-disable vue/one-component-per-file -- tiny render-function editor
   adapters, not SFCs */

const EDITOR_PROP_KEYS: Array<keyof GridEditorProps> = [
  'val',
  'save',
  'close',
  'column',
];

/**
 * Editor that forwards `val`/`save`/`close` plus the column's
 * `editorProps` (and optional grid-wide props) to `component`. Lets one
 * editor per kind — registered once in setup — serve every column.
 */
function columnEditor(
  component: Component,
  extraProps?: () => Record<string, unknown>,
) {
  return VGridVueEditor(
    defineComponent(
      (p: GridEditorProps) => () =>
        h(component, {
          val: p.val,
          save: p.save,
          close: p.close,
          ...p.column?.column?.editorProps,
          ...extraProps?.(),
        }),
      { inheritAttrs: false, props: EDITOR_PROP_KEYS },
    ),
  );
}

const NoopEditor = defineComponent(
  (p: GridEditorProps) => {
    p.close();
    return () => null;
  },
  { inheritAttrs: false, props: EDITOR_PROP_KEYS },
);

/* eslint-enable vue/one-component-per-file */

export interface UseWellGridColumnsOptions {
  columns: MaybeRefOrGetter<WellGridColumn[]>;
  onDelete: (rowIndex: number, model: Record<string, unknown>) => void;
  onChange: (rowIndex: number, prop: string, value: unknown) => void;
  /** Include the pinned-start drag-handle column (default true) */
  enableDrag?: boolean;
  /** Include the pinned-end delete-row column (default true) */
  enableDelete?: boolean;
  /** Label handed to the delete-button part (its aria-label by default). */
  deleteLabel?: MaybeRefOrGetter<LanguageTextInput>;
  /** Grid-internal text (texture editor, header info trigger). */
  labels?: MaybeRefOrGetter<WellDataGridLabels | undefined>;
  /** Part overrides; `addButton` is rendered by `WellDataGrid` itself. */
  components?: MaybeRefOrGetter<WellDataGridComponents | undefined>;
}

/**
 * Editor registry, column-kind resolution and RevoGrid column builder for a
 * well feature grid. **Call it in `setup`**: cell templates and editors are
 * bound to the calling component's app context there (see
 * `useCellTemplate`), which is what lets cells reach `createWelldot` and
 * PrimeVue.
 */
export function useWellGridColumns(options: UseWellGridColumnsOptions) {
  const {
    onDelete,
    onChange,
    enableDrag = true,
    enableDelete = true,
  } = options;
  const cols = computed(() => toValue(options.columns));
  const labels = computed(() => toValue(options.labels) ?? {});
  const parts = computed(() => toValue(options.components) ?? {});

  const config = useWelldotConfig();
  const text = useWellText();
  const cellTemplate = useCellTemplate();
  const suffixes = Object.fromEntries(
    UNIT_TYPES.map(type => [type, useUnitSuffix(type)]),
  ) as Record<DisplayUnitType, ReturnType<typeof useUnitSuffix>>;

  // ─── Editors ───────────────────────────────────────────────────────────────
  // Created once, here in setup: `VGridVueEditor` captures the current
  // instance's app context when called. Per-column data (unit type, options)
  // travels on the column as `editorProps`.

  const gridEditors: Editors = {
    noop: VGridVueEditor(NoopEditor),
    text: VGridVueEditor(GridTextEditor),
    number: VGridVueEditor(GridNumberEditor),
    color: VGridVueEditor(GridColorPickerEditor),
    unit: columnEditor(GridUnitEditor),
    select: columnEditor(GridSelectEditor),
    combo: columnEditor(GridComboEditor),
    texture: columnEditor(GridTextureSelectEditor, () => ({
      placeholder: labels.value.texturePlaceholder,
      showPending: labels.value.showPendingTextures,
    })),
  };

  const headerTemplate = cellTemplate(GridHeaderCell);

  const stretchCol = computed(() => cols.value.find(c => c.stretch) ?? null);
  const stretchProp = computed(() => stretchCol.value?.prop ?? null);
  const gridStretch = computed(() => stretchProp.value === null);

  const plugins = computed(() => {
    const list: GridPlugin[] = [];
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

  const checkboxCellProperties = () => ({ class: 'well-grid-checkbox-cell' });

  const columnKinds: Record<ColumnKind, ColumnKindDef> = {
    text: {},
    number: { numeric: true },
    unit: {
      editor: 'unit',
      numeric: true,
      editorProps: ({ col }) => ({ unitType: col.unitType }),
      cellTemplate: ({ col }) =>
        cellTemplate(GridUnitCell, { unitType: col.unitType }),
    },
    color: {
      editor: 'color',
      cellTemplate: () => cellTemplate(GridColorCell),
    },
    select: {
      editor: 'select',
      editorProps: ({ options }) => ({ options }),
      cellTemplate: ({ options }) => cellTemplate(GridSelectCell, { options }),
    },
    combo: {
      editor: 'combo',
      editorProps: ({ options }) => ({ options }),
      // GridSelectCell already falls back to the raw value when it isn't
      // one of the suggested options, which is exactly what free text needs.
      cellTemplate: ({ options }) => cellTemplate(GridSelectCell, { options }),
    },
    formatted: {
      cellTemplate: ({ col }) =>
        cellTemplate(GridFormattedCell, { formatter: col.formatter }),
    },
    checkbox: {
      editor: 'noop',
      cellProperties: checkboxCellProperties,
      cellTemplate: ({ col }) =>
        cellTemplate(GridCheckboxCell, {
          prop: col.prop,
          onToggle: (rowIndex: number, prop: string, value: boolean) =>
            onChange(rowIndex, prop, value),
        }),
    },
    'select-button': {
      editor: 'noop',
      cellProperties: checkboxCellProperties,
      cellTemplate: ({ col, options }) =>
        cellTemplate(GridSelectButtonCell, {
          prop: col.prop,
          options,
          onChange: (rowIndex: number, prop: string, value: unknown) =>
            onChange(rowIndex, prop, value),
        }),
    },
    texture: {
      editor: 'texture',
      cellTemplate: () => cellTemplate(GridTextureSelectCell),
    },
  };

  function resolveOptions(
    list: readonly WellGridOption[],
  ): ResolvedGridOption[] {
    return list.map(o => ({
      value: o.value,
      label: text(o.label) ?? o.value,
      ...(o.deprecated && { deprecated: true }),
    }));
  }

  function buildColumn(col: WellGridColumn): ColumnRegular {
    const kind = columnKinds[resolveColumnKind(col)];
    const resolved: ResolvedColumn = {
      col,
      options: 'options' in col ? resolveOptions(col.options) : undefined,
    };
    const label = text(col.label) ?? '';
    const unit = col.unitType ? suffixes[col.unitType].value : null;
    const readonly = col.readonly ?? false;
    const info = text(col.info);

    return {
      prop: col.prop,
      name: unit ? `${label} (${unit})` : label,
      autoSize: !col.size && !col.stretch,
      size: col.size,
      readonly,
      editor: readonly
        ? undefined
        : (kind.editor ??
          col.editor ??
          (col.type === 'number' ? 'number' : 'text')),
      editorProps: kind.editorProps?.(resolved),
      pin: col.pin,
      cellProperties:
        kind.cellProperties ??
        (kind.numeric ? () => ({ class: 'num' }) : undefined),
      cellTemplate: kind.cellTemplate?.(resolved),
      ...(info && {
        info,
        infoHighlight: text(col.infoHighlight),
        infoLabel: text(labels.value.columnInfo),
        columnTemplate: headerTemplate,
      }),
    };
  }

  const revoColumns = computed<ColumnRegular[]>(() => {
    const result: ColumnRegular[] = [];
    if (enableDrag) {
      const dragHandle = resolvePart(
        'dragHandle',
        parts.value.dragHandle,
        undefined,
        config,
      );
      result.push({
        prop: '_drag',
        name: '',
        size: 30,
        pin: 'colPinStart',
        rowDrag: true,
        cellProperties: () => ({ class: 'well-grid-drag-cell' }),
        // Without an override RevoGrid draws its own handle (styled by
        // grid.css). A template replaces it, so GridDragCell re-emits the
        // drag start RevoGrid's handle would have emitted.
        ...(dragHandle && {
          cellTemplate: cellTemplate(GridDragCell, { part: dragHandle }),
        }),
      });
    }
    result.push(...cols.value.map(buildColumn));
    if (enableDelete) {
      result.push({
        prop: '_delete',
        name: '',
        size: 40,
        readonly: true,
        pin: 'colPinEnd',
        cellProperties: () => ({ class: 'well-grid-delete-cell' }),
        cellTemplate: cellTemplate(GridDeleteCell, {
          part: resolvePart(
            'deleteButton',
            parts.value.deleteButton,
            WellGridDeleteButton,
            config,
          ),
          label: text(toValue(options.deleteLabel)),
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
