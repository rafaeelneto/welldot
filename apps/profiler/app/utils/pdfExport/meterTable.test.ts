import type { Meter, Well } from '@welldot/core';
import { describe, expect, it } from 'vitest';
import { buildMeterSection } from './meterTable';
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

describe('buildMeterSection', () => {
  it('returns null when there are no meters', () => {
    expect(buildMeterSection(baseWell(), baseOptions, t)).toBeNull();
  });

  it('lists meters newest first, marking the current one', () => {
    const meters: Meter[] = [
      {
        id: 'old',
        installed_at: '2020-01-01T10:00:00-03:00',
        removed_at: '2024-01-01T10:00:00-03:00',
        type: 'mechanical',
      },
      {
        id: 'new',
        installed_at: '2024-01-01T12:00:00-03:00',
        type: 'electromagnetic',
        serial: 'HM-42',
        nominal_diameter: 50,
        max_reading: 99999,
      },
    ];
    const serialized = JSON.stringify(
      buildMeterSection(baseWell({ meters }), baseOptions, t),
    );
    expect(serialized.indexOf('electromagnetic')).toBeLessThan(
      serialized.indexOf('mechanical'),
    );
    expect(serialized).toContain('current');
    expect(serialized).toContain('HM-42');
    expect(serialized).toContain('50.0 mm');
    expect(serialized).toContain('99,999 m³');
  });

  it('shows the register capacity in the chosen volume unit', () => {
    const meters: Meter[] = [
      { id: 'm', installed_at: '2024-01-01T12:00:00-03:00', max_reading: 10 },
    ];
    const serialized = JSON.stringify(
      buildMeterSection(
        baseWell({ meters }),
        { ...baseOptions, volumeUnit: 'L' },
        t,
      ),
    );
    expect(serialized).toContain('10,000 L');
  });
});
