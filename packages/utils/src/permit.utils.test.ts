import { describe, expect, it } from 'vitest';

import type {
  ConditionFulfillment,
  Permit,
  PermitCondition,
  Well,
} from '@welldot/core';

import {
  addDateDuration,
  getConditionDeadlineStates,
  getConditionDeadlines,
  getConditionFulfillments,
  getOverduePermitHistory,
  getPermitEffectiveEnd,
  getPermitHistory,
  getPermitIdentifier,
  getPermitStatus,
  getPermitTimeline,
  getPermitWarnings,
  isPermitGranted,
  parseDateDuration,
  todayCalendarDate,
} from './permit.utils';

function makeWell(permits: Permit[], extra: Partial<Well> = {}): Well {
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
    permits,
    ...extra,
  };
}

const base = (patch: Partial<Permit> = {}): Permit => ({
  id: 'pmt-01',
  type: 'abstraction_permit',
  authority: 'SEMAS-PA',
  identifier: '1234/2025',
  ...patch,
});

// ─── Date helpers ─────────────────────────────────────────────────────────────

describe('parseDateDuration', () => {
  it('parses date components', () => {
    expect(parseDateDuration('P1Y6M')).toEqual({
      years: 1,
      months: 6,
      weeks: 0,
      days: 0,
    });
    expect(parseDateDuration('P90D')?.days).toBe(90);
    expect(parseDateDuration('P2W')?.weeks).toBe(2);
  });

  it('rejects time components and empty durations', () => {
    expect(parseDateDuration('PT12H')).toBeUndefined();
    expect(parseDateDuration('P1DT1H')).toBeUndefined();
    expect(parseDateDuration('P')).toBeUndefined();
    expect(parseDateDuration('90D')).toBeUndefined();
  });
});

describe('addDateDuration', () => {
  it('clamps to the last day of shorter months', () => {
    const month = parseDateDuration('P1M')!;
    expect(addDateDuration('2025-01-31', month)).toBe('2025-02-28');
    expect(addDateDuration('2024-01-31', month)).toBe('2024-02-29');
    expect(addDateDuration('2025-01-31', month, 2)).toBe('2025-03-31');
  });

  it('adds days across month and year boundaries', () => {
    expect(addDateDuration('2025-02-10', parseDateDuration('P90D')!)).toBe(
      '2025-05-11',
    );
    expect(addDateDuration('2025-12-31', parseDateDuration('P1D')!)).toBe(
      '2026-01-01',
    );
  });

  it('handles negative multipliers', () => {
    expect(addDateDuration('2025-03-01', parseDateDuration('P1D')!, -1)).toBe(
      '2025-02-28',
    );
  });
});

describe('todayCalendarDate', () => {
  it('formats the local date', () => {
    expect(todayCalendarDate(new Date(2026, 0, 5, 23, 0))).toBe('2026-01-05');
  });
});

// ─── Status ───────────────────────────────────────────────────────────────────

describe('getPermitStatus', () => {
  const permit = base({
    issued_at: '2025-02-10',
    valid_until: '2029-02-10',
  });

  it('is not_yet_valid before the start date', () => {
    expect(getPermitStatus(makeWell([permit]), permit, '2025-02-09')).toBe(
      'not_yet_valid',
    );
  });

  it('prefers valid_from over issued_at as start date', () => {
    const p = base({ issued_at: '2025-01-01', valid_from: '2025-03-01' });
    expect(getPermitStatus(makeWell([p]), p, '2025-02-01')).toBe(
      'not_yet_valid',
    );
  });

  it('returns a stored administrative status other than granted as-is', () => {
    for (const status of [
      'requested',
      'suspended',
      'revoked',
      'denied',
      'withdrawn',
    ] as const) {
      const p = { ...permit, status };
      expect(getPermitStatus(makeWell([p]), p, '2026-01-01')).toBe(status);
    }
  });

  it('derives the date status when granted, even if superseded', () => {
    const p = { ...permit, status: 'granted' as const };
    expect(getPermitStatus(makeWell([p]), p, '2026-01-01')).toBe('active');
    const suspended = { ...permit, status: 'suspended' as const };
    const renewal = base({ id: 'pmt-02', supersedes: 'pmt-01' });
    expect(
      getPermitStatus(makeWell([suspended, renewal]), suspended, '2026-01-01'),
    ).toBe('suspended');
  });

  it('is active through valid_until, inclusive', () => {
    expect(getPermitStatus(makeWell([permit]), permit, '2029-02-10')).toBe(
      'active',
    );
  });

  it('is active with no fixed expiry', () => {
    const p = base({ issued_at: '2020-01-01' });
    expect(getPermitStatus(makeWell([p]), p, '2099-01-01')).toBe('active');
  });

  it('is expired after valid_until', () => {
    expect(getPermitStatus(makeWell([permit]), permit, '2029-02-11')).toBe(
      'expired',
    );
  });

  it('is active_pending_renewal when renewal was requested in time', () => {
    const p = { ...permit, renewal_requested_at: '2028-11-01' };
    expect(getPermitStatus(makeWell([p]), p, '2029-06-01')).toBe(
      'active_pending_renewal',
    );
  });

  it('is expired when the renewal request came after valid_until', () => {
    const p = { ...permit, renewal_requested_at: '2029-03-01' };
    expect(getPermitStatus(makeWell([p]), p, '2029-06-01')).toBe('expired');
  });

  it('is superseded when another permit supersedes it', () => {
    const renewal = base({
      id: 'pmt-02',
      valid_from: '2029-02-11',
      supersedes: 'pmt-01',
    });
    const well = makeWell([permit, renewal]);
    expect(getPermitStatus(well, 'pmt-01', '2026-01-01')).toBe('superseded');
    expect(getPermitStatus(well, 'pmt-02', '2029-03-01')).toBe('active');
  });

  it('returns undefined for an unknown id', () => {
    expect(getPermitStatus(makeWell([permit]), 'nope')).toBeUndefined();
  });
});

describe('getPermitEffectiveEnd', () => {
  const permit = base({ issued_at: '2025-02-10', valid_until: '2029-02-10' });

  it('is the day before the successor starts', () => {
    const renewal = base({
      id: 'pmt-02',
      valid_from: '2028-07-01',
      supersedes: 'pmt-01',
    });
    expect(
      getPermitEffectiveEnd(makeWell([permit, renewal]), permit, '2026-01-01'),
    ).toBe('2028-06-30');
  });

  it('is valid_until otherwise', () => {
    expect(getPermitEffectiveEnd(makeWell([permit]), permit)).toBe(
      '2029-02-10',
    );
  });

  it('is open while a renewal is pending', () => {
    const p = { ...permit, renewal_requested_at: '2028-12-01' };
    expect(
      getPermitEffectiveEnd(makeWell([p]), p, '2029-05-01'),
    ).toBeUndefined();
  });
});

// ─── Deadlines ────────────────────────────────────────────────────────────────

describe('getConditionDeadlines', () => {
  const permit = base({ issued_at: '2025-02-10', valid_until: '2029-02-10' });
  const well = makeWell([permit]);

  it('resolves due_after from the start date (one-time)', () => {
    expect(
      getConditionDeadlines(well, permit, {
        id: 'c1',
        description: 'meter',
        due_after: 'P90D',
      }),
    ).toEqual(['2025-05-11']);
  });

  it('recurs from first_due up to the effective end', () => {
    const deadlines = getConditionDeadlines(well, permit, {
      id: 'c2',
      description: 'report',
      first_due: '2025-07-31',
      recurrence: 'P6M',
    });
    expect(deadlines[0]).toBe('2025-07-31');
    expect(deadlines[1]).toBe('2026-01-31');
    expect(deadlines.at(-1)).toBe('2029-01-31');
    expect(deadlines).toHaveLength(8);
  });

  it('computes every deadline from the anchor (no drift)', () => {
    const p = base({ issued_at: '2025-01-01', valid_until: '2025-12-31' });
    expect(
      getConditionDeadlines(makeWell([p]), p, {
        id: 'c',
        description: 'monthly',
        first_due: '2025-01-31',
        recurrence: 'P1M',
        occurrences: 3,
      }),
    ).toEqual(['2025-01-31', '2025-02-28', '2025-03-31']);
  });

  it('stops at occurrences and last_due', () => {
    expect(
      getConditionDeadlines(well, permit, {
        id: 'c',
        description: 'level',
        due_after: 'P1M',
        recurrence: 'P1M',
        occurrences: 12,
      }),
    ).toHaveLength(12);
    expect(
      getConditionDeadlines(well, permit, {
        id: 'c',
        description: 'x',
        first_due: '2025-03-01',
        recurrence: 'P1M',
        last_due: '2025-05-15',
      }),
    ).toEqual(['2025-03-01', '2025-04-01', '2025-05-01']);
  });

  it('first_due wins over due_after', () => {
    expect(
      getConditionDeadlines(well, permit, {
        id: 'c',
        description: 'x',
        first_due: '2025-03-01',
        due_after: 'P90D',
      }),
    ).toEqual(['2025-03-01']);
  });

  it('returns [] for undated conditions or unresolvable due_after', () => {
    expect(
      getConditionDeadlines(well, permit, { id: 'c', description: 'x' }),
    ).toEqual([]);
    const noStart = base();
    expect(
      getConditionDeadlines(makeWell([noStart]), noStart, {
        id: 'c',
        description: 'x',
        due_after: 'P90D',
      }),
    ).toEqual([]);
  });

  it('uses the horizon when the permit has no end', () => {
    const p = base({ issued_at: '2025-01-01' });
    expect(
      getConditionDeadlines(
        makeWell([p]),
        p,
        { id: 'c', description: 'x', due_after: 'P1Y', recurrence: 'P1Y' },
        { horizon: '2028-06-01' },
      ),
    ).toEqual(['2026-01-01', '2027-01-01', '2028-01-01']);
  });

  it('stops at the day before a successor starts', () => {
    const renewal = base({
      id: 'pmt-02',
      valid_from: '2026-03-01',
      supersedes: 'pmt-01',
    });
    expect(
      getConditionDeadlines(makeWell([permit, renewal]), permit, {
        id: 'c',
        description: 'x',
        first_due: '2025-07-31',
        recurrence: 'P6M',
      }),
    ).toEqual(['2025-07-31', '2026-01-31']);
  });
});

describe('getConditionDeadlineStates', () => {
  // The complete example of the v2.3 spec.
  const fulfillment: ConditionFulfillment = {
    id: 'f1',
    datetime: '2025-04-02T10:00:00-03:00',
    due_date: '2025-05-11',
    description: 'Hidrômetro instalado',
  };
  const c1 = (fulfillments?: ConditionFulfillment[]): PermitCondition => ({
    id: 'c1',
    description: 'Instalar hidrômetro',
    category: 'meter_installation',
    due_after: 'P90D',
    ...(fulfillments && { fulfillments }),
  });
  const c2: PermitCondition = {
    id: 'c2',
    description: 'Relatório semestral',
    category: 'monitoring_report',
    first_due: '2025-07-31',
    recurrence: 'P6M',
  };
  const permitWith = (...conditions: PermitCondition[]) =>
    base({ issued_at: '2025-02-10', valid_until: '2029-02-10', conditions });
  const today = '2026-10-03';
  const statesOf = (
    condition: PermitCondition,
    patch: Partial<Permit> = {},
  ) => {
    const p = { ...permitWith(condition), ...patch };
    return getConditionDeadlineStates(makeWell([p]), p, condition, { today });
  };

  it('marks a matched deadline as fulfilled on time', () => {
    expect(statesOf(c1([fulfillment]))).toEqual([
      { due_date: '2025-05-11', status: 'fulfilled', fulfillment_id: 'f1' },
    ]);
  });

  it('marks past unmatched deadlines overdue and future ones upcoming', () => {
    const states = statesOf(c2);
    expect(states.slice(0, 3).map(s => s.status)).toEqual([
      'overdue',
      'overdue',
      'overdue',
    ]);
    expect(states[3]).toEqual({ due_date: '2027-01-31', status: 'upcoming' });
  });

  it('flags a fulfillment recorded after the deadline as late', () => {
    const late = { ...fulfillment, datetime: '2025-05-12T08:00:00-03:00' };
    expect(statesOf(c1([late]))[0]!.status).toBe('fulfilled_late');
  });

  it('uses the local date written in the fulfillment, not UTC', () => {
    // 22:00 at -03:00 is already the next day in UTC.
    const lastMinute = {
      ...fulfillment,
      datetime: '2025-05-11T22:00:00-03:00',
    };
    expect(statesOf(c1([lastMinute]))[0]!.status).toBe('fulfilled');
  });

  it('reports undated conditions only once fulfilled', () => {
    const undated: PermitCondition = {
      id: 'c3',
      description: 'Laje sanitária',
    };
    expect(statesOf(undated)).toEqual([]);
    const done = {
      ...undated,
      fulfillments: [{ ...fulfillment, id: 'f3', due_date: undefined }],
    };
    expect(statesOf(done)).toEqual([
      { status: 'fulfilled', fulfillment_id: 'f3' },
    ]);
  });

  it('generates nothing for a permit that was never granted', () => {
    for (const status of ['requested', 'denied', 'withdrawn'] as const) {
      expect(statesOf(c2, { status })).toEqual([]);
    }
  });

  it('stops at today for a suspended or revoked permit', () => {
    for (const status of ['suspended', 'revoked'] as const) {
      const states = statesOf(c2, { status });
      expect(states[states.length - 1]!.due_date).toBe('2026-07-31');
      expect(states.every(s => s.status === 'overdue')).toBe(true);
    }
  });
});

describe('getConditionFulfillments', () => {
  it('sorts fulfillments oldest first', () => {
    const c: PermitCondition = {
      id: 'c',
      description: 'x',
      fulfillments: [
        { id: 'b', datetime: '2025-06-01T00:00:00Z' },
        { id: 'a', datetime: '2025-01-01T00:00:00Z' },
      ],
    };
    expect(getConditionFulfillments(c).map(f => f.id)).toEqual(['a', 'b']);
    expect(getConditionFulfillments({ id: 'd', description: 'y' })).toEqual([]);
  });
});

// ─── Identity, history & timeline ────────────────────────────────────────────

describe('isPermitGranted / getPermitIdentifier', () => {
  it('treats an absent status as granted', () => {
    expect(isPermitGranted(base())).toBe(true);
    expect(isPermitGranted(base({ status: 'granted' }))).toBe(true);
    expect(isPermitGranted(base({ status: 'requested' }))).toBe(false);
  });

  it('falls back to the request identifier', () => {
    expect(getPermitIdentifier(base())).toBe('1234/2025');
    expect(
      getPermitIdentifier(
        base({ identifier: undefined, request_identifier: 'PRT-9' }),
      ),
    ).toBe('PRT-9');
    expect(getPermitIdentifier(base({ identifier: undefined }))).toBe(
      undefined,
    );
  });
});

describe('getPermitHistory / getOverduePermitHistory', () => {
  const p = base({
    history: [
      {
        id: 'fee',
        date: '2025-02-01',
        description: 'Taxa',
        due_date: '2025-03-01',
      },
      { id: 'filing', date: '2025-01-01', description: 'Protocolo' },
      {
        id: 'paid',
        date: '2025-02-02',
        description: 'Taxa 2',
        due_date: '2025-02-10',
        done: true,
      },
    ],
  });

  it('sorts history by date', () => {
    expect(getPermitHistory(p).map(h => h.id)).toEqual([
      'filing',
      'fee',
      'paid',
    ]);
  });

  it('lists past-due steps that are not done', () => {
    expect(getOverduePermitHistory(p, '2025-03-01')).toEqual([]);
    expect(getOverduePermitHistory(p, '2025-03-02').map(h => h.id)).toEqual([
      'fee',
    ]);
  });
});

describe('getPermitTimeline', () => {
  it('merges history and fulfillments, newest first, by local date', () => {
    const p = base({
      history: [
        { id: 'h1', date: '2025-01-01', description: 'Protocolo' },
        { id: 'h2', date: '2025-05-11', description: 'Notificação' },
      ],
      conditions: [
        {
          id: 'c1',
          description: 'x',
          fulfillments: [
            // Local date 2025-05-10 although UTC is already 2025-05-11.
            { id: 'f1', datetime: '2025-05-10T22:00:00-03:00' },
          ],
        },
      ],
    });
    const timeline = getPermitTimeline(p);
    expect(timeline.map(i => i.date)).toEqual([
      '2025-05-11',
      '2025-05-10',
      '2025-01-01',
    ]);
    expect(timeline[1]).toMatchObject({
      kind: 'fulfillment',
      condition: { id: 'c1' },
      fulfillment: { id: 'f1' },
    });
  });
});

// ─── Warnings ─────────────────────────────────────────────────────────────────

describe('getPermitWarnings', () => {
  const codes = (well: Well) =>
    getPermitWarnings(well, '2026-01-01').map(w => w.code);

  it('returns no warnings for a clean permit', () => {
    expect(
      codes(
        makeWell([
          base({ issued_at: '2025-01-01', valid_until: '2029-01-01' }),
        ]),
      ),
    ).toEqual([]);
  });

  it('flags valid_until before the start date', () => {
    expect(
      codes(
        makeWell([
          base({ valid_from: '2025-01-01', valid_until: '2024-01-01' }),
        ]),
      ),
    ).toContain('valid_until_before_valid_from');
  });

  it('flags unresolved and cyclic supersedes', () => {
    expect(codes(makeWell([base({ supersedes: 'ghost' })]))).toContain(
      'supersedes_unresolved',
    );
    const a = base({ id: 'a', supersedes: 'b' });
    const b = base({ id: 'b', supersedes: 'a' });
    expect(codes(makeWell([a, b]))).toContain('supersedes_cycle');
  });

  it('flags overlapping permits of the same type, not superseded ones', () => {
    const a = base({
      id: 'a',
      valid_from: '2025-01-01',
      valid_until: '2027-01-01',
    });
    const b = base({
      id: 'b',
      valid_from: '2026-01-01',
      valid_until: '2028-01-01',
    });
    expect(codes(makeWell([a, b]))).toContain('overlapping_validity');
    expect(codes(makeWell([a, { ...b, supersedes: 'a' }]))).not.toContain(
      'overlapping_validity',
    );
    expect(codes(makeWell([a, { ...b, type: 'registration' }]))).not.toContain(
      'overlapping_validity',
    );
  });

  it('flags operating times and monthly values', () => {
    expect(codes(makeWell([base({ daily_operating_time: 25 })]))).toContain(
      'daily_operating_time_out_of_range',
    );
    const p = base({
      flow_rate: 10,
      daily_operating_time: 20,
      monthly_schedule: [
        { month: 1, flow_rate: 12 },
        { month: 1, daily_operating_time: 18 },
      ],
      volume_limits: [
        { period: 'annual', volume: 1 },
        { period: 'annual', volume: 2 },
      ],
    });
    expect(codes(makeWell([p]))).toEqual(
      expect.arrayContaining([
        'monthly_above_max',
        'duplicate_month',
        'duplicate_volume_period',
      ]),
    );
  });

  it('flags condition issues', () => {
    const p = base({
      issued_at: '2025-01-01',
      conditions: [
        {
          id: 'c',
          description: 'x',
          first_due: '2025-02-01',
          due_after: 'P1M',
        },
        { id: 'c', description: 'y', recurrence: 'PT1H' },
      ],
    });
    expect(codes(makeWell([p]))).toEqual(
      expect.arrayContaining([
        'duplicate_condition_id',
        'condition_due_conflict',
        'invalid_duration',
      ]),
    );
  });

  it('flags fulfillments that match no deadline or reference', () => {
    const fulfillments: ConditionFulfillment[] = [
      { id: 'ok', datetime: '2025-03-01T10:00:00Z', due_date: '2025-04-01' },
      {
        id: 'bad-date',
        datetime: '2025-03-01T10:00:00Z',
        due_date: '2025-04-02',
      },
      { id: 'no-date', datetime: '2025-03-01T10:00:00Z' },
      {
        id: 'ghost-sample',
        datetime: '2025-03-01T10:00:00Z',
        due_date: '2025-04-01',
        sample_id: 'ghost',
      },
    ];
    const p = base({
      issued_at: '2025-01-01',
      conditions: [
        { id: 'c1', description: 'x', due_after: 'P90D', fulfillments },
        {
          id: 'c2',
          description: 'undated',
          fulfillments: [
            {
              id: 'dated',
              datetime: '2025-03-01T10:00:00Z',
              due_date: '2025-04-01',
            },
          ],
        },
      ],
    });
    const warnings = getPermitWarnings(makeWell([p]), '2026-01-01');
    expect(
      warnings
        .filter(w => w.code === 'unmatched_fulfillment')
        .map(w => w.fulfillment_id),
    ).toEqual(['bad-date', 'no-date', 'dated']);
    expect(
      warnings
        .filter(w => w.code === 'fulfillment_reference_unresolved')
        .map(w => w.fulfillment_id),
    ).toEqual(['ghost-sample']);
  });

  it('flags duplicate history and fulfillment ids', () => {
    const p = base({
      history: [
        { id: 'h', date: '2025-01-01', description: 'a' },
        { id: 'h', date: '2025-01-02', description: 'b' },
      ],
      conditions: [
        {
          id: 'c',
          description: 'x',
          fulfillments: [
            { id: 'f', datetime: '2025-01-01T00:00:00Z' },
            { id: 'f', datetime: '2025-01-02T00:00:00Z' },
          ],
        },
      ],
    });
    expect(codes(makeWell([p]))).toEqual(
      expect.arrayContaining([
        'duplicate_history_id',
        'duplicate_fulfillment_id',
      ]),
    );
  });

  it('flags missing identifiers', () => {
    expect(codes(makeWell([base({ identifier: undefined })]))).toContain(
      'missing_identifier',
    );
    const requested = base({
      identifier: undefined,
      request_identifier: 'PRT-1',
      status: 'requested',
    });
    expect(codes(makeWell([requested]))).toEqual([]);
    expect(codes(makeWell([{ ...requested, status: 'granted' }]))).toContain(
      'granted_without_identifier',
    );
  });

  it('ignores non-granted permits for overlapping validity', () => {
    const a = base({ id: 'a', valid_from: '2025-01-01' });
    const b = base({ id: 'b', valid_from: '2025-06-01', status: 'requested' });
    expect(codes(makeWell([a, b]))).not.toContain('overlapping_validity');
  });
});
