import { describe, expect, it } from 'vitest';

import {
  cubicMeterPerHourToLitersPerSecond,
  cubicMeterPerHourToUsGallonsPerMinute,
  decimalDegreesToDms,
  dmsToDecimalDegrees,
  feetToMeters,
  hoursToMinutes,
  inchesToMm,
  kilopascalToPsi,
  litersPerSecondToCubicMeterPerHour,
  metersToFeet,
  minutesToHours,
  mmToInches,
  mmToSlotNumber,
  psiToKilopascal,
  slotNumberToMm,
  squareMeterPerDayToSquareMeterPerSecond,
  squareMeterPerSecondToSquareMeterPerDay,
  usGallonsPerMinuteToCubicMeterPerHour,
} from './units';

// ─── Length ───────────────────────────────────────────────────────────────────

describe('metersToFeet', () => {
  it('converts 1 m to ~3.280840 ft', () => {
    expect(metersToFeet(1)).toBeCloseTo(3.280_839_895, 6);
  });
  it('converts 0 m to 0 ft', () => {
    expect(metersToFeet(0)).toBe(0);
  });
  it('round-trips with feetToMeters', () => {
    expect(feetToMeters(metersToFeet(100))).toBeCloseTo(100, 9);
  });
});

describe('feetToMeters', () => {
  it('converts 1 ft to 0.3048 m exactly', () => {
    expect(feetToMeters(1)).toBe(0.3048);
  });
  it('converts 0 ft to 0 m', () => {
    expect(feetToMeters(0)).toBe(0);
  });
});

// ─── Diameter ─────────────────────────────────────────────────────────────────

describe('mmToInches / inchesToMm', () => {
  it('25.4 mm = 1 inch', () => {
    expect(mmToInches(25.4)).toBeCloseTo(1, 10);
  });
  it('1 inch = 25.4 mm exactly', () => {
    expect(inchesToMm(1)).toBe(25.4);
  });
  it('0 mm = 0 inches', () => {
    expect(mmToInches(0)).toBe(0);
  });
  it('round-trips', () => {
    expect(inchesToMm(mmToInches(150))).toBeCloseTo(150, 10);
  });
});

// ─── Flow Rate ────────────────────────────────────────────────────────────────

describe('cubicMeterPerHourToLitersPerSecond / inverse', () => {
  it('3.6 m³/h = 1 L/s', () => {
    expect(cubicMeterPerHourToLitersPerSecond(3.6)).toBeCloseTo(1, 10);
  });
  it('1 L/s = 3.6 m³/h', () => {
    expect(litersPerSecondToCubicMeterPerHour(1)).toBeCloseTo(3.6, 10);
  });
  it('0 input returns 0', () => {
    expect(cubicMeterPerHourToLitersPerSecond(0)).toBe(0);
  });
  it('round-trips', () => {
    expect(
      litersPerSecondToCubicMeterPerHour(cubicMeterPerHourToLitersPerSecond(10)),
    ).toBeCloseTo(10, 10);
  });
});

describe('cubicMeterPerHourToUsGallonsPerMinute / inverse', () => {
  it('1 m³/h ≈ 4.4029 US GPM', () => {
    expect(cubicMeterPerHourToUsGallonsPerMinute(1)).toBeCloseTo(4.402_867, 3);
  });
  it('0 input returns 0', () => {
    expect(cubicMeterPerHourToUsGallonsPerMinute(0)).toBe(0);
  });
  it('round-trips', () => {
    expect(
      usGallonsPerMinuteToCubicMeterPerHour(
        cubicMeterPerHourToUsGallonsPerMinute(10),
      ),
    ).toBeCloseTo(10, 6);
  });
});

// ─── Transmissivity ───────────────────────────────────────────────────────────

describe('squareMeterPerSecondToSquareMeterPerDay / inverse', () => {
  it('1 m²/s = 86400 m²/day', () => {
    expect(squareMeterPerSecondToSquareMeterPerDay(1)).toBe(86_400);
  });
  it('86400 m²/day = 1 m²/s', () => {
    expect(squareMeterPerDayToSquareMeterPerSecond(86_400)).toBeCloseTo(1, 10);
  });
  it('0 input returns 0', () => {
    expect(squareMeterPerSecondToSquareMeterPerDay(0)).toBe(0);
  });
  it('round-trips', () => {
    expect(
      squareMeterPerDayToSquareMeterPerSecond(
        squareMeterPerSecondToSquareMeterPerDay(5e-4),
      ),
    ).toBeCloseTo(5e-4, 15);
  });
});

// ─── Coordinates ──────────────────────────────────────────────────────────────

describe('decimalDegreesToDms', () => {
  it('positive latitude → N', () => {
    expect(decimalDegreesToDms(1.4558, 'lat').direction).toBe('N');
  });
  it('negative latitude → S', () => {
    expect(decimalDegreesToDms(-1.4558, 'lat').direction).toBe('S');
  });
  it('positive longitude → E', () => {
    expect(decimalDegreesToDms(48.5044, 'lng').direction).toBe('E');
  });
  it('negative longitude → W', () => {
    expect(decimalDegreesToDms(-48.5044, 'lng').direction).toBe('W');
  });
  it('0° returns degrees=0, minutes=0, seconds≈0', () => {
    const r = decimalDegreesToDms(0, 'lat');
    expect(r.degrees).toBe(0);
    expect(r.minutes).toBe(0);
    expect(r.seconds).toBeCloseTo(0, 10);
  });
  it('defaults axis to lat', () => {
    expect(decimalDegreesToDms(-1).direction).toBe('S');
  });
});

describe('dmsToDecimalDegrees', () => {
  it('round-trips with decimalDegreesToDms for lat', () => {
    const dms = decimalDegreesToDms(-1.4558, 'lat');
    expect(dmsToDecimalDegrees(dms)).toBeCloseTo(-1.4558, 8);
  });
  it('round-trips with decimalDegreesToDms for lng', () => {
    const dms = decimalDegreesToDms(-48.5044, 'lng');
    expect(dmsToDecimalDegrees(dms)).toBeCloseTo(-48.5044, 8);
  });
  it('S direction returns negative', () => {
    expect(
      dmsToDecimalDegrees({ degrees: 1, minutes: 30, seconds: 0, direction: 'S' }),
    ).toBeCloseTo(-1.5, 10);
  });
  it('W direction returns negative', () => {
    expect(
      dmsToDecimalDegrees({ degrees: 48, minutes: 0, seconds: 0, direction: 'W' }),
    ).toBeCloseTo(-48, 10);
  });
  it('N direction returns positive', () => {
    expect(
      dmsToDecimalDegrees({ degrees: 1, minutes: 0, seconds: 0, direction: 'N' }),
    ).toBeCloseTo(1, 10);
  });
});

// ─── Screen Slot ──────────────────────────────────────────────────────────────

describe('slotNumberToMm / mmToSlotNumber', () => {
  it('slot 10 = 0.254 mm', () => {
    expect(slotNumberToMm(10)).toBeCloseTo(0.254, 10);
  });
  it('slot 100 = 2.54 mm', () => {
    expect(slotNumberToMm(100)).toBeCloseTo(2.54, 10);
  });
  it('0 slot = 0 mm', () => {
    expect(slotNumberToMm(0)).toBe(0);
  });
  it('0.254 mm = slot 10', () => {
    expect(mmToSlotNumber(0.254)).toBe(10);
  });
  it('round-trips', () => {
    expect(mmToSlotNumber(slotNumberToMm(50))).toBe(50);
  });
});

// ─── Pressure ─────────────────────────────────────────────────────────────────

describe('kilopascalToPsi / psiToKilopascal', () => {
  it('100 kPa ≈ 14.504 psi', () => {
    expect(kilopascalToPsi(100)).toBeCloseTo(14.5038, 3);
  });
  it('0 kPa = 0 psi', () => {
    expect(kilopascalToPsi(0)).toBe(0);
  });
  it('round-trips', () => {
    expect(psiToKilopascal(kilopascalToPsi(200))).toBeCloseTo(200, 8);
  });
});

// ─── Time ─────────────────────────────────────────────────────────────────────

describe('minutesToHours / hoursToMinutes', () => {
  it('60 minutes = 1 hour', () => {
    expect(minutesToHours(60)).toBe(1);
  });
  it('1 hour = 60 minutes', () => {
    expect(hoursToMinutes(1)).toBe(60);
  });
  it('0 input returns 0', () => {
    expect(minutesToHours(0)).toBe(0);
  });
  it('round-trips', () => {
    expect(hoursToMinutes(minutesToHours(90))).toBe(90);
  });
});
