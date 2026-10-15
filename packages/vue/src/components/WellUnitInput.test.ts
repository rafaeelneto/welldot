import { mount } from '@vue/test-utils';
import InputNumber from 'primevue/inputnumber';
import { describe, expect, it } from 'vitest';
import { welldotGlobal } from '../test/mountOptions';
import WellUnitInput from './WellUnitInput.vue';

const FT_PER_M = 3.28084;

describe('WellUnitInput', () => {
  it('shows canonical metres in feet and emits metres back', async () => {
    const wrapper = mount(WellUnitInput, {
      props: { modelValue: 10, unitType: 'length' },
      global: welldotGlobal({ units: { length: 'ft' } }),
    });
    const input = wrapper.findComponent(InputNumber);
    const shown = input.props('modelValue') as number;
    expect(shown).toBeCloseTo(10 * FT_PER_M, 4);

    // Round trip: emitting the displayed value yields the original metres.
    input.vm.$emit('update:modelValue', shown);
    input.vm.$emit('update:modelValue', 100);
    const emitted = wrapper.emitted('update:modelValue') as number[][];
    expect(emitted[0]![0]).toBeCloseTo(10, 6);
    expect(emitted[1]![0]).toBeCloseTo(30.48, 6);
  });

  it('passes metres through unchanged with SI units', () => {
    const wrapper = mount(WellUnitInput, {
      props: { modelValue: 10, unitType: 'length', min: 0, max: 50 },
      global: welldotGlobal(),
    });
    const input = wrapper.findComponent(InputNumber);
    expect(input.props('modelValue')).toBe(10);
    expect(input.props('max')).toBe(50);
  });

  it('converts min/max/step to the display unit', () => {
    const wrapper = mount(WellUnitInput, {
      props: { modelValue: null, unitType: 'length', max: 10, step: 1 },
      global: welldotGlobal({ units: { length: 'ft' } }),
    });
    const input = wrapper.findComponent(InputNumber);
    expect(input.props('modelValue')).toBeNull();
    expect(input.props('max') as number).toBeCloseTo(10 * FT_PER_M, 4);
    expect(input.props('step') as number).toBeCloseTo(FT_PER_M, 4);
  });

  it('emits null when cleared', () => {
    const wrapper = mount(WellUnitInput, {
      props: { modelValue: 5, unitType: 'length' },
      global: welldotGlobal({ units: { length: 'ft' } }),
    });
    wrapper.findComponent(InputNumber).vm.$emit('update:modelValue', null);
    expect(wrapper.emitted('update:modelValue')).toEqual([[null]]);
  });

  it('lets the unit prop override the configured unit', () => {
    const wrapper = mount(WellUnitInput, {
      props: { modelValue: 10, unitType: 'length', unit: 'ft' },
      global: welldotGlobal({ units: { length: 'm' } }),
    });
    expect(
      wrapper.findComponent(InputNumber).props('modelValue') as number,
    ).toBeCloseTo(10 * FT_PER_M, 4);
  });

  it('formats with the configured locale and defaults maxFractionDigits to 4', () => {
    const wrapper = mount(WellUnitInput, {
      props: { modelValue: 1, unitType: 'length' },
      global: welldotGlobal({ locale: 'pt' }),
    });
    const input = wrapper.findComponent(InputNumber);
    expect(input.props('locale')).toBe('pt-BR');
    expect(input.props('maxFractionDigits')).toBe(4);
  });

  it('keeps the exact value on an untouched focus + blur', async () => {
    const wrapper = mount(WellUnitInput, {
      props: { modelValue: 1, unitType: 'length' },
      global: welldotGlobal({ units: { length: 'ft' } }),
    });
    const input = wrapper.get('input');
    expect(input.element.value).toBe('3.2808');
    await input.trigger('focus');
    await input.trigger('blur');
    // 3.2808 ft would round-trip to 0.99998784 m.
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();

    // Same for an empty input.
    await wrapper.setProps({ modelValue: null });
    await input.trigger('focus');
    await input.trigger('blur');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });

  it('follows unitType changes', async () => {
    const wrapper = mount(WellUnitInput, {
      props: { modelValue: 25.4, unitType: 'length' as const },
      global: welldotGlobal({ units: { length: 'ft', diameter: 'inches' } }),
    });
    const input = wrapper.findComponent(InputNumber);
    expect(input.props('modelValue') as number).toBeCloseTo(25.4 * FT_PER_M, 4);
    await wrapper.setProps({ unitType: 'diameter' });
    expect(input.props('modelValue') as number).toBeCloseTo(1, 10);
    input.vm.$emit('update:modelValue', 2);
    expect(
      (wrapper.emitted('update:modelValue') as number[][])[0]![0],
    ).toBeCloseTo(50.8, 10);
  });
});
