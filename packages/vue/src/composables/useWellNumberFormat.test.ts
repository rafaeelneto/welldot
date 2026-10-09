import { describe, expect, it } from 'vitest';
import { createWelldot } from '../config';
import { withSetup } from '../test/withSetup';
import { LOCALE_MAP, useWellNumberFormat } from './useWellNumberFormat';

function setup(locale?: string) {
  return withSetup(useWellNumberFormat, [createWelldot({ locale })]).result;
}

describe('useWellNumberFormat', () => {
  it('maps bare languages to regional tags', () => {
    expect(LOCALE_MAP).toEqual({ en: 'en-US', pt: 'pt-BR' });
    expect(setup('en').resolvedLocale.value).toBe('en-US');
    expect(setup('pt').resolvedLocale.value).toBe('pt-BR');
  });

  it('passes other BCP-47 tags through', () => {
    expect(setup('de-DE').resolvedLocale.value).toBe('de-DE');
  });

  it('defaults to en-US without configuration', () => {
    expect(withSetup(useWellNumberFormat).result.resolvedLocale.value).toBe(
      'en-US',
    );
  });

  it('formats with the resolved locale', () => {
    expect(setup('en').formatNumber(1234.5, { fractionDigits: 1 })).toBe(
      '1,234.5',
    );
    expect(setup('pt').formatNumber(1234.5, { fractionDigits: 1 })).toBe(
      '1.234,5',
    );
  });
});
