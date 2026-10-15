import PrimeVue from 'primevue/config';
import type { Plugin } from 'vue';
import { createWelldot, type WelldotConfig } from '../config';

/** `global` mount options with PrimeVue and a welldot config installed. */
export function welldotGlobal(config: WelldotConfig = {}) {
  return {
    plugins: [
      [PrimeVue, { theme: 'none' }] as [Plugin, ...unknown[]],
      createWelldot(config),
    ],
  };
}
