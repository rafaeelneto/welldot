import type {
  DiameterUnits,
  FlowUnits,
  LengthUnits,
  PowerUnits,
  VolumeUnits,
} from '@welldot/core';
import type { CoordFormat } from '@welldot/utils';
import {
  hasInjectionContext,
  inject,
  isRef,
  markRaw,
  toRaw,
  toValue,
  type App,
  type Component,
  type InjectionKey,
  type MaybeRefOrGetter,
  type Plugin,
} from 'vue';

/** Display units, one per quantity. `.well` files always store SI. */
export interface WelldotUnits {
  length: LengthUnits;
  diameter: DiameterUnits;
  flow: FlowUnits;
  power: PowerUnits;
  volume: VolumeUnits;
}

/**
 * Swappable parts, keyed by part name. Each part has a typed props contract
 * exported from `types.ts` (e.g. `trigger` → `WellInfoTriggerProps`).
 *
 * Precedence when a component renders a part: its own `components` prop,
 * then this map (from `createWelldot`), then the built-in default.
 */
export interface WelldotComponents {
  /** `WellInfoPopover` trigger. Props: `WellInfoTriggerProps`. */
  trigger?: Component;
  /**
   * Renders a string icon name (e.g. `WellChip`'s `icon="ph:drop"`).
   * Props: `WellIconProps`. Without it, string icons are not rendered.
   */
  icon?: Component;
  /** `WellDataGrid` add-row button. Props: `WellAddButtonProps`. */
  addButton?: Component;
  /** `WellDataGrid` delete-row button. Props: `WellDeleteButtonProps`. */
  deleteButton?: Component;
  /** `WellDataGrid` drag handle. Visual only, no props. */
  dragHandle?: Component;
}

export type WelldotPartName = keyof WelldotComponents;

/**
 * Options of `createWelldot`. Every field is optional and may be a plain
 * value, a ref or a getter — getters keep the configuration reactive to an
 * app store or i18n instance without the package depending on either.
 */
export interface WelldotConfig {
  /** BCP-47 tag or a bare language (`en`, `pt`, `pt-BR`). Default `en`. */
  locale?: MaybeRefOrGetter<string>;
  /** Display units. Missing quantities fall back to SI (m, mm, m³/h, kW, m³). */
  units?: MaybeRefOrGetter<Partial<WelldotUnits>>;
  /** Fallback coordinate format for location inputs. Default `DD`. */
  coordinateFormat?: MaybeRefOrGetter<CoordFormat>;
  /** Global part overrides. Wrapped in `markRaw`. */
  components?: MaybeRefOrGetter<WelldotComponents>;
}

/** The configuration as components read it: plain values behind getters. */
export interface ResolvedWelldotConfig {
  readonly locale: string;
  readonly units: Readonly<WelldotUnits>;
  readonly coordinateFormat: CoordFormat;
  readonly components: Readonly<WelldotComponents>;
}

export const DEFAULT_WELLDOT_UNITS: Readonly<WelldotUnits> = Object.freeze({
  length: 'm',
  diameter: 'mm',
  flow: 'm3/h',
  power: 'kW',
  volume: 'm3',
});

export const DEFAULT_WELLDOT_LOCALE = 'en';
export const DEFAULT_COORDINATE_FORMAT: CoordFormat = 'DD';

export const WELLDOT_CONFIG_KEY: InjectionKey<ResolvedWelldotConfig> =
  Symbol('welldot-config');

const EMPTY_COMPONENTS: Readonly<WelldotComponents> = Object.freeze({});

function rawComponents(map: WelldotComponents | undefined): WelldotComponents {
  if (!map) return EMPTY_COMPONENTS;
  const raw: WelldotComponents = {};
  for (const [name, part] of Object.entries(map)) {
    if (part)
      raw[name as WelldotPartName] =
        typeof part === 'object' ? markRaw(part) : part;
  }
  return markRaw(raw);
}

/** One `createWelldot` call. A static `components` map is wrapped once. */
interface ConfigLayer {
  readonly options: WelldotConfig;
  readonly staticComponents?: WelldotComponents;
}

function toLayer(options: WelldotConfig): ConfigLayer {
  const { components } = options;
  const isStatic =
    !!components && typeof components !== 'function' && !isRef(components);
  return {
    options,
    staticComponents: isStatic
      ? rawComponents(components as WelldotComponents)
      : undefined,
  };
}

function layerComponents(layer: ConfigLayer): WelldotComponents {
  return (
    layer.staticComponents ?? rawComponents(toValue(layer.options.components))
  );
}

/** Merges plain objects key by key, skipping `undefined` values. */
function mergeDefined<T extends object>(
  base: T,
  parts: Array<Partial<T> | null | undefined>,
): T {
  const out = { ...base };
  for (const part of parts) {
    if (!part) continue;
    for (const [key, value] of Object.entries(part)) {
      if (value !== undefined && value !== null) {
        (out as Record<string, unknown>)[key] = value;
      }
    }
  }
  return out;
}

/** The layer stack behind every config this module created. */
const CONFIG_LAYERS = new WeakMap<ResolvedWelldotConfig, ConfigLayer[]>();

/**
 * Builds the getters over a layer stack. The last layer that sets `locale`
 * or `coordinateFormat` wins; `units` and `components` merge key by key, the
 * later layer winning per quantity / part.
 */
function layeredConfig(layers: ConfigLayer[]): ResolvedWelldotConfig {
  function last<T>(read: (options: WelldotConfig) => T | null | undefined) {
    for (let i = layers.length - 1; i >= 0; i--) {
      const value = read(layers[i].options);
      if (value !== undefined && value !== null && value !== '') return value;
    }
    return undefined;
  }

  const config: ResolvedWelldotConfig = {
    get locale() {
      return last(o => toValue(o.locale)) ?? DEFAULT_WELLDOT_LOCALE;
    },
    get units() {
      return mergeDefined<WelldotUnits>(
        DEFAULT_WELLDOT_UNITS,
        layers.map(l => toValue(l.options.units)),
      );
    },
    get coordinateFormat() {
      return (
        last(o => toValue(o.coordinateFormat)) ?? DEFAULT_COORDINATE_FORMAT
      );
    },
    get components() {
      const maps = layers
        .map(layerComponents)
        .filter(map => map !== EMPTY_COMPONENTS);
      if (maps.length === 0) return EMPTY_COMPONENTS;
      if (maps.length === 1) return maps[0];
      return markRaw(Object.assign({}, ...maps) as WelldotComponents);
    },
  };
  CONFIG_LAYERS.set(config, layers);
  return config;
}

/**
 * Resolves options into getters; reading a field re-reads its source, so
 * refs and getters stay reactive. Missing fields fall back to the defaults
 * (`en`, SI units, `DD`, no part overrides).
 */
export function resolveWelldotConfig(
  options: WelldotConfig = {},
): ResolvedWelldotConfig {
  return layeredConfig([toLayer(options)]);
}

const DEFAULT_CONFIG = resolveWelldotConfig();

/**
 * The `@welldot/vue` Vue plugin. Install it with `app.use()`.
 *
 * It registers the configuration with `app.provide`, which is what makes it
 * reach components mounted outside the normal tree (e.g. RevoGrid cells,
 * which only inherit the app context).
 *
 * **Layering.** Installing `createWelldot` again on the same app stacks the
 * new options on top of the existing configuration instead of replacing it:
 * `locale` and `coordinateFormat` come from the last install that sets them,
 * `units` and `components` merge per key (the later install wins per
 * quantity / part). This lets a library-level plugin (e.g. the Nuxt module's,
 * which wires `locale`) and an app plugin (which wires `units`) each set their
 * own fields. Install every layer before the app mounts.
 *
 * @example
 * app.use(createWelldot({
 *   locale: () => i18n.global.locale.value,
 *   units: () => ({ length: ui.lengthUnit, diameter: ui.diameterUnit }),
 *   components: { trigger: MyInfoButton },
 * }))
 */
export function createWelldot(options: WelldotConfig = {}): Plugin {
  const layer = toLayer(options);
  return {
    install(app: App) {
      // The stack lives per app (never on the plugin object), so one
      // `createWelldot()` result installed into several apps — e.g. one per
      // SSR request — never leaks layers between them.
      const current = app.runWithContext(() =>
        inject(WELLDOT_CONFIG_KEY, null),
      );
      const layers = current ? CONFIG_LAYERS.get(current) : undefined;
      if (layers) layers.push(layer);
      else app.provide(WELLDOT_CONFIG_KEY, layeredConfig([layer]));
    },
  };
}

/**
 * The active configuration. Falls back to the defaults (`en`, SI, `DD`, no
 * part overrides) when `createWelldot` isn't installed or when called outside
 * an injection context.
 */
export function useWelldotConfig(): ResolvedWelldotConfig {
  if (!hasInjectionContext()) return DEFAULT_CONFIG;
  return inject(WELLDOT_CONFIG_KEY, DEFAULT_CONFIG);
}

/**
 * Picks the component for a swappable part: `propOverride` (the rendering
 * component's own `components` prop), then the `createWelldot` map, then
 * `fallback` (the built-in default).
 *
 * `config` defaults to `useWelldotConfig()`, so call it from `setup` or a
 * render function — or pass the config captured in `setup` when resolving
 * inside a `computed` or callback.
 *
 * A prop override is unwrapped and marked raw, so a part held in reactive
 * state (e.g. `components` built from a `reactive` object) is not rendered
 * as a reactive component.
 */
export function resolvePart(
  name: WelldotPartName,
  propOverride?: Component | null,
  fallback?: Component,
  config: ResolvedWelldotConfig = useWelldotConfig(),
): Component | undefined {
  if (propOverride) return markRaw(toRaw(propOverride));
  return config.components[name] ?? fallback;
}
