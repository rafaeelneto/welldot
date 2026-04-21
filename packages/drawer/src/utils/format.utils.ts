import type { DiameterUnits, LengthUnits } from '@welldot/core';

const MM_TO_INCHES = 0.0393701;
const M_TO_FT = 3.28084;

export function formatLength(m: number, units: LengthUnits): string {
  return units === 'ft' ? (m * M_TO_FT).toFixed(1) : String(m);
}

export function formatDiameter(mm: number, units: DiameterUnits): string {
  return units === 'inches' ? (mm * MM_TO_INCHES).toFixed(2) : String(mm);
}

export function getLengthUnit(units: LengthUnits): string {
  return units === 'ft' ? 'ft' : 'm';
}

export function getDiameterUnit(units: DiameterUnits): string {
  return units === 'inches' ? '"' : 'mm';
}
