import { describe, expect, it } from 'vitest';

import type { LanguageText } from '../types/language.types';
import { resolveLanguageText } from './language.utils';

describe('resolveLanguageText', () => {
  const text = { en: 'Stainless steel', pt: 'Aço inox' };

  it('resolves the exact tag, then the base language', () => {
    expect(resolveLanguageText(text, 'pt')).toBe('Aço inox');
    expect(resolveLanguageText(text, 'pt-BR')).toBe('Aço inox');
  });

  it('falls back to en, then to the first label', () => {
    expect(resolveLanguageText(text, 'es')).toBe('Stainless steel');
    expect(resolveLanguageText({ pt: 'Só pt' }, 'es')).toBe('Só pt');
  });

  it('skips empty labels', () => {
    expect(resolveLanguageText({ en: 'Pump', pt: ' ' }, 'pt')).toBe('Pump');
    expect(resolveLanguageText({ en: '', pt: '' }, 'pt')).toBe('');
  });

  it('returns a plain string as-is, for any locale', () => {
    expect(resolveLanguageText('Bomba submersa', 'en')).toBe('Bomba submersa');
    expect(resolveLanguageText('', 'pt')).toBe('');
  });

  it('parses a JSON object string', () => {
    const json = JSON.stringify(text);
    expect(resolveLanguageText(json, 'pt-BR')).toBe('Aço inox');
    expect(resolveLanguageText(`  ${json}\n`, 'en')).toBe('Stainless steel');
    expect(resolveLanguageText('{"pt":"Só pt","en":42}', 'en')).toBe('Só pt');
    expect(resolveLanguageText('{}', 'pt')).toBe('');
  });

  it('treats malformed or non-object JSON as a plain string', () => {
    expect(resolveLanguageText('{not json}', 'pt')).toBe('{not json}');
    expect(resolveLanguageText('["en","pt"]', 'pt')).toBe('["en","pt"]');
    expect(resolveLanguageText('"quoted"', 'pt')).toBe('"quoted"');
  });

  it('resolves null and undefined to an empty string', () => {
    expect(resolveLanguageText(null, 'pt')).toBe('');
    expect(resolveLanguageText(undefined, 'en')).toBe('');
  });
});

describe('LanguageText', () => {
  it('requires the listed tags at compile time', () => {
    const both: LanguageText<'en' | 'pt'> = { en: 'Pump', pt: 'Bomba' };
    // @ts-expect-error — `pt` is required
    const missing: LanguageText<'en' | 'pt'> = { en: 'Pump' };
    const open: LanguageText = { es: 'Bomba' };
    expect([both, missing, open]).toHaveLength(3);
  });
});
