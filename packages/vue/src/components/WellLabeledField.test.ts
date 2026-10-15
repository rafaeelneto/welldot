import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { welldotGlobal } from '../test/mountOptions';
import WellLabeledField from './WellLabeledField.vue';

const depth = { en: 'Depth', pt: 'Profundidade' };

function render(props: Record<string, unknown>, locale = 'en') {
  return mount(WellLabeledField, {
    props,
    slots: { default: '<input class="control" />' },
    global: welldotGlobal({ locale }),
  });
}

describe('WellLabeledField', () => {
  it.each([
    ['en', 'Depth'],
    ['pt', 'Profundidade'],
  ])('resolves a LanguageText label for %s', (locale, expected) => {
    expect(render({ label: depth }, locale).find('label').text()).toBe(
      expected,
    );
  });

  it.each(['en', 'pt'])('renders a plain string label as-is (%s)', locale => {
    expect(render({ label: 'Diâmetro' }, locale).find('label').text()).toBe(
      'Diâmetro',
    );
  });

  it('renders the control without a label row when the label is omitted', () => {
    const wrapper = render({});
    expect(wrapper.find('label').exists()).toBe(false);
    expect(wrapper.find('input.control').exists()).toBe(true);
  });

  it('shows the info trigger with its resolved accessible label', () => {
    const wrapper = render(
      {
        label: depth,
        info: { en: 'Measured from the surface', pt: 'Medida da superfície' },
        infoLabel: { en: 'Field info', pt: 'Informação do campo' },
      },
      'pt',
    );
    expect(wrapper.find('button').attributes('aria-label')).toBe(
      'Informação do campo',
    );
  });

  it('hides the info trigger when there is no info', () => {
    expect(render({ label: depth }).find('button').exists()).toBe(false);
  });
});
