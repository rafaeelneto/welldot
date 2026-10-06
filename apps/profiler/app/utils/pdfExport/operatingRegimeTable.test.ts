import type { OperatingRegime, Well } from '@welldot/core';
import { describe, expect, it } from 'vitest';
import { buildOperatingRegimeSection } from './operatingRegimeTable';
import type { PdfExportOptions } from './types';

function baseWell(overrides: Partial<Well> = {}): Well {
  return {
    version: 2,
    bore_hole: [],
    well_case: [],
    reduction: [],
    well_screen: [],
    surface_case: [],
    hole_fill: [],
    lithology: [],
    fractures: [],
    caves: [],
    ...overrides,
  };
}

const baseOptions: PdfExportOptions = {
  header: 'Header',
  breakPages: false,
  scale: 500,
  metadataPosition: 'before',
  headingInfo: [],
  endInfo: [],
  lengthUnit: 'm',
  diameterUnit: 'mm',
  coordinateFormat: 'DD',
  locale: 'en',
  baseUrl: 'https://example.test',
};

const t = (key: string) => key.split('.').pop()!;

describe('buildOperatingRegimeSection', () => {
  it('returns null when there is no regime', () => {
    expect(buildOperatingRegimeSection(baseWell(), baseOptions, t)).toBeNull();
  });

  it('lists regimes newest first, marking the one in force', () => {
    const regimes: OperatingRegime[] = [
      {
        id: 'old',
        effective_from: '2020-01-01T00:00:00-03:00',
        flow_rate: 10,
        notes: 'first regime',
      },
      {
        id: 'new',
        effective_from: '2024-01-01T00:00:00-03:00',
        flow_rate: 12,
        daily_operating_time: 20,
        days_per_week: 6,
        notes: 'second regime',
      },
    ];
    const serialized = JSON.stringify(
      buildOperatingRegimeSection(
        baseWell({ operating_regime: regimes }),
        baseOptions,
        t,
      ),
    );
    expect(serialized.indexOf('second regime')).toBeLessThan(
      serialized.indexOf('first regime'),
    );
    expect(serialized).toContain('01/01/2024');
    expect(serialized).toContain('inForce');
    expect(serialized).toContain('12.00 m³/h');
    expect(serialized).toContain('"20"');
  });

  it('prints absent values as unknown, never zero', () => {
    const regimes: OperatingRegime[] = [
      { id: 'r', effective_from: '2024-01-01T00:00:00-03:00' },
    ];
    const serialized = JSON.stringify(
      buildOperatingRegimeSection(
        baseWell({ operating_regime: regimes }),
        baseOptions,
        t,
      ),
    );
    expect(serialized).toContain('—');
    expect(serialized).not.toContain('0.00 m³/h');
  });
});
