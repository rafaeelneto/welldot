import { createApp, type Plugin } from 'vue';

/**
 * Runs a composable inside a real app's `setup`, with the given plugins
 * installed, and returns its result plus the app (unmount when done).
 */
export function withSetup<T>(composable: () => T, plugins: Plugin[] = []) {
  let result!: T;
  const app = createApp({
    setup() {
      result = composable();
      return () => null;
    },
  });
  for (const plugin of plugins) app.use(plugin);
  app.mount(document.createElement('div'));
  return { result, app };
}
