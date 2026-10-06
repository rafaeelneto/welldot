import type {
  HistoryLogEntry,
  Permit,
  PermitCondition,
  Well,
} from '@welldot/core';

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
  | 'superseded'
  | 'pending'
  | 'active'
  | 'active_pending_renewal'
  | 'expired';

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
 * 1. Another permit `supersedes` it → `superseded`.
 * 2. `today` is before its start date → `pending`.
 * 3. `valid_until` is absent, or `today` is on or before it → `active`.
 * 4. `renewal_requested_at` is on or before `valid_until` →
 *    `active_pending_renewal`.
 * 5. Otherwise → `expired`.
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
  if (getSuccessorPermit(well, p)) return 'superseded';
  const start = getPermitStartDate(p);
  if (start && today < start) return 'pending';
  if (!p.valid_until || today <= p.valid_until) return 'active';
  if (p.renewal_requested_at && p.renewal_requested_at <= p.valid_until) {
    return 'active_pending_renewal';
  }
  return 'expired';
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
 * or, with no end, after `horizon`. Undated conditions yield `[]`.
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
  const end =
    getPermitEffectiveEnd(well, permit, today) ??
    options.horizon ??
    addDateDuration(today, parseDateDuration(DEFAULT_HORIZON)!);
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

export type ConditionDeadlineState = {
  /** The deadline. Absent for the fulfillment of an undated condition. */
  due_date?: string;
  status: ConditionDeadlineStatus;
  /** `history_logs[].id` of the `permit_condition` entry that fulfilled it. */
  log_id?: string;
};

/** `history_logs` entries of category `permit_condition` for one condition. */
export function getConditionFulfillments(
  well: Well,
  permitId: string,
  conditionId: string,
): HistoryLogEntry[] {
  return (well.history_logs ?? []).filter(
    l =>
      l.category === 'permit_condition' &&
      l.permit_id === permitId &&
      l.condition_id === conditionId,
  );
}

/**
 * Derives the status of each deadline of a condition, on `today`:
 * `fulfilled` (or `fulfilled_late` when the log's local date is after the
 * deadline) when a `permit_condition` log matches it by `permit_id`,
 * `condition_id` and `due_date`; otherwise `upcoming` until the deadline and
 * `overdue` after it. For an undated condition, a log without `due_date`
 * yields a single `fulfilled` entry.
 */
export function getConditionDeadlineStates(
  well: Well,
  permit: Permit,
  condition: PermitCondition,
  options: ConditionDeadlineOptions = {},
): ConditionDeadlineState[] {
  const today = options.today ?? todayCalendarDate();
  const logs = getConditionFulfillments(well, permit.id, condition.id);

  if (!getConditionAnchor(permit, condition)) {
    const log = logs.find(l => !l.due_date);
    return log ? [{ status: 'fulfilled', log_id: log.id }] : [];
  }

  return getConditionDeadlines(well, permit, condition, {
    ...options,
    today,
  }).map(due_date => {
    const log = logs.find(l => l.due_date === due_date);
    if (log) {
      return {
        due_date,
        status:
          instantLocalDate(log.datetime) > due_date
            ? 'fulfilled_late'
            : 'fulfilled',
        log_id: log.id,
      };
    }
    return { due_date, status: today > due_date ? 'overdue' : 'upcoming' };
  });
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
  | 'unmatched_condition_log';

export type PermitWarning = {
  code: PermitWarningCode;
  /** `permits[].id` values the warning refers to (empty for a dangling log). */
  ids: string[];
  /** `conditions[].id`, for condition-level warnings. */
  condition_id?: string;
  /** `history_logs[].id`, for `unmatched_condition_log`. */
  log_id?: string;
};

function outOfDayRange(hours: number | undefined): boolean {
  return hours !== undefined && (hours < 0 || hours > 24);
}

function hasDuplicates<T>(values: T[]): boolean {
  return new Set(values).size !== values.length;
}

/**
 * Returns the validation warnings of the `permits` block and of
 * `permit_condition` history logs defined by `.well` v2.3. Warnings never
 * make a file invalid:
 *
 * - `valid_until_before_valid_from` — `valid_until` earlier than the start date.
 * - `supersedes_unresolved` / `supersedes_cycle` — broken succession chain.
 * - `overlapping_validity` — two non-superseded permits of the same `type`
 *   with overlapping validity.
 * - `daily_operating_time_out_of_range` — a permit or monthly value outside 0–24.
 * - `monthly_above_max` — a `monthly_schedule` value above the permit maximum.
 * - `duplicate_month` / `duplicate_volume_period` / `duplicate_condition_id`.
 * - `condition_due_conflict` — a condition with both `first_due` and `due_after`.
 * - `invalid_duration` — a `due_after` or `recurrence` that is not a date duration.
 * - `unmatched_condition_log` — a `permit_condition` log whose permit,
 *   condition or `due_date` matches no generated deadline.
 */
export function getPermitWarnings(
  well: Well,
  today: string = todayCalendarDate(),
): PermitWarning[] {
  const permits = well.permits ?? [];
  const byId = new Map(permits.map(p => [p.id, p]));
  const warnings: PermitWarning[] = [];

  for (const p of permits) {
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
    }
  }

  // Two non-superseded permits of the same type with overlapping validity.
  const live = permits.filter(p => !getSuccessorPermit(well, p));
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

  // permit_condition logs that match no permit, condition or deadline.
  for (const log of well.history_logs ?? []) {
    if (log.category !== 'permit_condition') continue;
    const permit = log.permit_id ? byId.get(log.permit_id) : undefined;
    const condition = permit?.conditions?.find(c => c.id === log.condition_id);
    const matches =
      !!permit &&
      !!condition &&
      (log.due_date === undefined
        ? !getConditionAnchor(permit, condition)
        : getConditionDeadlines(well, permit, condition, {
            today,
            horizon: log.due_date,
          }).includes(log.due_date));
    if (!matches) {
      warnings.push({
        code: 'unmatched_condition_log',
        ids: permit ? [permit.id] : [],
        condition_id: log.condition_id,
        log_id: log.id,
      });
    }
  }

  return warnings;
}
