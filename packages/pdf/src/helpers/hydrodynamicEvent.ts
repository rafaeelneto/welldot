import type { HydrodynamicEvent, LevelReading } from '@welldot/core';

export function lastReading(event: HydrodynamicEvent): LevelReading | null {
  const ev = event as Record<string, unknown>;
  const steps = ev.steps as Array<{ readings?: LevelReading[] }> | undefined;
  if (!steps?.length) return null;
  for (let i = steps.length - 1; i >= 0; i--) {
    const r = steps[i]!.readings;
    if (r?.length) return r[r.length - 1]!;
  }
  return null;
}

export function stepRate(event: HydrodynamicEvent, index = 0): number | null {
  const steps = (event as Record<string, unknown>).steps as
    | Array<{ rate: number }>
    | undefined;
  return steps?.[index]?.rate ?? null;
}
