// ─── Shared .well v2.3 helpers ───────────────────────────────────────────────
// Used by profile.utils, permit.utils and operation.utils. Kept in their own
// module so those files never import each other in a cycle.

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
 * Local calendar date (`YYYY-MM-DD`) of an RFC 3339 instant, as written: the
 * date part of the string, interpreted in the offset it carries (.well v2.3
 * decision 22). No time-zone conversion is applied.
 */
export function instantLocalDate(instant: string): string {
  return instant.slice(0, 10);
}
