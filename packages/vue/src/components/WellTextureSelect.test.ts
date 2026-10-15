import { mount } from '@vue/test-utils';
import { FGDC_TEXTURES_OPTIONS } from '@welldot/core';
import Select from 'primevue/select';
import { describe, expect, it } from 'vitest';
import { welldotGlobal } from '../test/mountOptions';
import WellTextureSelect from './WellTextureSelect.vue';

describe('WellTextureSelect', () => {
  it('defaults to the FGDC catalogue without pending textures', () => {
    const wrapper = mount(WellTextureSelect, { global: welldotGlobal() });
    const options = wrapper.findComponent(Select).props('options') as Array<{
      pending?: true;
    }>;
    expect(options.length).toBe(
      FGDC_TEXTURES_OPTIONS.filter(o => !o.pending).length,
    );
    expect(options.some(o => o.pending)).toBe(false);
  });

  it('accepts a custom option list', () => {
    const custom = [
      { code: 601, label: 'Gravel' },
      { code: 999, label: 'Pending', pending: true as const },
    ];
    const wrapper = mount(WellTextureSelect, {
      props: { options: custom },
      global: welldotGlobal(),
    });
    expect(wrapper.findComponent(Select).props('options')).toEqual([custom[0]]);
  });

  it('resolves the placeholder and merges pt over the defaults', () => {
    const wrapper = mount(WellTextureSelect, {
      props: {
        labels: { placeholder: { en: 'Texture', pt: 'Textura' } },
        pt: { root: 'custom-root', overlay: { 'data-x': '1' } },
      },
      global: welldotGlobal({ locale: 'pt' }),
    });
    const select = wrapper.findComponent(Select);
    expect(select.props('placeholder')).toBe('Textura');
    expect(select.props('pt')).toMatchObject({
      root: 'custom-root',
      label: 'flex items-center',
      overlay: { class: 'min-w-[340px]', 'data-x': '1' },
    });
  });

  it('emits the picked code through v-model', () => {
    const wrapper = mount(WellTextureSelect, {
      props: { modelValue: null },
      global: welldotGlobal(),
    });
    wrapper.findComponent(Select).vm.$emit('update:modelValue', 601);
    expect(wrapper.emitted('update:modelValue')).toEqual([[601]]);
  });
});
