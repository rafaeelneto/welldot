import type { LoggerSeriesEvent } from '@welldot/core';
import { buildLoggerReadings, parseDelimitedText } from '@welldot/utils';
import { describe, expect, it } from 'vitest';
import {
  applyTypedDatetime,
  formatReadingLocal,
  fromLoggerForm,
  loggerSeriesIssues,
  mergeImportedReadings,
  nextReadingDatetime,
  parseReadingDatetime,
  toLoggerForm,
  validateLoggerForm,
  type LoggerFormReading,
} from './loggerSeriesForm';

// Spec item 10, verbatim (with a UUID for `id`).
const EXAMPLE: LoggerSeriesEvent = {
  id: '8f2c1e4a-3b6d-4f0e-9a7c-5d1b2e3f4a5b',
  type: 'logger_series',
  datetime: '2026-07-01T00:00:00-03:00',
  equipment: 'Solinst Levelogger 5 LT, SN 2081234',
  measurement_method: 'pressure_transducer',
  sensor_depth: 42.0,
  interval: 15,
  barometric_compensation: 'barologger',
  aggregation: 'none',
  readings: [
    { datetime: '2026-07-01T00:00:00-03:00', depth: 18.42, pressure: 233.9 },
    { datetime: '2026-07-01T00:15:00-03:00', depth: 18.44, pressure: 233.7 },
  ],
};

describe('loggerSeriesForm', () => {
  it('round-trips the spec example through the form', () => {
    expect(
      fromLoggerForm(toLoggerForm(EXAMPLE), EXAMPLE.id, EXAMPLE),
    ).toStrictEqual(EXAMPLE);
  });

  it('keeps members the form does not own', () => {
    const original = {
      ...EXAMPLE,
      sequence: 2,
      corrects: 'x',
      'x-app': { a: 1 },
    } as LoggerSeriesEvent;
    const event = fromLoggerForm(toLoggerForm(original), original.id, original);
    expect(event).toMatchObject({
      sequence: 2,
      corrects: 'x',
      'x-app': { a: 1 },
    });
  });

  it('keeps reading members the form does not edit', () => {
    const original: LoggerSeriesEvent = {
      ...EXAMPLE,
      readings: [{ ...EXAMPLE.readings[0]!, depth_precision: 0.01 }],
    };
    const event = fromLoggerForm(toLoggerForm(original), original.id, original);
    expect(event.readings[0]).toStrictEqual(original.readings[0]);
  });

  it('sorts readings by instant and omits empty optional fields', () => {
    const form = toLoggerForm(EXAMPLE);
    const [first, second] = form.readings;
    form.readings = [second!, { ...first!, pressure: null }];
    form.notes = '  ';
    form.sensorDepth = null;
    form.barometricCompensation = '';
    const event = fromLoggerForm(form, EXAMPLE.id, EXAMPLE);
    expect(event.readings.map(r => r.datetime)).toEqual([
      '2026-07-01T00:00:00-03:00',
      '2026-07-01T00:15:00-03:00',
    ]);
    expect(event.readings[0]).not.toHaveProperty('pressure');
    expect(event).not.toHaveProperty('notes');
    expect(event).not.toHaveProperty('sensor_depth');
    expect(event).not.toHaveProperty('barometric_compensation');
    expect(Object.values(event)).not.toContain(null);
  });

  it('reads inputs cleared to null as empty', () => {
    const form = toLoggerForm(EXAMPLE);
    const cleared = form as unknown as Record<string, unknown>;
    cleared.measurementMethod = null;
    cleared.barometricCompensation = null;
    cleared.aggregation = null;
    cleared.operator = null;
    const event = fromLoggerForm(form, EXAMPLE.id, EXAMPLE);
    expect(event).not.toHaveProperty('measurement_method');
    expect(event).not.toHaveProperty('barometric_compensation');
    expect(event).not.toHaveProperty('aggregation');
    expect(event).not.toHaveProperty('operator');
  });

  it('drops blank rows', () => {
    const form = toLoggerForm(EXAMPLE);
    form.readings.push({
      id: 'blank',
      datetime: '',
      depth: null,
      pressure: null,
      depthMin: null,
      depthMax: null,
    });
    expect(fromLoggerForm(form, EXAMPLE.id, EXAMPLE).readings).toHaveLength(2);
  });

  it('writes depth_min and depth_max only when aggregated', () => {
    const form = toLoggerForm(EXAMPLE);
    form.readings.forEach(r => {
      r.depthMin = 18.4;
      r.depthMax = 18.5;
    });
    const raw = fromLoggerForm(form, EXAMPLE.id, EXAMPLE);
    expect(raw.readings[0]).not.toHaveProperty('depth_min');
    expect(raw.readings[0]).not.toHaveProperty('depth_max');

    form.aggregation = 'hourly';
    const hourly = fromLoggerForm(form, EXAMPLE.id, EXAMPLE);
    expect(hourly.readings[0]).toMatchObject({
      depth_min: 18.4,
      depth_max: 18.5,
    });
  });

  it('defaults the start datetime to the first reading', () => {
    const form = toLoggerForm(EXAMPLE);
    form.datetime = '';
    form.readings.reverse();
    expect(fromLoggerForm(form, EXAMPLE.id, null).datetime).toBe(
      '2026-07-01T00:00:00-03:00',
    );
  });

  it('starts a new series with the recommended method and no readings', () => {
    const form = toLoggerForm(null);
    expect(form.measurementMethod).toBe('pressure_transducer');
    expect(form.readings).toEqual([]);
    expect(form.datetime).toBe('');
  });

  it('parseReadingDatetime reads local text in the well zone', () => {
    expect(parseReadingDatetime('2026-07-01 00:15', 'America/Belem')).toBe(
      '2026-07-01T00:15:00-03:00',
    );
    expect(parseReadingDatetime('2026-07-01 00:15:30', 'America/Belem')).toBe(
      '2026-07-01T00:15:30-03:00',
    );
    expect(
      parseReadingDatetime('2026-07-01T00:15:00+02:00', 'America/Belem'),
    ).toBe('2026-07-01T00:15:00+02:00');
    expect(parseReadingDatetime('garbage', 'America/Belem')).toBeUndefined();
    expect(parseReadingDatetime('2026-07-01 00:15', undefined)).toBeUndefined();
  });

  it('formatReadingLocal shows an instant as local text in the zone', () => {
    expect(formatReadingLocal('2026-07-01T03:15:00Z', 'America/Belem')).toBe(
      '2026-07-01 00:15:00',
    );
    expect(formatReadingLocal('2026-07-01 00:15', 'America/Belem')).toBe(
      '2026-07-01 00:15',
    );
    expect(formatReadingLocal('2026-07-01T03:15:00Z', 'Not/AZone')).toBe(
      '2026-07-01T03:15:00Z',
    );
  });

  it('nextReadingDatetime adds the interval keeping the offset', () => {
    expect(nextReadingDatetime('2026-07-01T00:15:00-03:00', 15)).toBe(
      '2026-07-01T00:30:00-03:00',
    );
    expect(nextReadingDatetime('2026-07-01T23:50:00Z', 15)).toBe(
      '2026-07-02T00:05:00Z',
    );
    expect(nextReadingDatetime(undefined, 15)).toBeUndefined();
    expect(
      nextReadingDatetime('2026-07-01T00:15:00-03:00', null),
    ).toBeUndefined();
  });

  it('loggerSeriesIssues reports schema and aggregation issues', () => {
    expect(loggerSeriesIssues(EXAMPLE)).toEqual([]);
    expect(
      loggerSeriesIssues({ ...EXAMPLE, readings: [] }).map(i => i.path),
    ).toEqual([['readings']]);
    expect(
      loggerSeriesIssues({ ...EXAMPLE, aggregation: 'daily' }).map(i => i.path),
    ).toContainEqual(['readings', 1, 'depth_max']);
  });

  it('writes a changed start typed in the zone with its offset', () => {
    const form = toLoggerForm(EXAMPLE);
    form.datetime = applyTypedDatetime(
      form.datetime,
      '2026-07-01 00:00:00',
      'America/Belem',
    );
    // Same instant typed again: the original string is kept.
    expect(fromLoggerForm(form, EXAMPLE.id, EXAMPLE).datetime).toBe(
      '2026-07-01T00:00:00-03:00',
    );
    form.datetime = applyTypedDatetime(
      form.datetime,
      '2026-06-30 23:00:00',
      'America/Belem',
    );
    expect(fromLoggerForm(form, EXAMPLE.id, EXAMPLE).datetime).toBe(
      '2026-06-30T23:00:00-03:00',
    );
    const fresh = toLoggerForm(null);
    fresh.datetime = applyTypedDatetime(
      fresh.datetime,
      '2026-07-01 00:00:00',
      'America/Belem',
    );
    expect(fresh.datetime).toBe('2026-07-01T00:00:00-03:00');
  });

  it('applyTypedDatetime keeps the stored instant when the shown text is unchanged', () => {
    const zone = 'America/Sao_Paulo';
    const withMillis = '2026-07-01T00:15:00.250-03:00';
    expect(
      applyTypedDatetime(
        withMillis,
        formatReadingLocal(withMillis, zone),
        zone,
      ),
    ).toBe(withMillis);
    // Second occurrence of a DST-overlap hour (New York, 2026-11-01 01:30).
    const second = '2026-11-01T01:30:00-05:00';
    const ny = 'America/New_York';
    expect(applyTypedDatetime(second, formatReadingLocal(second, ny), ny)).toBe(
      second,
    );
    expect(applyTypedDatetime(second, 'not a date', ny)).toBe('not a date');
    expect(applyTypedDatetime(second, '  ', ny)).toBe('');
  });

  it('keeps depth_min and depth_max of a non-aggregated series as loaded', () => {
    const original: LoggerSeriesEvent = {
      ...EXAMPLE,
      readings: EXAMPLE.readings.map(r => ({
        ...r,
        depth_min: 18.3,
        depth_max: 18.6,
      })),
    };
    const form = toLoggerForm(original);
    expect(fromLoggerForm(form, original.id, original)).toStrictEqual(original);
    // Values typed while aggregated are not invented into a raw series.
    const fresh = toLoggerForm(EXAMPLE);
    fresh.readings[0]!.depthMin = 1;
    expect(
      fromLoggerForm(fresh, EXAMPLE.id, EXAMPLE).readings[0],
    ).not.toHaveProperty('depth_min');
  });

  it('validateLoggerForm maps a reading issue to its form row', () => {
    const form = toLoggerForm(EXAMPLE);
    form.readings.reverse();
    form.readings[1]!.depth = null; // 00:00, first once sorted
    const { issues } = validateLoggerForm(form, EXAMPLE.id, EXAMPLE);
    expect(issues).toEqual([
      expect.objectContaining({ path: ['readings', 0, 'depth'], row: 2 }),
    ]);
  });

  it('builds and validates a 35 000-reading series quickly', () => {
    const start = Date.parse('2026-01-01T00:00:00-03:00');
    const readings: LoggerFormReading[] = Array.from(
      { length: 35000 },
      (_, i) => ({
        id: String(i),
        datetime: new Date(start + i * 900000)
          .toISOString()
          .replace('.000Z', 'Z'),
        depth: 18 + (i % 100) / 100,
        pressure: 230,
        depthMin: null,
        depthMax: null,
      }),
    );
    const form = { ...toLoggerForm(EXAMPLE), readings };
    const t0 = performance.now();
    const { event, issues } = validateLoggerForm(form, EXAMPLE.id, EXAMPLE);
    fromLoggerForm(form, EXAMPLE.id, EXAMPLE);
    const elapsed = performance.now() - t0;
    expect(issues).toEqual([]);
    expect(event.readings).toHaveLength(35000);
    expect(elapsed).toBeLessThan(1000);
  });

  it('imported readings merge into the form', () => {
    const csv = [
      'Date,Time,LEVEL',
      '2026/07/01,00:00:00,23.58',
      '2026/07/01,00:15:00,23.56',
    ].join('\n');
    const { rows } = parseDelimitedText(csv);
    const { readings, skipped } = buildLoggerReadings(rows, {
      headerRows: 1,
      dateColumn: 0,
      timeColumn: 1,
      valueColumn: 2,
      valueKind: 'water_column',
      sensorDepth: 42,
      dateFormat: 'ymd',
      timeZone: 'America/Belem',
    });
    expect(skipped).toEqual([]);
    const form = toLoggerForm(null);
    const merged = mergeImportedReadings(form.readings, readings, 'append');
    expect(merged.readings).toHaveLength(2);
    expect(merged.readings[0]).toMatchObject({
      datetime: '2026-07-01T00:00:00-03:00',
      depth: 18.42,
    });
    // Equal instants are replaced, blank rows are kept, replace drops all.
    const again = mergeImportedReadings(merged.readings, readings, 'append');
    expect(again.readings).toHaveLength(2);
    expect(again.replaced).toBe(2);
    const replaced = mergeImportedReadings(
      merged.readings,
      readings.slice(0, 1),
      'replace',
    );
    expect(replaced.readings).toHaveLength(1);
  });
});
