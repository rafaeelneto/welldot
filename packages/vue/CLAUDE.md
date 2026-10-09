# packages/vue — @welldot/vue

Vue 3 + PrimeVue base components, theme and composables for `.well` editors, plus a thin Nuxt module at `@welldot/vue/nuxt`. Depends on `@welldot/core`, `@welldot/utils` and `@welldot/render` (peers).

## Purpose

The shared UI layer of `apps/profiler` and `welldot-manager`, published so both consume the same versioned components instead of drifting copies. Base components only: labeled field, chip, tag select, info popover, number/unit inputs, texture select/thumbnail, the data grid and the location picker. Domain editors (tabs, permit/sample/event/pump dialogs) and `RecordCard` stay in the apps.

Framework-light: Vue + PrimeVue, no vue-i18n, no Pinia, no store shape. Every text prop is a `LanguageTextInput` (string or `LanguageText` from `@welldot/core`) resolved against the configured locale; an omitted label isn't rendered. App-wide settings (locale, display units, coordinate format, swappable parts) come from `createWelldot`, a Vue plugin that registers them with `app.provide`. Swappable parts are passed as components (`components` prop or `createWelldot({ components })`), never slots. Precedence: prop, then `createWelldot`, then the built-in default.

Spec: `~/.claude/plans/welldot-vue-package.md`.

## Source layout

```
src/
  index.ts                    ← `.` entry: createWelldot, composables, root components, part types
  config.ts                   ← WelldotConfig, WELLDOT_CONFIG_KEY, createWelldot (layered), useWelldotConfig, resolvePart
  types.ts                    ← part contracts (WellInfoTriggerProps, WellDeleteButtonProps…), WellTagOption
  composables/
    useWellText.ts            ← (text: LanguageTextInput) => string | undefined
    useWellUnits.ts           ← canonical SI ↔ display unit, per quantity
    useWellNumberFormat.ts    ← formatNumber + resolvedLocale (en → en-US, pt → pt-BR)
  components/
    WellLabeledField.vue  WellChip.vue  WellTagSelect.vue  WellInfoPopover.vue
    WellInputNumber.vue  WellUnitInput.vue  WellTextureSelect.vue  WellTextureThumbnail.vue
    parts/WellInfoTrigger.vue ← default `trigger` part
  grid/                       → `@welldot/vue/grid` (RevoGrid)
    index.ts  WellDataGrid.vue  types.ts  useWellGridColumns.ts  columnStretchPlugin.ts
    grid.css                  ← global RevoGrid theme → dist/grid.css (imported by tailwind.css)
    cells/*.vue               ← internal cell renderers/editors, not exported
    parts/                    ← default addButton / deleteButton
    composables/              ← useCellTemplate, useGridOverlayFocusGuard, useUnitSuffix
  location/                   → `@welldot/vue/location` (leaflet, loaded on mount)
    index.ts  location.ts  WellCoordinateInput.vue  WellLocationMap.vue  WellLocationPicker.vue
  theme/                      → `@welldot/vue/theme`
    index.ts                  ← WelldotPreset ({ preset, options }), welldotPt (named exports only)
    preset.ts  pt.ts
    define.ts                 ← defineWelldotTheme / defineWelldotPt: defu(overrides, defaults)
    tailwind.css              → `@welldot/vue/tailwind.css` (tokens, dark variant, base, @source)
  nuxt/                       → `@welldot/vue/nuxt`
    module.ts                 ← defineNuxtModule: components, imports, transpile (+ imports.transform.exclude of dist/), PrimeVue theme defaults
    runtime/plugin.ts         ← createWelldot({ locale }) from nuxtApp.$i18n
    runtime/imports.d.ts      ← type shim for Nuxt's `#imports`
  test/                       ← setup, withSetup, mountOptions, nuxtImports (`#imports` alias in vitest)
```

## Key API

```ts
import { createWelldot } from '@welldot/vue';

app.use(
  createWelldot({
    locale: () => i18n.global.locale.value, // 'en' | 'pt' | any BCP-47
    units: () => ({ length: ui.lengthUnit }), // missing quantities stay SI
    coordinateFormat: () => ui.coordinateFormat, // 'DD' | 'DMS'
    components: { trigger: MyInfoButton }, // markRaw'd
  }),
);
```

- Every option is a value, ref or getter; `ResolvedWelldotConfig` exposes getters, so reads stay reactive.
- **Layering:** installing `createWelldot` again on the same app stacks onto the existing config. `locale`/`coordinateFormat` come from the last layer that sets them; `units` and `components` merge per key. The Nuxt module's plugin sets `locale`, the app's own plugin sets `units`/`coordinateFormat`. The layer stack is per app (safe for SSR).
- `useWelldotConfig()` falls back to defaults (`en`, SI, `DD`) when the plugin isn't installed.
- `resolvePart(name, propOverride, fallback, config?)` picks a part by precedence.
- Nuxt: `modules: ['@welldot/vue/nuxt']`, options under `welldot: { grid, location, theme, i18n }`.
- Theme overrides: `defineWelldotTheme(overrides)` / `defineWelldotPt(overrides)` deep-merge onto the defaults with `defu` (never mutating them). In Nuxt, `welldot.theme: { preset?, pt? }` takes paths to files default-exporting the overrides; the generated `.nuxt/welldot/primevue-{theme,pt}.mjs` shims import them and call the define helpers (file paths, not inline objects, because PT values can be functions).

## Commands

```bash
pnpm test       # vitest run (jsdom)
pnpm build      # vite build → dist/ (type errors fail the build via vite-plugin-dts)
pnpm dev        # vite build --watch
pnpm lint       # eslint .
```

## Documentation requirements

`README.md` must stay in sync with the public API. **Any change to an entry's exports, a component's props/models/events/labels/parts, `createWelldot` options, the Nuxt module options or the CSS files requires updating `README.md` in the same commit.** Every exported function and component needs a JSDoc block.

## Constraints

- Never import vue-i18n, Pinia, Nuxt auto-imports or app code (`~/`, `@/`). Helpers come from `@welldot/core` / `@welldot/utils` directly. Text is `LanguageTextInput`; no built-in dictionary (only locale-independent text such as `DD`/`DMS` or coordinate examples).
- **RevoGrid cells only see app-level provides.** `VGridVueTemplate` mounts each cell with the app context only, so `createWelldot` must use `app.provide` (never a component-level `provide`), and the grid's `components`/`labels` reach cells as template props, never through inject. Create cell/editor factories during setup, not inside a `computed`.
- Don't add `vue-tsc`: in this workspace it becomes the optional peer of the root `prettier-plugin-organize-imports`, which then rewrites the profiler's `.vue` imports. Type checking runs through `vite-plugin-dts` (`afterDiagnostic` throws).
- Every dependency is external (`vite.config.ts` `EXTERNAL`); `leaflet`, RevoGrid, `vue-color`, `@nuxt/kit` and `@nuxt/schema` are optional peers, imported only from their subpath (`/location`, `/grid`, `/nuxt`). Never import them from the root entry.
- `tailwind.css` token split, so apps can override after importing it: colors in `@theme` map to PrimeVue's `--w-*` (override through the preset, `defineWelldotTheme`); fonts and radii in `@theme static` (always emitted; override in the app's `@theme`); focus/error rings in `@layer base` (override in the app's `@layer base`). Never redeclare a `@theme` token in `@layer base` — the base layer comes after the theme layer, so it silently beats the app's `@theme` override.
- CSS ships as `dist/tailwind.css` (exported as `./tailwind.css`), `dist/grid.css` and `dist/style.css` (extracted SFC styles); `tailwind.css` imports the other two. Apps import it manually after `tailwindcss` and `tailwindcss-primeui`, so the tokens share the app's Tailwind compilation — the Nuxt module does not inject CSS.
- Icons are compiled in with `unplugin-icons` (`~icons/ph/*`). String icon names (e.g. `WellChip`'s `icon="ph:drop"`) render only through the `icon` part.
- Nuxt runtime code imports Nuxt APIs and `createWelldot` from `#imports` (typed by `runtime/imports.d.ts`, aliased to `src/test/nuxtImports.ts` in vitest), so the app's own `@welldot/vue` copy provides the config. PrimeVue's module emits a default import for `importTheme`/`importPT`, so the module generates `.nuxt/welldot/primevue-{theme,pt}.mjs` re-exporting the named theme exports as defaults.
- ESM only, target ES2020.
