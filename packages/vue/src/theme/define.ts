import type { Preset } from '@primeuix/themes/types';
import { defu } from 'defu';
import type { PrimeVuePTOptions } from 'primevue/config';
import { WelldotPreset } from './preset';
import { welldotPt } from './pt';

type DeepPartial<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

/** PrimeVue `theme` option shape: `{ preset, options }`. */
export type WelldotTheme = typeof WelldotPreset;

/** Overrides merged onto `WelldotPreset` by `defineWelldotTheme`. */
export interface WelldotThemeOverrides {
  /** Design tokens (`primitive`, `semantic`, `components`…) */
  preset?: DeepPartial<Preset> & Record<string, unknown>;
  /** Theme options (`prefix`, `darkModeSelector`, `cssLayer`) */
  options?: DeepPartial<WelldotTheme['options']>;
}

/**
 * `WelldotPreset` with `overrides` deep-merged on top (`defu`: plain objects
 * merge key by key, any other value set in `overrides` wins, arrays are
 * concatenated). The defaults are never mutated.
 *
 * Changing `options.prefix` breaks `@welldot/vue/tailwind.css`, whose tokens
 * read PrimeVue's `--w-*` variables.
 *
 * @example
 * app.use(PrimeVue, {
 *   theme: defineWelldotTheme({
 *     preset: { components: { tabs: { tab: { padding: '0.5rem 1rem' } } } },
 *   }),
 * })
 */
export function defineWelldotTheme(
  overrides: WelldotThemeOverrides = {},
): WelldotTheme {
  return defu(overrides, WelldotPreset) as WelldotTheme;
}

/**
 * `welldotPt` with `overrides` deep-merged on top, per component and section.
 * A section set in `overrides` replaces the default (a class string or a
 * function is not combined with the default's); nested sections merge.
 *
 * @example
 * app.use(PrimeVue, {
 *   pt: defineWelldotPt({ tabpanels: { root: 'p-0' } }),
 * })
 */
export function defineWelldotPt(
  overrides: PrimeVuePTOptions = {},
): PrimeVuePTOptions {
  return defu(
    overrides as Record<string, unknown>,
    welldotPt as Record<string, unknown>,
  ) as PrimeVuePTOptions;
}
