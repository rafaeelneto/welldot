import { formatNumber, type FormatNumberOptions } from '@welldot/utils';
import { computed } from 'vue';
import { useWelldotConfig } from '../config';

/** Bare app languages mapped to the regional tag used for number formatting. */
export const LOCALE_MAP: Record<string, string> = { en: 'en-US', pt: 'pt-BR' };

/**
 * Locale-aware number formatting driven by the configured locale. `en` and
 * `pt` map to `en-US` / `pt-BR`; any other BCP-47 tag passes through.
 */
export function useWellNumberFormat() {
  const config = useWelldotConfig();
  const resolvedLocale = computed(
    () => LOCALE_MAP[config.locale] ?? config.locale,
  );

  function format(
    value: number | null | undefined,
    options?: Omit<FormatNumberOptions, 'locale'>,
  ): string {
    return formatNumber(value, { ...options, locale: resolvedLocale.value });
  }

  return { formatNumber: format, resolvedLocale };
}
