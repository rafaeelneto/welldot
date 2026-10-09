import type { ColumnRegular } from '@revolist/revogrid';
import { WELL_STATUSES } from '@welldot/core';
import PrimeVue from 'primevue/config';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp, defineComponent, h, nextTick, type App } from 'vue';
import { createWelldot, type WelldotConfig } from '../config';
import type { WellGridColumn } from './types';
import {
  useWellGridColumns,
  type UseWellGridColumnsOptions,
} from './useWellGridColumns';

type Builder = ReturnType<typeof useWellGridColumns>;

let app: App | undefined;
afterEach(() => {
  app?.unmount();
  app = undefined;
  document.body.innerHTML = '';
});

/** Runs the builder in a real app's setup (PrimeVue + createWelldot). */
function build(
  columns: WellGridColumn[],
  config: WelldotConfig = {},
  options: Partial<UseWellGridColumnsOptions> = {},
): Builder {
  let result!: Builder;
  app = createApp({
    setup() {
      result = useWellGridColumns({
        columns,
        onDelete: () => {},
        onChange: () => {},
        ...options,
      });
      return () => null;
    },
  });
  app.use(PrimeVue, { theme: 'none' });
  app.use(createWelldot(config));
  app.mount(document.createElement('div'));
  return result;
}

function column(builder: Builder, prop: string): ColumnRegular {
  const col = builder.revoColumns.value.find(c => c.prop === prop);
  if (!col) throw new Error(`no column ${prop}`);
  return col;
}

/**
 * Renders a column template the way RevoGrid does: call it with a
 * hyperscript function, then hand its `ref` callback a real element.
 */
function renderTemplate(
  template: unknown,
  props: Record<string, unknown>,
): HTMLElement {
  const el = document.body.appendChild(document.createElement('span'));
  const vnode = (template as (...args: unknown[]) => unknown)(
    (_tag: string, data: { ref: (el: Element) => void }) => data,
    props,
  ) as { ref: (el: Element) => void };
  vnode.ref(el);
  return el;
}

describe('useWellGridColumns — labels', () => {
  const columns: WellGridColumn[] = [
    {
      prop: 'from',
      label: { en: 'From', pt: 'De' },
      info: { en: 'Top depth', pt: 'Profundidade do topo' },
      infoHighlight: { en: 'Edit me', pt: 'Edite' },
    },
    { prop: 'plain', label: 'Plain' },
  ];

  it.each([
    ['en', 'From', 'Top depth', 'Edit me'],
    ['pt', 'De', 'Profundidade do topo', 'Edite'],
  ])(
    'resolves label/info/infoHighlight for %s',
    (locale, name, info, highlight) => {
      const col = column(build(columns, { locale }), 'from');
      expect(col.name).toBe(name);
      expect(col.info).toBe(info);
      expect(col.infoHighlight).toBe(highlight);
      expect(col.columnTemplate).toBeTypeOf('function');
    },
  );

  it('keeps string labels and adds no header template without info', () => {
    const col = column(build(columns, { locale: 'pt' }), 'plain');
    expect(col.name).toBe('Plain');
    expect(col.columnTemplate).toBeUndefined();
    expect(col.info).toBeUndefined();
  });

  it('passes the resolved column-info label to the header template', () => {
    const col = column(
      build(
        columns,
        { locale: 'pt' },
        { labels: { columnInfo: { en: 'Field info', pt: 'Sobre o campo' } } },
      ),
      'from',
    );
    expect(col.infoLabel).toBe('Sobre o campo');
    const el = renderTemplate(col.columnTemplate, { ...col });
    expect(el.textContent).toContain('De');
    expect(el.querySelector('button')?.getAttribute('aria-label')).toBe(
      'Sobre o campo',
    );
  });

  it('re-resolves when the locale changes', async () => {
    const { ref } = await import('vue');
    const locale = ref('en');
    const builder = build(columns, { locale });
    expect(column(builder, 'from').name).toBe('From');
    locale.value = 'pt';
    await nextTick();
    expect(column(builder, 'from').name).toBe('De');
  });
});

describe('useWellGridColumns — unit columns', () => {
  const columns: WellGridColumn[] = [
    { prop: 'depth', label: 'Depth', unitType: 'length' },
    { prop: 'diameter', label: 'Diameter', unitType: 'diameter' },
    { prop: 'flow', label: 'Flow', unitType: 'flow' },
    { prop: 'power', label: 'Power', unitType: 'power' },
    { prop: 'volume', label: 'Volume', unitType: 'volume' },
  ];

  it('suffixes every unit type with the SI default', () => {
    const builder = build(columns);
    expect(builder.revoColumns.value.map(c => c.name)).toEqual([
      '',
      'Depth (m)',
      'Diameter (mm)',
      'Flow (m³/h)',
      'Power (kW)',
      'Volume (m³)',
      '',
    ]);
  });

  it.each([
    ['en', 'Diameter (in.)'],
    ['pt', 'Diameter (")'],
    ['pt-BR', 'Diameter (")'],
  ])('suffixes configured units (%s)', (locale, diameter) => {
    const builder = build(columns, {
      locale,
      units: {
        length: 'ft',
        diameter: 'inches',
        flow: 'L/s',
        power: 'hp',
        volume: 'gal',
      },
    });
    expect(column(builder, 'depth').name).toBe('Depth (ft)');
    expect(column(builder, 'diameter').name).toBe(diameter);
    expect(column(builder, 'flow').name).toBe('Flow (L/s)');
    expect(column(builder, 'power').name).toBe('Power (hp)');
    expect(column(builder, 'volume').name).toBe('Volume (gal)');
  });

  it('uses the unit editor and passes the unit type to it', () => {
    const builder = build(columns);
    for (const col of columns) {
      const built = column(builder, col.prop);
      expect(built.editor).toBe('unit');
      expect(built.editorProps).toEqual({ unitType: col.unitType });
      expect(built.cellTemplate).toBeTypeOf('function');
      expect(built.cellProperties?.({} as never)).toEqual({ class: 'num' });
    }
  });

  it('renders converted values in the cell template', () => {
    const builder = build(columns, { units: { length: 'ft', power: 'hp' } });
    const depth = renderTemplate(column(builder, 'depth').cellTemplate, {
      prop: 'depth',
      value: 10,
      rowIndex: 0,
    });
    expect(depth.textContent).toBe('32.8084 ft');
    const power = renderTemplate(column(builder, 'power').cellTemplate, {
      prop: 'power',
      value: 0,
      rowIndex: 0,
    });
    expect(power.textContent).toBe('0 hp');
  });
});

describe('useWellGridColumns — kinds', () => {
  it('maps column types to editors', () => {
    const builder = build([
      { prop: 'a', label: 'A' },
      { prop: 'b', label: 'B', type: 'number' },
      { prop: 'c', label: 'C', type: 'color' },
      { prop: 'd', label: 'D', type: 'texture' },
      { prop: 'e', label: 'E', type: 'checkbox' },
      { prop: 'f', label: 'F', type: 'select', options: [] },
      { prop: 'g', label: 'G', type: 'combo', options: [] },
      { prop: 'h', label: 'H', type: 'select-button', options: [] },
      { prop: 'i', label: 'I', editor: 'number' },
    ]);
    const editors = Object.fromEntries(
      builder.revoColumns.value.map(c => [c.prop, c.editor]),
    );
    expect(editors).toMatchObject({
      a: 'text',
      b: 'number',
      c: 'color',
      d: 'texture',
      e: 'noop',
      f: 'select',
      g: 'combo',
      h: 'noop',
      i: 'number',
    });
    for (const key of Object.values(editors)) {
      if (key)
        expect(builder.gridEditors[key as string]).toBeTypeOf('function');
    }
  });

  it('readonly columns get no editor', () => {
    const col = column(
      build([{ prop: 'x', label: 'X', type: 'number', readonly: true }]),
      'x',
    );
    expect(col.readonly).toBe(true);
    expect(col.editor).toBeUndefined();
  });

  it('formatter columns render through the formatter with the row', () => {
    const formatter = vi.fn(
      (value: unknown, row: Record<string, unknown>) => `${value}/${row.b}`,
    );
    const col = column(
      build([{ prop: 'a', label: 'A', formatter, readonly: true }]),
      'a',
    );
    const el = renderTemplate(col.cellTemplate, {
      prop: 'a',
      value: 1,
      model: { a: 1, b: 2 },
      rowIndex: 0,
    });
    expect(el.textContent).toBe('1/2');
    expect(formatter).toHaveBeenCalledWith(1, { a: 1, b: 2 });
  });

  it.each([
    ['en', 'Active'],
    ['pt', 'Ativo'],
  ])(
    'select options accept a core vocabulary (LanguageText labels, %s)',
    (locale, label) => {
      const active = WELL_STATUSES.find(v => v.value === 'active');
      expect(active).toBeDefined();
      const col = column(
        build(
          [
            {
              prop: 'status',
              label: 'Status',
              type: 'select',
              options: WELL_STATUSES,
            },
          ],
          { locale },
        ),
        'status',
      );
      const options = (
        col.editorProps as { options: { value: string; label: string }[] }
      ).options;
      expect(options).toHaveLength(WELL_STATUSES.length);
      expect(options.find(o => o.value === 'active')?.label).toBe(label);

      const el = renderTemplate(col.cellTemplate, {
        prop: 'status',
        value: 'active',
        rowIndex: 0,
      });
      expect(el.textContent).toBe(label);
    },
  );

  it('select cells fall back to the raw value', () => {
    const col = column(
      build([
        {
          prop: 's',
          label: 'S',
          type: 'combo',
          options: [{ value: 'pvc', label: { en: 'PVC', pt: 'PVC' } }],
        },
      ]),
      's',
    );
    const el = renderTemplate(col.cellTemplate, {
      prop: 's',
      value: 'bamboo',
      rowIndex: 0,
    });
    expect(el.textContent).toBe('bamboo');
  });

  it('wires checkbox toggles to onChange', async () => {
    const onChange = vi.fn();
    const col = column(
      build([{ prop: 'ok', label: 'OK', type: 'checkbox' }], {}, { onChange }),
      'ok',
    );
    const el = renderTemplate(col.cellTemplate, {
      prop: 'ok',
      value: false,
      rowIndex: 3,
    });
    el.querySelector('input')?.click();
    await nextTick();
    expect(onChange).toHaveBeenCalledWith(3, 'ok', true);
  });
});

describe('useWellGridColumns — drag and delete columns', () => {
  const columns: WellGridColumn[] = [{ prop: 'a', label: 'A' }];

  it("leaves the drag handle to RevoGrid's own by default", () => {
    const drag = column(build(columns), '_drag');
    expect(drag.rowDrag).toBe(true);
    expect(drag.pin).toBe('colPinStart');
    expect(drag.cellTemplate).toBeUndefined();
  });

  it('renders a dragHandle part that re-emits dragstartcell', () => {
    const Grip = defineComponent({
      render: () => h('i', { class: 'grip' }),
    });
    const drag = column(
      build(columns, {}, { components: { dragHandle: Grip } }),
      '_drag',
    );
    expect(drag.rowDrag).toBe(true);
    const el = renderTemplate(drag.cellTemplate, {
      prop: '_drag',
      rowIndex: 2,
      model: { a: 1 },
    });
    expect(el.querySelector('.revo-draggable i.grip')).not.toBeNull();

    const listener = vi.fn();
    el.addEventListener('dragstartcell', listener);
    el.querySelector('.revo-draggable')?.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true }),
    );
    expect(listener).toHaveBeenCalledTimes(1);
    const detail = (listener.mock.calls[0]![0] as CustomEvent).detail;
    expect(detail.originalEvent).toBeInstanceOf(MouseEvent);
    expect(detail.model).toMatchObject({ rowIndex: 2, model: { a: 1 } });
  });

  it('takes the dragHandle part from createWelldot', () => {
    const Grip = defineComponent({ render: () => h('i') });
    const drag = column(
      build(columns, { components: { dragHandle: Grip } }),
      '_drag',
    );
    expect(drag.cellTemplate).toBeTypeOf('function');
  });

  it('omits drag/delete columns when disabled', () => {
    const builder = build(
      columns,
      {},
      { enableDrag: false, enableDelete: false },
    );
    expect(builder.revoColumns.value.map(c => c.prop)).toEqual(['a']);
    expect(builder.plugins.value).toHaveLength(0);
  });

  it('adds the stretch plugin for a stretch column', () => {
    const builder = build([{ prop: 'a', label: 'A', stretch: true }]);
    expect(builder.gridStretch.value).toBe(false);
    expect(builder.plugins.value).toHaveLength(2);
    expect(column(builder, 'a').autoSize).toBe(false);
  });

  it('renders the default delete button with the resolved label', () => {
    const onDelete = vi.fn();
    const del = column(
      build(
        columns,
        { locale: 'pt' },
        { onDelete, deleteLabel: { en: 'Delete row', pt: 'Excluir linha' } },
      ),
      '_delete',
    );
    expect(del.pin).toBe('colPinEnd');
    expect(del.readonly).toBe(true);
    const el = renderTemplate(del.cellTemplate, {
      prop: '_delete',
      rowIndex: 4,
      model: { a: 'x' },
    });
    const button = el.querySelector('button.well-grid-delete-btn');
    expect(button?.getAttribute('aria-label')).toBe('Excluir linha');
    (button as HTMLButtonElement).click();
    expect(onDelete).toHaveBeenCalledWith(4, { a: 'x' });
  });
});
