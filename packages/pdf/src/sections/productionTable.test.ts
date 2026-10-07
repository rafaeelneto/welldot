import type { Meter, ProductionEntry } from '@welldot/core';
import { describe, expect, it } from 'vitest';
import { baseWell, lastSegmentLabels, makeTestContext } from '../test-utils';
import { buildProductionSection } from './productionTable';

const ctx = makeTestContext({}, lastSegmentLabels);

const meter: Meter = {
  id: 'm1',
  installed_at: '2024-01-01T00:00:00-03:00',
  type: 'mechanical',
  serial: 'HM-1',
};

describe('buildProductionSection', () => {
  it('returns null when the ledger is empty', () => {
    expect(buildProductionSection(baseWell(), ctx)).toBeNull();
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
      buildProductionSection(baseWell({ meters: [meter], production }), ctx),
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
              identifier: '1',
              issued_at: '2020-01-01',
              volume_limits: [{ period: 'annual', volume: 1000 }],
            },
          ],
        }),
        ctx,
      ),
    );
    expect(serialized).toContain('ofLimit');
    expect(serialized).toContain('50%');
  });

  it('honors custom date formats in the ledger', () => {
    const production: ProductionEntry[] = [
      {
        id: 'r1',
        type: 'meter_reading',
        datetime: '2024-01-01T08:30:00-03:00',
        meter_id: 'm1',
        reading: 100,
      },
      {
        id: 'd1',
        type: 'declared_volume',
        period_start: '2024-01-01T00:00:00-03:00',
        period_end: '2025-01-01T00:00:00-03:00',
        volume: 1200,
      },
    ];
    const serialized = JSON.stringify(
      buildProductionSection(
        baseWell({ meters: [meter], production }),
        makeTestContext(
          { dateFormats: { date: 'yyyy-MM-dd', dateTime: 'yyyy-MM-dd HH:mm' } },
          lastSegmentLabels,
        ),
      ),
    );
    // Instants are formatted in the local timezone; match the pattern shape.
    expect(serialized).toMatch(/"\d{4}-\d{2}-\d{2} \d{2}:\d{2}"/);
    expect(serialized).toMatch(/\d{4}-\d{2}-\d{2} → \d{4}-\d{2}-\d{2}/);
    // The meter label (installation date) follows the date format too.
    expect(serialized).toMatch(/HM-1 · \d{4}-\d{2}-\d{2}/);
    expect(serialized).not.toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });
});
