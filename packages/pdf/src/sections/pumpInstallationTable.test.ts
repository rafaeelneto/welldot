import type { PumpInstallation } from '@welldot/core';
import { describe, expect, it } from 'vitest';
import { baseWell, lastSegmentLabels, makeTestContext } from '../test-utils';
import { buildPumpInstallationSection } from './pumpInstallationTable';

const ctx = makeTestContext({}, lastSegmentLabels);

describe('buildPumpInstallationSection', () => {
  it('returns null when there are no installations', () => {
    expect(buildPumpInstallationSection(baseWell(), ctx)).toBeNull();
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
        ctx,
      ),
    );
    expect(serialized.indexOf('Submersible pump')).toBeLessThan(
      serialized.indexOf('Jet pump'),
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
        makeTestContext(
          { units: { flow: 'L/s', power: 'cv' } },
          lastSegmentLabels,
        ),
      ),
    );
    expect(serialized).toContain('10.00 L/s');
    expect(serialized).toContain('10 cv');
  });

  it('lists who installed and removed the unit', () => {
    const list: PumpInstallation[] = [
      {
        id: 'old',
        installed_at: '2020-01-01T12:00:00-03:00',
        removed_at: '2024-01-01T12:00:00-03:00',
        type: 'submersible',
        installed_by: 'Perfurações Silva',
        removed_by: 'Hidro Serviços',
      },
      {
        id: 'current',
        installed_at: '2024-01-01T13:00:00-03:00',
        type: 'submersible',
        removed_by: 'Ignored Crew',
      },
    ];
    const serialized = JSON.stringify(
      buildPumpInstallationSection(baseWell({ pump_installations: list }), ctx),
    );
    expect(serialized).toContain('installedBy: Perfurações Silva');
    expect(serialized).toContain('removedBy: Hidro Serviços');
    expect(serialized).not.toContain('Ignored Crew');
  });

  it('honors a custom date format for the installation period', () => {
    const pumps: PumpInstallation[] = [
      {
        id: 'p',
        installed_at: '2020-03-05T12:00:00Z',
        removed_at: '2024-07-08T12:00:00Z',
        type: 'submersible',
      },
    ];
    const serialized = JSON.stringify(
      buildPumpInstallationSection(
        baseWell({ pump_installations: pumps }),
        makeTestContext(
          { dateFormats: { date: 'yyyy-MM-dd' } },
          lastSegmentLabels,
        ),
      ),
    );
    expect(serialized).toContain('2020-03-05 → 2024-07-08');
  });
});
