import type { PumpInstallation } from '@welldot/core';
import { describe, expect, it } from 'vitest';
import {
  baseWell,
  collectFields,
  lastSegmentLabels,
  makeTestContext,
} from '../test-utils';
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
    const fields = collectFields(JSON.parse(serialized));
    expect(fields.installedBy).toEqual(['Perfurações Silva']);
    expect(fields.removedBy).toEqual(['Hidro Serviços']);
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

  it('lays the fields out as a label/value grid, notes on their own row', () => {
    const pumps: PumpInstallation[] = [
      {
        id: 'p',
        installed_at: '2024-01-01T12:00:00-03:00',
        type: 'submersible',
        serial: 'SN-1',
        riser_diameter: 75,
        riser_material: 'galvanized_steel',
        notes: 'Replaced after wear',
      },
    ];
    const section = buildPumpInstallationSection(
      baseWell({ pump_installations: pumps }),
      ctx,
    );
    const fields = collectFields(section);
    expect(fields.serial).toEqual(['SN-1']);
    expect(fields.riserDiameter).toEqual(['75.0 mm']);
    expect(fields.riserMaterial).toHaveLength(1);
    expect(fields.notes).toEqual(['Replaced after wear']);

    const grid = (section as { stack: unknown[] }).stack[1] as {
      table: { widths: unknown[]; body: { colSpan?: number }[][] };
    };
    expect(grid.table.widths).toHaveLength(4);
    // Notes span the whole last row.
    expect(grid.table.body[grid.table.body.length - 1]![0]!.colSpan).toBe(4);
  });

  it('uses two grid columns in a narrow content width', () => {
    const pumps: PumpInstallation[] = [
      {
        id: 'p',
        installed_at: '2024-01-01T12:00:00-03:00',
        type: 'jet',
        serial: 'SN-1',
      },
    ];
    const narrow = { ...ctx, page: { ...ctx.page, contentWidth: 300 } };
    const section = buildPumpInstallationSection(
      baseWell({ pump_installations: pumps }),
      narrow,
    ) as { stack: { table?: { widths: unknown[] } }[] };
    expect(section.stack[1]!.table!.widths).toHaveLength(2);
  });
});
