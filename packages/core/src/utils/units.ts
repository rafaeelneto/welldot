// ─── Constants ────────────────────────────────────────────────────────────────

const FEET_PER_METER = 3.280_839_895;
const METERS_PER_FOOT = 0.304_8; // exact (international foot)
const MM_PER_INCH = 25.4; // exact
const M3H_TO_LS = 1 / 3.6;
const M3H_TO_USGPM = 4.402_867_361;
const M2S_TO_M2D = 86_400;
const PSI_PER_KPA = 0.145_037_738;
const SLOT_MM = 0.025_4; // 1 slot = 0.001 in = 0.0254 mm

// ─── Types ────────────────────────────────────────────────────────────────────

export type DmsCoordinate = {
  degrees: number;
  minutes: number;
  seconds: number;
  /** 'N' | 'S' for latitude axes; 'E' | 'W' for longitude axes */
  direction: 'N' | 'S' | 'E' | 'W';
};

// ─── Length ───────────────────────────────────────────────────────────────────

export function metersToFeet(m: number): number {
  return m * FEET_PER_METER;
}

export function feetToMeters(ft: number): number {
  return ft * METERS_PER_FOOT;
}

// ─── Diameter ─────────────────────────────────────────────────────────────────

export function mmToInches(mm: number): number {
  return mm / MM_PER_INCH;
}

export function inchesToMm(inches: number): number {
  return inches * MM_PER_INCH;
}

// ─── Flow Rate ────────────────────────────────────────────────────────────────

export function cubicMeterPerHourToLitersPerSecond(q: number): number {
  return q * M3H_TO_LS;
}

export function litersPerSecondToCubicMeterPerHour(q: number): number {
  return q / M3H_TO_LS;
}

export function cubicMeterPerHourToUsGallonsPerMinute(q: number): number {
  return q * M3H_TO_USGPM;
}

export function usGallonsPerMinuteToCubicMeterPerHour(q: number): number {
  return q / M3H_TO_USGPM;
}

// ─── Transmissivity ───────────────────────────────────────────────────────────

export function squareMeterPerSecondToSquareMeterPerDay(t: number): number {
  return t * M2S_TO_M2D;
}

export function squareMeterPerDayToSquareMeterPerSecond(t: number): number {
  return t / M2S_TO_M2D;
}

// ─── Coordinates ──────────────────────────────────────────────────────────────

/**
 * Converts decimal degrees to DMS.
 * @param degrees - Signed decimal degrees (negative = S for lat, W for lng).
 * @param axis - 'lat' produces N/S; 'lng' produces E/W. Defaults to 'lat'.
 */
export function decimalDegreesToDms(
  degrees: number,
  axis: 'lat' | 'lng' = 'lat',
): DmsCoordinate {
  const abs = Math.abs(degrees);
  const d = Math.floor(abs);
  const minFloat = (abs - d) * 60;
  const m = Math.floor(minFloat);
  const s = (minFloat - m) * 60;
  const direction =
    axis === 'lat' ? (degrees >= 0 ? 'N' : 'S') : degrees >= 0 ? 'E' : 'W';
  return { degrees: d, minutes: m, seconds: s, direction };
}

/** Converts DMS back to signed decimal degrees. */
export function dmsToDecimalDegrees(dms: DmsCoordinate): number {
  const abs = dms.degrees + dms.minutes / 60 + dms.seconds / 3600;
  return dms.direction === 'S' || dms.direction === 'W' ? -abs : abs;
}

// ─── Screen Slot ──────────────────────────────────────────────────────────────

/** Converts a US slot number to millimeters (1 slot = 0.001 in = 0.0254 mm). */
export function slotNumberToMm(slotNumber: number): number {
  return slotNumber * SLOT_MM;
}

/** Converts millimeters to the nearest US slot number. */
export function mmToSlotNumber(mm: number): number {
  return Math.round(mm / SLOT_MM);
}

// ─── Pressure ─────────────────────────────────────────────────────────────────

export function kilopascalToPsi(kPa: number): number {
  return kPa * PSI_PER_KPA;
}

export function psiToKilopascal(psi: number): number {
  return psi / PSI_PER_KPA;
}

// ─── Time ─────────────────────────────────────────────────────────────────────

export function minutesToHours(min: number): number {
  return min / 60;
}

export function hoursToMinutes(h: number): number {
  return h * 60;
}
