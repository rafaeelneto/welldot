import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { createWelldot, type WelldotUnits } from '../config';
import { withSetup } from '../test/withSetup';
import type { DisplayUnitType } from './useWellUnits';
import { isDisplayedValue, useWellUnits } from './useWellUnits';

function setup<T extends keyof WelldotUnits>(
  type: T,
  units?: Partial<WelldotUnits>,
  override?: WelldotUnits[T],
) {
  return withSetup(
    () => useWellUnits(type, override),
    [createWelldot({ units })],
  ).result;
}

describe('useWellUnits', () => {
  it('is the identity for SI defaults', () => {
    for (const type of [
      'length',
      'diameter',
      'flow',
      'power',
      'volume',
    ] as const) {
      const { toDisplay, toCanonical } = setup(type);
      expect(toDisplay(12.5)).toBe(12.5);
      expect(toCanonical(12.5)).toBe(12.5);
    }
  });

  it('exposes raw units for length/diameter/power and labels for flow/volume', () => {
    expect(setup('length').unit.value).toBe('m');
    expect(setup('diameter').unit.value).toBe('mm');
    expect(setup('power').unit.value).toBe('kW');
    expect(setup('flow').unit.value).toBe('m³/h');
    expect(setup('volume').unit.value).toBe('m³');
    expect(setup('volume', { volume: 'ft3' }).unit.value).toBe('ft³');
  });

  it('converts length m ↔ ft', () => {
    const { unit, toDisplay, toCanonical } = setup('length', { length: 'ft' });
    expect(unit.value).toBe('ft');
    expect(toDisplay(1)).toBeCloseTo(3.28084, 5);
    expect(toCanonical(toDisplay(42))).toBeCloseTo(42, 6);
  });

  it('converts diameter mm ↔ inches', () => {
    const { toDisplay, toCanonical } = setup('diameter', {
      diameter: 'inches',
    });
    expect(toDisplay(25.4)).toBeCloseTo(1, 10);
    expect(toCanonical(6)).toBeCloseTo(152.4, 10);
  });

  it('converts flow, power and volume', () => {
    expect(setup('flow', { flow: 'L/s' }).toDisplay(3.6)).toBeCloseTo(1, 10);
    expect(setup('power', { power: 'hp' }).toCanonical(1)).toBeCloseTo(
      0.7457,
      3,
    );
    expect(setup('volume', { volume: 'L' }).toDisplay(1)).toBeCloseTo(1000, 6);
  });

  it('lets an override replace the configured unit', () => {
    const { unit, toDisplay } = setup('length', { length: 'm' }, 'ft');
    expect(unit.value).toBe('ft');
    expect(toDisplay(1)).toBeCloseTo(3.28084, 5);
  });

  it('follows reactive config changes', () => {
    const length = ref<'m' | 'ft'>('m');
    const { result } = withSetup(
      () => useWellUnits('length'),
      [createWelldot({ units: () => ({ length: length.value }) })],
    );
    expect(result.toDisplay(1)).toBe(1);
    length.value = 'ft';
    expect(result.unit.value).toBe('ft');
    expect(result.toDisplay(1)).toBeCloseTo(3.28084, 5);
  });

  it('accepts the unit type as a ref or getter and follows it', () => {
    const type = ref<DisplayUnitType>('length');
    const { result } = withSetup(
      () => useWellUnits(() => type.value),
      [createWelldot({ units: { length: 'ft', diameter: 'inches' } })],
    );
    expect(result.unit.value).toBe('ft');
    expect(result.toDisplay(1)).toBeCloseTo(3.28084, 5);
    type.value = 'diameter';
    expect(result.unit.value).toBe('inches');
    expect(result.toDisplay(25.4)).toBeCloseTo(1, 10);
    expect(result.toCanonical(1)).toBeCloseTo(25.4, 10);
  });

  it('applies an override to the current unit type', () => {
    const type = ref<DisplayUnitType>('length');
    const { result } = withSetup(
      () => useWellUnits(type, () => (type.value === 'length' ? 'ft' : null)),
      [createWelldot()],
    );
    expect(result.unit.value).toBe('ft');
    type.value = 'diameter';
    expect(result.unit.value).toBe('mm');
  });
});

describe('isDisplayedValue', () => {
  it('matches a value equal to the display rounded to the digits', () => {
    expect(isDisplayedValue(3.2808, 3.28084, 4)).toBe(true);
    expect(isDisplayedValue(3.2809, 3.28084, 4)).toBe(false);
    expect(isDisplayedValue(3.28, 3.28084, 2)).toBe(true);
    expect(isDisplayedValue(-1.5, -1.5, 4)).toBe(true);
  });

  it('treats null/undefined as equal only to each other', () => {
    expect(isDisplayedValue(null, null, 4)).toBe(true);
    expect(isDisplayedValue(undefined, null, 4)).toBe(true);
    expect(isDisplayedValue(0, null, 4)).toBe(false);
    expect(isDisplayedValue(null, 0, 4)).toBe(false);
  });
});
