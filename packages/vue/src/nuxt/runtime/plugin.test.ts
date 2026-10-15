import { describe, expect, it } from 'vitest';
import { createApp, ref } from 'vue';
import { createWelldot, useWelldotConfig } from '../../config';

import welldotPlugin from './plugin';

// `#imports` is aliased to `src/test/nuxtImports.ts`, whose
// `defineNuxtPlugin` returns the plugin object unchanged.
const plugin = welldotPlugin as unknown as {
  name: string;
  setup: (nuxtApp: Record<string, unknown>) => void;
};

function run(nuxtApp: Record<string, unknown>, layers = [] as unknown[]) {
  let config!: ReturnType<typeof useWelldotConfig>;
  const app = createApp({
    setup() {
      config = useWelldotConfig();
      return () => null;
    },
  });
  plugin.setup({ ...nuxtApp, vueApp: app });
  for (const layer of layers)
    app.use(layer as ReturnType<typeof createWelldot>);
  app.mount(document.createElement('div'));
  return config;
}

describe('@welldot/vue/nuxt runtime plugin', () => {
  it('reads the locale from $i18n, reactively', () => {
    const locale = ref('pt');
    const config = run({ $i18n: { locale } });
    expect(config.locale).toBe('pt');
    locale.value = 'en';
    expect(config.locale).toBe('en');
  });

  it('accepts a legacy-mode string locale', () => {
    expect(run({ $i18n: { locale: 'pt' } }).locale).toBe('pt');
  });

  it('falls back to en without $i18n', () => {
    expect(run({}).locale).toBe('en');
  });

  it('lets an app plugin layer units on top', () => {
    const config = run({ $i18n: { locale: ref('pt') } }, [
      createWelldot({ units: { length: 'ft' }, coordinateFormat: 'DMS' }),
    ]);
    expect(config.locale).toBe('pt');
    expect(config.units.length).toBe('ft');
    expect(config.coordinateFormat).toBe('DMS');
  });
});
