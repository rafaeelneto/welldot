import type { LoggerSeriesEvent } from '@welldot/core';
import { describe, expect, it } from 'vitest';
import { loggerChartSeries, loggerTickFormatter } from './loggerChart';

const labels = { depth: 'Level', min: 'Min', max: 'Max' };

function event(
  count: number,
  aggregation: LoggerSeriesEvent['aggregation'] = 'none',
): LoggerSeriesEvent {
  const start = Date.parse('2026-07-01T00:00:00Z');
  return {
    id: '8f2c1e4a-3b6d-4f0e-9a7c-5d1b2e3f4a5b',
    type: 'logger_series',
    datetime: '2026-07-01T00:00:00Z',
    measurement_method: 'pressure_transducer',
    aggregation,
    readings: Array.from({ length: count }, (_, i) => ({
      datetime: new Date(start + i * 60_000).toISOString(),
      depth: 20 + Math.sin(i / 50) * 3,
      ...(aggregation !== 'none' && {
        depth_min: 19 + Math.sin(i / 50) * 3,
        depth_max: 21 + Math.sin(i / 50) * 3,
      }),
    })),
  } as LoggerSeriesEvent;
}

describe('loggerChartSeries', () => {
  it('downsamples 5 000 readings to at most 2 000 points', () => {
    const series = loggerChartSeries(event(5000), labels);
    expect(series).toHaveLength(1);
    expect(series[0].points.length).toBeLessThanOrEqual(2000);
    expect(series[0].points.length).toBeGreaterThan(100);
    expect(series[0].markers).toBe(false);
    const xs = series[0].points.map(p => p.x);
    expect(xs[0]).toBe(Date.parse('2026-07-01T00:00:00Z'));
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
  });

  it('adds muted dashed min and max series when aggregated', () => {
    const series = loggerChartSeries(event(30, 'hourly'), labels);
    expect(series.map(s => s.id)).toEqual(['depth', 'depth-min', 'depth-max']);
    expect(series[1]).toMatchObject({ muted: true, dashed: true });
    expect(series[0].markers).toBe(true);
  });

  it('is empty without readings', () => {
    expect(loggerChartSeries(event(0), labels)).toEqual([]);
  });
});

describe('loggerChartSeries with bad rows', () => {
  it('drops unparseable instants and NaN depths without throwing', () => {
    const e = event(10);
    e.readings[2] = { ...e.readings[2], datetime: 'not a date' };
    e.readings[3] = { ...e.readings[3], depth: Number.NaN };
    const series = loggerChartSeries(e, labels);
    expect(series[0].points).toHaveLength(8);
    expect(series[0].points.every(p => Number.isFinite(p.x + p.y))).toBe(true);
  });

  it('does not let bad rows take bucket extremes', () => {
    const e = event(5000);
    e.readings[2500] = { ...e.readings[2500], depth: Number.NaN };
    const pts = loggerChartSeries(e, labels)[0].points;
    expect(pts.every(p => Number.isFinite(p.y))).toBe(true);
    expect(pts.length).toBeLessThanOrEqual(2000);
  });
});

describe('loggerTickFormatter', () => {
  const t = Date.parse('2026-07-01T15:30:00Z');
  const hour = 3_600_000;
  const day = 86_400_000;

  it('prints the clock time under 2 days', () => {
    expect(loggerTickFormatter(6 * hour, 'America/Belem', 'en')(t)).toBe(
      '12:30',
    );
  });

  it('prints day and month up to a year, by locale', () => {
    expect(loggerTickFormatter(30 * day, 'America/Belem', 'pt')(t)).toBe(
      '01/07',
    );
    expect(loggerTickFormatter(30 * day, 'America/Belem', 'en')(t)).toBe(
      '07-01',
    );
  });

  it('prints month and year beyond a year', () => {
    expect(loggerTickFormatter(400 * day, 'America/Belem', 'en')(t)).toBe(
      'Jul 2026',
    );
  });
});
