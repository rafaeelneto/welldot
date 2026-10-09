/**
 * Test stand-in for Nuxt's `#imports` (aliased in `vitest.config.ts`):
 * `defineNuxtPlugin` returns the plugin object as-is so tests can call
 * `setup` directly; `createWelldot` is the auto-import the module registers.
 */
export { createWelldot } from '../config';

export function defineNuxtPlugin<T>(plugin: T): T {
  return plugin;
}
