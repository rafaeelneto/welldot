import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h, reactive } from 'vue';
import { welldotGlobal } from '../test/mountOptions';
import type { WellInfoTriggerProps } from '../types';
import WellInfoPopover from './WellInfoPopover.vue';

function makeTrigger(tag: string) {
  return defineComponent({
    props: {
      label: { type: String, default: undefined },
      size: { type: String, required: true },
    },
    setup: (props: WellInfoTriggerProps) => () =>
      h('a', {
        class: tag,
        'data-label': props.label,
        'data-size': props.size,
      }),
  });
}

describe('WellInfoPopover', () => {
  it('renders the default trigger with a resolved aria-label', () => {
    const wrapper = mount(WellInfoPopover, {
      props: { info: 'x', label: { en: 'More info', pt: 'Mais informações' } },
      global: welldotGlobal({ locale: 'pt' }),
    });
    expect(wrapper.find('button').attributes('aria-label')).toBe(
      'Mais informações',
    );
  });

  it('has no aria-label when the label is omitted', () => {
    const wrapper = mount(WellInfoPopover, {
      props: { info: 'x' },
      global: welldotGlobal(),
    });
    expect(wrapper.find('button').attributes('aria-label')).toBeUndefined();
  });

  it('uses the global trigger part from createWelldot', () => {
    const wrapper = mount(WellInfoPopover, {
      props: { info: 'x', label: 'Info', size: 'md' },
      global: welldotGlobal({ components: { trigger: makeTrigger('global') } }),
    });
    const trigger = wrapper.find('a.global');
    expect(trigger.attributes('data-label')).toBe('Info');
    expect(trigger.attributes('data-size')).toBe('md');
    expect(wrapper.find('button').exists()).toBe(false);
  });

  it('prefers the components prop over the global part', () => {
    const wrapper = mount(WellInfoPopover, {
      props: { info: 'x', components: { trigger: makeTrigger('local') } },
      global: welldotGlobal({ components: { trigger: makeTrigger('global') } }),
    });
    expect(wrapper.find('a.local').exists()).toBe(true);
    expect(wrapper.find('a.global').exists()).toBe(false);
  });

  it('renders a part held in reactive state without a reactivity warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const state = reactive({ components: { trigger: makeTrigger('state') } });
    const wrapper = mount(
      defineComponent({
        render: () =>
          h(WellInfoPopover, { info: 'x', components: state.components }),
      }),
      { global: welldotGlobal() },
    );
    expect(wrapper.find('a.state').exists()).toBe(true);
    const messages = warn.mock.calls.map(args => String(args[0]));
    warn.mockRestore();
    expect(messages.filter(m => m.includes('made a reactive object'))).toEqual(
      [],
    );
  });
});
