import type { LoggerReading } from '@welldot/core';
import { describe, expect, it } from 'vitest';
import {
  buildLoggerReadings,
  downsampleLoggerReadings,
  inferLoggerInterval,
  localDateTimeToInstant,
  mergeLoggerReadings,
  parseDelimitedText,
  type LoggerImportMapping,
} from './logger.utils';

const base: LoggerImportMapping = {
  headerRows: 0,
  dateColumn: 0,
  valueColumn: 1,
  valueKind: 'depth',
  dateFormat: 'iso',
};

describe('parseDelimitedText', () => {
  it('detects comma, semicolon and tab', () => {
    expect(parseDelimitedText('a,b,c\n1,2,3')).toEqual({
      delimiter: ',',
      rows: [
        ['a', 'b', 'c'],
        ['1', '2', '3'],
      ],
    });
    expect(parseDelimitedText('a;b;c\n1;2;3').delimiter).toBe(';');
    expect(parseDelimitedText('a\tb\tc\n1\t2\t3').delimiter).toBe('\t');
  });

  it('ignores a title line and prefers ; over decimal commas', () => {
    const { delimiter, rows } = parseDelimitedText(
      'Logger export\nDate;Time;Level\n01/07/2026;00:15;18,44\n01/07/2026;00:30;18,45',
    );
    expect(delimiter).toBe(';');
    expect(rows[2]).toEqual(['01/07/2026', '00:15', '18,44']);
  });

  it('detects a tab file with a title line and a single-line file', () => {
    expect(
      parseDelimitedText('Title\nd\tt\tv\n1\t2\t3\n4\t5\t6').delimiter,
    ).toBe('\t');
    expect(parseDelimitedText('a;b;c')).toEqual({
      delimiter: ';',
      rows: [['a', 'b', 'c']],
    });
  });

  it('keeps quoted fields with the delimiter inside and drops empty lines', () => {
    const { rows } = parseDelimitedText('x,y\n\n"a,b","say ""hi"""\r\n\n');
    expect(rows).toEqual([
      ['x', 'y'],
      ['a,b', 'say "hi"'],
    ]);
  });
});

describe('localDateTimeToInstant', () => {
  it('uses the zone offset in force at each local time', () => {
    expect(localDateTimeToInstant('2026-01-15T12:00', 'America/New_York')).toBe(
      '2026-01-15T12:00:00-05:00',
    );
    expect(localDateTimeToInstant('2026-07-15T12:00', 'America/New_York')).toBe(
      '2026-07-15T12:00:00-04:00',
    );
  });

  it('resolves times right after a DST change and rejects invalid zones', () => {
    expect(
      localDateTimeToInstant('2026-03-08T03:30:00', 'America/New_York'),
    ).toBe('2026-03-08T03:30:00-04:00');
    expect(
      localDateTimeToInstant('2026-07-01T00:00', 'Not/AZone'),
    ).toBeUndefined();
  });

  it('resolves DST gaps with the pre-change offset and overlaps to the first occurrence', () => {
    const ny = 'America/New_York';
    const berlin = 'Europe/Berlin';
    expect(localDateTimeToInstant('2026-03-08T02:30', ny)).toBe(
      '2026-03-08T02:30:00-05:00',
    );
    expect(localDateTimeToInstant('2026-11-01T01:30', ny)).toBe(
      '2026-11-01T01:30:00-04:00',
    );
    expect(localDateTimeToInstant('2026-03-29T02:30', berlin)).toBe(
      '2026-03-29T02:30:00+01:00',
    );
    expect(localDateTimeToInstant('2026-10-25T02:30', berlin)).toBe(
      '2026-10-25T02:30:00+02:00',
    );
  });
});

describe('buildLoggerReadings', () => {
  it('reads an ISO date column with offset as written', () => {
    const r = buildLoggerReadings(
      [['2026-07-01T00:15:00-03:00', '18.44']],
      base,
    );
    expect(r.readings).toEqual([
      { datetime: '2026-07-01T00:15:00-03:00', depth: 18.44 },
    ]);
    expect(r.skipped).toEqual([]);
  });

  it('joins a date and a time column in dmy format and applies the well time zone', () => {
    const r = buildLoggerReadings([['01/07/2026', '00:15', '18,44']], {
      ...base,
      dateFormat: 'dmy',
      timeColumn: 1,
      valueColumn: 2,
      timeZone: 'America/Belem',
    });
    expect(r.readings).toEqual([
      { datetime: '2026-07-01T00:15:00-03:00', depth: 18.44 },
    ]);
  });

  it('falls back to the typed offset without a time zone', () => {
    const rows = [['2026-07-01 00:15', '18.44']];
    expect(
      buildLoggerReadings(rows, { ...base, offset: '-03:00' }).readings[0]
        .datetime,
    ).toBe('2026-07-01T00:15:00-03:00');
    expect(buildLoggerReadings(rows, base)).toEqual({
      readings: [],
      skipped: [{ row: 0, issue: 'missing_offset' }],
    });
  });

  it('converts water column above the sensor to depth', () => {
    const m: LoggerImportMapping = {
      ...base,
      valueKind: 'water_column',
      sensorDepth: 42,
    };
    const rows = [['2026-07-01T00:15:00Z', '23.58']];
    expect(buildLoggerReadings(rows, m).readings[0].depth).toBe(18.42);
    const none = buildLoggerReadings(rows, {
      ...base,
      valueKind: 'water_column',
    });
    expect(none.readings).toEqual([]);
    expect(none.skipped).toEqual([{ row: 0, issue: 'missing_sensor_depth' }]);
  });

  it('skips header rows and reports invalid rows with their row index', () => {
    const r = buildLoggerReadings(
      [
        ['title'],
        ['date', 'level'],
        ['2026-07-01T00:00:00Z', '10'],
        ['2026-07-01T00:15:00Z', 'abc'],
        ['32/13/2026', '10'],
      ],
      { ...base, headerRows: 2 },
    );
    expect(r.readings).toHaveLength(1);
    expect(r.skipped).toEqual([
      { row: 3, issue: 'invalid_value' },
      { row: 4, issue: 'invalid_date' },
    ]);
  });

  it('reads the pressure column when mapped', () => {
    const r = buildLoggerReadings(
      [['2026-07-01T00:15:00Z', '18.44', '233,9']],
      { ...base, pressureColumn: 2 },
    );
    expect(r.readings[0].pressure).toBe(233.9);
  });
});

const rd = (datetime: string, depth: number): LoggerReading => ({
  datetime,
  depth,
});

describe('mergeLoggerReadings', () => {
  const existing = [
    rd('2026-07-01T00:00:00-03:00', 1),
    rd('2026-07-01T00:15:00-03:00', 2),
  ];
  const incoming = [
    rd('2026-07-01T03:30:00Z', 4),
    rd('2026-07-01T03:15:00Z', 3),
  ];

  it('appends, sorts by instant and lets incoming win on equal instants', () => {
    const r = mergeLoggerReadings(existing, incoming, 'append');
    expect(r.readings.map(x => x.depth)).toEqual([1, 3, 4]);
    expect(r.replaced).toBe(1);
  });

  it('replace returns only the incoming readings, sorted', () => {
    const r = mergeLoggerReadings(existing, incoming, 'replace');
    expect(r.readings.map(x => x.depth)).toEqual([3, 4]);
  });
});

describe('inferLoggerInterval', () => {
  it('returns the median spacing in minutes', () => {
    const t = (min: number) =>
      new Date(Date.UTC(2026, 6, 1, 0, min)).toISOString();
    const readings = [0, 15, 30, 45, 105, 120].map(m => rd(t(m), 1));
    expect(inferLoggerInterval(readings)).toBe(15);
    expect(inferLoggerInterval(readings.slice(0, 1))).toBeUndefined();
  });
});

describe('downsampleLoggerReadings', () => {
  const many = Array.from({ length: 10000 }, (_, i) =>
    rd(
      new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(),
      20 + Math.sin(i / 50) * 5 + (i === 7777 ? 9 : 0) - (i === 3333 ? 9 : 0),
    ),
  );

  it('keeps first, last and per-bucket min and max', () => {
    const out = downsampleLoggerReadings(many, 500);
    expect(out.length).toBeLessThanOrEqual(500);
    expect(out[0]).toBe(many[0]);
    expect(out[out.length - 1]).toBe(many[many.length - 1]);
    const depths = many.map(x => x.depth);
    expect(out.map(x => x.depth)).toContain(Math.max(...depths));
    expect(out.map(x => x.depth)).toContain(Math.min(...depths));
  });

  it('returns the readings unchanged when under maxPoints', () => {
    const few = many.slice(0, 10);
    expect(downsampleLoggerReadings(few, 500)).toBe(few);
  });
});
