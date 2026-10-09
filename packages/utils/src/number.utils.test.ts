import { describe, expect, it } from 'vitest';
import { formatNumber } from './number.utils';

describe('formatNumber', () => {
  describe('fallback handling', () => {
    it('returns — for null', () => {
      expect(formatNumber(null)).toBe('—');
    });

    it('returns — for undefined', () => {
      expect(formatNumber(undefined)).toBe('—');
    });

    it('returns — for NaN', () => {
      expect(formatNumber(NaN)).toBe('—');
    });

    it('returns custom fallback', () => {
      expect(formatNumber(null, { fallback: 'N/A' })).toBe('N/A');
    });
  });

  describe('locale decimal separators', () => {
    it('formats with period separator in en-US', () => {
      expect(formatNumber(3.28, { fractionDigits: 2, locale: 'en-US' })).toBe(
        '3.28',
      );
    });

    it('formats with comma separator in pt-BR', () => {
      expect(formatNumber(3.28, { fractionDigits: 2, locale: 'pt-BR' })).toBe(
        '3,28',
      );
    });

    it('accepts bare language tags (en, pt) equivalently', () => {
      expect(formatNumber(3.28, { fractionDigits: 2, locale: 'en' })).toBe(
        '3.28',
      );
      expect(formatNumber(3.28, { fractionDigits: 2, locale: 'pt' })).toBe(
        '3,28',
      );
    });
  });

  describe('fractionDigits', () => {
    it('pads with zeros (fixed precision)', () => {
      expect(formatNumber(1.5, { fractionDigits: 2, locale: 'en-US' })).toBe(
        '1.50',
      );
    });

    it('rounds to given digits', () => {
      expect(formatNumber(1.555, { fractionDigits: 2, locale: 'en-US' })).toBe(
        '1.56',
      );
    });

    it('fractionDigits: 0 produces integer', () => {
      expect(formatNumber(42.9, { fractionDigits: 0, locale: 'en-US' })).toBe(
        '43',
      );
    });
  });

  describe('maximumFractionDigits', () => {
    it('strips trailing zeros', () => {
      expect(
        formatNumber(1.5, { maximumFractionDigits: 4, locale: 'en-US' }),
      ).toBe('1.5');
    });

    it('does not exceed max digits', () => {
      expect(
        formatNumber(1.23456, { maximumFractionDigits: 2, locale: 'en-US' }),
      ).toBe('1.23');
    });

    it('rounds long floating-point noise away (e.g. depth drift)', () => {
      expect(
        formatNumber(39.99998784, {
          maximumFractionDigits: 2,
          locale: 'en-US',
        }),
      ).toBe('40');
      expect(
        formatNumber(13.99998784, {
          maximumFractionDigits: 2,
          locale: 'pt-BR',
        }),
      ).toBe('14');
    });
  });

  describe('suffix', () => {
    it('appends suffix with space', () => {
      expect(formatNumber(10, { suffix: 'm', locale: 'en-US' })).toBe('10 m');
    });

    it('appends m³ suffix', () => {
      expect(
        formatNumber(2.5, { fractionDigits: 2, suffix: 'm³', locale: 'en-US' }),
      ).toBe('2.50 m³');
    });

    it('no suffix when omitted', () => {
      expect(formatNumber(10, { locale: 'en-US' })).toBe('10');
    });
  });

  describe('locale override in options', () => {
    it('uses provided locale over default', () => {
      expect(formatNumber(1.5, { fractionDigits: 2, locale: 'pt-BR' })).toBe(
        '1,50',
      );
    });

    it('defaults to en-US when no locale given', () => {
      expect(formatNumber(1.5, { fractionDigits: 2 })).toBe('1.50');
    });
  });

  describe('thousands separator', () => {
    it('formats large numbers with en-US grouping', () => {
      expect(
        formatNumber(1000000, { fractionDigits: 0, locale: 'en-US' }),
      ).toBe('1,000,000');
    });

    it('formats large numbers with pt-BR grouping', () => {
      expect(
        formatNumber(1000000, { fractionDigits: 0, locale: 'pt-BR' }),
      ).toBe('1.000.000');
    });
  });
});
