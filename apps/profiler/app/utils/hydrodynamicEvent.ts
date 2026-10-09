import type { HydrodynamicEvent } from '@welldot/core';
import { allStepReadings } from '@welldot/utils';

// Reading helpers live in @welldot/utils; re-exported for auto-import.
export {
  allStepReadings,
  derivedStepDuration,
  lastReading,
  recoveryReadingsCount,
  stepHasReadings,
  stepRate,
} from '@welldot/utils';

export function hasSparkline(event: HydrodynamicEvent): boolean {
  return allStepReadings(event).length >= 2;
}

export function sparklinePoints(event: HydrodynamicEvent): string {
  const readings = allStepReadings(event);
  if (readings.length < 2) return '';
  const minE = Math.min(...readings.map(r => r.elapsed));
  const maxE = Math.max(...readings.map(r => r.elapsed));
  const minD = Math.min(...readings.map(r => r.depth));
  const maxD = Math.max(...readings.map(r => r.depth));
  const W = 200,
    H = 40,
    P = 3;
  const rX = maxE - minE || 1;
  const rY = maxD - minD || 1;
  return readings
    .map(r => {
      const x = P + ((r.elapsed - minE) / rX) * (W - P * 2);
      const y = P + ((r.depth - minD) / rY) * (H - P * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}
