// ─── Shared .well v2.3 helpers ───────────────────────────────────────────────
// Used by profile.utils, permit.utils and operation.utils. Kept in their own
// module so those files never import each other in a cycle.

import type { Well } from '@welldot/core';

/**
 * Returns the ids retracted by any `corrects` field among `entries`
 * (`.well` v2.3 ledger corrections). A retracted entry stays in the file but
 * is excluded from every derivation. In a chain (C corrects B, which
 * corrected A) both A and B are retracted; only C counts.
 */
export function getRetractedIds(
  entries: readonly { id: string; corrects?: string }[],
): Set<string> {
  const retracted = new Set<string>();
  for (const entry of entries) {
    if (typeof entry.corrects === 'string') retracted.add(entry.corrects);
  }
  return retracted;
}

/**
 * Local calendar date (`YYYY-MM-DD`) of an RFC 3339 instant.
 *
 * With `timeZone` (an IANA name, from `location.properties.timezone`), the
 * instant is converted to that zone (.well v2.4). Without it, or when the zone
 * or the instant is invalid, the result is the date part as written, in the
 * offset the string carries (.well v2.3 decision 22).
 */
export function instantLocalDate(instant: string, timeZone?: string): string {
  const written = instant.slice(0, 10);
  if (!timeZone) return written;
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return written;
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const get = (type: string) => parts.find(p => p.type === type)?.value;
    const [y, m, d] = [get('year'), get('month'), get('day')];
    return y && m && d ? `${y.padStart(4, '0')}-${m}-${d}` : written;
  } catch {
    return written;
  }
}

/** IANA time zone of the well site (`location.properties.timezone`), if set. */
export function getWellTimeZone(well: Well): string | undefined {
  return well.location?.properties?.timezone;
}

/**
 * UTC offset written on an RFC 3339 instant (`Z`, `+hh:mm` or `-hh:mm`), or
 * `undefined` when the string carries none.
 */
export function instantOffset(instant: string): string | undefined {
  return /(Z|[+-]\d{2}:\d{2})$/i.exec(instant)?.[1]?.toUpperCase();
}
