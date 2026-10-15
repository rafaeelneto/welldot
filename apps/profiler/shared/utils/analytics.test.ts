import { describe, expect, it } from 'vitest';
import { isAnalyticsEvent, parseAnalyticsParams } from './analytics';

describe('isAnalyticsEvent', () => {
  it('accepts listed names only', () => {
    expect(isAnalyticsEvent('well_open')).toBe(true);
    expect(isAnalyticsEvent('drop_table')).toBe(false);
    expect(isAnalyticsEvent(42)).toBe(false);
  });
});

describe('parseAnalyticsParams', () => {
  it('treats missing params as empty', () => {
    expect(parseAnalyticsParams(undefined)).toEqual({});
    expect(parseAnalyticsParams(null)).toEqual({});
  });

  it('keeps flat, small params', () => {
    const params = { source: 'example', http_status: 404, ok: true };
    expect(parseAnalyticsParams(params)).toEqual(params);
  });

  it('rejects nested, oversized or badly named params', () => {
    expect(parseAnalyticsParams({ well: { name: 'x' } })).toBeNull();
    expect(parseAnalyticsParams({ note: 'x'.repeat(65) })).toBeNull();
    expect(parseAnalyticsParams({ 'Bad-Key': 'x' })).toBeNull();
    expect(parseAnalyticsParams(['a'])).toBeNull();
    expect(parseAnalyticsParams({ n: Number.NaN })).toBeNull();
    const many = Object.fromEntries(
      Array.from({ length: 9 }, (_, i) => [`k${i}`, i]),
    );
    expect(parseAnalyticsParams(many)).toBeNull();
  });
});
