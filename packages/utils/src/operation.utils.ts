import type {
  DeclaredVolume,
  HistoryLogEntry,
  Meter,
  MeterReading,
  OperatingRegime,
  ProductionEntry,
  Well,
  WellStatus,
} from '@welldot/core';

import { getPermitStatus, todayCalendarDate } from './permit.utils';
import { getRetractedIds, instantLocalDate } from './shared.utils';

// ─── Internal helpers ────────────────────────────────────────────────────────
// Instants are compared as points in time (parsed with their offset); bucket
// keys use the local date as written (see `instantLocalDate`).

function toTime(instant: string | undefined): number {
  return typeof instant === 'string' ? new Date(instant).getTime() : NaN;
}

function isMeterReading(entry: ProductionEntry): entry is MeterReading {
  return (
    entry.type === 'meter_reading' &&
    typeof entry.meter_id === 'string' &&
    typeof entry.reading === 'number' &&
    Number.isFinite(toTime(entry.datetime))
  );
}

function isDeclaredVolume(entry: ProductionEntry): entry is DeclaredVolume {
  return entry.type === 'declared_volume' && typeof entry.volume === 'number';
}

/** `method: "reported"` is the only non-estimated method. */
function isReported(entry: DeclaredVolume): boolean {
  return entry.method === 'reported';
}

/** Valid declared period: both instants parse and `period_end` is later. */
function declaredPeriod(
  entry: DeclaredVolume,
): { start: number; end: number } | undefined {
  const start = toTime(entry.period_start);
  const end = toTime(entry.period_end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return undefined;
  }
  return { start, end };
}

type Span = { start: number; end: number };

/** Union of spans, sorted and merged (touching spans merge). */
function mergeSpans(spans: Span[]): Span[] {
  const sorted = spans
    .filter(s => s.end > s.start)
    .sort((a, b) => a.start - b.start);
  const merged: Span[] = [];
  for (const s of sorted) {
    const last = merged[merged.length - 1];
    if (last && s.start <= last.end) last.end = Math.max(last.end, s.end);
    else merged.push({ ...s });
  }
  return merged;
}

/** Length of `span` covered by the (merged) `cover`. */
function coveredLength(span: Span, cover: Span[]): number {
  let total = 0;
  for (const c of cover) {
    const start = Math.max(span.start, c.start);
    const end = Math.min(span.end, c.end);
    if (end > start) total += end - start;
  }
  return total;
}

function duplicatedValues<T>(values: T[]): Set<T> {
  const seen = new Set<T>();
  const dup = new Set<T>();
  for (const v of values) {
    if (seen.has(v)) dup.add(v);
    else seen.add(v);
  }
  return dup;
}

// ─── Production ledger ───────────────────────────────────────────────────────

/**
 * Returns the ids of every `production` entry retracted by another entry's
 * `corrects` field (.well v2.3 ledger corrections). Chains retract every link
 * but the last.
 */
export function getRetractedProductionIds(well: Well): Set<string> {
  return getRetractedIds(well.production ?? []);
}

/**
 * Returns the `production` entries that count for derivations: every entry
 * not retracted by a `corrects` reference. Order is preserved. Entries of
 * unknown (`x-…`) types are kept here but ignored by the volume derivations.
 */
export function getEffectiveProduction(well: Well): ProductionEntry[] {
  const entries = well.production ?? [];
  const retracted = getRetractedProductionIds(well);
  if (retracted.size === 0) return entries;
  return entries.filter(e => !retracted.has(e.id));
}

/**
 * Returns the meters currently installed: entries without `removed_at`,
 * newest `installed_at` first. Several open meters are allowed (secondary
 * meters).
 */
export function getCurrentMeters(well: Well): Meter[] {
  return (well.meters ?? [])
    .filter(m => !m.removed_at)
    .sort((a, b) => toTime(b.installed_at) - toTime(a.installed_at));
}

/** Volume between two consecutive readings of the same meter. */
export type MeterInterval = {
  /** `meters[].id` of both readings. */
  meter_id: string;
  /** `production[].id` of the first reading (r₁). */
  from_id: string;
  /** `production[].id` of the second reading (r₂). */
  to_id: string;
  /** RFC 3339 instant of r₁. */
  start: string;
  /** RFC 3339 instant of r₂. */
  end: string;
  /**
   * Volume in m³. `null` when unknown: r₂ < r₁ and the meter has no
   * `max_reading`. Never negative.
   */
  volume: number | null;
  /** `true` when the register rolled over (r₂ < r₁ with `max_reading`). */
  rollover: boolean;
};

/**
 * Derives the volume of every interval between consecutive readings of the
 * same meter (.well v2.3 volume derivation, normative). Only effective
 * (non-retracted) `meter_reading` entries count; readings of each meter are
 * ordered by instant, then `sequence` (lower first, absent first), then file
 * order.
 *
 * - r₂ ≥ r₁ → r₂ − r₁.
 * - r₂ < r₁ with `max_reading` → (`max_reading` − r₁) + r₂ (rollover).
 * - r₂ < r₁ without `max_reading` → `volume: null` (unknown).
 *
 * Intervals never span two meters, so a meter swap leaves the gap between
 * the removal and installation readings unmetered. Production before a
 * meter's first reading is unknown and yields no interval. Readings whose
 * `meter_id` does not resolve are still paired (without rollover). The result
 * is sorted by `end` instant.
 */
export function getMeterIntervals(well: Well): MeterInterval[] {
  const meters = new Map<string, Meter>();
  for (const m of well.meters ?? []) if (!meters.has(m.id)) meters.set(m.id, m);

  const byMeter = new Map<string, MeterReading[]>();
  for (const entry of getEffectiveProduction(well)) {
    if (!isMeterReading(entry)) continue;
    const list = byMeter.get(entry.meter_id) ?? [];
    list.push(entry);
    byMeter.set(entry.meter_id, list);
  }

  const intervals: MeterInterval[] = [];
  for (const [meterId, readings] of byMeter) {
    const maxReading = meters.get(meterId)?.max_reading;
    const ordered = readings
      .map((r, i) => ({ r, i, t: toTime(r.datetime) }))
      .sort(
        (a, b) =>
          a.t - b.t ||
          (a.r.sequence ?? -Infinity) - (b.r.sequence ?? -Infinity) ||
          a.i - b.i,
      )
      .map(x => x.r);
    for (let k = 1; k < ordered.length; k++) {
      const r1 = ordered[k - 1]!;
      const r2 = ordered[k]!;
      let volume: number | null;
      let rollover = false;
      if (r2.reading >= r1.reading) volume = r2.reading - r1.reading;
      else if (typeof maxReading === 'number') {
        volume = maxReading - r1.reading + r2.reading;
        rollover = true;
      } else volume = null;
      intervals.push({
        meter_id: meterId,
        from_id: r1.id,
        to_id: r2.id,
        start: r1.datetime,
        end: r2.datetime,
        volume,
        rollover,
      });
    }
  }

  return intervals.sort((a, b) => toTime(a.end) - toTime(b.end));
}

export type ProductionPeriod = 'day' | 'month' | 'year';

export type ProductionTotals = {
  /** Sum (m³) of the known meter interval volumes. */
  metered: number;
  /**
   * Sum (m³) of `estimated` (or method-less) declared volumes, each counted
   * only for the fraction of its period not covered by a meter interval.
   */
  estimated: number;
  /** `metered + estimated`. */
  total: number;
  /** Sum (m³) of `reported` declared volumes. Never part of `total`. */
  reported: number;
  /** Number of meter intervals whose volume is unknown. */
  unknown_intervals: number;
};

export type ProductionBucket = ProductionTotals & {
  /** `YYYY`, `YYYY-MM` or `YYYY-MM-DD`, from local dates as written. */
  period: string;
};

type Contribution = {
  date: string;
  metered: number;
  estimated: number;
  reported: number;
  unknown: number;
};

/**
 * Everything that feeds the totals, each keyed by a local date: meter
 * intervals by the date of their end, declared volumes by the date of
 * `period_end`.
 */
function getProductionContributions(well: Well): Contribution[] {
  const intervals = getMeterIntervals(well);
  const cover = mergeSpans(
    intervals.map(i => ({ start: toTime(i.start), end: toTime(i.end) })),
  );
  const out: Contribution[] = intervals.map(i => ({
    date: instantLocalDate(i.end),
    metered: i.volume ?? 0,
    estimated: 0,
    reported: 0,
    unknown: i.volume === null ? 1 : 0,
  }));

  for (const entry of getEffectiveProduction(well)) {
    if (!isDeclaredVolume(entry)) continue;
    const span = declaredPeriod(entry);
    if (!span) continue;
    const date = instantLocalDate(entry.period_end);
    if (isReported(entry)) {
      out.push({
        date,
        metered: 0,
        estimated: 0,
        reported: entry.volume,
        unknown: 0,
      });
      continue;
    }
    const uncovered = 1 - coveredLength(span, cover) / (span.end - span.start);
    out.push({
      date,
      metered: 0,
      estimated: entry.volume * uncovered,
      reported: 0,
      unknown: 0,
    });
  }
  return out;
}

function emptyTotals(): ProductionTotals {
  return {
    metered: 0,
    estimated: 0,
    total: 0,
    reported: 0,
    unknown_intervals: 0,
  };
}

function addContribution(t: ProductionTotals, c: Contribution): void {
  t.metered += c.metered;
  t.estimated += c.estimated;
  t.total = t.metered + t.estimated;
  t.reported += c.reported;
  t.unknown_intervals += c.unknown;
}

const PERIOD_KEY_LENGTH: Record<ProductionPeriod, number> = {
  year: 4,
  month: 7,
  day: 10,
};

/**
 * Production per day, month or year (.well v2.3 derived values), ascending
 * by period key. Only periods with at least one contribution are returned.
 *
 * Simplification: a meter interval is allocated whole to the period of the
 * local date of its end (r₂), and a declared volume to the period of the
 * local date of its `period_end`; volumes are not prorated across period
 * boundaries. Local dates are the date part of the instant as written.
 * Precedence follows {@link getProductionTotal}.
 */
export function getProductionByPeriod(
  well: Well,
  period: ProductionPeriod,
): ProductionBucket[] {
  const len = PERIOD_KEY_LENGTH[period];
  const buckets = new Map<string, ProductionBucket>();
  for (const c of getProductionContributions(well)) {
    const key = c.date.slice(0, len);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { period: key, ...emptyTotals() };
      buckets.set(key, bucket);
    }
    addContribution(bucket, c);
  }
  return [...buckets.values()].sort((a, b) =>
    a.period < b.period ? -1 : a.period > b.period ? 1 : 0,
  );
}

/**
 * Total production of the well (.well v2.3 precedence rules):
 *
 * - Meter intervals with a known volume are `metered`; unknown ones are
 *   counted in `unknown_intervals` and add nothing.
 * - An `estimated` (or method-less) `declared_volume` counts only for the time
 *   not covered by any meter interval (the meter wins), prorated linearly by
 *   the uncovered fraction of its period. Intervals of unknown volume still
 *   count as covered.
 * - A `reported` `declared_volume` is kept in `reported` for comparison and
 *   never added to `total`.
 * - Retracted entries, entries of unknown types and declared volumes with an
 *   invalid period are ignored.
 */
export function getProductionTotal(well: Well): ProductionTotals {
  const totals = emptyTotals();
  for (const c of getProductionContributions(well)) addContribution(totals, c);
  return totals;
}

// ─── Operating regime ────────────────────────────────────────────────────────

function latestRegime(
  regimes: OperatingRegime[],
  isEligible: (r: OperatingRegime) => boolean,
): OperatingRegime | undefined {
  let current: OperatingRegime | undefined;
  for (const r of regimes) {
    if (!Number.isFinite(toTime(r.effective_from)) || !isEligible(r)) continue;
    if (
      !current ||
      toTime(r.effective_from) >= toTime(current.effective_from)
    ) {
      current = r;
    }
  }
  return current;
}

/**
 * Returns the operating regime in force at `at` (default now): the entry with
 * the latest `effective_from` not after `at`, compared as instants. Returns
 * `undefined` when no regime has started yet.
 */
export function getCurrentRegime(
  well: Well,
  at: Date = new Date(),
): OperatingRegime | undefined {
  const time = at.getTime();
  return latestRegime(
    well.operating_regime ?? [],
    r => toTime(r.effective_from) <= time,
  );
}

// ─── Well status ─────────────────────────────────────────────────────────────

/** `status_change` entries carrying a `status`, sorted by instant ascending. */
function getStatusChanges(well: Well): HistoryLogEntry[] {
  return (well.history_logs ?? [])
    .map((l, i) => ({ l, i, t: toTime(l.datetime) }))
    .filter(
      x =>
        x.l.category === 'status_change' &&
        typeof x.l.status === 'string' &&
        Number.isFinite(x.t),
    )
    .sort((a, b) => a.t - b.t || a.i - b.i)
    .map(x => x.l);
}

/**
 * Returns the `status_change` history log entry with the latest `datetime`
 * (compared as instants; file order breaks ties). Entries without `status`
 * are ignored. `undefined` when there is none.
 */
export function getCurrentWellStatusEntry(
  well: Well,
): HistoryLogEntry | undefined {
  const changes = getStatusChanges(well);
  return changes[changes.length - 1];
}

/**
 * Returns the current status of the well (.well v2.3): the `status` of the
 * latest `status_change` entry, e.g. `active`, `maintenance`, `inactive`,
 * `decommissioned` or `abandoned`. `undefined` means unknown — there is no
 * `status_change` entry.
 */
export function getCurrentWellStatus(well: Well): WellStatus | undefined {
  return getCurrentWellStatusEntry(well)?.status;
}

const CLOSED_STATUSES = new Set<WellStatus>(['decommissioned', 'abandoned']);

/**
 * Instant from which the well is closed: when the current status is
 * `decommissioned` or `abandoned`, the earliest entry of the trailing run of
 * closed statuses (not followed by a reopening status).
 */
function getClosedSince(well: Well): number | undefined {
  const changes = getStatusChanges(well);
  let since: number | undefined;
  for (let k = changes.length - 1; k >= 0; k--) {
    if (!CLOSED_STATUSES.has(changes[k]!.status!)) break;
    since = toTime(changes[k]!.datetime);
  }
  return since;
}

// ─── Validation ──────────────────────────────────────────────────────────────

export type OperationWarningCode =
  | 'meter_removed_before_installed'
  | 'overlapping_meters'
  | 'duplicate_meter_id'
  | 'reading_meter_unresolved'
  | 'reading_outside_installation'
  | 'reading_rollover_unknown'
  | 'duplicate_production_id'
  | 'corrects_unresolved'
  | 'corrects_cycle'
  | 'declared_period_invalid'
  | 'estimated_overlaps_meter'
  | 'duplicate_regime_id'
  | 'regime_duplicate_effective_from'
  | 'regime_exceeds_permit'
  | 'log_category_field_mismatch'
  | 'log_reference_unresolved'
  | 'log_after_decommission'
  | 'missing_maintenance_type'
  | 'missing_status'
  | 'analysis_uses_retracted_event';

export type OperationWarning = {
  code: OperationWarningCode;
  /**
   * Ids of the offending records (`meters`, `production`, `operating_regime`,
   * `permits`, `history_logs`, `aquifer_analysis`, `hydrodynamic_events`).
   */
  ids: string[];
};

const MAINTENANCE_FIELDS = [
  'maintenance_type',
  'pump_installation_id',
  'meter_id',
] as const;
const MAINTENANCE_LINK_FIELDS = ['event_id', 'sample_id'] as const;

function hasField(log: HistoryLogEntry, field: keyof HistoryLogEntry): boolean {
  return log[field] !== undefined;
}

/**
 * Returns the validation warnings of the `meters`, `production` and
 * `operating_regime` blocks, of the v2.3 `history_logs` categories and of
 * `aquifer_analysis` references (.well v2.3). Warnings never make a file
 * invalid. `today` (local calendar date) selects the active permit and the
 * regime in force for `regime_exceeds_permit`.
 *
 * Meters:
 * - `meter_removed_before_installed` — `removed_at` not after `installed_at`. ids: [meter].
 * - `overlapping_meters` — two installation windows overlap (open = until
 *   infinity; touching is fine). ids: [meter, meter].
 * - `duplicate_meter_id` — ids: [meter id].
 *
 * Production (effective entries only, except for ids and `corrects`):
 * - `reading_meter_unresolved` — ids: [production, meter_id].
 * - `reading_outside_installation` — reading before `installed_at` or after
 *   `removed_at` (equal is fine). ids: [production, meter].
 * - `reading_rollover_unknown` — r₂ < r₁ without `max_reading`. ids:
 *   [r₁ production, r₂ production, meter].
 * - `duplicate_production_id` — ids: [production id].
 * - `corrects_unresolved` — `corrects` points to no entry. ids: [production].
 * - `corrects_cycle` — the `corrects` chain loops back. ids: [production],
 *   once per entry in the cycle.
 * - `declared_period_invalid` — `period_end` not after `period_start`, or an
 *   unparseable instant. ids: [production].
 * - `estimated_overlaps_meter` — an estimated (or method-less) declared volume
 *   overlapping a meter interval; the meter wins. ids: [production].
 *
 * Operating regime:
 * - `duplicate_regime_id` — ids: [regime id].
 * - `regime_duplicate_effective_from` — same instant. ids: every regime sharing it.
 * - `regime_exceeds_permit` — the regime in force on `today` (latest whose
 *   `effective_from` local date is on or before `today`) has `flow_rate` or
 *   `daily_operating_time` above an `active` / `active_pending_renewal`
 *   permit. ids: [regime, permit].
 *
 * History logs (ids: [log]):
 * - `log_category_field_mismatch` — maintenance fields on a non-`maintenance`
 *   entry (including `event_id` / `sample_id`), `status` on a
 *   non-`status_change`.
 * - `log_reference_unresolved` — `pump_installation_id`, `meter_id`,
 *   `event_id` or `sample_id` (`water_samples[].id`) that does not resolve.
 * - `log_after_decommission` — while the current status is `decommissioned` or
 *   `abandoned`, a non-`status_change` entry dated after the start of that
 *   closed run (the earliest closing entry not followed by a reopening one).
 * - `missing_maintenance_type` — a structured `maintenance` entry (with
 *   `pump_installation_id`, `meter_id`, `event_id` or `sample_id`) without
 *   `maintenance_type`. Legacy maintenance entries without references are fine.
 * - `missing_status` — a `status_change` entry without `status`.
 *
 * Aquifer analysis:
 * - `analysis_uses_retracted_event` — `source_event_ids` or
 *   `static_level_source_id` points to a retracted event. ids: [analysis, event].
 */
export function getOperationWarnings(
  well: Well,
  today: string = todayCalendarDate(),
): OperationWarning[] {
  const warnings: OperationWarning[] = [];
  const push = (code: OperationWarningCode, ids: string[]) =>
    warnings.push({ code, ids });

  // ── Meters ──
  const meters = well.meters ?? [];
  const meterById = new Map<string, Meter>();
  for (const m of meters) if (!meterById.has(m.id)) meterById.set(m.id, m);

  for (const m of meters) {
    if (m.removed_at && toTime(m.removed_at) <= toTime(m.installed_at)) {
      push('meter_removed_before_installed', [m.id]);
    }
  }
  for (const id of duplicatedValues(meters.map(m => m.id))) {
    push('duplicate_meter_id', [id]);
  }
  for (let i = 0; i < meters.length; i++) {
    for (let j = i + 1; j < meters.length; j++) {
      const a = meters[i]!;
      const b = meters[j]!;
      const aEnd = a.removed_at ? toTime(a.removed_at) : Infinity;
      const bEnd = b.removed_at ? toTime(b.removed_at) : Infinity;
      if (toTime(a.installed_at) < bEnd && toTime(b.installed_at) < aEnd) {
        push('overlapping_meters', [a.id, b.id]);
      }
    }
  }

  // ── Production ──
  const production = well.production ?? [];
  const productionIds = new Set(production.map(p => p.id));
  for (const id of duplicatedValues(production.map(p => p.id))) {
    push('duplicate_production_id', [id]);
  }

  const correctsOf = new Map<string, string>();
  for (const p of production) {
    if (typeof p.corrects === 'string' && !correctsOf.has(p.id)) {
      correctsOf.set(p.id, p.corrects);
    }
  }
  for (const p of production) {
    if (typeof p.corrects !== 'string') continue;
    if (!productionIds.has(p.corrects)) {
      push('corrects_unresolved', [p.id]);
      continue;
    }
    const seen = new Set<string>();
    let next: string | undefined = p.corrects;
    while (next !== undefined && !seen.has(next)) {
      if (next === p.id) {
        push('corrects_cycle', [p.id]);
        break;
      }
      seen.add(next);
      next = correctsOf.get(next);
    }
  }

  const intervals = getMeterIntervals(well);
  const cover = mergeSpans(
    intervals.map(i => ({ start: toTime(i.start), end: toTime(i.end) })),
  );

  for (const p of getEffectiveProduction(well)) {
    if (isMeterReading(p)) {
      const meter = meterById.get(p.meter_id);
      if (!meter) {
        push('reading_meter_unresolved', [p.id, p.meter_id]);
        continue;
      }
      const t = toTime(p.datetime);
      if (
        t < toTime(meter.installed_at) ||
        (meter.removed_at !== undefined && t > toTime(meter.removed_at))
      ) {
        push('reading_outside_installation', [p.id, meter.id]);
      }
    } else if (p.type === 'declared_volume') {
      const span = declaredPeriod(p as DeclaredVolume);
      if (!span) {
        push('declared_period_invalid', [p.id]);
        continue;
      }
      if (
        isDeclaredVolume(p) &&
        !isReported(p) &&
        coveredLength(span, cover) > 0
      ) {
        push('estimated_overlaps_meter', [p.id]);
      }
    }
  }

  for (const i of intervals) {
    if (i.volume === null) {
      push('reading_rollover_unknown', [i.from_id, i.to_id, i.meter_id]);
    }
  }

  // ── Operating regime ──
  const regimes = well.operating_regime ?? [];
  for (const id of duplicatedValues(regimes.map(r => r.id))) {
    push('duplicate_regime_id', [id]);
  }
  const byInstant = new Map<number, string[]>();
  for (const r of regimes) {
    const t = toTime(r.effective_from);
    if (!Number.isFinite(t)) continue;
    byInstant.set(t, [...(byInstant.get(t) ?? []), r.id]);
  }
  for (const ids of byInstant.values()) {
    if (ids.length > 1) push('regime_duplicate_effective_from', ids);
  }

  const regime = latestRegime(
    regimes,
    r => instantLocalDate(r.effective_from) <= today,
  );
  if (regime) {
    for (const permit of well.permits ?? []) {
      const status = getPermitStatus(well, permit, today);
      if (status !== 'active' && status !== 'active_pending_renewal') continue;
      const exceeds =
        (regime.flow_rate !== undefined &&
          permit.flow_rate !== undefined &&
          regime.flow_rate > permit.flow_rate) ||
        (regime.daily_operating_time !== undefined &&
          permit.daily_operating_time !== undefined &&
          regime.daily_operating_time > permit.daily_operating_time);
      if (exceeds) push('regime_exceeds_permit', [regime.id, permit.id]);
    }
  }

  // ── History logs ──
  const pumpIds = new Set((well.pump_installations ?? []).map(p => p.id));
  const eventIds = new Set((well.hydrodynamic_events ?? []).map(e => e.id));
  const sampleIds = new Set((well.water_samples ?? []).map(s => s.id));
  const closedSince = getClosedSince(well);

  for (const log of well.history_logs ?? []) {
    const c = log.category;
    const mismatch =
      (c !== 'maintenance' &&
        [...MAINTENANCE_FIELDS, ...MAINTENANCE_LINK_FIELDS].some(f =>
          hasField(log, f),
        )) ||
      (c !== 'status_change' && hasField(log, 'status'));
    if (mismatch) push('log_category_field_mismatch', [log.id]);

    if (
      (log.pump_installation_id !== undefined &&
        !pumpIds.has(log.pump_installation_id)) ||
      (log.meter_id !== undefined && !meterById.has(log.meter_id)) ||
      (log.event_id !== undefined && !eventIds.has(log.event_id)) ||
      (log.sample_id !== undefined && !sampleIds.has(log.sample_id))
    ) {
      push('log_reference_unresolved', [log.id]);
    }

    if (
      closedSince !== undefined &&
      c !== 'status_change' &&
      toTime(log.datetime) > closedSince
    ) {
      push('log_after_decommission', [log.id]);
    }

    if (
      c === 'maintenance' &&
      log.maintenance_type === undefined &&
      (log.pump_installation_id !== undefined ||
        log.meter_id !== undefined ||
        log.event_id !== undefined ||
        log.sample_id !== undefined)
    ) {
      push('missing_maintenance_type', [log.id]);
    }

    if (c === 'status_change' && log.status === undefined) {
      push('missing_status', [log.id]);
    }
  }

  // ── Aquifer analysis ──
  const retractedEvents = getRetractedIds(well.hydrodynamic_events ?? []);
  if (retractedEvents.size > 0) {
    for (const a of well.aquifer_analysis ?? []) {
      const refs = [...(a.source_event_ids ?? []), a.static_level_source_id];
      const flagged = new Set<string>();
      for (const id of refs) {
        if (id === undefined || flagged.has(id) || !retractedEvents.has(id)) {
          continue;
        }
        flagged.add(id);
        push('analysis_uses_retracted_event', [a.id, id]);
      }
    }
  }

  return warnings;
}
