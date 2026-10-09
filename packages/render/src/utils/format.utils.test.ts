import { describe, expect, it } from 'vitest';
import {
  formatDiameter,
  formatLength,
  getDiameterUnit,
  getLengthUnit,
  resolveRenderLabel,
} from './format.utils';

describe('getDiameterUnit', () => {
  it('always returns mm regardless of locale', () => {
    expect(getDiameterUnit('mm', 'en')).toBe('mm');
    expect(getDiameterUnit('mm', 'pt')).toBe('mm');
    expect(getDiameterUnit('mm', undefined)).toBe('mm');
  });

  it('returns the double-quote symbol for inches when locale is pt or omitted', () => {
    expect(getDiameterUnit('inches', 'pt')).toBe('"');
    expect(getDiameterUnit('inches', undefined)).toBe('"');
  });

  it('returns "in." for inches when locale is en', () => {
    expect(getDiameterUnit('inches', 'en')).toBe('in.');
  });
});

describe('resolveRenderLabel', () => {
  it('falls back to pt when en is not set', () => {
    expect(resolveRenderLabel({ pt: 'X' }, 'en')).toBe('X');
  });

  it('returns en when set and locale is en', () => {
    expect(resolveRenderLabel({ pt: 'X', en: 'Y' }, 'en')).toBe('Y');
  });

  it('returns pt when locale is pt, even if en is set', () => {
    expect(resolveRenderLabel({ pt: 'X', en: 'Y' }, 'pt')).toBe('X');
  });

  it('returns a bare string as-is, regardless of locale', () => {
    expect(resolveRenderLabel('Z', 'en')).toBe('Z');
    expect(resolveRenderLabel('Z', 'pt')).toBe('Z');
  });
});

describe('formatLength / getLengthUnit', () => {
  it('passes through meters unconverted', () => {
    expect(formatLength(7, 'm', 'pt')).toBe('7');
    expect(getLengthUnit('m')).toBe('m');
  });

  it('converts to feet, rounded to at most one decimal', () => {
    expect(formatLength(7, 'ft', 'en')).toBe('23');
    expect(formatLength(7.01, 'ft', 'en')).toBe('23');
    expect(getLengthUnit('ft')).toBe('ft');
  });

  it('rounds long floating-point noise instead of printing it raw', () => {
    expect(formatLength(39.99998784, 'm', 'en')).toBe('40');
  });

  it('uses the locale decimal separator', () => {
    expect(formatLength(7.5, 'm', 'en')).toBe('7.5');
    expect(formatLength(7.5, 'm', 'pt')).toBe('7,5');
  });
});

describe('formatDiameter', () => {
  it('passes through mm unconverted', () => {
    expect(formatDiameter(350, 'mm', 'pt')).toBe('350');
  });

  it('converts to inches with two decimals', () => {
    expect(formatDiameter(350, 'inches', 'en')).toBe(
      (350 * 0.0393701).toFixed(2),
    );
  });

  it('rounds long floating-point noise instead of printing it raw', () => {
    expect(formatDiameter(48.99998784, 'mm', 'en')).toBe('49');
  });
});
