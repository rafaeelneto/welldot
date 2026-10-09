/**
 * Integration tests against the real RevoGrid web component under jsdom.
 *
 * RevoGrid hydrates in jsdom, but sizes its virtual viewports from a
 * ResizeObserver (absent in jsdom) and `getBoundingClientRect` (all zeros),
 * so both are stubbed to an 800×400 box — otherwise no row renders. Layout,
 * scrolling, editors and real pointer drags are not exercised here.
 */
import { VGrid, VGridVueTemplate } from '@revolist/vue3-datagrid';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { defineComponent, h, onUnmounted, provide, type PropType } from 'vue';
import {
  WELLDOT_CONFIG_KEY,
  resolveWelldotConfig,
  useWelldotConfig,
} from '../config';
import { welldotGlobal } from '../test/mountOptions';
import type { WellGridColumn } from './types';
import WellDataGrid from './WellDataGrid.vue';

/** Reports a fixed 800×400 box for every observed element. */
class FixedSizeObserver {
  constructor(private callback: ResizeObserverCallback) {}
  observe(target: Element) {
    queueMicrotask(() =>
      this.callback(
        [
          {
            target,
            contentRect: { width: 800, height: 400 },
          } as unknown as ResizeObserverEntry,
        ],
        this as unknown as ResizeObserver,
      ),
    );
  }
  unobserve() {}
  disconnect() {}
}

const originalResizeObserver = globalThis.ResizeObserver;
const originalRect = Element.prototype.getBoundingClientRect;

beforeAll(() => {
  globalThis.ResizeObserver =
    FixedSizeObserver as unknown as typeof ResizeObserver;
  Element.prototype.getBoundingClientRect = () =>
    ({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 800,
      bottom: 400,
      width: 800,
      height: 400,
      toJSON: () => ({}),
    }) as DOMRect;
});

afterAll(() => {
  globalThis.ResizeObserver = originalResizeObserver;
  Element.prototype.getBoundingClientRect = originalRect;
});

const wrappers: VueWrapper[] = [];
afterEach(() => {
  while (wrappers.length) wrappers.pop()?.unmount();
  document.body.innerHTML = '';
});

/** Waits until RevoGrid (lazy-loaded, async render) shows `selector`. */
async function waitFor(selector: string, root: ParentNode = document) {
  for (let i = 0; i < 100; i++) {
    await flushPromises();
    const found = root.querySelectorAll<HTMLElement>(selector);
    if (found.length) return [...found];
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error(`timed out waiting for ${selector}`);
}

/** Reads the welldot config inside a grid cell. */
const ConfigProbe = defineComponent({
  props: { value: { type: null, default: undefined } },
  setup(props) {
    const config = useWelldotConfig();
    return () =>
      h(
        'i',
        { class: 'probe' },
        `${config.locale}|${config.units.length}|${String(props.value)}`,
      );
  },
});

describe('RevoGrid cells and app-level provides', () => {
  it('a VGridVueTemplate cell sees createWelldot, not component provides', async () => {
    const Host = defineComponent({
      setup() {
        // A component-level provide never reaches RevoGrid cells: they are
        // rendered with the app context only.
        provide(WELLDOT_CONFIG_KEY, resolveWelldotConfig({ locale: 'xx' }));
        const template = VGridVueTemplate(ConfigProbe);
        return () =>
          h(VGrid, {
            source: [{ a: 1 }, { a: 2 }],
            columns: [{ prop: 'a', name: 'A', cellTemplate: template }],
          });
      },
    });
    wrappers.push(
      mount(Host, {
        attachTo: document.body,
        global: welldotGlobal({ locale: 'pt', units: { length: 'ft' } }),
      }),
    );
    const probes = await waitFor('i.probe');
    expect(probes.map(p => p.textContent)).toEqual(['pt|ft|1', 'pt|ft|2']);
  });
});

describe('WellDataGrid', () => {
  const columns: WellGridColumn[] = [
    { prop: 'from', label: { en: 'From', pt: 'De' }, unitType: 'length' },
    {
      prop: 'kind',
      label: 'Kind',
      type: 'select',
      options: [{ value: 'pvc', label: { en: 'PVC pipe', pt: 'Tubo PVC' } }],
    },
  ];
  const rows = [
    { from: 10, kind: 'pvc' },
    { from: 20, kind: 'steel' },
  ];

  /** Delete part that also reads the config from inside the cell. */
  const ProbeDelete = defineComponent({
    props: {
      index: { type: Number, required: true },
      row: {
        type: Object as PropType<Record<string, unknown>>,
        required: true,
      },
      label: { type: String, default: undefined },
    },
    emits: ['click'],
    setup(props, { emit }) {
      const config = useWelldotConfig();
      return () =>
        h(
          'button',
          {
            class: 'probe-delete',
            'aria-label': props.label,
            onClick: () => emit('click'),
          },
          `${config.locale}:${props.index}:${String(props.row.from)}`,
        );
    },
  });

  function mountGrid(
    props: Partial<InstanceType<typeof WellDataGrid>['$props']> = {},
    config = {},
  ) {
    const wrapper = mount(WellDataGrid, {
      props: { rows, columns, ...props },
      attachTo: document.body,
      global: welldotGlobal({
        locale: 'pt',
        units: { length: 'ft' },
        ...config,
      }),
    });
    wrappers.push(wrapper);
    return wrapper;
  }

  it('renders cells with the configured locale and units', async () => {
    mountGrid();
    const cells = await waitFor('revogr-data[candrag] .rgCell');
    const text = cells.map(c => c.textContent?.trim());
    expect(text).toContain('32,8084 ft');
    expect(text).toContain('65,6168 ft');
    expect(text).toContain('Tubo PVC');
    // Not one of the options: shown raw.
    expect(text).toContain('steel');

    const headers = await waitFor('revogr-header .rgHeaderCell');
    const names = headers.map(c => c.textContent?.trim());
    expect(names).toContain('De (ft)');
    expect(names).toContain('Kind');
  });

  it('renders a createWelldot deleteButton inside the cell and deletes on click', async () => {
    const wrapper = mountGrid(
      { deleteLabel: { en: 'Delete row', pt: 'Excluir linha' } },
      { components: { deleteButton: ProbeDelete } },
    );
    const buttons = await waitFor('button.probe-delete');
    expect(buttons.map(b => b.textContent)).toEqual(['pt:0:10', 'pt:1:20']);
    expect(buttons[0]!.getAttribute('aria-label')).toBe('Excluir linha');
    expect(document.querySelector('.well-grid-delete-btn')).toBeNull();

    buttons[1]!.click();
    expect(wrapper.emitted('delete')).toEqual([[1]]);
  });

  it('prefers the components prop over createWelldot', async () => {
    const Global = defineComponent({
      render: () => h('button', { class: 'global-delete' }),
    });
    const wrapper = mountGrid(
      { components: { deleteButton: ProbeDelete } },
      { components: { deleteButton: Global } },
    );
    const buttons = await waitFor('button.probe-delete');
    expect(document.querySelector('.global-delete')).toBeNull();
    buttons[0]!.click();
    expect(wrapper.emitted('delete')).toEqual([[0]]);
  });

  it('defaults to the × button with an aria-label', async () => {
    const wrapper = mountGrid({
      deleteLabel: { en: 'Delete row', pt: 'Excluir linha' },
    });
    const buttons = await waitFor('button.well-grid-delete-btn');
    expect(buttons).toHaveLength(2);
    expect(buttons[0]!.getAttribute('aria-label')).toBe('Excluir linha');
    buttons[0]!.click();
    expect(wrapper.emitted('delete')).toEqual([[0]]);
  });

  it("uses RevoGrid's drag handle unless a dragHandle part is given", async () => {
    mountGrid();
    await waitFor('.revo-drag-icon');

    document.body.innerHTML = '';
    const Grip = defineComponent({ render: () => h('i', { class: 'grip' }) });
    mountGrid({ components: { dragHandle: Grip } });
    const grips = await waitFor('.revo-draggable i.grip');
    expect(grips).toHaveLength(2);
    expect(document.querySelector('.revo-drag-icon')).toBeNull();
  });

  it('unmounts every cell when the grid unmounts', async () => {
    let live = 0;
    const Counted = defineComponent({
      setup() {
        live++;
        onUnmounted(() => live--);
        return () => h('button', { class: 'counted' });
      },
    });
    const wrapper = mountGrid({ components: { deleteButton: Counted } });
    await waitFor('button.counted');
    expect(live).toBe(rows.length);

    wrappers.splice(wrappers.indexOf(wrapper), 1);
    wrapper.unmount();
    await flushPromises();
    expect(live).toBe(0);
  });

  it('renders the add button with a label, or icon-only without one', async () => {
    const labelled = mountGrid({
      addLabel: { en: 'Add row', pt: 'Nova linha' },
    });
    const button = labelled.get('button.well-grid-add-btn');
    expect(button.text()).toBe('Nova linha');
    expect(button.find('svg').exists()).toBe(true);
    await button.trigger('click');
    expect(labelled.emitted('add')).toHaveLength(1);

    const bare = mountGrid();
    const iconOnly = bare.get('button.well-grid-add-btn');
    expect(iconOnly.text()).toBe('');
    expect(iconOnly.find('svg').exists()).toBe(true);
  });

  it('swaps the add button part', async () => {
    const onAdd = vi.fn();
    const Add = defineComponent({
      props: { label: { type: String, default: undefined } },
      setup: props => () => h('a', { class: 'my-add' }, props.label),
    });
    const wrapper = mountGrid({
      addLabel: 'More',
      components: { addButton: Add },
      onAdd,
    });
    expect(wrapper.find('.well-grid-add-btn').exists()).toBe(false);
    await wrapper.get('a.my-add').trigger('click');
    expect(wrapper.get('a.my-add').text()).toBe('More');
    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});
