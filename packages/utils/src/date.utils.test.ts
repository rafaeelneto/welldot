import { describe, expect, it } from 'vitest';

import {
  formatCalendarDate,
  formatDate,
  fromCalendarDate,
  toCalendarDate,
} from './date.utils';

describe('formatDate', () => {
  it('formats dates and date strings with a pattern', () => {
    expect(formatDate(new Date(2024, 1, 3, 9, 5))).toBe('03/02/2024 09:05');
    expect(formatDate(new Date(2024, 1, 3), 'yyyy-MM-dd')).toBe('2024-02-03');
  });

  it('returns an empty string for missing or invalid input', () => {
    expect(formatDate(undefined)).toBe('');
    expect(formatDate('not a date')).toBe('');
  });
});

describe('calendar dates', () => {
  it('round-trips YYYY-MM-DD through local midnight', () => {
    const date = fromCalendarDate('2024-02-29');
    expect(date?.getDate()).toBe(29);
    expect(toCalendarDate(date!)).toBe('2024-02-29');
  });

  it('returns null for absent or malformed values', () => {
    expect(fromCalendarDate(undefined)).toBeNull();
    expect(fromCalendarDate('2024-13-40')).toBeNull();
  });

  it('displays calendar dates with a default or custom pattern', () => {
    expect(formatCalendarDate('2024-02-29')).toBe('29/02/2024');
    expect(formatCalendarDate('2024-02-29', 'MM/dd/yyyy')).toBe('02/29/2024');
    expect(formatCalendarDate(undefined)).toBe('');
  });
});
