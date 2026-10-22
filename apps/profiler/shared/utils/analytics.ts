/**
 * Product events, shared by `trackEvent()` (app/utils/analytics.ts) and the
 * `/api/events` route that accepts them. Snake case. Add a name here before
 * tracking a new event: the route drops anything else.
 */
export const ANALYTICS_EVENTS = [
  'well_new',
  'well_open',
  'well_save',
  'siagas_import',
  'pdf_download',
  'pdf_print',
  'share_link',
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

/** Flat, small event details. Never put well data or anything personal here. */
export type AnalyticsParams = Record<string, string | number | boolean>;

export const ANALYTICS_LIMITS = {
  maxParams: 8,
  keyPattern: /^[a-z][a-z0-9_]{0,31}$/,
  maxValueLength: 64,
} as const;

export function isAnalyticsEvent(name: unknown): name is AnalyticsEvent {
  return (
    typeof name === 'string' &&
    (ANALYTICS_EVENTS as readonly string[]).includes(name)
  );
}

/** The params when they fit `ANALYTICS_LIMITS`, otherwise null. */
export function parseAnalyticsParams(value: unknown): AnalyticsParams | null {
  if (value === undefined || value === null) return {};
  if (typeof value !== 'object' || Array.isArray(value)) return null;
  const entries = Object.entries(value);
  if (entries.length > ANALYTICS_LIMITS.maxParams) return null;
  for (const [key, v] of entries) {
    if (!ANALYTICS_LIMITS.keyPattern.test(key)) return null;
    if (typeof v === 'string' && v.length <= ANALYTICS_LIMITS.maxValueLength)
      continue;
    if (typeof v === 'number' && Number.isFinite(v)) continue;
    if (typeof v === 'boolean') continue;
    return null;
  }
  return value as AnalyticsParams;
}
