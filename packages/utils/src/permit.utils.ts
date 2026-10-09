import type {
  ConditionFulfillment,
  Permit,
  PermitCondition,
  PermitHistoryEntry,
  VocabEntry,
  Well,
} from '@welldot/core';

import { PERMIT_ADMINISTRATIVE_STATUSES } from '@welldot/core';

import { instantLocalDate } from './shared.utils';

// ─── Calendar date helpers (.well v2.3) ──────────────────────────────────────
// Permit dates are calendar dates (`YYYY-MM-DD`), the local civil date at the
// well site. They are compared as strings and never turned into instants; the
// UTC arithmetic below is only a day counter.

const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_DURATION = /^P(?=\d)(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?$/;

/** Default look-ahead for deadlines of a permit with no end. */
const DEFAULT_HORIZON = 'P2Y';
/** Safety cap on generated deadlines per condition. */
const MAX_DEADLINES = 1000;

/** An ISO 8601 date duration split into its components. */
export type DateDuration = {
  years: number;
  months: number;
  weeks: number;
  days: number;
};

/**
 * Parses an ISO 8601 duration restricted to date components (`PnYnMnWnD`).
 * Returns `undefined` for anything else, including time components (`PT…`).
 */
export function parseDateDuration(value: string): DateDuration | undefined {
  const m = DATE_DURATION.exec(value);
  if (!m) return undefined;
  return {
    years: Number(m[1] ?? 0),
    months: Number(m[2] ?? 0),
    weeks: Number(m[3] ?? 0),
    days: Number(m[4] ?? 0),
  };
}

function parseCalendarDate(date: string) {
  const m = CALENDAR_DATE.exec(date);
  if (!m) return undefined;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

function formatCalendarDate(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/**
 * Adds `times` × `duration` to a calendar date. Years and months are applied
 * first; when the resulting day does not exist in the target month, the
 * month's last day is used. Weeks and days are then added. Returns
 * `undefined` for a malformed date.
 */
export function addDateDuration(
  date: string,
  duration: DateDuration,
  times = 1,
): string | undefined {
  const parsed = parseCalendarDate(date);
  if (!parsed) return undefined;
  const totalMonths =
    parsed.m - 1 + (duration.years * 12 + duration.months) * times;
  const y = parsed.y + Math.floor(totalMonths / 12);
  const m = (((totalMonths % 12) + 12) % 12) + 1;
  const d = Math.min(parsed.d, daysInMonth(y, m));
  const extraDays = (duration.weeks * 7 + duration.days) * times;
  if (!extraDays) return formatCalendarDate(y, m, d);
  const shifted = new Date(Date.UTC(y, m - 1, d + extraDays));
  return formatCalendarDate(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate(),
  );
}

function previousDay(date: string): string | undefined {
  return addDateDuration(date, { years: 0, months: 0, weeks: 0, days: -1 });
}

/** Today's local calendar date (`YYYY-MM-DD`) on this machine. */
export function todayCalendarDate(now: Date = new Date()): string {
  return formatCalendarDate(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate(),
  );
}

// ─── Permit status ───────────────────────────────────────────────────────────

export type PermitStatus =
  | 'requested'
  | 'suspended'
  | 'revoked'
  | 'denied'
  | 'withdrawn'
  | 'superseded'
  | 'not_yet_valid'
  | 'active'
  | 'active_pending_renewal'
  | 'expired';

const DERIVED_PERMIT_STATUSES: readonly VocabEntry<PermitStatus>[] = [
  { value: 'superseded', label: { en: 'Superseded', pt: 'Substituída' } },
  {
    value: 'not_yet_valid',
    label: { en: 'Not yet valid', pt: 'Ainda não vigente' },
  },
  { value: 'active', label: { en: 'Active', pt: 'Vigente' } },
  {
    value: 'active_pending_renewal',
    label: { en: 'Renewal pending', pt: 'Renovação em análise' },
  },
  { value: 'expired', label: { en: 'Expired', pt: 'Vencida' } },
];

/**
 * Every {@link PermitStatus} with en/pt labels, for `getVocabLabel` of
 * `@welldot/core`: the stored administrative statuses (minus `granted`,
 * which always resolves to a derived one) followed by the derived ones.
 */
export const PERMIT_STATUSES: readonly VocabEntry<PermitStatus>[] = [
  ...(PERMIT_ADMINISTRATIVE_STATUSES.filter(
    e => e.value !== 'granted',
  ) as VocabEntry<PermitStatus>[]),
  ...DERIVED_PERMIT_STATUSES,
];

/**
 * Administrative statuses under which a permit has no deadlines at all: it
 * was never granted.
 */
const NEVER_GRANTED: ReadonlySet<PermitStatus> = new Set([
  'requested',
  'denied',
  'withdrawn',
]);

/**
 * Administrative statuses that stop a granted permit on `today`: deadlines
 * already due remain, later ones are not generated.
 */
const HALTED: ReadonlySet<PermitStatus> = new Set(['suspended', 'revoked']);

/** Start date of a permit: `valid_from`, else `issued_at`. */
export function getPermitStartDate(permit: Permit): string | undefined {
  return permit.valid_from ?? permit.issued_at;
}

function findPermit(well: Well, permit: Permit | string): Permit | undefined {
  return typeof permit === 'string'
    ? well.permits?.find(p => p.id === permit)
    : permit;
}

/** The permit whose `supersedes` points to `permit`, if any. */
export function getSuccessorPermit(
  well: Well,
  permit: Permit,
): Permit | undefined {
  return well.permits?.find(
    p => p.id !== permit.id && p.supersedes === permit.id,
  );
}

/**
 * Derives the status of a permit (.well v2.3), evaluated on `today` (a local
 * calendar date at the well site), in order:
 *
 * 1. A stored administrative `status` other than `granted` (`requested`,
 *    `suspended`, `revoked`, `denied`, `withdrawn`) is returned as-is.
 * 2. Another permit `supersedes` it → `superseded`.
 * 3. `today` is before its start date → `not_yet_valid`.
 * 4. `valid_until` is absent, or `today` is on or before it → `active`.
 * 5. `renewal_requested_at` is on or before `valid_until` →
 *    `active_pending_renewal`.
 * 6. Otherwise → `expired`.
 *
 * Returns `undefined` when `permit` is an id that does not resolve.
 */
export function getPermitStatus(
  well: Well,
  permit: Permit | string,
  today: string = todayCalendarDate(),
): PermitStatus | undefined {
  const p = findPermit(well, permit);
  if (!p) return undefined;
  if (p.status && p.status !== 'granted') return p.status;
  if (getSuccessorPermit(well, p)) return 'superseded';
  const start = getPermitStartDate(p);
  if (start && today < start) return 'not_yet_valid';
  if (!p.valid_until || today <= p.valid_until) return 'active';
  if (p.renewal_requested_at && p.renewal_requested_at <= p.valid_until) {
    return 'active_pending_renewal';
  }
  return 'expired';
}

/** Whether a permit's administrative `status` is `granted` (or absent). */
export function isPermitGranted(permit: Permit): boolean {
  return !permit.status || permit.status === 'granted';
}

/**
 * Display identifier of a permit: `identifier`, else `request_identifier`,
 * else `undefined`.
 */
export function getPermitIdentifier(permit: Permit): string | undefined {
  return permit.identifier ?? permit.request_identifier;
}

/**
 * Effective end date of a permit: the day before its successor's start date
 * when superseded; otherwise `valid_until`; none while the status is
 * `active_pending_renewal` or when there is no fixed expiry.
 */
export function getPermitEffectiveEnd(
  well: Well,
  permit: Permit,
  today: string = todayCalendarDate(),
): string | undefined {
  const successor = getSuccessorPermit(well, permit);
  const successorStart = successor && getPermitStartDate(successor);
  if (successorStart) return previousDay(successorStart);
  if (getPermitStatus(well, permit, today) === 'active_pending_renewal') {
    return undefined;
  }
  return permit.valid_until;
}

// ─── Condition deadlines ─────────────────────────────────────────────────────

/**
 * Anchor (first deadline) of a condition: `first_due`, else the permit's
 * start date + `due_after`. `undefined` for an undated condition.
 */
export function getConditionAnchor(
  permit: Permit,
  condition: PermitCondition,
): string | undefined {
  if (condition.first_due) return condition.first_due;
  if (!condition.due_after) return undefined;
  const start = getPermitStartDate(permit);
  const offset = parseDateDuration(condition.due_after);
  if (!start || !offset) return undefined;
  return addDateDuration(start, offset);
}

export type ConditionDeadlineOptions = {
  /** Local calendar date used for the permit status. Defaults to today. */
  today?: string;
  /**
   * Last date generated when the permit has no effective end. Defaults to
   * `today` + 2 years.
   */
  horizon?: string;
};

/**
 * Generates the deadlines of a permit condition (.well v2.3, normative):
 * deadline n = anchor + n × `recurrence`, always from the anchor. Generation
 * stops at `occurrences`, after `last_due`, after the permit's effective end
 * or, with no end, after `horizon`. A `suspended` or `revoked` permit
 * generates nothing after `today`; a `requested`, `denied` or `withdrawn` one
 * generates nothing. Undated conditions yield `[]`.
 */
export function getConditionDeadlines(
  well: Well,
  permit: Permit,
  condition: PermitCondition,
  options: ConditionDeadlineOptions = {},
): string[] {
  const anchor = getConditionAnchor(permit, condition);
  if (!anchor) return [];

  const today = options.today ?? todayCalendarDate();
  const status = getPermitStatus(well, permit, today)!;
  if (NEVER_GRANTED.has(status)) return [];
  let end =
    getPermitEffectiveEnd(well, permit, today) ??
    options.horizon ??
    addDateDuration(today, parseDateDuration(DEFAULT_HORIZON)!);
  if (HALTED.has(status) && (!end || today < end)) end = today;
  const recurrence = condition.recurrence
    ? parseDateDuration(condition.recurrence)
    : undefined;
  const max = Math.min(
    condition.occurrences ?? MAX_DEADLINES,
    recurrence ? MAX_DEADLINES : 1,
  );

  const deadlines: string[] = [];
  for (let n = 0; n < max; n++) {
    const date = n === 0 ? anchor : addDateDuration(anchor, recurrence!, n);
    if (!date) break;
    if (condition.last_due && date > condition.last_due) break;
    if (end && date > end) break;
    deadlines.push(date);
  }
  return deadlines;
}

export type ConditionDeadlineStatus =
  | 'fulfilled'
  | 'fulfilled_late'
  | 'upcoming'
  | 'overdue';

/** Every {@link ConditionDeadlineStatus} with en/pt labels. */
export const CONDITION_DEADLINE_STATUSES: readonly VocabEntry<ConditionDeadlineStatus>[] =
  [
    { value: 'fulfilled', label: { en: 'Fulfilled', pt: 'Cumprida' } },
    {
      value: 'fulfilled_late',
      label: { en: 'Fulfilled late', pt: 'Cumprida com atraso' },
    },
    { value: 'upcoming', label: { en: 'Upcoming', pt: 'A vencer' } },
    { value: 'overdue', label: { en: 'Overdue', pt: 'Atrasada' } },
  ];

export type ConditionDeadlineState = {
  /** The deadline. Absent for the fulfillment of an undated condition. */
  due_date?: string;
  status: ConditionDeadlineStatus;
  /** `conditions[].fulfillments[].id` of the record that fulfilled it. */
  fulfillment_id?: string;
};

/** Fulfillments of a condition, oldest first. */
export function getConditionFulfillments(
  condition: PermitCondition,
): ConditionFulfillment[] {
  return [...(condition.fulfillments ?? [])].sort(
    (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime(),
  );
}

/**
 * Derives the status of each deadline of a condition, on `today`:
 * `fulfilled` (or `fulfilled_late` when the fulfillment's local date is after
 * the deadline) when one of its `fulfillments` has that `due_date`; otherwise
 * `upcoming` until the deadline and `overdue` after it. For an undated
 * condition, a fulfillment without `due_date` yields a single `fulfilled`
 * entry.
 */
export function getConditionDeadlineStates(
  well: Well,
  permit: Permit,
  condition: PermitCondition,
  options: ConditionDeadlineOptions = {},
): ConditionDeadlineState[] {
  const today = options.today ?? todayCalendarDate();
  const fulfillments = getConditionFulfillments(condition);

  if (!getConditionAnchor(permit, condition)) {
    const f = fulfillments.find(x => !x.due_date);
    return f ? [{ status: 'fulfilled', fulfillment_id: f.id }] : [];
  }

  return getConditionDeadlines(well, permit, condition, {
    ...options,
    today,
  }).map(due_date => {
    const f = fulfillments.find(x => x.due_date === due_date);
    if (f) {
      return {
        due_date,
        status:
          instantLocalDate(f.datetime) > due_date
            ? 'fulfilled_late'
            : 'fulfilled',
        fulfillment_id: f.id,
      };
    }
    return { due_date, status: today > due_date ? 'overdue' : 'upcoming' };
  });
}

// ─── History & timeline ──────────────────────────────────────────────────────

/** `history` of a permit sorted by `date` (stable for equal dates). */
export function getPermitHistory(permit: Permit): PermitHistoryEntry[] {
  return [...(permit.history ?? [])].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

/**
 * Steps of `history` whose `due_date` has passed on `today` and that are not
 * `done`.
 */
export function getOverduePermitHistory(
  permit: Permit,
  today: string = todayCalendarDate(),
): PermitHistoryEntry[] {
  return getPermitHistory(permit).filter(
    h => h.due_date !== undefined && h.done !== true && h.due_date < today,
  );
}

export type PermitTimelineItem =
  | {
      kind: 'history';
      /** Calendar date (YYYY-MM-DD) the item is placed at. */
      date: string;
      entry: PermitHistoryEntry;
    }
  | {
      kind: 'fulfillment';
      /** Local calendar date of the fulfillment instant. */
      date: string;
      condition: PermitCondition;
      fulfillment: ConditionFulfillment;
    };

/**
 * Merges a permit's `history` and every condition's `fulfillments` into one
 * list ordered by local calendar date, newest first. Fulfillments are placed
 * at the local date of their `datetime`.
 */
export function getPermitTimeline(permit: Permit): PermitTimelineItem[] {
  const items: PermitTimelineItem[] = [
    ...(permit.history ?? []).map(entry => ({
      kind: 'history' as const,
      date: entry.date,
      entry,
    })),
    ...(permit.conditions ?? []).flatMap(condition =>
      (condition.fulfillments ?? []).map(fulfillment => ({
        kind: 'fulfillment' as const,
        date: instantLocalDate(fulfillment.datetime),
        condition,
        fulfillment,
      })),
    ),
  ];
  return items.sort((a, b) => b.date.localeCompare(a.date));
}

// ─── Validation ──────────────────────────────────────────────────────────────

export type PermitWarningCode =
  | 'valid_until_before_valid_from'
  | 'supersedes_unresolved'
  | 'supersedes_cycle'
  | 'overlapping_validity'
  | 'daily_operating_time_out_of_range'
  | 'monthly_above_max'
  | 'duplicate_month'
  | 'duplicate_volume_period'
  | 'duplicate_condition_id'
  | 'condition_due_conflict'
  | 'invalid_duration'
  | 'missing_identifier'
  | 'granted_without_identifier'
  | 'duplicate_history_id'
  | 'duplicate_fulfillment_id'
  | 'unmatched_fulfillment'
  | 'fulfillment_reference_unresolved';

export type PermitWarning = {
  code: PermitWarningCode;
  /** `permits[].id` values the warning refers to. */
  ids: string[];
  /** `conditions[].id`, for condition-level warnings. */
  condition_id?: string;
  /** `fulfillments[].id`, for fulfillment-level warnings. */
  fulfillment_id?: string;
};

function outOfDayRange(hours: number | undefined): boolean {
  return hours !== undefined && (hours < 0 || hours > 24);
}

function hasDuplicates<T>(values: T[]): boolean {
  return new Set(values).size !== values.length;
}

/**
 * Returns the validation warnings of the `permits` block defined by `.well`
 * v2.3. Warnings never make a file invalid:
 *
 * - `valid_until_before_valid_from` — `valid_until` earlier than the start date.
 * - `supersedes_unresolved` / `supersedes_cycle` — broken succession chain.
 * - `overlapping_validity` — two granted, non-superseded permits of the same
 *   `type` with overlapping validity.
 * - `daily_operating_time_out_of_range` — a permit or monthly value outside 0–24.
 * - `monthly_above_max` — a `monthly_schedule` value above the permit maximum.
 * - `duplicate_month` / `duplicate_volume_period` / `duplicate_condition_id` /
 *   `duplicate_history_id` / `duplicate_fulfillment_id`.
 * - `condition_due_conflict` — a condition with both `first_due` and `due_after`.
 * - `invalid_duration` — a `due_after` or `recurrence` that is not a date duration.
 * - `missing_identifier` — neither `identifier` nor `request_identifier`.
 * - `granted_without_identifier` — a granted permit with no `identifier`.
 * - `unmatched_fulfillment` — a fulfillment whose `due_date` matches no
 *   generated deadline, or with no `due_date` on a dated condition.
 * - `fulfillment_reference_unresolved` — a fulfillment `event_id` or
 *   `sample_id` that resolves to nothing.
 */
export function getPermitWarnings(
  well: Well,
  today: string = todayCalendarDate(),
): PermitWarning[] {
  const permits = well.permits ?? [];
  const byId = new Map(permits.map(p => [p.id, p]));
  const warnings: PermitWarning[] = [];

  const eventIds = new Set((well.hydrodynamic_events ?? []).map(e => e.id));
  const sampleIds = new Set((well.water_samples ?? []).map(s => s.id));

  for (const p of permits) {
    if (!p.identifier && !p.request_identifier) {
      warnings.push({ code: 'missing_identifier', ids: [p.id] });
    } else if (isPermitGranted(p) && !p.identifier) {
      warnings.push({ code: 'granted_without_identifier', ids: [p.id] });
    }
    if (hasDuplicates((p.history ?? []).map(h => h.id))) {
      warnings.push({ code: 'duplicate_history_id', ids: [p.id] });
    }

    const start = getPermitStartDate(p);
    if (start && p.valid_until && p.valid_until < start) {
      warnings.push({ code: 'valid_until_before_valid_from', ids: [p.id] });
    }

    if (p.supersedes !== undefined) {
      if (!byId.has(p.supersedes) || p.supersedes === p.id) {
        warnings.push({
          code:
            p.supersedes === p.id
              ? 'supersedes_cycle'
              : 'supersedes_unresolved',
          ids: [p.id],
        });
      } else {
        const seen = new Set([p.id]);
        let next = byId.get(p.supersedes);
        while (next) {
          if (seen.has(next.id)) {
            warnings.push({ code: 'supersedes_cycle', ids: [p.id] });
            break;
          }
          seen.add(next.id);
          next = next.supersedes ? byId.get(next.supersedes) : undefined;
        }
      }
    }

    const schedule = p.monthly_schedule ?? [];
    if (
      outOfDayRange(p.daily_operating_time) ||
      schedule.some(g => outOfDayRange(g.daily_operating_time))
    ) {
      warnings.push({ code: 'daily_operating_time_out_of_range', ids: [p.id] });
    }
    if (
      schedule.some(
        g =>
          (p.flow_rate !== undefined &&
            g.flow_rate !== undefined &&
            g.flow_rate > p.flow_rate) ||
          (p.daily_operating_time !== undefined &&
            g.daily_operating_time !== undefined &&
            g.daily_operating_time > p.daily_operating_time),
      )
    ) {
      warnings.push({ code: 'monthly_above_max', ids: [p.id] });
    }
    if (hasDuplicates(schedule.map(g => g.month))) {
      warnings.push({ code: 'duplicate_month', ids: [p.id] });
    }
    if (hasDuplicates((p.volume_limits ?? []).map(v => v.period))) {
      warnings.push({ code: 'duplicate_volume_period', ids: [p.id] });
    }

    const conditions = p.conditions ?? [];
    if (hasDuplicates(conditions.map(c => c.id))) {
      warnings.push({ code: 'duplicate_condition_id', ids: [p.id] });
    }
    for (const c of conditions) {
      if (c.first_due && c.due_after) {
        warnings.push({
          code: 'condition_due_conflict',
          ids: [p.id],
          condition_id: c.id,
        });
      }
      if (
        (c.due_after && !parseDateDuration(c.due_after)) ||
        (c.recurrence && !parseDateDuration(c.recurrence))
      ) {
        warnings.push({
          code: 'invalid_duration',
          ids: [p.id],
          condition_id: c.id,
        });
      }

      const fulfillments = c.fulfillments ?? [];
      if (hasDuplicates(fulfillments.map(f => f.id))) {
        warnings.push({
          code: 'duplicate_fulfillment_id',
          ids: [p.id],
          condition_id: c.id,
        });
      }
      const dated = !!getConditionAnchor(p, c);
      for (const f of fulfillments) {
        const matches =
          f.due_date === undefined
            ? !dated
            : dated &&
              getConditionDeadlines(well, p, c, {
                today,
                horizon: f.due_date,
              }).includes(f.due_date);
        if (!matches) {
          warnings.push({
            code: 'unmatched_fulfillment',
            ids: [p.id],
            condition_id: c.id,
            fulfillment_id: f.id,
          });
        }
        if (
          (f.event_id !== undefined && !eventIds.has(f.event_id)) ||
          (f.sample_id !== undefined && !sampleIds.has(f.sample_id))
        ) {
          warnings.push({
            code: 'fulfillment_reference_unresolved',
            ids: [p.id],
            condition_id: c.id,
            fulfillment_id: f.id,
          });
        }
      }
    }
  }

  // Two granted, non-superseded permits of the same type with overlapping validity.
  const live = permits.filter(
    p => isPermitGranted(p) && !getSuccessorPermit(well, p),
  );
  for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) {
      const a = live[i]!;
      const b = live[j]!;
      if (a.type !== b.type) continue;
      const aStart = getPermitStartDate(a) ?? '';
      const bStart = getPermitStartDate(b) ?? '';
      const aEnd = a.valid_until ?? '9999-12-31';
      const bEnd = b.valid_until ?? '9999-12-31';
      if (aStart <= bEnd && bStart <= aEnd) {
        warnings.push({ code: 'overlapping_validity', ids: [a.id, b.id] });
      }
    }
  }

  return warnings;
}

// ─── Display helpers ─────────────────────────────────────────────────────────

/**
 * Short display label of a permit: authority plus `identifier`, else
 * `request_identifier`. Falls back to `fallback` (e.g. an unresolved id).
 *
 * @example permitLabel(permit) // "SEMAS-PA 1234/2025"
 */
export function permitLabel(permit: Permit | undefined, fallback = ''): string {
  if (!permit) return fallback;
  return [permit.authority, getPermitIdentifier(permit)]
    .filter(Boolean)
    .join(' ');
}

/**
 * The permit production compliance is judged by: among the `active` /
 * `active_pending_renewal` permits on `today`, the one with the latest start.
 */
export function getActivePermit(
  well: Well,
  today: string = todayCalendarDate(),
): Permit | undefined {
  return (well.permits ?? [])
    .filter(p => {
      const status = getPermitStatus(well, p, today);
      return status === 'active' || status === 'active_pending_renewal';
    })
    .sort((a, b) =>
      (getPermitStartDate(b) ?? '').localeCompare(getPermitStartDate(a) ?? ''),
    )[0];
}
