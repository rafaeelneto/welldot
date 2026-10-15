import { VISIBILITY_LEAF_KEYS, redactWell } from '@welldot/core';
import { describe, expect, it } from 'vitest';
import {
  allVisible,
  countVisible,
  fromSelectionKeys,
  normalizeVisibility,
  toSelectionKeys,
} from './visibility';

describe('normalizeVisibility', () => {
  it('defaults every leaf to visible', () => {
    expect(normalizeVisibility(undefined)).toEqual(allVisible());
    expect(countVisible(normalizeVisibility({}))).toBe(
      VISIBILITY_LEAF_KEYS.length,
    );
  });

  it('migrates the pre-tree per-section shape', () => {
    const v = normalizeVisibility({
      general: true,
      constructive: true,
      geology: true,
      hydrodynamic: true,
      history: false,
      operation: false,
      water_quality: true,
    });
    expect(v.history).toBe(false);
    expect(v.meters).toBe(false);
    expect(v.permits).toBe(false);
    expect(v.pump_installations).toBe(false);
    expect(v.water_quality).toBe(true);
    expect(v.bore_hole).toBe(true);
    expect('operation' in v).toBe(false);
  });

  it('keeps stored leaf values and fills new leaves as visible', () => {
    const v = normalizeVisibility({ meters: false });
    expect(v.meters).toBe(false);
    expect(v.permits).toBe(true);
  });
});

describe('tree selection keys', () => {
  it('marks a parent partial when only some fields are visible', () => {
    const keys = toSelectionKeys({ ...allVisible(), meters: false });
    expect(keys.operation).toEqual({ checked: false, partialChecked: true });
    expect(keys.meters).toBeUndefined();
    expect(keys.permits).toEqual({ checked: true, partialChecked: false });
    expect(keys.general).toEqual({ checked: true, partialChecked: false });
    expect(keys.history).toEqual({ checked: true, partialChecked: false });
  });

  it('omits a parent with no visible fields', () => {
    const keys = toSelectionKeys(normalizeVisibility({ operation: false }));
    expect(keys.operation).toBeUndefined();
  });

  it('round-trips through PrimeVue keys', () => {
    const v = { ...allVisible(), caves: false, history: false };
    expect(fromSelectionKeys(toSelectionKeys(v))).toEqual(v);
  });

  it('feeds redactWell directly', () => {
    const well = {
      version: 2,
      bore_hole: [],
      well_case: [],
      reduction: [],
      well_screen: [],
      surface_case: [],
      hole_fill: [],
      lithology: [],
      fractures: [],
      caves: [],
      meters: [{ id: 'm1' }],
      permits: [{ id: 'p1' }],
    } as never;
    const result = redactWell(well, { ...allVisible(), meters: false });
    expect(result.meters).toBeUndefined();
    expect(result.permits).toHaveLength(1);
  });
});
