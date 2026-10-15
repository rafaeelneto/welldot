import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { createWelldot } from '../config';
import { withSetup } from '../test/withSetup';
import { useWellText } from './useWellText';

describe('useWellText', () => {
  const pump = { en: 'Pump', pt: 'Bomba' };

  it('resolves LanguageText for the configured locale', () => {
    const { result: en } = withSetup(useWellText, [
      createWelldot({ locale: 'en' }),
    ]);
    const { result: pt } = withSetup(useWellText, [
      createWelldot({ locale: 'pt-BR' }),
    ]);
    expect(en(pump)).toBe('Pump');
    expect(pt(pump)).toBe('Bomba');
  });

  it('returns plain strings as-is', () => {
    const { result: t } = withSetup(useWellText, [
      createWelldot({ locale: 'pt' }),
    ]);
    expect(t('Depth')).toBe('Depth');
  });

  it('returns undefined for missing or empty text', () => {
    const { result: t } = withSetup(useWellText);
    expect(t()).toBeUndefined();
    expect(t(null)).toBeUndefined();
    expect(t('')).toBeUndefined();
    expect(t({ en: '  ' })).toBeUndefined();
  });

  it('follows locale changes', () => {
    const locale = ref('en');
    const { result: t } = withSetup(useWellText, [createWelldot({ locale })]);
    expect(t(pump)).toBe('Pump');
    locale.value = 'pt';
    expect(t(pump)).toBe('Bomba');
  });
});
