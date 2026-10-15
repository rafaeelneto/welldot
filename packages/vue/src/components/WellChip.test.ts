import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import { welldotGlobal } from '../test/mountOptions';
import type { WellIconProps } from '../types';
import WellChip from './WellChip.vue';

const pump = { en: 'Pump', pt: 'Bomba' };

describe('WellChip', () => {
  it.each([
    ['en', 'Pump'],
    ['pt', 'Bomba'],
  ])('resolves a LanguageText label for %s', (locale, expected) => {
    const wrapper = mount(WellChip, {
      props: { label: pump },
      global: welldotGlobal({ locale }),
    });
    expect(wrapper.text()).toBe(expected);
  });

  it('renders a plain string label as-is', () => {
    const wrapper = mount(WellChip, {
      props: { label: 'Filter' },
      global: welldotGlobal({ locale: 'pt' }),
    });
    expect(wrapper.text()).toBe('Filter');
  });

  it('renders a button and no remove control by default', () => {
    const wrapper = mount(WellChip, {
      props: { label: 'x' },
      global: welldotGlobal(),
    });
    expect(wrapper.element.tagName).toBe('BUTTON');
    expect(wrapper.find('.app-chip-remove').exists()).toBe(false);
  });

  it('emits remove from the × button with a resolved aria-label', async () => {
    const wrapper = mount(WellChip, {
      props: {
        label: pump,
        removable: true,
        removeLabel: { en: 'Remove', pt: 'Remover' },
      },
      global: welldotGlobal({ locale: 'pt' }),
    });
    expect(wrapper.element.tagName).toBe('SPAN');
    const remove = wrapper.find('button.app-chip-remove');
    expect(remove.attributes('aria-label')).toBe('Remover');
    expect(remove.find('svg').exists()).toBe(true);
    await remove.trigger('click');
    expect(wrapper.emitted('remove')).toHaveLength(1);
  });

  it('omits the aria-label when removeLabel is not given', () => {
    const wrapper = mount(WellChip, {
      props: { label: 'x', removable: true },
      global: welldotGlobal(),
    });
    expect(
      wrapper.find('button.app-chip-remove').attributes('aria-label'),
    ).toBeUndefined();
  });

  it('renders a component icon', () => {
    const Drop = defineComponent({ render: () => h('svg', { class: 'drop' }) });
    const wrapper = mount(WellChip, {
      props: { label: 'x', icon: Drop },
      global: welldotGlobal(),
    });
    expect(wrapper.find('svg.drop').exists()).toBe(true);
  });

  it('ignores a string icon without an icon part', () => {
    const wrapper = mount(WellChip, {
      props: { label: 'x', icon: 'ph:drop' },
      global: welldotGlobal(),
    });
    expect(wrapper.find('svg').exists()).toBe(false);
  });

  it('renders a string icon through the configured icon part', () => {
    const IconPart = defineComponent({
      props: { name: { type: String, required: true } },
      setup: (props: WellIconProps) => () =>
        h('i', { 'data-icon': props.name }),
    });
    const wrapper = mount(WellChip, {
      props: { label: 'x', icon: 'ph:drop' },
      global: welldotGlobal({ components: { icon: IconPart } }),
    });
    expect(wrapper.find('i[data-icon="ph:drop"]').exists()).toBe(true);
  });
});
