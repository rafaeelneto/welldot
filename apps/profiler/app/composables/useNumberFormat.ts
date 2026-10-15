import { useWellNumberFormat } from '@welldot/vue';

export { LOCALE_MAP } from '@welldot/vue';

/**
 * Locale-aware number formatting (`en` → `en-US`, `pt` → `pt-BR`).
 *
 * Thin wrapper over `@welldot/vue`'s `useWellNumberFormat`; the locale reaches
 * it from `$i18n` through the `@welldot/vue/nuxt` module's plugin.
 */
export function useNumberFormat() {
  return useWellNumberFormat();
}
