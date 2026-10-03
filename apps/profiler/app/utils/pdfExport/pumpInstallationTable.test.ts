import type { PumpInstallation, Well } from '@welldot/core';
import { describe, expect, it } from 'vitest';
import { buildPumpInstallationSection } from './pumpInstallationTable';
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

describe('buildPumpInstallationSection', () => {
  it('returns null when there are no installations', () => {
    expect(buildPumpInstallationSection(baseWell(), baseOptions, t)).toBeNull();
  });

  it('lists installations newest first, marking the current one', () => {
    const pumps: PumpInstallation[] = [
      {
        id: 'old',
        installed_at: '2020-01-01T10:00:00-03:00',
        removed_at: '2024-01-01T10:00:00-03:00',
        type: 'jet',
      },
      {
        id: 'new',
        installed_at: '2024-01-01T12:00:00-03:00',
        type: 'submersible',
        manufacturer: 'Acme',
        model: 'SP-5',
        intake_depth: 60,
        attachments: [
          {
            id: 'a',
            uri: 'https://example.test/curve.pdf',
            media_type: 'application/pdf',
            filename: 'curve.pdf',
          },
        ],
      },
    ];
    const serialized = JSON.stringify(
      buildPumpInstallationSection(
        baseWell({ pump_installations: pumps }),
        baseOptions,
        t,
      ),
    );
    expect(serialized.indexOf('submersible')).toBeLessThan(
      serialized.indexOf('jet'),
    );
    expect(serialized).toContain('current');
    expect(serialized).toContain('Acme SP-5');
    expect(serialized).toContain('60.00 m');
    expect(serialized).toContain('curve.pdf');
  });

  it('shows flow and power in the chosen display units', () => {
    const pumps: PumpInstallation[] = [
      {
        id: 'p',
        installed_at: '2024-01-01T12:00:00-03:00',
        type: 'submersible',
        rated_flow_rate: 36,
        rated_power: 7.3549875,
      },
    ];
    const serialized = JSON.stringify(
      buildPumpInstallationSection(
        baseWell({ pump_installations: pumps }),
        { ...baseOptions, flowUnit: 'L/s', powerUnit: 'cv' },
        t,
      ),
    );
    expect(serialized).toContain('10.00 L/s');
    expect(serialized).toContain('10 cv');
  });
});
