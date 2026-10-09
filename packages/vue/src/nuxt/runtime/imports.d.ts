/**
 * Minimal type shim for the Nuxt virtual module `#imports`, which only exists
 * inside a Nuxt app. It types just what `runtime/plugin.ts` uses; in the app
 * the real module (with `createWelldot` auto-imported from `@welldot/vue`)
 * takes its place.
 */
declare module '#imports' {
  interface WelldotNuxtApp {
    vueApp: import('vue').App;
    /** `@nuxtjs/i18n` global composer (composition or legacy mode). */
    $i18n?: { locale?: string | import('vue').Ref<string> };
  }

  // Returns `unknown` so the emitted `plugin.d.ts` doesn't reference a type
  // that only this shim declares.
  export function defineNuxtPlugin(plugin: {
    name?: string;
    setup: (nuxtApp: WelldotNuxtApp) => void;
  }): unknown;

  export const createWelldot: typeof import('../../config').createWelldot;
}
