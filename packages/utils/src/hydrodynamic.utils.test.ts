import { describe, expect, it } from 'vitest';

import type { HydrodynamicEvent } from '@welldot/core';

import {
  allStepReadings,
  derivedStepDuration,
  lastReading,
  recoveryReadingsCount,
  stepHasReadings,
  stepRate,
} from './hydrodynamic.utils';

const stepped = {
  id: 'e1',
  type: 'step_drawdown',
  datetime: '2024-01-01T10:00:00Z',
  steps: [
    { rate: 5, readings: [{ elapsed: 10, depth: 12 }] },
    {
      rate: 8,
      readings: [
        { elapsed: 20, depth: 14 },
        { elapsed: 30, depth: 15 },
      ],
    },
    { rate: 10 },
  ],
  recovery: { readings: [{ elapsed: 5, depth: 13 }] },
} as unknown as HydrodynamicEvent;

const spot = {
  id: 'e2',
  type: 'spot_measurement',
  datetime: '2024-01-01T10:00:00Z',
} as unknown as HydrodynamicEvent;

describe('hydrodynamic readings', () => {
  it('finds the last reading of the last step that has readings', () => {
    expect(lastReading(stepped)).toEqual({ elapsed: 30, depth: 15 });
    expect(lastReading(spot)).toBeNull();
  });

  it('collects every step reading in order', () => {
    expect(allStepReadings(stepped).map(r => r.elapsed)).toEqual([10, 20, 30]);
    expect(allStepReadings(spot)).toEqual([]);
  });

  it('reads step rates and recovery counts', () => {
    expect(stepRate(stepped)).toBe(5);
    expect(stepRate(stepped, 2)).toBe(10);
    expect(stepRate(spot)).toBeNull();
    expect(recoveryReadingsCount(stepped)).toBe(1);
    expect(recoveryReadingsCount(spot)).toBe(0);
  });

  it('derives step duration from complete readings only', () => {
    const readings = [
      { elapsed: 10, depth: 1 },
      { elapsed: 40, depth: null },
      { elapsed: 25, depth: 2 },
    ];
    expect(stepHasReadings(readings)).toBe(true);
    expect(derivedStepDuration(readings)).toBe(25);
    expect(stepHasReadings([{ elapsed: null, depth: 1 }])).toBe(false);
    expect(derivedStepDuration([])).toBeNull();
  });
});
