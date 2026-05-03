import type { DiameterUnits, LengthUnits } from '@welldot/core';

const MM_TO_INCHES = 0.0393701;
const M_TO_FT = 3.28084;

/** Formats a depth value in metres to the active length unit string. */
export function formatLength(m: number, units: LengthUnits): string {
  return units === 'ft' ? (m * M_TO_FT).toFixed(1) : String(m);
}

/** Formats a diameter value in millimetres to the active diameter unit string. */
export function formatDiameter(mm: number, units: DiameterUnits): string {
  return units === 'inches' ? (mm * MM_TO_INCHES).toFixed(2) : String(mm);
}

/** Returns the display label for the active length unit (e.g. `"m"` or `"ft"`). */
export function getLengthUnit(units: LengthUnits): string {
  return units === 'ft' ? 'ft' : 'm';
}

/** Returns the display label for the active diameter unit (e.g. `"mm"` or `'"'`). */
export function getDiameterUnit(units: DiameterUnits): string {
  return units === 'inches' ? '"' : 'mm';
}
