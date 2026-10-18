import {
  HydrodynamicEventSchema,
  LoggerSeriesEventSchema,
  type Attachment,
  type LoggerReading,
  type LoggerSeriesEvent,
} from '@welldot/core';
import { localDateTimeToInstant } from '@welldot/utils';

/**
 * Form model of the `logger_series` editor (`LoggerSeriesDialog.vue`) and its
 * conversion to and from the event. Kept out of the component so the round
 * trip is testable.
 */

export type LoggerFormReading = {
  id: string;
  /** RFC 3339 instant as stored; text the user typed that did not parse stays as typed. */
  datetime: string;
  depth: number | null;
  pressure: number | null;
  depthMin: number | null;
  depthMax: number | null;
  /**
   * Reading members as loaded that the form does not edit (`depth_precision`,
   * `x-` …), written back untouched. Loaded `depth_min`/`depth_max` are kept
   * here too: a non-aggregated series writes them back as they were, an
   * aggregated one writes the edited `depthMin`/`depthMax` instead.
   */
  rest?: Record<string, unknown>;
};

export type LoggerForm = {
  /**
   * Start instant: RFC 3339 as stored, text the user typed that did not parse
   * (left for validation to flag), or `''` (the first reading's instant).
   */
  datetime: string;
  operator: string;
  equipment: string;
  notes: string;
  measurementMethod: string;
  sensorDepth: number | null;
  interval: number | null;
  barometricCompensation: string;
  aggregation: string;
  readings: LoggerFormReading[];
  attachments: Attachment[];
};

/**
 * Members the form owns and rebuilds on save. Everything else on the edited
 * event (`sequence`, `corrects`, `x-` members, …) is carried over untouched.
 */
const FORM_MANAGED_KEYS = new Set([
  'id',
  'type',
  'datetime',
  'operator',
  'equipment',
  'notes',
  'measurement_method',
  'sensor_depth',
  'interval',
  'barometric_compensation',
  'aggregation',
  'readings',
  'attachments',
]);

/** Reading members the form edits; the rest go to `LoggerFormReading.rest`. */
const READING_MANAGED_KEYS = new Set(['datetime', 'depth', 'pressure']);

const DEFAULT_MEASUREMENT_METHOD = 'pressure_transducer';

const RFC3339_WITH_OFFSET =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const LOCAL_DATETIME = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2})?)$/;
const OFFSET = /(Z|[+-]\d{2}:\d{2})$/;

export function isAggregated(aggregation: string | null): boolean {
  return aggregation === 'hourly' || aggregation === 'daily';
}

export function blankLoggerReading(datetime = ''): LoggerFormReading {
  return {
    id: crypto.randomUUID(),
    datetime,
    depth: null,
    pressure: null,
    depthMin: null,
    depthMax: null,
  };
}

export function toLoggerForm(event: LoggerSeriesEvent | null): LoggerForm {
  return {
    datetime: event?.datetime ?? '',
    operator: event?.operator ?? '',
    equipment: event?.equipment ?? '',
    notes: event?.notes ?? '',
    measurementMethod: event
      ? (event.measurement_method ?? '')
      : DEFAULT_MEASUREMENT_METHOD,
    sensorDepth: event?.sensor_depth ?? null,
    interval: event?.interval ?? null,
    barometricCompensation: event?.barometric_compensation ?? '',
    aggregation: event?.aggregation ?? '',
    readings: (event?.readings ?? []).map(r => {
      const rest = Object.fromEntries(
        Object.entries(r).filter(([key]) => !READING_MANAGED_KEYS.has(key)),
      );
      return {
        id: crypto.randomUUID(),
        datetime: r.datetime ?? '',
        depth: r.depth ?? null,
        pressure: r.pressure ?? null,
        depthMin: r.depth_min ?? null,
        depthMax: r.depth_max ?? null,
        ...(Object.keys(rest).length > 0 && { rest }),
      };
    }),
    attachments: (event?.attachments ?? []).map(a => ({ ...a })),
  };
}

function isBlankRow(r: LoggerFormReading): boolean {
  return (
    !text(r.datetime) &&
    r.depth == null &&
    r.pressure == null &&
    r.depthMin == null &&
    r.depthMax == null &&
    !r.rest
  );
}

/** Whether `datetime` is an RFC 3339 instant with offset (the schema's rule). */
export function isReadingInstant(datetime: string | null | undefined): boolean {
  return !Number.isNaN(instantMs(datetime ?? ''));
}

function instantMs(datetime: string): number {
  return RFC3339_WITH_OFFSET.test(text(datetime))
    ? Date.parse(datetime)
    : Number.NaN;
}

/**
 * The rows `fromLoggerForm` writes, in the order it writes them: blank rows
 * dropped, then sorted by instant (rows without a valid instant last, in form
 * order). Lets the dialog map a schema issue on `readings[i]` to its grid row.
 */
export function orderedReadingRows(
  readings: LoggerFormReading[],
): LoggerFormReading[] {
  return readings
    .filter(r => !isBlankRow(r))
    .map((row, index) => ({ row, index, ms: instantMs(row.datetime) }))
    .sort((a, b) => {
      const aBad = Number.isNaN(a.ms);
      const bBad = Number.isNaN(b.ms);
      if (aBad || bBad)
        return aBad === bBad ? a.index - b.index : aBad ? 1 : -1;
      return a.ms - b.ms || a.index - b.index;
    })
    .map(e => e.row);
}

const num = (v: number | null | undefined) =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined;

/** Trimmed text; a cleared PrimeVue input yields `null`, read as empty. */
const text = (v: string | null | undefined) =>
  typeof v === 'string' ? v.trim() : '';

/** Drops empty members: `undefined`, `null` and `''` are never written. */
function compact<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(
      ([, v]) => v !== undefined && v !== null && v !== '',
    ),
  ) as T;
}

function buildReading(
  r: LoggerFormReading,
  aggregated: boolean,
): LoggerReading {
  const { depth_min: loadedMin, depth_max: loadedMax, ...rest } = r.rest ?? {};
  return compact({
    datetime: text(r.datetime),
    depth: num(r.depth),
    ...rest,
    pressure: num(r.pressure),
    // Aggregated: edited (and required). Otherwise kept as loaded, never invented.
    depth_min: aggregated ? num(r.depthMin) : loadedMin,
    depth_max: aggregated ? num(r.depthMax) : loadedMax,
  } as LoggerReading);
}

export function fromLoggerForm(
  form: LoggerForm,
  id: string,
  original: LoggerSeriesEvent | null,
): LoggerSeriesEvent {
  return buildEvent(form, id, original, orderedReadingRows(form.readings));
}

function buildEvent(
  form: LoggerForm,
  id: string,
  original: LoggerSeriesEvent | null,
  rows: LoggerFormReading[],
): LoggerSeriesEvent {
  const aggregated = isAggregated(form.aggregation);
  const readings = rows.map(r => buildReading(r, aggregated));
  const preserved = Object.fromEntries(
    Object.entries(original ?? {}).filter(
      ([key]) => !FORM_MANAGED_KEYS.has(key),
    ),
  );
  return {
    ...compact({
      id,
      type: 'logger_series',
      // An empty start defaults to the first reading's instant.
      datetime: text(form.datetime) || readings[0]?.datetime,
      operator: text(form.operator),
      equipment: text(form.equipment),
      notes: text(form.notes),
      measurement_method: text(form.measurementMethod),
      sensor_depth: num(form.sensorDepth),
      interval: num(form.interval),
      barometric_compensation: text(form.barometricCompensation),
      aggregation: text(form.aggregation),
    }),
    readings,
    ...(form.attachments.length > 0 && {
      attachments: form.attachments.map(a => ({ ...a })),
    }),
    ...preserved,
  } as LoggerSeriesEvent;
}

export type LoggerSeriesIssue = {
  path: (string | number)[];
  code: string;
  message: string;
};

/**
 * Schema issues of a series: `LoggerSeriesEventSchema`, then the
 * `depth_min`/`depth_max` rule of aggregated series, which core checks on
 * `HydrodynamicEventSchema` only.
 */
export function loggerSeriesIssues(event: unknown): LoggerSeriesIssue[] {
  const own = LoggerSeriesEventSchema.safeParse(event);
  const parsed = own.success ? HydrodynamicEventSchema.safeParse(event) : own;
  if (parsed.success) return [];
  return parsed.error.issues.map(i => ({
    path: i.path,
    code: i.code,
    message: i.message,
  }));
}

export type LoggerFormIssue = LoggerSeriesIssue & {
  /** 1-based grid row (form order) of a `readings[i]` issue. */
  row?: number;
};

/**
 * Builds the series and its schema issues in one pass (readings sorted once),
 * mapping each reading issue to its grid row. The dialog runs it debounced
 * while editing and synchronously on save.
 */
export function validateLoggerForm(
  form: LoggerForm,
  id: string,
  original: LoggerSeriesEvent | null,
): { event: LoggerSeriesEvent; issues: LoggerFormIssue[] } {
  const rows = orderedReadingRows(form.readings);
  const event = buildEvent(form, id, original, rows);
  const issues = loggerSeriesIssues(event);
  if (!issues.length) return { event, issues: [] };
  const formIndex = new Map(form.readings.map((r, i) => [r, i]));
  return {
    event,
    issues: issues.map(issue => {
      const [head, index] = issue.path;
      const row =
        head === 'readings' && typeof index === 'number' && rows[index]
          ? formIndex.get(rows[index])
          : undefined;
      return row === undefined ? issue : { ...issue, row: row + 1 };
    }),
  };
}

/**
 * A reading instant from what the user typed: an RFC 3339 instant as written,
 * or local `YYYY-MM-DD HH:mm[:ss]` read in `timeZone` (no zone: undefined).
 */
export function parseReadingDatetime(
  text: string,
  timeZone: string | undefined,
): string | undefined {
  const s = text.trim();
  if (RFC3339_WITH_OFFSET.test(s)) {
    return Number.isNaN(Date.parse(s)) ? undefined : s;
  }
  const m = LOCAL_DATETIME.exec(s);
  if (!m || !timeZone) return undefined;
  return localDateTimeToInstant(`${m[1]}T${m[2]}`, timeZone);
}

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

/** `last` plus `intervalMinutes`, written with the offset `last` carries. */
export function nextReadingDatetime(
  last: string | undefined,
  intervalMinutes: number | null,
): string | undefined {
  if (!last || intervalMinutes == null || !(intervalMinutes > 0)) {
    return undefined;
  }
  const ms = instantMs(last);
  const offset = OFFSET.exec(last.trim())?.[1];
  if (Number.isNaN(ms) || !offset) return undefined;
  const offsetMinutes =
    offset === 'Z'
      ? 0
      : (offset[0] === '-' ? -1 : 1) *
        (Number(offset.slice(1, 3)) * 60 + Number(offset.slice(4, 6)));
  const local = new Date(ms + intervalMinutes * 60000 + offsetMinutes * 60000);
  const millis = local.getUTCMilliseconds();
  const date = `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`;
  const time = `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:${pad(local.getUTCSeconds())}`;
  const fraction = millis ? `.${pad(millis, 3)}` : '';
  return `${date}T${time}${fraction}${offset}`;
}

const localFormatters = new Map<string, Intl.DateTimeFormat>();

/**
 * An instant as local `YYYY-MM-DD HH:mm:ss` in `timeZone`, the text the
 * readings grid shows and `parseReadingDatetime` reads back. Text that is not
 * an instant, or an invalid zone, comes back as written.
 */
export function formatReadingLocal(instant: string, timeZone: string): string {
  const ms = instantMs(instant);
  if (Number.isNaN(ms)) return instant;
  let fmt = localFormatters.get(timeZone);
  if (!fmt) {
    try {
      fmt = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return instant;
    }
    localFormatters.set(timeZone, fmt);
  }
  const parts = Object.fromEntries(
    fmt.formatToParts(ms).map(p => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

/**
 * The stored datetime after the user commits `typed` in a field showing
 * `formatReadingLocal(current, timeZone)`. Unchanged text keeps `current`
 * as stored (milliseconds, offset, the second occurrence of a DST-overlap
 * hour); blank clears it; anything else goes through `parseReadingDatetime`,
 * and text that does not parse is kept as typed for validation to flag.
 */
export function applyTypedDatetime(
  current: string,
  typed: string,
  timeZone: string,
): string {
  const value = text(typed);
  if (value === formatReadingLocal(current, timeZone)) return current;
  if (!value) return '';
  return parseReadingDatetime(value, timeZone) ?? value;
}
