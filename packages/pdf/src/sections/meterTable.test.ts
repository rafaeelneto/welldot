import type { Meter } from '@welldot/core';
import { describe, expect, it } from 'vitest';
import { baseWell, lastSegmentT, makeTestContext } from '../test-utils';
import { buildMeterSection } from './meterTable';

const ctx = makeTestContext({}, lastSegmentT);

describe('buildMeterSection', () => {
  it('returns null when there are no meters', () => {
    expect(buildMeterSection(baseWell(), ctx)).toBeNull();
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
      buildMeterSection(baseWell({ meters }), ctx),
    );
    expect(serialized.indexOf('Electromagnetic')).toBeLessThan(
      serialized.indexOf('Mechanical'),
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
        makeTestContext({ units: { volume: 'L' } }, lastSegmentT),
      ),
    );
    expect(serialized).toContain('10,000 L');
  });

  it('lists manufacturer, model and attachments', () => {
    const meters: Meter[] = [
      {
        id: 'm',
        installed_at: '2024-01-01T12:00:00-03:00',
        manufacturer: 'Saga',
        model: 'MAG-50',
        attachments: [
          {
            id: 'a1',
            uri: 'https://example.test/files/install-photo.jpg',
            media_type: 'image/jpeg',
          },
          {
            id: 'a2',
            uri: 'https://example.test/files/x.pdf',
            media_type: 'application/pdf',
            filename: 'nota-fiscal.pdf',
          },
        ],
      },
    ];
    const serialized = JSON.stringify(
      buildMeterSection(baseWell({ meters }), ctx),
    );
    expect(serialized).toContain('model: Saga MAG-50');
    expect(serialized).toContain('install-photo.jpg');
    expect(serialized).toContain('nota-fiscal.pdf');
  });

  it('lists who installed and removed the unit', () => {
    const list: Meter[] = [
      {
        id: 'old',
        installed_at: '2020-01-01T12:00:00-03:00',
        removed_at: '2024-01-01T12:00:00-03:00',
        installed_by: 'Perfurações Silva',
        removed_by: 'Hidro Serviços',
      },
      {
        id: 'current',
        installed_at: '2024-01-01T13:00:00-03:00',
        removed_by: 'Ignored Crew',
      },
    ];
    const serialized = JSON.stringify(
      buildMeterSection(baseWell({ meters: list }), ctx),
    );
    expect(serialized).toContain('installedBy: Perfurações Silva');
    expect(serialized).toContain('removedBy: Hidro Serviços');
    expect(serialized).not.toContain('Ignored Crew');
  });

  it('honors a custom date format for the installation period', () => {
    const meters: Meter[] = [
      {
        id: 'm',
        installed_at: '2020-03-05T12:00:00Z',
        removed_at: '2024-07-08T12:00:00Z',
      },
    ];
    const serialized = JSON.stringify(
      buildMeterSection(
        baseWell({ meters }),
        makeTestContext({ dateFormats: { date: 'yyyy-MM-dd' } }, lastSegmentT),
      ),
    );
    expect(serialized).toContain('2020-03-05 → 2024-07-08');
  });

  it('labels an untyped meter from the package label pack', () => {
    const meters: Meter[] = [
      { id: 'm', installed_at: '2024-01-01T12:00:00-03:00' },
    ];
    const serialized = JSON.stringify(
      buildMeterSection(baseWell({ meters }), makeTestContext()),
    );
    expect(serialized).toContain('"Meters"');
    expect(serialized).toContain('"Meter"');
    expect(serialized).toContain('Current');
  });
});
