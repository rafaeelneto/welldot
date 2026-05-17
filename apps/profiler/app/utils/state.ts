/**
 * Returns a recursive Proxy over `target` that intercepts property sets and
 * routes them through `updater` with an auto-generated path-based recipe.
 *
 * Intended for Immer-backed stores: every assignment on the proxy (or on a
 * nested proxy returned by a chain of gets) becomes a tracked draft mutation.
 *
 * @example
 * const proxy = makeDeepProxy(snapshot, [], updateWell)
 * proxy.name = 'x'                              // → updateWell(d => { d.name = 'x' })
 * proxy.events[1].steps.level = 12.3            // → updateWell(d => { d.events[1].steps.level = 12.3 })
 *
 * Symbol keys pass through unproxied (Vue/JS internals).
 * Array mutation methods (push, splice…) are NOT intercepted — call `updater` directly for those.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function makeDeepProxy<T extends object>(
  target: T,
  path: (string | number)[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updater: (recipe: (draft: any) => void) => void,
): T {
  return new Proxy(target, {
    get(obj, key) {
      if (typeof key === 'symbol') return Reflect.get(obj, key);
      const value = Reflect.get(obj, key);
      if (value !== null && typeof value === 'object')
        return makeDeepProxy(value as object, [...path, key as string], updater);
      return value;
    },
    set(_, key, value) {
      if (typeof key === 'symbol') return false;
      updater(draft => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let node: any = draft;
        for (const segment of path) node = node[segment];
        node[key] = value;
      });
      return true;
    },
  });
}
