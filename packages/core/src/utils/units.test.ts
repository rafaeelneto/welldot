import { describe, expect, it } from 'vitest';

import {
  cubicMeterPerHourToLitersPerSecond,
  cubicMeterPerHourToUsGallonsPerMinute,
  cubicMetersToLiters,
  cvToKilowatts,
  decimalDegreesToDms,
  dmsToDecimalDegrees,
  feetToMeters,
  flowFromCanonical,
  flowToCanonical,
  hoursToMinutes,
  hpToKilowatts,
  inchesToMm,
  kilopascalToPsi,
  kilowattsToCv,
  kilowattsToHp,
  litersPerSecondToCubicMeterPerHour,
  litersToCubicMeters,
  metersToFeet,
  minutesToHours,
  mmToInches,
  mmToSlotNumber,
  powerFromCanonical,
  powerToCanonical,
  psiToKilopascal,
  slotNumberToMm,
  squareMeterPerDayToSquareMeterPerSecond,
  squareMeterPerSecondToSquareMeterPerDay,
  usGallonsPerMinuteToCubicMeterPerHour,
  volumeFromCanonical,
  volumeToCanonical,
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
      litersPerSecondToCubicMeterPerHour(
        cubicMeterPerHourToLitersPerSecond(10),
      ),
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
      dmsToDecimalDegrees({
        degrees: 1,
        minutes: 30,
        seconds: 0,
        direction: 'S',
      }),
    ).toBeCloseTo(-1.5, 10);
  });
  it('W direction returns negative', () => {
    expect(
      dmsToDecimalDegrees({
        degrees: 48,
        minutes: 0,
        seconds: 0,
        direction: 'W',
      }),
    ).toBeCloseTo(-48, 10);
  });
  it('N direction returns positive', () => {
    expect(
      dmsToDecimalDegrees({
        degrees: 1,
        minutes: 0,
        seconds: 0,
        direction: 'N',
      }),
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

describe('litersToCubicMeters / cubicMetersToLiters', () => {
  it('converts 1000 L to 1 m³', () => {
    expect(litersToCubicMeters(1000)).toBe(1);
  });

  it('round-trips', () => {
    expect(litersToCubicMeters(cubicMetersToLiters(12.5))).toBeCloseTo(12.5, 9);
  });
});

describe('cvToKilowatts / kilowattsToCv', () => {
  it('converts 1 cv to 0.73549875 kW', () => {
    expect(cvToKilowatts(1)).toBeCloseTo(0.735_498_75, 9);
  });

  it('round-trips', () => {
    expect(kilowattsToCv(cvToKilowatts(7.5))).toBeCloseTo(7.5, 9);
  });
});

describe('hpToKilowatts / kilowattsToHp', () => {
  it('converts 1 hp to ~0.7457 kW', () => {
    expect(hpToKilowatts(1)).toBeCloseTo(0.745_699_872, 9);
  });

  it('round-trips', () => {
    expect(kilowattsToHp(hpToKilowatts(10))).toBeCloseTo(10, 9);
  });
});

describe('flowFromCanonical / flowToCanonical', () => {
  it('passes m3/h through unchanged', () => {
    expect(flowFromCanonical(36, 'm3/h')).toBe(36);
    expect(flowToCanonical(36, 'm3/h')).toBe(36);
  });

  it('converts 36 m³/h to 10 L/s and back', () => {
    expect(flowFromCanonical(36, 'L/s')).toBeCloseTo(10, 9);
    expect(flowToCanonical(10, 'L/s')).toBeCloseTo(36, 9);
  });

  it('round-trips gpm', () => {
    expect(flowToCanonical(flowFromCanonical(15, 'gpm'), 'gpm')).toBeCloseTo(
      15,
      9,
    );
  });
});

describe('powerFromCanonical / powerToCanonical', () => {
  it('passes kW through unchanged', () => {
    expect(powerFromCanonical(5.5, 'kW')).toBe(5.5);
    expect(powerToCanonical(5.5, 'kW')).toBe(5.5);
  });

  it('converts cv and hp', () => {
    expect(powerToCanonical(10, 'cv')).toBeCloseTo(7.3549875, 9);
    expect(powerFromCanonical(powerToCanonical(10, 'hp'), 'hp')).toBeCloseTo(
      10,
      9,
    );
  });
});

describe('volumeFromCanonical / volumeToCanonical', () => {
  it('passes m3 through unchanged', () => {
    expect(volumeFromCanonical(12, 'm3')).toBe(12);
    expect(volumeToCanonical(12, 'm3')).toBe(12);
  });

  it('converts liters, cubic feet and US gallons', () => {
    expect(volumeFromCanonical(1, 'L')).toBe(1000);
    expect(volumeFromCanonical(1, 'ft3')).toBeCloseTo(35.3146667, 6);
    expect(volumeToCanonical(1, 'gal')).toBeCloseTo(0.003785411784, 12);
    for (const unit of ['L', 'ft3', 'gal'] as const) {
      expect(
        volumeToCanonical(volumeFromCanonical(42.5, unit), unit),
      ).toBeCloseTo(42.5, 9);
    }
  });
});
