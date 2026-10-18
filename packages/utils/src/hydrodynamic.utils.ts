// ─── Hydrodynamic event readings ─────────────────────────────────────────────
// Events are a union of shapes; these read the optional `steps`/`recovery`
// blocks generically so callers need no per-type narrowing.
import type { HydrodynamicEvent, LevelReading } from '@welldot/core';

type StepLike = { rate?: number; readings?: LevelReading[] };

function stepsOf(event: HydrodynamicEvent): StepLike[] | undefined {
  return (event as { steps?: StepLike[] }).steps;
}

/** Last level reading of the last step that has readings, or `null`. */
export function lastReading(event: HydrodynamicEvent): LevelReading | null {
  const steps = stepsOf(event);
  if (!steps?.length) return null;
  for (let i = steps.length - 1; i >= 0; i--) {
    const r = steps[i]!.readings;
    if (r?.length) return r[r.length - 1]!;
  }
  return null;
}

/** Every step reading of the event, in step order. */
export function allStepReadings(event: HydrodynamicEvent): LevelReading[] {
  const out: LevelReading[] = [];
  for (const s of stepsOf(event) ?? []) if (s.readings) out.push(...s.readings);
  return out;
}

/** Number of recovery readings, `0` when there is no recovery block. */
export function recoveryReadingsCount(event: HydrodynamicEvent): number {
  return (
    (event as { recovery?: { readings?: unknown[] } }).recovery?.readings
      ?.length ?? 0
  );
}

/** Pumping rate of step `index` (default the first), or `null`. */
export function stepRate(event: HydrodynamicEvent, index = 0): number | null {
  return stepsOf(event)?.[index]?.rate ?? null;
}

type MaybeReading = { elapsed?: number | null; depth?: number | null };

/** Whether any reading has both `elapsed` and `depth`. */
export function stepHasReadings(readings: MaybeReading[]): boolean {
  return readings.some(r => r.elapsed != null && r.depth != null);
}

/** Step duration implied by its readings (largest complete `elapsed`), or `null`. */
export function derivedStepDuration(readings: MaybeReading[]): number | null {
  const elapsedValues = readings
    .filter(r => r.elapsed != null && r.depth != null)
    .map(r => r.elapsed as number);
  return elapsedValues.length > 0 ? Math.max(...elapsedValues) : null;
}

// ─── Pumping test series ─────────────────────────────────────────────────────
// Step `elapsed` restarts at each step and recovery `elapsed` at pump
// shutdown; these place every reading on one test clock and build the series
// of the usual pumping-test plots.

/** A reading on the test clock. `t` and `elapsed` are minutes. */
export type TimelinePoint = {
  /** Minutes since the first step started. */
  t: number;
  /** Minutes since its own step started (or since pump shutdown). */
  elapsed: number;
  depth: number;
  /** `depth − static_level`, or `null` without a static level. */
  drawdown: number | null;
};

export type TimelineStep = {
  index: number;
  rate: number | null;
  /** Test-clock minutes where the step starts and ends. */
  start: number;
  end: number;
  points: TimelinePoint[];
};

export type PumpingTimeline = {
  staticLevel: number | null;
  /** Empty for `recovery_only`. */
  steps: TimelineStep[];
  /** Test-clock minute the pump stopped, or `null` when unknown. */
  pumpingEnd: number | null;
  recovery: { start: number; points: TimelinePoint[] } | null;
};

export type PumpingChartKind =
  | 'hydrograph'
  | 'semilog'
  | 'recovery'
  | 'stepTest';

type RawStep = { rate?: number; duration?: number; readings?: LevelReading[] };

function finite(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

/** Readings with a finite `elapsed` and `depth`, sorted by `elapsed`. */
function cleanReadings(readings: LevelReading[] | undefined): LevelReading[] {
  return (readings ?? [])
    .filter(r => finite(r.elapsed) && finite(r.depth))
    .sort((a, b) => a.elapsed - b.elapsed);
}

function staticLevelOf(event: HydrodynamicEvent): number | null {
  const level = (event as { static_level?: number }).static_level;
  return finite(level) ? level : null;
}

/**
 * Every reading of the event on one test clock. Step N+1 starts where step N
 * ends: at its `duration`, or at its last reading when it has none. Recovery
 * starts when the last step ends (`pumping_duration` for `recovery_only`).
 */
export function pumpingTimeline(event: HydrodynamicEvent): PumpingTimeline {
  const staticLevel = staticLevelOf(event);
  const point = (offset: number, r: LevelReading): TimelinePoint => ({
    t: offset + r.elapsed,
    elapsed: r.elapsed,
    depth: r.depth,
    drawdown: staticLevel == null ? null : r.depth - staticLevel,
  });

  const steps: TimelineStep[] = [];
  let cursor = 0;
  for (const [index, s] of ((stepsOf(event) ?? []) as RawStep[]).entries()) {
    const readings = cleanReadings(s.readings);
    const length = finite(s.duration)
      ? s.duration
      : (readings[readings.length - 1]?.elapsed ?? 0);
    steps.push({
      index,
      rate: finite(s.rate) ? s.rate : null,
      start: cursor,
      end: cursor + length,
      points: readings.map(r => point(cursor, r)),
    });
    cursor += length;
  }

  let pumpingEnd: number | null = steps.length ? cursor : null;
  if (event.type === 'recovery_only') {
    const duration = (event as { pumping_duration?: number }).pumping_duration;
    pumpingEnd = finite(duration) ? duration : null;
  }

  const rawRecovery = (event as { recovery?: { readings?: LevelReading[] } })
    .recovery;
  const start = pumpingEnd ?? 0;
  const recovery = rawRecovery
    ? {
        start,
        points: cleanReadings(rawRecovery.readings).map(r => point(start, r)),
      }
    : null;

  return { staticLevel, steps, pumpingEnd, recovery };
}

/**
 * Drawdown against each step's own elapsed time, for a semi-log
 * (Cooper–Jacob) plot. Only points with `elapsed > 0`; empty without a
 * static level.
 */
export function semilogDrawdownSeries(event: HydrodynamicEvent): {
  step: number;
  rate: number | null;
  points: { elapsed: number; drawdown: number }[];
}[] {
  const { staticLevel, steps } = pumpingTimeline(event);
  if (staticLevel == null) return [];
  return steps
    .map(s => ({
      step: s.index,
      rate: s.rate,
      points: s.points
        .filter(p => p.elapsed > 0)
        .map(p => ({ elapsed: p.elapsed, drawdown: p.drawdown! })),
    }))
    .filter(s => s.points.length > 0);
}

/**
 * Theis recovery series: `ratio` = t/t′ (time since pumping started over
 * time since it stopped) against the residual drawdown, or against the depth
 * (`residual: false`) when there is no static level. Empty when the pumping
 * duration is unknown.
 */
export function theisRecoverySeries(
  event: HydrodynamicEvent,
): { ratio: number; value: number; residual: boolean }[] {
  const { pumpingEnd, recovery } = pumpingTimeline(event);
  if (pumpingEnd == null || pumpingEnd <= 0 || !recovery) return [];
  return recovery.points
    .filter(p => p.elapsed > 0)
    .map(p => ({
      ratio: (pumpingEnd + p.elapsed) / p.elapsed,
      value: p.drawdown ?? p.depth,
      residual: p.drawdown != null,
    }));
}

/**
 * Step-drawdown test values from the last reading of each step: drawdown,
 * specific drawdown s/Q and specific capacity Q/s. Steps without a positive
 * rate or readings are skipped; empty without a static level.
 */
export function stepTestSeries(event: HydrodynamicEvent): {
  step: number;
  rate: number;
  drawdown: number;
  specificDrawdown: number;
  specificCapacity: number;
}[] {
  const { staticLevel, steps } = pumpingTimeline(event);
  if (staticLevel == null) return [];
  return steps.flatMap(s => {
    const last = s.points[s.points.length - 1];
    if (s.rate == null || s.rate <= 0 || !last) return [];
    const drawdown = last.drawdown!;
    return [
      {
        step: s.index,
        rate: s.rate,
        drawdown,
        specificDrawdown: drawdown / s.rate,
        specificCapacity: drawdown !== 0 ? s.rate / drawdown : Infinity,
      },
    ];
  });
}

/** Pumping-test plots that the event has enough data for, in display order. */
export function availablePumpingCharts(
  event: HydrodynamicEvent,
): PumpingChartKind[] {
  const timeline = pumpingTimeline(event);
  const out: PumpingChartKind[] = [];
  const pointCount =
    timeline.steps.reduce((n, s) => n + s.points.length, 0) +
    (timeline.recovery?.points.length ?? 0);
  if (pointCount >= 2) out.push('hydrograph');
  if (semilogDrawdownSeries(event).some(s => s.points.length >= 2))
    out.push('semilog');
  if (theisRecoverySeries(event).length >= 2) out.push('recovery');
  if (event.type === 'step_drawdown' && stepTestSeries(event).length >= 2)
    out.push('stepTest');
  return out;
}
