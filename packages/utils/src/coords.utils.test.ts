import { describe, expect, it } from 'vitest';

import {
  clampLat,
  clampLng,
  ddToDms,
  formatCoord,
  parseToDd,
} from './coords.utils';

describe('ddToDms', () => {
  it('formats hemispheres for latitude and longitude', () => {
    expect(ddToDms(-1.5, true)).toBe(`1°30'0.00"S`);
    expect(ddToDms(48.25, false)).toBe(`48°15'0.00"E`);
    expect(ddToDms(-48.25, false)).toBe(`48°15'0.00"W`);
  });
});

describe('parseToDd', () => {
  it('accepts decimal degrees and DMS variants', () => {
    expect(parseToDd('-1.5')).toBe(-1.5);
    expect(parseToDd(`1°30'0"S`)).toBeCloseTo(-1.5);
    expect(parseToDd('23 30 45.12 S')).toBeCloseTo(-23.5125333, 6);
    expect(parseToDd('-23 30 45')).toBeCloseTo(-23.5125, 6);
  });

  it('returns NaN for empty or invalid input', () => {
    expect(parseToDd('')).toBeNaN();
    expect(parseToDd('-')).toBeNaN();
    expect(parseToDd('north')).toBeNaN();
  });
});

describe('clampLat / clampLng', () => {
  it('clamps to the valid ranges', () => {
    expect(clampLat(95)).toBe(90);
    expect(clampLat(-95)).toBe(-90);
    expect(clampLng(200)).toBe(180);
    expect(clampLng(-12)).toBe(-12);
  });
});

describe('formatCoord', () => {
  it('uses 6 decimals for DD and DMS otherwise', () => {
    expect(formatCoord(-1.5, 'DD', true)).toBe('-1.500000');
    expect(formatCoord(-1.5, 'DMS', true)).toBe(`1°30'0.00"S`);
  });
});
