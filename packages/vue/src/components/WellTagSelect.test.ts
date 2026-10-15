import { mount } from '@vue/test-utils';
import Select from 'primevue/select';
import { describe, expect, it } from 'vitest';
import { welldotGlobal } from '../test/mountOptions';
import WellTagSelect from './WellTagSelect.vue';

const options = [
  { value: 'pump', label: { en: 'Pump', pt: 'Bomba' } },
  { value: 'meter', label: { en: 'Meter', pt: 'Hidrômetro' } },
  { value: 'plain', label: 'Plain' },
];

describe('WellTagSelect', () => {
  it('renders selected values as chips with resolved labels', () => {
    const wrapper = mount(WellTagSelect, {
      props: { modelValue: ['pump', 'plain', 'unknown-id'], options },
      global: welldotGlobal({ locale: 'pt' }),
    });
    const chips = wrapper.findAll('.app-chip').map(c => c.text());
    expect(chips).toEqual(['Bomba', 'Plain', 'unknown-id']);
  });

  it('offers only unselected options, resolved', () => {
    const wrapper = mount(WellTagSelect, {
      props: {
        modelValue: ['pump'],
        options,
        placeholder: { en: 'Add…', pt: 'Adicionar…' },
      },
      global: welldotGlobal({ locale: 'pt' }),
    });
    const select = wrapper.findComponent(Select);
    expect(select.props('options')).toEqual([
      { value: 'meter', label: 'Hidrômetro' },
      { value: 'plain', label: 'Plain' },
    ]);
    expect(select.props('placeholder')).toBe('Adicionar…');
  });

  it('adds and removes values through v-model', async () => {
    const wrapper = mount(WellTagSelect, {
      props: {
        modelValue: ['pump'],
        options,
        'onUpdate:modelValue': (v: string[]) =>
          wrapper.setProps({ modelValue: v }),
      },
      global: welldotGlobal(),
    });
    wrapper.findComponent(Select).vm.$emit('update:modelValue', 'meter');
    await wrapper.vm.$nextTick();
    expect(wrapper.props('modelValue')).toEqual(['pump', 'meter']);

    await wrapper.find('button.app-chip-remove').trigger('click');
    expect(wrapper.props('modelValue')).toEqual(['meter']);
  });
});
