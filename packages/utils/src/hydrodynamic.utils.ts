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
