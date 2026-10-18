import { describe, expect, it } from 'vitest';

import type { HydrodynamicEvent } from '@welldot/core';

import {
  allStepReadings,
  availablePumpingCharts,
  derivedStepDuration,
  lastReading,
  pumpingTimeline,
  recoveryReadingsCount,
  semilogDrawdownSeries,
  stepHasReadings,
  stepRate,
  stepTestSeries,
  theisRecoverySeries,
} from './hydrodynamic.utils';
import { getLatestStaticLevel } from './profile.utils';

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

const stepTest = {
  id: 's1',
  type: 'step_drawdown',
  datetime: '2024-01-01T10:00:00Z',
  static_level: 40,
  steps: [
    {
      rate: 60,
      duration: 120,
      readings: [
        { elapsed: 60, depth: 46 },
        { elapsed: 0, depth: 40 },
        { elapsed: 110, depth: 47 },
      ],
    },
    { rate: 90, readings: [{ elapsed: 30, depth: 50 }, { elapsed: 100, depth: 52 }] },
    { rate: 120, duration: 60, readings: [{ elapsed: 60, depth: 60 }] },
  ],
  recovery: {
    readings: [
      { elapsed: 0, depth: 60 },
      { elapsed: 10, depth: 50 },
      { elapsed: 70, depth: 42 },
    ],
  },
} as unknown as HydrodynamicEvent;

describe('pumpingTimeline', () => {
  it('starts each step where the previous one ends', () => {
    const { steps, pumpingEnd, recovery } = pumpingTimeline(stepTest);
    // duration 120, then last reading 100 (no duration), then duration 60.
    expect(steps.map(s => [s.start, s.end])).toEqual([
      [0, 120],
      [120, 220],
      [220, 280],
    ]);
    expect(pumpingEnd).toBe(280);
    expect(recovery?.start).toBe(280);
    expect(recovery?.points.map(p => p.t)).toEqual([280, 290, 350]);
  });

  it('sorts readings and derives drawdown from the static level', () => {
    const [first] = pumpingTimeline(stepTest).steps;
    expect(first!.points.map(p => [p.t, p.drawdown])).toEqual([
      [0, 0],
      [60, 6],
      [110, 7],
    ]);
    expect(pumpingTimeline(stepped).steps[0]!.points[0]!.drawdown).toBeNull();
  });

  it('offsets recovery_only by its pumping duration', () => {
    const event = {
      id: 'r',
      type: 'recovery_only',
      datetime: '2024-01-01T10:00:00Z',
      pumping_duration: 600,
      recovery: { readings: [{ elapsed: 5, depth: 20 }] },
    } as unknown as HydrodynamicEvent;
    const timeline = pumpingTimeline(event);
    expect(timeline.steps).toEqual([]);
    expect(timeline.pumpingEnd).toBe(600);
    expect(timeline.recovery?.points[0]?.t).toBe(605);
  });
});

describe('pumping test series', () => {
  it('keeps only positive elapsed times for the semi-log plot', () => {
    const series = semilogDrawdownSeries(stepTest);
    expect(series[0]!.points).toEqual([
      { elapsed: 60, drawdown: 6 },
      { elapsed: 110, drawdown: 7 },
    ]);
    expect(semilogDrawdownSeries(stepped)).toEqual([]);
  });

  it('computes t/t′ for recovery', () => {
    expect(theisRecoverySeries(stepTest)).toEqual([
      { ratio: 29, value: 10, residual: true },
      { ratio: 5, value: 2, residual: true },
    ]);
  });

  it('computes s, s/Q and Q/s per step', () => {
    const series = stepTestSeries(stepTest);
    expect(series.map(s => [s.rate, s.drawdown])).toEqual([
      [60, 7],
      [90, 12],
      [120, 20],
    ]);
    expect(series[2]!.specificDrawdown).toBeCloseTo(20 / 120);
    expect(series[2]!.specificCapacity).toBeCloseTo(6);
  });

  it('lists the charts the event has data for', () => {
    expect(availablePumpingCharts(stepTest)).toEqual([
      'hydrograph',
      'semilog',
      'recovery',
      'stepTest',
    ]);
    expect(availablePumpingCharts(stepped)).toEqual(['hydrograph']);
    expect(availablePumpingCharts(spot)).toEqual([]);
  });
});

describe('logger_series (v2.4)', () => {
  const series = {
    id: 'ls-1',
    type: 'logger_series',
    datetime: '2026-07-01T00:00:00-03:00',
    sensor_depth: 42,
    readings: [
      { datetime: '2026-07-01T00:00:00-03:00', depth: 18.42 },
      { datetime: '2026-07-01T00:15:00-03:00', depth: 18.44 },
    ],
  } as HydrodynamicEvent;

  it('logger_series does not feed static level or pumping derivations', () => {
    const well = {
      version: '2.4',
      bore_hole: [],
      well_case: [],
      reduction: [],
      well_screen: [],
      surface_case: [],
      hole_fill: [],
      lithology: [],
      fractures: [],
      caves: [],
      hydrodynamic_events: [series],
    } as unknown as Parameters<typeof getLatestStaticLevel>[0];
    expect(getLatestStaticLevel(well)).toBeUndefined();
    expect(() => pumpingTimeline(series)).not.toThrow();
    expect(pumpingTimeline(series)).toEqual({
      staticLevel: null,
      steps: [],
      pumpingEnd: null,
      recovery: null,
    });
    expect(lastReading(series)).toBeNull();
    expect(allStepReadings(series)).toEqual([]);
    expect(availablePumpingCharts(series)).toEqual([]);
  });
});
