import type { OperatingRegime } from '@welldot/core';
import { describe, expect, it } from 'vitest';
import { baseWell, lastSegmentT, makeTestContext } from '../test-utils';
import { buildOperatingRegimeSection } from './operatingRegimeTable';

const ctx = makeTestContext({}, lastSegmentT);

describe('buildOperatingRegimeSection', () => {
  it('returns null when there is no regime', () => {
    expect(buildOperatingRegimeSection(baseWell(), ctx)).toBeNull();
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
      buildOperatingRegimeSection(baseWell({ operating_regime: regimes }), ctx),
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
      buildOperatingRegimeSection(baseWell({ operating_regime: regimes }), ctx),
    );
    expect(serialized).toContain('—');
    expect(serialized).not.toContain('0.00 m³/h');
  });

  it('honors a custom dateTime format', () => {
    const regimes: OperatingRegime[] = [
      { id: 'r', effective_from: '2024-03-05T12:00:00Z', flow_rate: 5 },
    ];
    const serialized = JSON.stringify(
      buildOperatingRegimeSection(
        baseWell({ operating_regime: regimes }),
        makeTestContext(
          { dateFormats: { dateTime: "yyyy-MM-dd '@' HH:mm" } },
          lastSegmentT,
        ),
      ),
    );
    expect(serialized).toMatch(/2024-03-05 @ \d{2}:\d{2}/);
  });
});
