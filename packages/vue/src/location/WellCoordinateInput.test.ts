import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { welldotGlobal } from '../test/mountOptions';
import WellCoordinateInput from './WellCoordinateInput.vue';

type Props = InstanceType<typeof WellCoordinateInput>['$props'];

/** Mounts with the parent side of `v-model` wired to `setProps`. */
function mountTwoWay(props: Props) {
  const wrapper = mount(WellCoordinateInput, {
    props: {
      ...props,
      'onUpdate:modelValue': (value: number | undefined) =>
        wrapper.setProps({ modelValue: value }),
    },
    global: welldotGlobal(),
  });
  return wrapper;
}

function setup(props: Props, config = {}) {
  const wrapper = mount(WellCoordinateInput, {
    props,
    global: welldotGlobal(config),
  });
  const input = wrapper.find('input');
  return {
    wrapper,
    input,
    emitted: () =>
      (wrapper.emitted('update:modelValue') ?? []).map(([v]) => v as number),
  };
}

describe('WellCoordinateInput', () => {
  it('formats the model in DD with 6 decimals', () => {
    const { input } = setup({ modelValue: -23.5, axis: 'lat', format: 'DD' });
    expect(input.element.value).toBe('-23.500000');
  });

  it('formats the model in DMS with the hemisphere', () => {
    const lat = setup({ modelValue: -1.5, axis: 'lat', format: 'DMS' });
    const lng = setup({ modelValue: -48.5, axis: 'lng', format: 'DMS' });
    expect(lat.input.element.value).toBe(`1°30'0.00"S`);
    expect(lng.input.element.value).toBe(`48°30'0.00"W`);
  });

  it('keeps the exact model on an untouched blur or Enter', async () => {
    const { input, emitted } = setup({
      modelValue: -23.123456789,
      axis: 'lat',
      format: 'DD',
    });
    expect(input.element.value).toBe('-23.123457');
    await input.trigger('focus');
    await input.trigger('blur');
    await input.trigger('keydown', { key: 'Enter' });
    expect(emitted()).toEqual([]);

    const dms = setup({
      modelValue: -48.123456789,
      axis: 'lng',
      format: 'DMS',
    });
    await dms.input.trigger('blur');
    expect(dms.emitted()).toEqual([]);
  });

  it('parses DD on blur and reformats', async () => {
    const { input, emitted } = setup({
      modelValue: 0,
      axis: 'lat',
      format: 'DD',
    });
    await input.setValue('-12.5');
    await input.trigger('blur');
    expect(emitted()).toEqual([-12.5]);
    expect(input.element.value).toBe('-12.500000');
  });

  it('parses DMS on Enter and reformats in the active format', async () => {
    const { input, emitted } = setup({
      modelValue: 0,
      axis: 'lat',
      format: 'DMS',
    });
    await input.setValue(`23°30'45.12"S`);
    await input.trigger('keydown', { key: 'Enter' });
    expect(emitted()[0]).toBeCloseTo(-(23 + 30 / 60 + 45.12 / 3600), 8);
    expect(input.element.value).toBe(`23°30'45.12"S`);
  });

  it('accepts DMS typed while the format is DD', async () => {
    const { input, emitted } = setup({
      modelValue: 0,
      axis: 'lng',
      format: 'DD',
    });
    await input.setValue('48 30 0 W');
    await input.trigger('blur');
    expect(emitted()).toEqual([-48.5]);
    expect(input.element.value).toBe('-48.500000');
  });

  it.each([
    ['lat', '95', 90],
    ['lat', '-120.5', -90],
    ['lng', '200', 180],
    ['lng', '-181', -180],
  ] as const)('clamps %s %s to %d', async (axis, typed, expected) => {
    const { input, emitted } = setup({ modelValue: 0, axis, format: 'DD' });
    await input.setValue(typed);
    await input.trigger('blur');
    expect(emitted()).toEqual([expected]);
    expect(input.element.value).toBe(expected.toFixed(6));
  });

  it.each(['abc', '', '-', '12°xx'])(
    'reverts invalid input %j to the formatted model',
    async typed => {
      const { input, emitted } = setup({
        modelValue: 10.25,
        axis: 'lat',
        format: 'DD',
      });
      await input.setValue(typed);
      await input.trigger('blur');
      expect(emitted()).toEqual([]);
      expect(input.element.value).toBe('10.250000');
    },
  );

  it('reformats when the model or the format changes externally', async () => {
    const { wrapper, input } = setup({
      modelValue: 1.5,
      axis: 'lat',
      format: 'DD',
    });
    await wrapper.setProps({ modelValue: -2.25 });
    expect(input.element.value).toBe('-2.250000');
    await wrapper.setProps({ format: 'DMS' });
    expect(input.element.value).toBe(`2°15'0.00"S`);
  });

  it('works as a two-way v-model', async () => {
    const wrapper = mountTwoWay({ modelValue: 0, axis: 'lat', format: 'DD' });
    const input = wrapper.find('input');
    await input.setValue('45');
    await input.trigger('blur');
    expect(wrapper.props('modelValue')).toBe(45);
    expect(input.element.value).toBe('45.000000');
  });

  it('falls back to the configured coordinate format', () => {
    const { input } = setup(
      { modelValue: -1.5, axis: 'lat' },
      { coordinateFormat: 'DMS' },
    );
    expect(input.element.value).toBe(`1°30'0.00"S`);
  });

  it.each([
    ['lat', 'DD', '-23.512533'],
    ['lat', 'DMS', `23°30'45.12"S`],
    ['lng', 'DD', '-48.503900'],
    ['lng', 'DMS', `48°30'14.04"W`],
  ] as const)(
    'uses the built-in %s %s placeholder',
    (axis, format, expected) => {
      const { input } = setup({ modelValue: 0, axis, format });
      expect(input.attributes('placeholder')).toBe(expected);
    },
  );

  it('resolves a LanguageText placeholder override', () => {
    const { input } = setup(
      {
        modelValue: 0,
        axis: 'lat',
        placeholder: { en: 'Latitude', pt: 'Latitude (graus)' },
      },
      { locale: 'pt' },
    );
    expect(input.attributes('placeholder')).toBe('Latitude (graus)');
  });
});
