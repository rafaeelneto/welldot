// ─── Date display helpers (date-fns patterns) ────────────────────────────────
import { format as formatFns, parse } from 'date-fns';

/**
 * Formats a `Date` or date string with a date-fns pattern (default
 * `dd/MM/yyyy HH:mm`). Returns `''` for missing or invalid input.
 */
export function formatDate(
  date: Date | string | undefined,
  format = 'dd/MM/yyyy HH:mm',
): string {
  if (!date) return '';
  const value = typeof date === 'string' ? new Date(date) : date;
  if (!(value instanceof Date) || isNaN(value.getTime())) return '';
  return formatFns(value, format);
}

/**
 * Formats a `Date` as a .well calendar date (`YYYY-MM-DD`) from its local
 * components — never through UTC, which could shift the day.
 */
export function toCalendarDate(date: Date): string {
  return formatFns(date, 'yyyy-MM-dd');
}

/**
 * Parses a .well calendar date (`YYYY-MM-DD`) into a local-midnight `Date`.
 * Returns `null` for absent or malformed values.
 */
export function fromCalendarDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = parse(value, 'yyyy-MM-dd', new Date());
  return isNaN(date.getTime()) ? null : date;
}

/** Displays a .well calendar date (default `dd/MM/yyyy`) without time-zone shifts. */
export function formatCalendarDate(
  value: string | undefined,
  format = 'dd/MM/yyyy',
): string {
  const date = fromCalendarDate(value);
  return date ? formatFns(date, format) : '';
}
