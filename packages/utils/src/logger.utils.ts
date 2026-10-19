import type { LoggerReading } from '@welldot/core';

/** Field delimiters recognised by {@link parseDelimitedText}. */
type Delimiter = ',' | ';' | '\t';

function splitRecords(text: string, delimiter: Delimiter): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const endRow = () => {
    row.push(field);
    field = '';
    if (row.some(f => f.trim() !== '')) rows.push(row.map(f => f.trim()));
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === delimiter) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      endRow();
    } else field += c;
  }
  endRow();
  return rows;
}

/**
 * Parses delimited text (CSV, semicolon or tab separated) into rows of fields.
 *
 * The delimiter is detected over the first 20 non-empty lines (a title or
 * preamble line does not mislead it): for each of `,` `;` `\t` the lines are
 * split and the most common field count of 2 or more is found; the delimiter
 * shared by the most lines wins. Equal scores prefer `;`, then `\t`, then `,`,
 * so a `;` file with decimal commas never reads as comma separated. Quotes follow
 * RFC 4180: a quoted field may contain the delimiter or line breaks, and `""`
 * is an escaped quote. Fields are trimmed and empty lines are dropped.
 *
 * @param text - The raw file content.
 * @returns The detected delimiter and the parsed rows.
 */
export function parseDelimitedText(text: string): {
  delimiter: Delimiter;
  rows: string[][];
} {
  const sample = text
    .split(/\r\n|\n|\r/)
    .filter(l => l.trim() !== '')
    .slice(0, 20)
    .join('\n');
  let delimiter: Delimiter = ',';
  let best = 0;
  for (const d of [';', '\t', ','] as Delimiter[]) {
    const counts = new Map<number, number>();
    for (const row of splitRecords(sample, d)) {
      if (row.length >= 2)
        counts.set(row.length, (counts.get(row.length) ?? 0) + 1);
    }
    const score = Math.max(0, ...counts.values());
    if (score > best) {
      best = score;
      delimiter = d;
    }
  }
  return { delimiter, rows: splitRecords(text, delimiter) };
}

/** Order of the date parts in a text date column. */
export type LoggerDateFormat = 'iso' | 'dmy' | 'mdy' | 'ymd';

/** Column mapping and conventions used to turn imported rows into readings. */
export type LoggerImportMapping = {
  /** Number of leading rows to skip. */
  headerRows: number;
  /** Zero-based column of the date (or date and time). */
  dateColumn: number;
  /** Zero-based column of the time, when it is separate from the date. */
  timeColumn?: number;
  /** Zero-based column of the measured value. */
  valueColumn: number;
  /** Zero-based column of the pressure, when present. */
  pressureColumn?: number;
  /** `depth`: the value is depth to water; `water_column`: height of water above the sensor. */
  valueKind: 'depth' | 'water_column';
  /** Sensor depth (m). Required for `water_column`. */
  sensorDepth?: number;
  dateFormat: LoggerDateFormat;
  /** IANA zone applied to timestamps without an offset (the well `timezone`). */
  timeZone?: string;
  /** Offset (`-03:00`) applied to timestamps without an offset when `timeZone` is not set. */
  offset?: string;
};

/** Why a row could not become a reading. */
export type LoggerImportIssue =
  | 'invalid_date'
  | 'invalid_value'
  | 'missing_sensor_depth'
  | 'missing_offset';

const pad = (n: number, len = 2) => String(n).padStart(len, '0');

/** UTC offset in minutes of `timeZone` at `epochMs`, or undefined for an invalid zone. */
function zoneOffsetMinutes(
  epochMs: number,
  timeZone: string,
): number | undefined {
  try {
    const name = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'longOffset',
    })
      .formatToParts(new Date(epochMs))
      .find(p => p.type === 'timeZoneName')?.value;
    if (!name) return undefined;
    if (name === 'GMT') return 0;
    const m = /^GMT([+-])(\d{2}):(\d{2})/.exec(name);
    if (!m) return undefined;
    return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
  } catch {
    return undefined;
  }
}

function formatOffset(minutes: number): string {
  const abs = Math.abs(minutes);
  return `${minutes < 0 ? '-' : '+'}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/**
 * Converts a local date and time in an IANA time zone to an RFC 3339 instant
 * carrying the zone's offset at that local time.
 *
 * @param local - `YYYY-MM-DDTHH:mm[:ss]`.
 * @param timeZone - IANA zone name.
 * @returns The instant (`2026-07-15T12:00:00-04:00`), or `undefined` when the
 *   zone or the local string is invalid. A local time that happens twice
 *   (clocks go back) resolves to its first occurrence, with the offset before
 *   the change. A local time that never happens (clocks go forward) takes the
 *   offset in force before the change, so `02:30` in a spring-forward gap in
 *   New York is `02:30:00-05:00`.
 */
export function localDateTimeToInstant(
  local: string,
  timeZone: string,
): string | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
    local,
  );
  if (!m) return undefined;
  const [y, mo, d, h, mi, s] = [m[1], m[2], m[3], m[4], m[5], m[6] ?? '0'].map(
    Number,
  );
  const naive = Date.UTC(y, mo - 1, d, h, mi, s);
  const check = new Date(naive);
  if (
    check.getUTCMonth() !== mo - 1 ||
    check.getUTCDate() !== d ||
    h > 23 ||
    mi > 59 ||
    s > 59
  )
    return undefined;
  const DAY = 86400000;
  const before = zoneOffsetMinutes(naive - DAY, timeZone);
  const after = zoneOffsetMinutes(naive + DAY, timeZone);
  if (before === undefined || after === undefined) return undefined;
  // An offset is valid when the instant it produces really has that offset.
  const valid = [...new Set([before, after])].filter(
    o => zoneOffsetMinutes(naive - o * 60000, timeZone) === o,
  );
  // Overlap (two valid): the earlier instant, i.e. the larger offset.
  // Gap (none valid): the offset in force before the change.
  const offset = valid.length ? Math.max(...valid) : before;
  return `${y}-${pad(mo)}-${pad(d)}T${pad(h)}:${pad(mi)}:${pad(s)}${formatOffset(offset)}`;
}

const OFFSET_RE = /^(Z|[+-]\d{2}(?::?\d{2})?)$/i;

function normalizeOffset(raw: string): string | undefined {
  const t = raw.trim();
  if (!OFFSET_RE.test(t)) return undefined;
  if (/^z$/i.test(t)) return 'Z';
  const digits = t.slice(1).replace(':', '');
  const hh = digits.slice(0, 2);
  const mm = digits.slice(2) || '00';
  if (Number(hh) > 23 || Number(mm) > 59) return undefined;
  return `${t[0]}${hh}:${mm}`;
}

function parseNumber(raw: string): number | undefined {
  let t = raw.trim();
  if (t.includes(',') && !t.includes('.')) t = t.replace(',', '.');
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(t)) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

type ParsedDate = { date: string; time?: string; offset?: string };

function parseTime(raw: string): string | undefined {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2})(?:[.,]\d+)?)?$/.exec(raw.trim());
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59 || Number(m[3] ?? 0) > 59)
    return undefined;
  return `${pad(Number(m[1]))}:${m[2]}:${m[3] ?? '00'}`;
}

function parseDateField(
  raw: string,
  format: LoggerDateFormat,
): ParsedDate | undefined {
  const text = raw.trim();
  const datePart =
    format === 'iso'
      ? String.raw`(\d{4})-(\d{2})-(\d{2})`
      : String.raw`(\d{1,4})[/.-](\d{1,2})[/.-](\d{1,4})`;
  const m = new RegExp(
    String.raw`^${datePart}(?:[T ]+(\d{1,2}:\d{2}(?::\d{2}(?:[.,]\d+)?)?))?\s*(Z|[+-]\d{2}(?::?\d{2})?)?$`,
    'i',
  ).exec(text);
  if (!m) return undefined;
  const [a, b, c] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const [y, mo, d] =
    format === 'dmy' ? [c, b, a] : format === 'mdy' ? [c, a, b] : [a, b, c];
  const check = new Date(Date.UTC(y, mo - 1, d));
  if (
    y < 1000 ||
    mo < 1 ||
    mo > 12 ||
    check.getUTCMonth() !== mo - 1 ||
    check.getUTCDate() !== d
  )
    return undefined;
  const result: ParsedDate = { date: `${pad(y, 4)}-${pad(mo)}-${pad(d)}` };
  if (m[4] !== undefined) {
    result.time = parseTime(m[4]);
    if (!result.time) return undefined;
  }
  if (m[5] !== undefined) {
    result.offset = normalizeOffset(m[5]);
    if (!result.offset) return undefined;
  }
  return result;
}

/**
 * Turns imported rows into logger readings using a column mapping.
 *
 * The first `headerRows` rows are skipped. Timestamps that carry an offset keep
 * it; otherwise `timeZone` (resolved with {@link localDateTimeToInstant}) and
 * then `offset` apply, in that order. Decimal commas are accepted. With
 * `valueKind: 'water_column'` the depth is `sensorDepth − value`, rounded to 3
 * decimals. A date without a time reads as 00:00.
 *
 * @param rows - Rows from {@link parseDelimitedText}.
 * @param mapping - Column mapping and conventions.
 * @returns The readings and the skipped rows with their zero-based index in
 *   `rows` (header rows included) and the reason.
 */
export function buildLoggerReadings(
  rows: string[][],
  mapping: LoggerImportMapping,
): {
  readings: LoggerReading[];
  skipped: { row: number; issue: LoggerImportIssue }[];
} {
  const readings: LoggerReading[] = [];
  const skipped: { row: number; issue: LoggerImportIssue }[] = [];
  const typedOffset = mapping.offset
    ? normalizeOffset(mapping.offset)
    : undefined;
  for (let i = mapping.headerRows; i < rows.length; i++) {
    const row = rows[i];
    const skip = (issue: LoggerImportIssue) => skipped.push({ row: i, issue });
    const parsed = parseDateField(
      row[mapping.dateColumn] ?? '',
      mapping.dateFormat,
    );
    if (!parsed) {
      skip('invalid_date');
      continue;
    }
    let time = parsed.time;
    if (mapping.timeColumn !== undefined) {
      const fromColumn = parseTime(row[mapping.timeColumn] ?? '');
      if (!fromColumn) {
        skip('invalid_date');
        continue;
      }
      time = fromColumn;
    }
    const value = parseNumber(row[mapping.valueColumn] ?? '');
    if (value === undefined) {
      skip('invalid_value');
      continue;
    }
    let pressure: number | undefined;
    if (mapping.pressureColumn !== undefined) {
      const raw = row[mapping.pressureColumn] ?? '';
      if (raw.trim() !== '') {
        pressure = parseNumber(raw);
        if (pressure === undefined) {
          skip('invalid_value');
          continue;
        }
      }
    }
    let depth = value;
    if (mapping.valueKind === 'water_column') {
      if (mapping.sensorDepth === undefined) {
        skip('missing_sensor_depth');
        continue;
      }
      depth = round3(mapping.sensorDepth - value);
    }
    const local = `${parsed.date}T${time ?? '00:00:00'}`;
    let datetime: string | undefined;
    if (parsed.offset) datetime = `${local}${parsed.offset}`;
    else if (mapping.timeZone)
      datetime = localDateTimeToInstant(local, mapping.timeZone);
    if (!datetime && typedOffset) datetime = `${local}${typedOffset}`;
    if (!datetime) {
      skip('missing_offset');
      continue;
    }
    readings.push(
      pressure === undefined
        ? { datetime, depth }
        : { datetime, depth, pressure },
    );
  }
  return { readings, skipped };
}

const instantKey = (r: LoggerReading) => {
  const ms = Date.parse(r.datetime);
  return Number.isNaN(ms) ? r.datetime : ms;
};
const instantMs = (r: LoggerReading) => {
  const ms = Date.parse(r.datetime);
  return Number.isNaN(ms) ? 0 : ms;
};

/**
 * Merges imported readings into a series.
 *
 * Instants compare as instants, so `2026-07-01T03:00:00Z` equals
 * `2026-07-01T00:00:00-03:00`. In `append` mode the incoming reading wins on an
 * equal instant; in `replace` mode only the incoming readings remain. The
 * result is sorted by instant; within `incoming`, the last of equal instants wins.
 *
 * @returns The readings and `replaced`: in `append` mode, how many existing
 *   readings an incoming one overwrote; in `replace` mode, how many existing
 *   readings were dropped.
 */
export function mergeLoggerReadings(
  existing: LoggerReading[],
  incoming: LoggerReading[],
  mode: 'append' | 'replace',
): { readings: LoggerReading[]; replaced: number } {
  const map = new Map<number | string, LoggerReading>();
  const existingKeys = new Set(existing.map(instantKey));
  const overwritten = new Set<number | string>();
  if (mode === 'append') for (const r of existing) map.set(instantKey(r), r);
  for (const r of incoming) {
    const key = instantKey(r);
    if (mode === 'append' && existingKeys.has(key)) overwritten.add(key);
    map.set(key, r);
  }
  const replaced = mode === 'replace' ? existing.length : overwritten.size;
  return {
    readings: [...map.values()].sort((a, b) => instantMs(a) - instantMs(b)),
    replaced,
  };
}

/**
 * Median spacing between consecutive readings, in minutes rounded to 0.1.
 *
 * @returns `undefined` with fewer than two readings with distinct instants.
 */
export function inferLoggerInterval(
  readings: LoggerReading[],
): number | undefined {
  const times = readings
    .map(r => Date.parse(r.datetime))
    .filter(t => !Number.isNaN(t))
    .sort((a, b) => a - b);
  const gaps: number[] = [];
  for (let i = 1; i < times.length; i++)
    if (times[i] > times[i - 1]) gaps.push(times[i] - times[i - 1]);
  if (gaps.length === 0) return undefined;
  gaps.sort((a, b) => a - b);
  const mid = Math.floor(gaps.length / 2);
  const median = gaps.length % 2 ? gaps[mid] : (gaps[mid - 1] + gaps[mid]) / 2;
  return Math.round(median / 6000) / 10;
}

/**
 * Reduces a series for plotting, keeping its extremes.
 *
 * The first and last readings are kept and the readings between them are split
 * into buckets, each keeping its lowest and highest `depth`. The result has at
 * most `maxPoints` readings, in time order. A series already within
 * `maxPoints` is returned unchanged (same array).
 */
export function downsampleLoggerReadings(
  readings: LoggerReading[],
  maxPoints: number,
): LoggerReading[] {
  const n = readings.length;
  if (n <= maxPoints) return readings;
  if (maxPoints <= 1) return readings.slice(0, Math.max(0, maxPoints));
  if (maxPoints < 4) return [readings[0], readings[n - 1]];
  const bucketCount = Math.floor((maxPoints - 2) / 2);
  const interior = n - 2;
  const keep = new Set<number>([0, n - 1]);
  for (let b = 0; b < bucketCount; b++) {
    const from = 1 + Math.floor((b * interior) / bucketCount);
    const to = 1 + Math.floor(((b + 1) * interior) / bucketCount);
    let lo = from;
    let hi = from;
    for (let i = from; i < to; i++) {
      if (readings[i].depth < readings[lo].depth) lo = i;
      if (readings[i].depth > readings[hi].depth) hi = i;
    }
    keep.add(lo);
    keep.add(hi);
  }
  return [...keep].sort((a, b) => a - b).map(i => readings[i]);
}
