import { describe, expect, it } from 'vitest';

import type {
  AquiferAnalysis,
  HistoryLogEntry,
  HydrodynamicEvent,
  Meter,
  OperatingRegime,
  Permit,
  ProductionEntry,
  Well,
} from '@welldot/core';

import {
  getCurrentMeters,
  getCurrentRegime,
  getCurrentWellStatus,
  getCurrentWellStatusEntry,
  getEffectiveProduction,
  getMeterIntervals,
  getOperationWarnings,
  getProductionByPeriod,
  getProductionTotal,
  getRetractedProductionIds,
  type OperationWarningCode,
} from './operation.utils';
import { getRetractedEventIds } from './profile.utils';
import { getRetractedIds, instantLocalDate } from './shared.utils';

const TODAY = '2026-10-05';

function makeWell(patch: Partial<Well> = {}): Well {
  return {
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
    ...patch,
  };
}

const meter = (patch: Partial<Meter> = {}): Meter => ({
  id: 'hm-01',
  installed_at: '2025-01-01T00:00:00Z',
  ...patch,
});

const reading = (
  id: string,
  datetime: string,
  value: number,
  patch: Record<string, unknown> = {},
): ProductionEntry => ({
  id,
  type: 'meter_reading',
  datetime,
  meter_id: 'hm-01',
  reading: value,
  ...patch,
});

const declared = (
  id: string,
  period_start: string,
  period_end: string,
  volume: number,
  patch: Record<string, unknown> = {},
): ProductionEntry => ({
  id,
  type: 'declared_volume',
  period_start,
  period_end,
  volume,
  ...patch,
});

const log = (patch: Partial<HistoryLogEntry>): HistoryLogEntry => ({
  id: 'log-1',
  datetime: '2025-06-01T10:00:00-03:00',
  category: 'other',
  description: 'entry',
  ...patch,
});

const codes = (well: Well, today = TODAY): OperationWarningCode[] =>
  getOperationWarnings(well, today).map(w => w.code);

/** The v2.3 blocks of the spec's "Complete example". */
const specExample = (): Well =>
  makeWell({
    well_purpose: ['production'],
    pump_installations: [
      {
        id: 'pump-02',
        installed_at: '2024-11-18T16:00:00-03:00',
        type: 'submersible',
        intake_depth: 60,
      },
    ],
    permits: [
      {
        id: 'pmt-01',
        type: 'abstraction_permit',
        authority: 'SEMAS-PA',
        identifier: '1234/2025',
        issued_at: '2025-02-10',
        valid_until: '2029-02-10',
        flow_rate: 15,
        daily_operating_time: 20,
      },
    ],
    meters: [
      {
        id: 'hm-01',
        installed_at: '2025-04-02T09:00:00-03:00',
        removed_at: '2026-03-05T11:00:00-03:00',
        type: 'mechanical',
        max_reading: 99999,
      },
      {
        id: 'hm-02',
        installed_at: '2026-03-05T11:30:00-03:00',
        type: 'electromagnetic',
      },
    ],
    production: [
      reading('p1', '2025-04-02T09:00:00-03:00', 0),
      reading('p2', '2026-03-05T11:00:00-03:00', 81240),
      reading('p3', '2026-03-05T11:30:00-03:00', 0, { meter_id: 'hm-02' }),
      reading('p4', '2026-09-30T08:00:00-03:00', 52310, {
        meter_id: 'hm-02',
        source: 'telemetry',
      }),
    ],
    operating_regime: [
      {
        id: 'r1',
        effective_from: '2025-04-02T09:00:00-03:00',
        flow_rate: 14,
        daily_operating_time: 18,
        days_per_week: 7,
      },
    ],
    history_logs: [
      log({
        id: 'log-2',
        datetime: '2025-04-02T09:00:00-03:00',
        category: 'status_change',
        status: 'active',
      }),
    ],
  });

// ─── Shared helpers ───────────────────────────────────────────────────────────

describe('getRetractedIds', () => {
  it('retracts every link of a correction chain but the last', () => {
    const ids = getRetractedIds([
      { id: 'a' },
      { id: 'b', corrects: 'a' },
      { id: 'c', corrects: 'b' },
    ]);
    expect([...ids].sort()).toEqual(['a', 'b']);
  });

  it('returns an empty set when nothing is corrected', () => {
    expect(getRetractedIds([{ id: 'a' }]).size).toBe(0);
  });

  it('backs getRetractedEventIds', () => {
    const well = makeWell({
      hydrodynamic_events: [
        {
          id: 'e1',
          type: 'spot_measurement',
          datetime: '2025-01-01T00:00:00Z',
        },
        {
          id: 'e2',
          type: 'spot_measurement',
          datetime: '2025-01-02T00:00:00Z',
          corrects: 'e1',
        },
      ] as HydrodynamicEvent[],
    });
    expect([...getRetractedEventIds(well)]).toEqual(['e1']);
  });
});

describe('instantLocalDate', () => {
  it('keeps the date part in the offset the instant carries', () => {
    expect(instantLocalDate('2025-04-02T23:30:00-03:00')).toBe('2025-04-02');
    expect(instantLocalDate('2025-04-02T00:30:00+09:00')).toBe('2025-04-02');
  });
});

// ─── Production ledger ────────────────────────────────────────────────────────

describe('getEffectiveProduction', () => {
  it('drops retracted entries and preserves order', () => {
    const well = makeWell({
      production: [
        reading('a', '2025-01-01T00:00:00Z', 0),
        reading('b', '2025-01-02T00:00:00Z', 50),
        reading('c', '2025-01-02T00:00:00Z', 60, { corrects: 'b' }),
      ],
    });
    expect([...getRetractedProductionIds(well)]).toEqual(['b']);
    expect(getEffectiveProduction(well).map(p => p.id)).toEqual(['a', 'c']);
  });

  it('returns [] without a production block', () => {
    expect(getEffectiveProduction(makeWell())).toEqual([]);
  });
});

describe('getCurrentMeters', () => {
  it('returns open meters, newest installation first', () => {
    const well = makeWell({
      meters: [
        meter({ id: 'old', installed_at: '2024-01-01T00:00:00Z' }),
        meter({
          id: 'gone',
          installed_at: '2023-01-01T00:00:00Z',
          removed_at: '2023-06-01T00:00:00Z',
        }),
        meter({ id: 'new', installed_at: '2025-01-01T00:00:00Z' }),
      ],
    });
    expect(getCurrentMeters(well).map(m => m.id)).toEqual(['new', 'old']);
  });
});

describe('getMeterIntervals', () => {
  it('derives the difference between consecutive readings', () => {
    const well = makeWell({
      meters: [meter()],
      production: [
        reading('r2', '2025-02-01T00:00:00Z', 150),
        reading('r1', '2025-01-01T00:00:00Z', 100),
      ],
    });
    expect(getMeterIntervals(well)).toEqual([
      {
        meter_id: 'hm-01',
        from_id: 'r1',
        to_id: 'r2',
        start: '2025-01-01T00:00:00Z',
        end: '2025-02-01T00:00:00Z',
        volume: 50,
        rollover: false,
      },
    ]);
  });

  it('applies the rollover rule when the meter has max_reading', () => {
    const well = makeWell({
      meters: [meter({ max_reading: 99999 })],
      production: [
        reading('r1', '2025-01-01T00:00:00Z', 99000),
        reading('r2', '2025-02-01T00:00:00Z', 500),
      ],
    });
    const [interval] = getMeterIntervals(well);
    expect(interval?.volume).toBe(1499);
    expect(interval?.rollover).toBe(true);
  });

  it('marks a decrease without max_reading as unknown, never negative', () => {
    const well = makeWell({
      meters: [meter()],
      production: [
        reading('r1', '2025-01-01T00:00:00Z', 900),
        reading('r2', '2025-02-01T00:00:00Z', 100),
      ],
    });
    expect(getMeterIntervals(well)[0]?.volume).toBeNull();
  });

  it('orders identical instants by sequence', () => {
    const well = makeWell({
      meters: [meter()],
      production: [
        reading('b', '2025-01-01T00:00:00Z', 20, { sequence: 2 }),
        reading('a', '2025-01-01T00:00:00Z', 10, { sequence: 1 }),
      ],
    });
    const [interval] = getMeterIntervals(well);
    expect([interval?.from_id, interval?.to_id]).toEqual(['a', 'b']);
    expect(interval?.volume).toBe(10);
  });

  it('compares instants across offsets', () => {
    const well = makeWell({
      meters: [meter()],
      production: [
        reading('later', '2025-01-01T01:00:00-03:00', 30),
        reading('earlier', '2025-01-01T03:00:00Z', 10),
      ],
    });
    expect(getMeterIntervals(well)[0]?.from_id).toBe('earlier');
  });

  it('never computes volume across two meters', () => {
    const intervals = getMeterIntervals(specExample());
    expect(intervals.map(i => [i.meter_id, i.volume])).toEqual([
      ['hm-01', 81240],
      ['hm-02', 52310],
    ]);
  });

  it('skips retracted readings and unknown entry types', () => {
    const well = makeWell({
      meters: [meter()],
      production: [
        reading('r1', '2025-01-01T00:00:00Z', 0),
        reading('typo', '2025-01-15T00:00:00Z', 9999),
        reading('fix', '2025-01-15T00:00:00Z', 40, { corrects: 'typo' }),
        { id: 'x', type: 'x-flow', datetime: '2025-01-20T00:00:00Z' } as never,
        reading('r2', '2025-02-01T00:00:00Z', 100),
      ],
    });
    expect(getMeterIntervals(well).map(i => i.volume)).toEqual([40, 60]);
  });
});

// ─── Production totals ────────────────────────────────────────────────────────

describe('getProductionTotal', () => {
  it('matches the spec complete example (133 550 m³, swap unmetered)', () => {
    expect(getProductionTotal(specExample())).toEqual({
      metered: 133550,
      estimated: 0,
      total: 133550,
      reported: 0,
      unknown_intervals: 0,
    });
  });

  it('uses only the last link of a correction chain', () => {
    const well = makeWell({
      meters: [meter()],
      production: [
        reading('r1', '2025-01-01T00:00:00Z', 0),
        reading('a', '2025-02-01T00:00:00Z', 1000),
        reading('b', '2025-02-01T00:00:00Z', 500, { corrects: 'a' }),
        reading('c', '2025-02-01T00:00:00Z', 300, { corrects: 'b' }),
      ],
    });
    expect(getProductionTotal(well).metered).toBe(300);
  });

  it('counts estimated volumes only for time not covered by a meter', () => {
    const well = makeWell({
      meters: [meter()],
      production: [
        reading('r1', '2025-01-01T00:00:00Z', 0),
        reading('r2', '2025-01-11T00:00:00Z', 100),
        // Half of this period overlaps the meter interval.
        declared('d1', '2025-01-06T00:00:00Z', '2025-01-16T00:00:00Z', 50),
        // Fully outside meter coverage; method-less counts as estimated.
        declared('d2', '2025-03-01T00:00:00Z', '2025-03-31T00:00:00Z', 70, {
          method: 'estimated',
        }),
      ],
    });
    expect(getProductionTotal(well)).toEqual({
      metered: 100,
      estimated: 95,
      total: 195,
      reported: 0,
      unknown_intervals: 0,
    });
  });

  it('keeps reported volumes out of the total', () => {
    const well = makeWell({
      production: [
        declared('d1', '2025-01-01T00:00:00Z', '2025-02-01T00:00:00Z', 900, {
          method: 'reported',
        }),
      ],
    });
    expect(getProductionTotal(well)).toMatchObject({ total: 0, reported: 900 });
  });

  it('counts unknown intervals without adding volume', () => {
    const well = makeWell({
      meters: [meter()],
      production: [
        reading('r1', '2025-01-01T00:00:00Z', 900),
        reading('r2', '2025-02-01T00:00:00Z', 100),
        reading('r3', '2025-03-01T00:00:00Z', 150),
      ],
    });
    expect(getProductionTotal(well)).toMatchObject({
      metered: 50,
      unknown_intervals: 1,
    });
  });

  it('ignores declared volumes with an invalid period', () => {
    const well = makeWell({
      production: [
        declared('d1', '2025-02-01T00:00:00Z', '2025-01-01T00:00:00Z', 10),
      ],
    });
    expect(getProductionTotal(well).total).toBe(0);
  });

  it('is all zeros without production', () => {
    expect(getProductionTotal(makeWell()).total).toBe(0);
  });
});

describe('getProductionByPeriod', () => {
  it('allocates meter intervals to the local date of their end', () => {
    const well = specExample();
    expect(getProductionByPeriod(well, 'year')).toEqual([
      {
        period: '2026',
        metered: 133550,
        estimated: 0,
        total: 133550,
        reported: 0,
        unknown_intervals: 0,
      },
    ]);
    expect(
      getProductionByPeriod(well, 'month').map(b => [b.period, b.metered]),
    ).toEqual([
      ['2026-03', 81240],
      ['2026-09', 52310],
    ]);
    expect(getProductionByPeriod(well, 'day').map(b => b.period)).toEqual([
      '2026-03-05',
      '2026-09-30',
    ]);
  });

  it('uses the local date as written, not UTC', () => {
    const well = makeWell({
      meters: [meter({ installed_at: '2024-12-01T00:00:00-03:00' })],
      production: [
        reading('r1', '2024-12-01T00:00:00-03:00', 0),
        // 2025-01-01T01:30Z, but still 31 Dec at the site.
        reading('r2', '2024-12-31T22:30:00-03:00', 10),
      ],
    });
    expect(getProductionByPeriod(well, 'year')[0]?.period).toBe('2024');
  });

  it('allocates declared volumes to the local date of period_end, ascending', () => {
    const well = makeWell({
      production: [
        declared('d2', '2025-03-01T00:00:00Z', '2025-03-31T00:00:00Z', 30, {
          method: 'reported',
        }),
        declared('d1', '2025-01-01T00:00:00Z', '2025-01-31T00:00:00Z', 20),
      ],
    });
    expect(
      getProductionByPeriod(well, 'month').map(b => [
        b.period,
        b.estimated,
        b.reported,
      ]),
    ).toEqual([
      ['2025-01', 20, 0],
      ['2025-03', 0, 30],
    ]);
  });
});

// ─── Operating regime and status ──────────────────────────────────────────────

describe('getCurrentRegime', () => {
  const regimes: OperatingRegime[] = [
    { id: 'r2', effective_from: '2026-01-01T00:00:00-03:00', flow_rate: 12 },
    { id: 'r1', effective_from: '2025-01-01T00:00:00-03:00', flow_rate: 10 },
    { id: 'r3', effective_from: '2027-01-01T00:00:00-03:00', flow_rate: 14 },
  ];
  const well = makeWell({ operating_regime: regimes });

  it('returns the latest regime not after the given instant', () => {
    expect(getCurrentRegime(well, new Date('2026-06-01T00:00:00Z'))?.id).toBe(
      'r2',
    );
    expect(getCurrentRegime(well, new Date('2025-06-01T00:00:00Z'))?.id).toBe(
      'r1',
    );
  });

  it('includes a regime taking effect exactly at the instant', () => {
    expect(getCurrentRegime(well, new Date('2026-01-01T03:00:00Z'))?.id).toBe(
      'r2',
    );
  });

  it('returns undefined before the first regime', () => {
    expect(getCurrentRegime(well, new Date('2020-01-01T00:00:00Z'))).toBe(
      undefined,
    );
    expect(getCurrentRegime(makeWell())).toBeUndefined();
  });
});

describe('getCurrentWellStatus', () => {
  it('is unknown without a status_change entry', () => {
    const well = makeWell({ history_logs: [log({ category: 'maintenance' })] });
    expect(getCurrentWellStatus(well)).toBeUndefined();
    expect(getCurrentWellStatusEntry(well)).toBeUndefined();
  });

  it('reads the status_change with the latest instant', () => {
    const well = makeWell({
      history_logs: [
        log({
          id: 'b',
          category: 'status_change',
          status: 'inactive',
          datetime: '2025-06-01T00:00:00Z',
        }),
        log({
          id: 'a',
          category: 'status_change',
          status: 'active',
          // Later instant despite the earlier wall-clock date in UTC terms.
          datetime: '2025-05-31T23:00:00-03:00',
        }),
      ],
    });
    expect(getCurrentWellStatus(well)).toBe('active');
    expect(getCurrentWellStatusEntry(well)?.id).toBe('a');
  });

  it('reads the spec example as active', () => {
    expect(getCurrentWellStatus(specExample())).toBe('active');
  });
});

// ─── Warnings ─────────────────────────────────────────────────────────────────

describe('getOperationWarnings', () => {
  it('emits nothing for the spec complete example', () => {
    expect(getOperationWarnings(specExample(), TODAY)).toEqual([]);
  });

  it('flags a meter removed before it was installed', () => {
    const well = makeWell({
      meters: [meter({ removed_at: '2024-12-31T00:00:00Z' })],
    });
    expect(getOperationWarnings(well, TODAY)).toContainEqual({
      code: 'meter_removed_before_installed',
      ids: ['hm-01'],
    });
  });

  it('flags overlapping installations but not touching ones', () => {
    const overlapping = makeWell({
      meters: [
        meter({ id: 'a' }),
        meter({ id: 'b', installed_at: '2025-06-01T00:00:00Z' }),
      ],
    });
    expect(getOperationWarnings(overlapping, TODAY)).toContainEqual({
      code: 'overlapping_meters',
      ids: ['a', 'b'],
    });
    expect(codes(specExample())).not.toContain('overlapping_meters');
    const touching = makeWell({
      meters: [
        meter({ id: 'a', removed_at: '2025-06-01T00:00:00Z' }),
        meter({ id: 'b', installed_at: '2025-06-01T00:00:00Z' }),
      ],
    });
    expect(codes(touching)).not.toContain('overlapping_meters');
  });

  it('flags duplicate meter ids', () => {
    const well = makeWell({
      meters: [
        meter({ removed_at: '2025-02-01T00:00:00Z' }),
        meter({ installed_at: '2025-03-01T00:00:00Z' }),
      ],
    });
    expect(getOperationWarnings(well, TODAY)).toContainEqual({
      code: 'duplicate_meter_id',
      ids: ['hm-01'],
    });
  });

  it('flags readings of an unknown meter', () => {
    const well = makeWell({
      production: [
        reading('p1', '2025-01-01T00:00:00Z', 0, { meter_id: 'nope' }),
      ],
    });
    expect(getOperationWarnings(well, TODAY)).toContainEqual({
      code: 'reading_meter_unresolved',
      ids: ['p1', 'nope'],
    });
  });

  it('flags readings outside the installation window, edges excluded', () => {
    const well = makeWell({
      meters: [meter({ removed_at: '2025-06-01T00:00:00Z' })],
      production: [
        reading('before', '2024-12-31T00:00:00Z', 0),
        reading('edge-in', '2025-01-01T00:00:00Z', 0),
        reading('edge-out', '2025-06-01T00:00:00Z', 10),
        reading('after', '2025-07-01T00:00:00Z', 20),
      ],
    });
    const flagged = getOperationWarnings(well, TODAY)
      .filter(w => w.code === 'reading_outside_installation')
      .map(w => w.ids);
    expect(flagged).toEqual([
      ['before', 'hm-01'],
      ['after', 'hm-01'],
    ]);
  });

  it('flags an unknown rollover', () => {
    const well = makeWell({
      meters: [meter()],
      production: [
        reading('r1', '2025-01-01T00:00:00Z', 900),
        reading('r2', '2025-02-01T00:00:00Z', 100),
      ],
    });
    expect(getOperationWarnings(well, TODAY)).toContainEqual({
      code: 'reading_rollover_unknown',
      ids: ['r1', 'r2', 'hm-01'],
    });
  });

  it('flags duplicate production ids', () => {
    const well = makeWell({
      meters: [meter()],
      production: [
        reading('p1', '2025-01-01T00:00:00Z', 0),
        reading('p1', '2025-02-01T00:00:00Z', 10),
      ],
    });
    expect(codes(well)).toContain('duplicate_production_id');
  });

  it('flags unresolved corrects and correction cycles', () => {
    const well = makeWell({
      production: [
        declared('a', '2025-01-01T00:00:00Z', '2025-02-01T00:00:00Z', 1, {
          corrects: 'b',
        }),
        declared('b', '2025-01-01T00:00:00Z', '2025-02-01T00:00:00Z', 1, {
          corrects: 'a',
        }),
        declared('c', '2025-01-01T00:00:00Z', '2025-02-01T00:00:00Z', 1, {
          corrects: 'ghost',
        }),
      ],
    });
    const warnings = getOperationWarnings(well, TODAY);
    expect(warnings).toContainEqual({
      code: 'corrects_unresolved',
      ids: ['c'],
    });
    expect(
      warnings.filter(w => w.code === 'corrects_cycle').map(w => w.ids),
    ).toEqual([['a'], ['b']]);
  });

  it('flags a declared period that does not end after it starts', () => {
    const well = makeWell({
      production: [
        declared('d1', '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z', 5),
      ],
    });
    expect(getOperationWarnings(well, TODAY)).toContainEqual({
      code: 'declared_period_invalid',
      ids: ['d1'],
    });
  });

  it('flags estimated volumes overlapping a meter, not reported ones', () => {
    const well = makeWell({
      meters: [meter()],
      production: [
        reading('r1', '2025-01-01T00:00:00Z', 0),
        reading('r2', '2025-01-11T00:00:00Z', 100),
        declared('est', '2025-01-06T00:00:00Z', '2025-01-16T00:00:00Z', 50),
        declared('rep', '2025-01-06T00:00:00Z', '2025-01-16T00:00:00Z', 50, {
          method: 'reported',
        }),
        declared('out', '2025-02-01T00:00:00Z', '2025-02-10T00:00:00Z', 50),
      ],
    });
    const flagged = getOperationWarnings(well, TODAY)
      .filter(w => w.code === 'estimated_overlaps_meter')
      .map(w => w.ids);
    expect(flagged).toEqual([['est']]);
  });

  it('flags duplicate regime ids and effective_from instants', () => {
    const well = makeWell({
      operating_regime: [
        { id: 'r1', effective_from: '2025-01-01T00:00:00-03:00' },
        { id: 'r1', effective_from: '2025-01-01T03:00:00Z' },
      ],
    });
    const warnings = getOperationWarnings(well, TODAY);
    expect(warnings).toContainEqual({
      code: 'duplicate_regime_id',
      ids: ['r1'],
    });
    expect(warnings).toContainEqual({
      code: 'regime_duplicate_effective_from',
      ids: ['r1', 'r1'],
    });
  });

  describe('regime_exceeds_permit', () => {
    const permit: Permit = {
      id: 'pmt-01',
      type: 'abstraction_permit',
      authority: 'SEMAS-PA',
      identifier: '1',
      issued_at: '2025-01-01',
      valid_until: '2027-01-01',
      flow_rate: 15,
      daily_operating_time: 20,
    };

    it('flags the regime in force above the active permit', () => {
      const well = makeWell({
        permits: [permit],
        operating_regime: [
          {
            id: 'old',
            effective_from: '2025-01-01T00:00:00-03:00',
            flow_rate: 30,
          },
          {
            id: 'now',
            effective_from: '2026-01-01T00:00:00-03:00',
            flow_rate: 14,
            daily_operating_time: 22,
          },
        ],
      });
      expect(
        getOperationWarnings(well, TODAY).filter(
          w => w.code === 'regime_exceeds_permit',
        ),
      ).toEqual([{ code: 'regime_exceeds_permit', ids: ['now', 'pmt-01'] }]);
    });

    it('ignores expired permits and regimes within limits', () => {
      const regime: OperatingRegime = {
        id: 'r',
        effective_from: '2025-01-01T00:00:00-03:00',
        flow_rate: 30,
      };
      const expired = makeWell({
        permits: [{ ...permit, valid_until: '2025-12-31' }],
        operating_regime: [regime],
      });
      expect(codes(expired)).not.toContain('regime_exceeds_permit');
      const within = makeWell({
        permits: [permit],
        operating_regime: [{ ...regime, flow_rate: 15 }],
      });
      expect(codes(within)).not.toContain('regime_exceeds_permit');
    });
  });

  it('flags category-specific fields on other categories', () => {
    const well = makeWell({
      hydrodynamic_events: [
        {
          id: 'e1',
          type: 'spot_measurement',
          datetime: '2025-01-01T00:00:00Z',
        },
      ] as HydrodynamicEvent[],
      history_logs: [
        log({ id: 'm', category: 'other', maintenance_type: 'cleaning' }),
        log({ id: 's', category: 'maintenance', status: 'active' }),
        log({
          id: 'p',
          category: 'status_change',
          status: 'active',
          pump_installation_id: 'x',
        }),
        log({
          id: 'ok',
          category: 'maintenance',
          maintenance_type: 'pump_test',
          hydrodynamic_event_ids: ['e1'],
        }),
      ],
    });
    const flagged = getOperationWarnings(well, TODAY)
      .filter(w => w.code === 'log_category_field_mismatch')
      .map(w => w.ids[0]);
    expect(flagged).toEqual(['m', 's', 'p']);
  });

  it('flags unresolved pump, meter and event references', () => {
    const well = makeWell({
      meters: [meter()],
      history_logs: [
        log({
          id: 'a',
          category: 'maintenance',
          maintenance_type: 'pump_service',
          pump_installation_id: 'nope',
        }),
        log({
          id: 'b',
          category: 'maintenance',
          maintenance_type: 'meter_calibration',
          meter_id: 'hm-01',
        }),
        log({
          id: 'c',
          category: 'maintenance',
          maintenance_type: 'pump_test',
          hydrodynamic_event_ids: ['nope'],
        }),
      ],
    });
    const flagged = getOperationWarnings(well, TODAY)
      .filter(w => w.code === 'log_reference_unresolved')
      .map(w => w.ids[0]);
    expect(flagged).toEqual(['a', 'c']);
  });

  it('accepts event and sample links on every category', () => {
    const well = makeWell({
      hydrodynamic_events: [
        {
          id: 'e1',
          type: 'spot_measurement',
          datetime: '2025-01-01T00:00:00Z',
        },
      ] as HydrodynamicEvent[],
      water_samples: [
        {
          id: 'ws1',
          datetime: '2025-01-01T00:00:00Z',
          sample_type: 'routine',
          results: [
            { parameter: { code: 'ph', vocabulary: 'welldot' }, value: 7 },
          ],
        },
      ],
      history_logs: [
        log({
          id: 'maint',
          category: 'maintenance',
          maintenance_type: 'water_sampling',
          sample_ids: ['ws1'],
        }),
        log({ id: 'insp', category: 'inspection', sample_ids: ['ws1'] }),
        log({
          id: 'inc',
          category: 'incident',
          hydrodynamic_event_ids: ['e1'],
          sample_ids: ['ws1'],
        }),
      ],
    });
    const codes = getOperationWarnings(well, TODAY).map(w => w.code);
    expect(codes).not.toContain('log_category_field_mismatch');
    expect(codes).not.toContain('log_reference_unresolved');
  });

  it('flags an unresolved id in sample_ids', () => {
    const well = makeWell({
      water_samples: [
        {
          id: 'ws1',
          datetime: '2025-01-01T00:00:00Z',
          sample_type: 'routine',
          results: [
            { parameter: { code: 'ph', vocabulary: 'welldot' }, value: 7 },
          ],
        },
      ],
      history_logs: [
        log({
          id: 'ok',
          category: 'maintenance',
          maintenance_type: 'water_sampling',
          sample_ids: ['ws1'],
        }),
        log({
          id: 'missing',
          category: 'maintenance',
          maintenance_type: 'water_sampling',
          sample_ids: ['ws1', 'ws-nope'],
        }),
        log({ id: 'untyped', category: 'maintenance', sample_ids: ['ws1'] }),
      ],
    });
    const warnings = getOperationWarnings(well, TODAY);
    expect(
      warnings
        .filter(w => w.code === 'log_reference_unresolved')
        .map(w => w.ids[0]),
    ).toEqual(['missing']);
    // Links are not maintenance fields: they don't call for maintenance_type.
    expect(warnings.filter(w => w.code === 'missing_maintenance_type')).toEqual(
      [],
    );
  });

  it('flags entries dated after a decommission still in force', () => {
    const closed = makeWell({
      history_logs: [
        log({
          id: 's1',
          category: 'status_change',
          status: 'decommissioned',
          datetime: '2025-01-01T00:00:00Z',
        }),
        log({
          id: 's2',
          category: 'status_change',
          status: 'abandoned',
          datetime: '2025-03-01T00:00:00Z',
        }),
        log({
          id: 'late',
          category: 'inspection',
          datetime: '2025-02-01T00:00:00Z',
        }),
        log({
          id: 'early',
          category: 'inspection',
          datetime: '2024-12-01T00:00:00Z',
        }),
      ],
    });
    const flagged = getOperationWarnings(closed, TODAY)
      .filter(w => w.code === 'log_after_decommission')
      .map(w => w.ids[0]);
    expect(flagged).toEqual(['late']);

    const reopened = makeWell({
      history_logs: [
        log({
          id: 's1',
          category: 'status_change',
          status: 'decommissioned',
          datetime: '2025-01-01T00:00:00Z',
        }),
        log({
          id: 's2',
          category: 'status_change',
          status: 'active',
          datetime: '2025-03-01T00:00:00Z',
        }),
        log({
          id: 'late',
          category: 'inspection',
          datetime: '2025-04-01T00:00:00Z',
        }),
      ],
    });
    expect(codes(reopened)).not.toContain('log_after_decommission');
  });

  it('requires maintenance_type only on structured maintenance entries', () => {
    const well = makeWell({
      meters: [meter()],
      history_logs: [
        log({ id: 'legacy', category: 'maintenance' }),
        log({ id: 'structured', category: 'maintenance', meter_id: 'hm-01' }),
      ],
    });
    expect(
      getOperationWarnings(well, TODAY).filter(
        w => w.code === 'missing_maintenance_type',
      ),
    ).toEqual([{ code: 'missing_maintenance_type', ids: ['structured'] }]);
  });

  it('flags a status_change without status', () => {
    const well = makeWell({
      history_logs: [log({ id: 's', category: 'status_change' })],
    });
    expect(getOperationWarnings(well, TODAY)).toContainEqual({
      code: 'missing_status',
      ids: ['s'],
    });
    expect(getCurrentWellStatus(well)).toBeUndefined();
  });

  it('flags an analysis that uses a retracted event, naming both ids', () => {
    const well = makeWell({
      hydrodynamic_events: [
        {
          id: 'e1',
          type: 'spot_measurement',
          datetime: '2025-01-01T00:00:00Z',
        },
        {
          id: 'e2',
          type: 'spot_measurement',
          datetime: '2025-01-02T00:00:00Z',
          corrects: 'e1',
        },
      ] as HydrodynamicEvent[],
      aquifer_analysis: [
        {
          id: 'an-1',
          datetime: '2025-02-01T00:00:00Z',
          source_event_ids: ['e1', 'e2'],
          static_level_source_id: 'e1',
        } as AquiferAnalysis,
      ],
    });
    expect(
      getOperationWarnings(well, TODAY).filter(
        w => w.code === 'analysis_uses_retracted_event',
      ),
    ).toEqual([{ code: 'analysis_uses_retracted_event', ids: ['an-1', 'e1'] }]);
  });
});
