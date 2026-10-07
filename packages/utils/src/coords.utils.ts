// ─── Coordinate formatting and parsing ───────────────────────────────────────
// The DMS math lives in @welldot/core (`decimalDegreesToDms`); these add the
// display string, text parsing and clamping.
import { decimalDegreesToDms } from '@welldot/core';

/** Coordinate display format: decimal degrees or degrees/minutes/seconds. */
export type CoordFormat = 'DD' | 'DMS';

/**
 * Decimal degrees to `DD°MM'SS.ss"H`, with `N`/`S` for latitudes and
 * `E`/`W` for longitudes.
 *
 * @example ddToDms(-1.5, true) // `1°30'0.00"S`
 */
export function ddToDms(dd: number, isLat: boolean): string {
  const { degrees, minutes, seconds, direction } = decimalDegreesToDms(
    dd,
    isLat ? 'lat' : 'lng',
  );
  return `${degrees}°${minutes}'${seconds.toFixed(2)}"${direction}`;
}

/**
 * Parses a coordinate typed in decimal degrees or DMS
 * (`23°30'45.12"S`, `23 30 45.12 S`, `-23 30 45`) to decimal degrees.
 * Returns `NaN` on invalid input.
 */
export function parseToDd(input: string): number {
  const trimmed = input.trim();
  if (trimmed === '' || trimmed === '-') return NaN;

  const asNum = Number(trimmed);
  if (!isNaN(asNum)) return asNum;

  const dmsRe =
    /^(-?\d+(?:[°ºd\s]+))(\d+(?:['\s]+))?(\d+(?:[.,]\d+)?(?:["\s]+)?)?([NSEWnsew]?)$/;
  const match = trimmed.match(dmsRe);
  if (!match) return NaN;

  const deg = parseFloat(match[1] || '');
  const min = match[2] ? parseFloat(match[2]) : 0;
  const sec = match[3] ? parseFloat(match[3].replace(',', '.')) : 0;
  const dir = match[4]?.toUpperCase();

  let result = Math.abs(deg) + min / 60 + sec / 3600;
  if (deg < 0 || dir === 'S' || dir === 'W') result = -result;

  return result;
}

/** Clamps a latitude to [-90, 90]. */
export function clampLat(lat: number): number {
  return Math.min(90, Math.max(-90, lat));
}

/** Clamps a longitude to [-180, 180]. */
export function clampLng(lng: number): number {
  return Math.min(180, Math.max(-180, lng));
}

/** Formats one coordinate: 6-decimal degrees for `DD`, {@link ddToDms} for `DMS`. */
export function formatCoord(
  dd: number,
  format: CoordFormat,
  isLat: boolean,
): string {
  if (format === 'DMS') return ddToDms(dd, isLat);
  return dd.toFixed(6);
}
