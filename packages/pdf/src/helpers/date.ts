import * as datefns from 'date-fns';

export function formatDate(
  date: Date | string | undefined,
  format = 'dd/MM/yyyy HH:mm',
): string {
  if (!date) return '';

  let dateToFormat = date;
  if (typeof date === 'string') {
    dateToFormat = new Date(date);
  }
  if (!(dateToFormat instanceof Date) || isNaN(dateToFormat.getTime())) {
    return '';
  }
  return datefns.format(dateToFormat, format);
}

/**
 * Formats a picker `Date` as a .well calendar date (`YYYY-MM-DD`) from its
 * local components — never through UTC, which could shift the day.
 */
export function toCalendarDate(date: Date): string {
  return datefns.format(date, 'yyyy-MM-dd');
}

/**
 * Parses a .well calendar date (`YYYY-MM-DD`) into a local-midnight `Date`
 * for date pickers. Returns `null` for absent or malformed values.
 */
export function fromCalendarDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = datefns.parse(value, 'yyyy-MM-dd', new Date());
  return isNaN(date.getTime()) ? null : date;
}

/** Displays a .well calendar date (default `dd/MM/yyyy`) without timezone shifts. */
export function formatCalendarDate(
  value: string | undefined,
  format = 'dd/MM/yyyy',
): string {
  const date = fromCalendarDate(value);
  return date ? datefns.format(date, format) : '';
}
