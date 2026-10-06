import type { Meter, ProductionEntry, Well } from '@welldot/core';
import { describe, expect, it } from 'vitest';
import { buildProductionSection } from './productionTable';
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

const meter: Meter = {
  id: 'm1',
  installed_at: '2024-01-01T00:00:00-03:00',
  type: 'mechanical',
  serial: 'HM-1',
};

describe('buildProductionSection', () => {
  it('returns null when the ledger is empty', () => {
    expect(buildProductionSection(baseWell(), baseOptions, t)).toBeNull();
  });

  it('prints totals, the annual table and the ledger with retractions', () => {
    const production: ProductionEntry[] = [
      {
        id: 'r1',
        type: 'meter_reading',
        datetime: '2024-01-01T00:00:00-03:00',
        meter_id: 'm1',
        reading: 100,
      },
      {
        id: 'r2',
        type: 'meter_reading',
        datetime: '2024-06-01T00:00:00-03:00',
        meter_id: 'm1',
        reading: 9999,
      },
      {
        id: 'r2b',
        type: 'meter_reading',
        datetime: '2024-06-01T00:00:00-03:00',
        meter_id: 'm1',
        reading: 1100,
        corrects: 'r2',
      },
      {
        id: 'd1',
        type: 'declared_volume',
        period_start: '2024-01-01T00:00:00-03:00',
        period_end: '2025-01-01T00:00:00-03:00',
        volume: 1200,
        method: 'reported',
      },
    ];
    const serialized = JSON.stringify(
      buildProductionSection(
        baseWell({ meters: [meter], production }),
        baseOptions,
        t,
      ),
    );
    // metered = 1100 − 100; the retracted 9999 reading does not count.
    expect(serialized).toContain('1,000.0 m³');
    // reported volume is shown for comparison.
    expect(serialized).toContain('1,200.0 m³');
    expect(serialized).toContain('"2024"');
    expect(serialized).toContain('retracted');
    expect(serialized).toContain('correction');
    expect(serialized).toContain('lineThrough');
    expect(serialized).toContain('HM-1');
  });

  it('shows the share of the active permit annual limit', () => {
    const production: ProductionEntry[] = [
      {
        id: 'r1',
        type: 'meter_reading',
        datetime: '2024-01-01T00:00:00-03:00',
        meter_id: 'm1',
        reading: 0,
      },
      {
        id: 'r2',
        type: 'meter_reading',
        datetime: '2024-06-01T00:00:00-03:00',
        meter_id: 'm1',
        reading: 500,
      },
    ];
    const serialized = JSON.stringify(
      buildProductionSection(
        baseWell({
          meters: [meter],
          production,
          permits: [
            {
              id: 'p',
              type: 'abstraction_permit',
              authority: 'ANA',
              number: '1',
              issued_at: '2020-01-01',
              volume_limits: [{ period: 'annual', volume: 1000 }],
            },
          ],
        }),
        baseOptions,
        t,
      ),
    );
    expect(serialized).toContain('ofLimit');
    expect(serialized).toContain('50%');
  });
});
