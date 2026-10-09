import { mount } from '@vue/test-utils';
import InputNumber from 'primevue/inputnumber';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h, type PropType } from 'vue';
import { welldotGlobal } from '../test/mountOptions';
import type { WellDeleteButtonProps } from '../types';
import GridDeleteCell from './cells/GridDeleteCell.vue';
import GridUnitCell from './cells/GridUnitCell.vue';
import GridUnitEditor from './cells/GridUnitEditor.vue';
import WellGridDeleteButton from './parts/WellGridDeleteButton.vue';

describe('GridUnitCell', () => {
  it('shows canonical metres converted to feet', () => {
    const wrapper = mount(GridUnitCell, {
      props: { value: 10, unitType: 'length' },
      global: welldotGlobal({ units: { length: 'ft' } }),
    });
    expect(wrapper.text()).toBe('32.8084 ft');
  });

  it('shows metres as-is with the SI default', () => {
    const wrapper = mount(GridUnitCell, {
      props: { value: 12.5, unitType: 'length' },
      global: welldotGlobal(),
    });
    expect(wrapper.text()).toBe('12.5 m');
  });

  it('formats for the configured locale', () => {
    const wrapper = mount(GridUnitCell, {
      props: { value: 1234.5, unitType: 'length' },
      global: welldotGlobal({ locale: 'pt' }),
    });
    expect(wrapper.text()).toBe('1.234,5 m');
  });

  it.each([
    ['en', '6 in.'],
    ['pt', '6 "'],
  ])('suffixes inches per language (%s)', (locale, expected) => {
    const wrapper = mount(GridUnitCell, {
      props: { value: 152.4, unitType: 'diameter' },
      global: welldotGlobal({ locale, units: { diameter: 'inches' } }),
    });
    expect(wrapper.text()).toBe(expected);
  });

  it.each([
    ['flow', { flow: 'L/s' }, 3.6, '1 L/s'],
    ['power', { power: 'kW' }, 7.5, '7.5 kW'],
    ['volume', { volume: 'L' }, 2, '2,000 L'],
  ] as const)('handles %s columns', (unitType, units, value, expected) => {
    const wrapper = mount(GridUnitCell, {
      props: { value, unitType },
      global: welldotGlobal({ units }),
    });
    expect(wrapper.text()).toBe(expected);
  });

  it.each([null, undefined, '', 'abc'])('shows a dash for %s', value => {
    const wrapper = mount(GridUnitCell, {
      props: { value, unitType: 'length' },
      global: welldotGlobal(),
    });
    expect(wrapper.text()).toBe('—');
  });
});

describe('GridUnitCell (reactive unitType)', () => {
  it('follows unitType changes', async () => {
    const wrapper = mount(GridUnitCell, {
      props: { value: 25.4, unitType: 'diameter' as const },
      global: welldotGlobal({ units: { length: 'ft', diameter: 'inches' } }),
    });
    expect(wrapper.text()).toBe('1 in.');
    await wrapper.setProps({ unitType: 'length' });
    expect(wrapper.text()).toBe('83.3333 ft');
  });
});

describe('GridUnitEditor', () => {
  function mountEditor(val: unknown) {
    const save = vi.fn();
    const close = vi.fn();
    const wrapper = mount(GridUnitEditor, {
      props: { val, save, close, unitType: 'length' },
      global: welldotGlobal({ units: { length: 'ft' } }),
      attachTo: document.body,
    });
    return { wrapper, save, close, input: wrapper.get('input') };
  }

  it('closes without saving on an untouched blur', async () => {
    const { wrapper, save, close, input } = mountEditor(1);
    expect(input.element.value).toBe('3.2808');
    await input.trigger('blur');
    // 3.2808 ft would round-trip to 0.99998784 m.
    expect(save).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledWith(false);
    wrapper.unmount();
  });

  it('saves an edited value in canonical units', () => {
    const { wrapper, save } = mountEditor(1);
    wrapper.findComponent(InputNumber).vm.$emit('update:modelValue', 10);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0]![0]).toBeCloseTo(3.048, 10);
    expect(save.mock.calls[0]![1]).toBe(true);
    wrapper.unmount();
  });

  it.each([undefined, null, ''])(
    'starts empty for %s and saves nothing on blur',
    async val => {
      const { wrapper, save, input } = mountEditor(val);
      expect(input.element.value).toBe('');
      expect(wrapper.findComponent(InputNumber).props('modelValue')).toBeNull();
      await input.trigger('blur');
      expect(save).not.toHaveBeenCalled();
      wrapper.unmount();
    },
  );
});

describe('GridDeleteCell', () => {
  const model = { from: 0, to: 10 };

  it('renders the default button with the label as aria-label', async () => {
    const requestDelete = vi.fn();
    const wrapper = mount(GridDeleteCell, {
      props: {
        rowIndex: 2,
        model,
        part: WellGridDeleteButton,
        label: 'Delete row',
        requestDelete,
      },
      global: welldotGlobal(),
    });
    const button = wrapper.get('button.well-grid-delete-btn');
    expect(button.attributes('aria-label')).toBe('Delete row');
    expect(button.text()).toBe('');
    await button.trigger('click');
    expect(requestDelete).toHaveBeenCalledWith(2, model);
  });

  it('swaps in a custom part with the contract props', async () => {
    const requestDelete = vi.fn();
    const received: WellDeleteButtonProps[] = [];
    // Emits `click` (no native event): the cell must still delete.
    const TrashButton = defineComponent({
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
        return () => {
          received.push({ ...props });
          return h(
            'a',
            { class: 'trash', onClick: () => emit('click') },
            props.label,
          );
        };
      },
    });

    const wrapper = mount(GridDeleteCell, {
      props: {
        rowIndex: 5,
        model,
        part: TrashButton,
        label: 'Remover',
        requestDelete,
      },
      global: welldotGlobal(),
    });
    expect(wrapper.find('.well-grid-delete-btn').exists()).toBe(false);
    expect(wrapper.get('a.trash').text()).toBe('Remover');
    expect(received.at(-1)).toEqual({ index: 5, row: model, label: 'Remover' });
    await wrapper.get('a.trash').trigger('click');
    expect(requestDelete).toHaveBeenCalledWith(5, model);
  });
});
