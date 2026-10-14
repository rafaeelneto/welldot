import { flushPromises, mount } from '@vue/test-utils';
import Select from 'primevue/select';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { welldotGlobal } from '../test/mountOptions';
import WellComboSelect from './WellComboSelect.vue';

const hint = { en: 'Suggestions', pt: 'Sugestões' };

async function mountOpen(props: Record<string, unknown>, locale = 'en') {
  const wrapper = mount(WellComboSelect, {
    props: { options: ['Rotary', 'Percussion'], ...props },
    global: welldotGlobal({ locale }),
    attachTo: document.body,
  });
  (wrapper.findComponent(Select).vm as unknown as { show: () => void }).show();
  await flushPromises();
  return wrapper;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('WellComboSelect', () => {
  it('is an editable Select receiving the forwarded attributes', () => {
    const wrapper = mount(WellComboSelect, {
      props: { options: ['a', 'b'], placeholder: 'Pick' },
      global: welldotGlobal(),
    });
    const select = wrapper.findComponent(Select);
    expect(select.props('editable')).toBe(true);
    expect(select.props('options')).toEqual(['a', 'b']);
    expect(select.props('placeholder')).toBe('Pick');
  });

  it('opens the overlay with the resolved hint', async () => {
    const wrapper = await mountOpen({ hint }, 'pt');
    const note = document.body.querySelector('[role="note"]');
    expect(note?.textContent?.trim()).toBe('Sugestões');
    wrapper.unmount();
  });

  it('shows no hint when none is given', async () => {
    const wrapper = await mountOpen({});
    expect(document.body.querySelector('[role="note"]')).toBeNull();
    wrapper.unmount();
  });

  it('keeps typed text as the model value', async () => {
    const onUpdate = vi.fn();
    const wrapper = mount(WellComboSelect, {
      props: {
        modelValue: null,
        options: ['Rotary'],
        'onUpdate:modelValue': onUpdate,
      },
      global: welldotGlobal(),
    });
    await wrapper.find('input').setValue('Hand dug');
    expect(onUpdate).toHaveBeenLastCalledWith('Hand dug');
  });
});
