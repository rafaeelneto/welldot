// eslint-disable-next-line import-x/no-unresolved -- Nuxt virtual module
import { createWelldot, defineNuxtPlugin } from '#imports';
import { unref } from 'vue';

/**
 * `@welldot/vue/nuxt` runtime plugin: installs `createWelldot` with `locale`
 * read from `@nuxtjs/i18n` (`nuxtApp.$i18n.locale`), falling back to `en`.
 *
 * `$i18n` is read lazily inside the getter, so plugin order doesn't matter.
 * `createWelldot` comes through `#imports` (the module auto-imports it from
 * `@welldot/vue`), so the app's own copy of the package provides the config.
 *
 * Units and coordinate format are app state: an app plugin installs another
 * `createWelldot({ units, coordinateFormat })`, which layers on top of this.
 */
export default defineNuxtPlugin({
  name: 'welldot:config',
  setup(nuxtApp) {
    nuxtApp.vueApp.use(
      createWelldot({
        locale: () => unref(nuxtApp.$i18n?.locale) ?? 'en',
      }),
    );
  },
});
