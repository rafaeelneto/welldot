# @welldot/vue

Vue 3 + PrimeVue base components, theme and composables for `.well` water well editors, with a Nuxt module. Part of the [welldot](https://github.com/rafaeelneto/welldot) open-source ecosystem.

Labeled fields, chips, tag selects, info popovers, number and unit inputs, an FGDC texture picker, a spreadsheet-style data grid and a map-based location picker, all sharing one PrimeVue theme and Tailwind tokens. No i18n library and no store: text props accept a plain string or a `LanguageText` (`{ en, pt, … }`), and app-wide settings come from one `createWelldot` plugin.

---

## Install

```bash
npm install @welldot/vue @welldot/core @welldot/utils @welldot/render primevue @primeuix/themes
```

Optional peers, only for the subpath that needs them:

| Subpath                 | Install                                                     |
| ----------------------- | ----------------------------------------------------------- |
| `@welldot/vue/grid`     | `@revolist/vue3-datagrid @revolist/revogrid vue-color`      |
| `@welldot/vue/location` | `leaflet`                                                   |
| `@welldot/vue/nuxt`     | `@nuxt/kit`, `@nuxt/schema` (already present in a Nuxt app) |

The package is ESM only.

---

## Quick start

### Vue

```ts
import PrimeVue from 'primevue/config';
import { createApp } from 'vue';
import { createWelldot } from '@welldot/vue';
import { WelldotPreset, welldotPt } from '@welldot/vue/theme';

const app = createApp(App);
app.use(PrimeVue, { theme: WelldotPreset, pt: welldotPt });
app.use(createWelldot({ locale: 'pt' }));
app.mount('#app');
```

```vue
<script setup lang="ts">
import { WellLabeledField, WellUnitInput } from '@welldot/vue';

const depth = ref<number | null>(120); // always stored in metres
</script>

<template>
  <WellLabeledField :label="{ en: 'Depth', pt: 'Profundidade' }">
    <WellUnitInput v-model="depth" unit-type="length" />
  </WellLabeledField>
</template>
```

### Nuxt

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@primevue/nuxt-module', '@nuxtjs/i18n', '@welldot/vue/nuxt'],
  css: ['~/assets/styles/main.css'], // see Tailwind setup
});
```

The module:

- registers every `Well*` component (names as-is, no prefix) and auto-imports `createWelldot`, `useWelldotConfig`, `useWellText`, `useWellUnits` and `useWellNumberFormat`;
- adds `@welldot/vue` to `build.transpile` and keeps Nuxt's auto-import transform off its built files (needed when the package is linked, e.g. in a pnpm workspace);
- when `@primevue/nuxt-module` is installed, defaults `primevue.importTheme` / `importPT` to `WelldotPreset` / `welldotPt` — each only if the app hasn't set it;
- when `@nuxtjs/i18n` is installed, adds a plugin that installs `createWelldot({ locale })` following `$i18n.locale`.

| Option (`welldot: {}`) | Default                         | Description                                                                                                                          |
| ---------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `grid`                 | `true`                          | Register `WellDataGrid`                                                                                                              |
| `location`             | `true`                          | Register `WellCoordinateInput`, `WellLocationMap`, `WellLocationPicker`                                                              |
| `theme`                | `true`                          | Default PrimeVue `importTheme` / `importPT` to the Welldot theme; `{ preset?, pt? }` merges override files onto it ([Theme](#theme)) |
| `i18n`                 | `true` if `@nuxtjs/i18n` exists | Wire `locale` to `$i18n.locale`                                                                                                      |

Units and coordinate format are app state, so the app wires them in its own plugin. Its `createWelldot` layers on top of the module's (see [Layering](#layering)):

```ts
// app/plugins/welldot.ts
export default defineNuxtPlugin(nuxtApp => {
  const ui = useUiStore();
  nuxtApp.vueApp.use(
    createWelldot({
      units: () => ({ length: ui.lengthUnit, diameter: ui.diameterUnit }),
      coordinateFormat: () => ui.coordinateFormat,
    }),
  );
});
```

The module never injects CSS: add the Tailwind import below in Nuxt too.

---

## Tailwind setup

The components are styled with Tailwind CSS 4 utilities and the Welldot tokens. In the app's main stylesheet:

```css
@import 'tailwindcss';
@import 'tailwindcss-primeui';
@import '@welldot/vue/tailwind.css';
```

`@welldot/vue/tailwind.css` brings the `@theme` tokens, the `dark` variant (`.dark-mode`), the base layer, the data grid's styles and the components' own styles, and adds the package's built files as a Tailwind `@source`. It must be imported from the app's CSS (not from JS) so the tokens join the app's Tailwind compilation. The tokens read PrimeVue's `--w-*` variables, so use `WelldotPreset` (prefix `w`) or a preset with the same prefix.

### Overriding the tokens

Everything in `tailwind.css` can be overridden from the app's own stylesheet, **after** the import:

| Token                                                                     | Where it comes from                      | Override with                                                                                                                                     |
| ------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Colors (`--color-{surface,content,primary,error,warning,success,info}-*`) | PrimeVue's `--w-*` variables             | The preset — `defineWelldotTheme` (see [Overriding the theme](#overriding-the-theme)), so PrimeVue components and Tailwind utilities stay in sync |
| Fonts (`--font-display`, `--font-serif`, `--font-mono`)                   | `@theme static`                          | The app's `@theme` block                                                                                                                          |
| Radii (`--radius-{sm,md,lg,xl,2xl,pill}`)                                 | `@theme static`                          | The app's `@theme` block                                                                                                                          |
| Focus/error rings (`--color-focus-ring`, `--color-error-ring`)            | `@layer base` (`:root` and `.dark-mode`) | The app's `@layer base`                                                                                                                           |

```css
/* app main.css */
@import 'tailwindcss';
@import 'tailwindcss-primeui';
@import '@welldot/vue/tailwind.css';

@theme {
  --font-display: 'Inter', system-ui, sans-serif;
  --radius-md: 4px;
}

@layer base {
  :root {
    --color-focus-ring: var(--color-primary-600);
  }
  .dark-mode {
    --color-focus-ring: var(--color-primary-200);
  }
}
```

Avoid overriding a color token in `@theme` directly: Tailwind utilities would change while PrimeVue components keep the preset's color. Fonts and radii are declared `static` so they're always emitted, even when only component styles read them through `var()`. The fonts themselves aren't loaded by the package; load them in the app (e.g. `@nuxt/fonts`).

---

## Configuration

```ts
app.use(
  createWelldot({
    locale: () => i18n.global.locale.value, // BCP-47 or 'en' | 'pt'
    units: () => ({ length, diameter, flow, power, volume }),
    coordinateFormat: () => ui.coordinateFormat, // 'DD' | 'DMS'
    components: { deleteButton: TrashButton }, // global part overrides
  }),
);
```

| Option             | Type                                      | Default                                                                    | Used by                                  |
| ------------------ | ----------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------- |
| `locale`           | `MaybeRefOrGetter<string>`                | `'en'`                                                                     | text resolution, number formatting       |
| `units`            | `MaybeRefOrGetter<Partial<WelldotUnits>>` | `{ length: 'm', diameter: 'mm', flow: 'm3/h', power: 'kW', volume: 'm3' }` | unit inputs, grid unit columns           |
| `coordinateFormat` | `MaybeRefOrGetter<'DD' \| 'DMS'>`         | `'DD'`                                                                     | location inputs without a bound `format` |
| `components`       | `MaybeRefOrGetter<WelldotComponents>`     | `{}`                                                                       | swappable parts (wrapped in `markRaw`)   |

Every option takes a value, a ref or a getter. Getters keep the configuration reactive to any store or i18n instance without the package depending on either. Missing unit quantities fall back to SI. `.well` files always store SI; units only change what is shown and typed.

`useWelldotConfig()` returns the active configuration (as getters) and falls back to the defaults when the plugin isn't installed.

**Precedence:** a component's own prop (`unit`, `format`, `components`) → `createWelldot` → built-in default.

### Layering

Installing `createWelldot` more than once on the same app stacks the configurations instead of replacing them:

- `locale` and `coordinateFormat` come from the last install that sets them (`undefined`, `null` and `''` don't count);
- `units` and `components` merge key by key, the later install winning per quantity / part.

So a library plugin can set the locale and the app another plugin with the units. Install every layer before `app.mount()`. Layers are kept per app, so one `createWelldot()` result can be installed in several apps (e.g. per SSR request).

---

## Text and i18n

Every text prop is a `LanguageTextInput` from `@welldot/core`: a plain string, or a `LanguageText` such as `{ en: 'Depth', pt: 'Profundidade' }`, resolved with `resolveLanguageText(text, locale)` against the configured locale. Core vocabularies (`VocabEntry[]`) can be passed as options directly.

- An omitted label is not rendered (no built-in dictionary). The only built-in text is locale-independent (`DD` / `DMS`, coordinate examples).
- Composite components take a grouped `labels` prop (`WellLocationPicker`, `WellTextureSelect`, `WellDataGrid`).
- With vue-i18n, pass the translated string: `:label="t('editor.depth')"`.

`useWellText()` returns the resolver for custom components:

```ts
const text = useWellText();
text({ en: 'Depth', pt: 'Profundidade' }); // 'Profundidade' when locale is 'pt'
text(undefined); // undefined
```

---

## Swappable parts

Parts are replaced with components, not slots: through a component's `components` prop, or globally through `createWelldot({ components })`.

```vue
<WellDataGrid
  :rows="rows"
  :columns="columns"
  :components="{ deleteButton: TrashButton, dragHandle: Grip }"
/>
```

| Part           | Used by                   | Props contract                                   | Notes                                 |
| -------------- | ------------------------- | ------------------------------------------------ | ------------------------------------- |
| `trigger`      | `WellInfoPopover`         | `WellInfoTriggerProps` `{ label?, size }`        | must be focusable                     |
| `icon`         | `WellChip` (string icons) | `WellIconProps` `{ name }`                       | without it, string icons don't render |
| `addButton`    | `WellDataGrid`            | `WellAddButtonProps` `{ label? }`                | emits `click`                         |
| `deleteButton` | `WellDataGrid`            | `WellDeleteButtonProps` `{ index, row, label? }` | emits `click`                         |
| `dragHandle`   | `WellDataGrid`            | `WellDragHandleProps` (none)                     | visual only                           |

Text reaches a part already resolved. A custom part owns its aria-label wording; listeners (`onClick`, `onFocus`, …) arrive as attrs and must fall through to its root element.

For example, render string icons with `@nuxt/icon`:

```ts
import { Icon } from '#components';

createWelldot({
  components: {
    icon: defineComponent({
      props: { name: { type: String, required: true } },
      setup: props => () => h(Icon, { name: props.name }),
    }),
  },
});
```

---

## Components

### `WellLabeledField`

Small uppercase label above (or beside) a control, with an optional info popover.

| Prop          | Type                         | Description                          |
| ------------- | ---------------------------- | ------------------------------------ |
| `label`       | `LanguageTextInput`          | Not rendered when omitted            |
| `orientation` | `'vertical' \| 'horizontal'` | Default `vertical`                   |
| `info`        | `LanguageTextInput`          | Info popover text                    |
| `infoLabel`   | `LanguageTextInput`          | Accessible label of the info trigger |

Slots: `default` (the control), `info` (rich popover body, replaces `info`).

The info popover sits in the label row, so it needs a `label`: with `info` (or the `info` slot) but no label (or a label that resolves to empty text), neither the label nor the popover is rendered. Use `WellInfoPopover` directly for an info button without a label.

### `WellChip`

Compact pill. A `<button>` by default (listen to `click`); with `removable`, a static chip with a trailing × that emits `remove`.

| Prop          | Type                  | Description                              |
| ------------- | --------------------- | ---------------------------------------- |
| `label`       | `LanguageTextInput`   |                                          |
| `icon`        | `string \| Component` | A string renders through the `icon` part |
| `active`      | `boolean`             | Selected state (primary tint)            |
| `removable`   | `boolean`             |                                          |
| `removeLabel` | `LanguageTextInput`   | Accessible label of the × button         |

### `WellTagSelect`

Multi-value picker: selected values render as removable chips above a single Select. `v-model: string[]`. Values missing from `options` still show, as their raw value.

| Prop          | Type                       | Description                                                |
| ------------- | -------------------------- | ---------------------------------------------------------- |
| `options`     | `readonly WellTagOption[]` | `{ value, label: LanguageTextInput }`; `VocabEntry[]` fits |
| `placeholder` | `LanguageTextInput`        |                                                            |
| `removeLabel` | `LanguageTextInput`        | Accessible label of each chip's ×                          |
| `filter`      | `boolean`                  | Filter box in the Select                                   |

### `WellInfoPopover`

Info icon that opens a popover on hover, focus or click. Body: `info` or the default slot.

| Prop         | Type                      | Description                             |
| ------------ | ------------------------- | --------------------------------------- |
| `info`       | `LanguageTextInput`       |                                         |
| `label`      | `LanguageTextInput`       | Accessible label of the trigger         |
| `size`       | `'sm' \| 'md'`            | Default `sm`                            |
| `components` | `{ trigger?: Component }` | See [Swappable parts](#swappable-parts) |

### `WellInputNumber`

PrimeVue `InputNumber` with the locale from the configuration (`en` → `en-US`, `pt` → `pt-BR`, other BCP-47 tags as-is). All attrs pass through.

### `WellUnitInput`

Number input bound to a canonical SI value, shown and edited in the configured display unit. `v-model: number | null`. Other attrs pass through to `WellInputNumber`; `maxFractionDigits` defaults to 4. Follows `unitType` / `unit` changes. A blur that leaves the shown value as it was emits nothing, so an untouched focus + blur never replaces the exact SI value with its rounded display (`1` m shown as `3.2808` ft stays `1`).

| Prop                   | Type                                                      | Description                                  |
| ---------------------- | --------------------------------------------------------- | -------------------------------------------- |
| `unitType`             | `'length' \| 'diameter' \| 'flow' \| 'power' \| 'volume'` | Required                                     |
| `unit`                 | unit of that quantity                                     | Overrides the configured unit for this input |
| `min` / `max` / `step` | `number`                                                  | In SI; converted for display                 |

### `WellTextureSelect`

Filterable Select of lithology texture codes with thumbnails. `v-model: TextureCode | null`. Other attrs (`disabled`, `invalid`, listeners…) pass through to the PrimeVue Select; `show()` / `hide()` are exposed.

| Prop       | Type                             | Description                                                           |
| ---------- | -------------------------------- | --------------------------------------------------------------------- |
| `options`  | `readonly TextureOption[]`       | Default `FGDC_TEXTURES_OPTIONS`                                       |
| `labels`   | `{ placeholder?, showPending? }` | `showPending` labels the "pending textures" toggle; hidden without it |
| `appendTo` | `string \| HTMLElement`          | Overlay target, default `body`                                        |
| `filter`   | `boolean`                        | Default `true`                                                        |
| `pt`       | `object`                         | Merged per section over the built-in pass-through                     |

### `WellTextureThumbnail`

SVG thumbnail of an FGDC texture, loaded lazily from `@welldot/render/textures`.

| Prop   | Type                            | Description    |
| ------ | ------------------------------- | -------------- |
| `code` | `number \| string \| undefined` |                |
| `size` | `number`                        | px, default 48 |

---

## Data grid (`@welldot/vue/grid`)

`WellDataGrid` is a spreadsheet-style editor for any `.well` feature array, built on [RevoGrid](https://rv-grid.com). It never mutates `rows`: it emits events and the parent updates its state. The grid renders on the client after mount (a skeleton shows until then).

```vue
<script setup lang="ts">
import { WellDataGrid, type WellGridColumn } from '@welldot/vue/grid';
import { CONSTRUCTION_MATERIALS, type WellCase } from '@welldot/core';

const casings = ref<WellCase[]>([]);

const columns: WellGridColumn[] = [
  {
    prop: 'from',
    label: { en: 'From', pt: 'De' },
    type: 'number',
    unitType: 'length',
  },
  {
    prop: 'to',
    label: { en: 'To', pt: 'Até' },
    type: 'number',
    unitType: 'length',
  },
  {
    prop: 'type',
    label: 'Material',
    type: 'select',
    options: CONSTRUCTION_MATERIALS,
  },
];
</script>

<template>
  <WellDataGrid
    :rows="casings"
    :columns="columns"
    :add-label="{ en: 'Add casing', pt: 'Adicionar revestimento' }"
    :delete-label="{ en: 'Delete row', pt: 'Excluir linha' }"
    @add="casings.push({ from: 0, to: 0, type: '', diameter: 0 })"
    @delete="i => casings.splice(i, 1)"
    @change="
      (i, prop, value) =>
        ((casings[i] as Record<string, unknown>)[prop] = value)
    "
    @reorder="(from, to) => casings.splice(to, 0, ...casings.splice(from, 1))"
  />
</template>
```

| Prop          | Type                        | Description                                               |
| ------------- | --------------------------- | --------------------------------------------------------- |
| `rows`        | `Record<string, unknown>[]` | Rows to display                                           |
| `columns`     | `WellGridColumn[]`          | Column definitions (below)                                |
| `addLabel`    | `LanguageTextInput`         | Add-row button label; icon-only button when omitted       |
| `deleteLabel` | `LanguageTextInput`         | Accessible label of each delete button                    |
| `labels`      | `WellDataGridLabels`        | `texturePlaceholder`, `showPendingTextures`, `columnInfo` |
| `components`  | `WellDataGridComponents`    | `addButton`, `deleteButton`, `dragHandle`                 |

| Event     | Payload                                       |
| --------- | --------------------------------------------- |
| `add`     | —                                             |
| `delete`  | `index: number`                               |
| `change`  | `index: number, prop: string, value: unknown` |
| `reorder` | `from: number, to: number`                    |

**`WellGridColumn`**: `prop`, `label`, `info?`, `infoHighlight?` (text fields are `LanguageTextInput`), `type` (`text`, `number`, `color`, `checkbox`, `select`, `select-button`, `combo`, `texture`), `options` (for `select` / `select-button` / `combo`; `{ value, label, deprecated? }`, so `VocabEntry[]` fits), `unitType` (values stay SI, shown in the configured unit with the unit in the header), `formatter`, `editor`, `readonly`, `size`, `minSize`, `stretch`, `pin`.

Grid styles ship in `dist/grid.css`, included by `@welldot/vue/tailwind.css`. The color editor loads `vue-color/style.css` itself with a client-only dynamic import, so `@welldot/vue/grid` loads in plain-Vite SSR without `ssr.noExternal` and the app's CSS needs nothing from `vue-color`. Cells are mounted by RevoGrid outside the component tree and only see app-level provides: install `createWelldot` with `app.use` (the Nuxt module does).

Lower-level exports for a custom RevoGrid: `useWellGridColumns({ columns, onDelete, onChange, enableDrag?, enableDelete?, deleteLabel?, labels?, components? })` returns `revoColumns`, `gridEditors`, `plugins` and the edit handlers (cell templates, unit conversion, drag and delete columns included), and `columnStretchPlugin` lets `stretch` columns absorb the remaining width.

---

## Location (`@welldot/vue/location`)

Leaflet is imported on mount, so server-side rendering outputs an empty map container.

### `WellCoordinateInput`

Text input for one coordinate. `v-model: number` (decimal degrees). Accepts DD or DMS, clamps, and reformats on blur or Enter. Blur or Enter on the untouched text emits nothing, so the exact model is not replaced by its rounded display.

| Prop          | Type                | Description                                                |
| ------------- | ------------------- | ---------------------------------------------------------- |
| `axis`        | `'lat' \| 'lng'`    | Required                                                   |
| `format`      | `'DD' \| 'DMS'`     | Falls back to `createWelldot({ coordinateFormat })`        |
| `placeholder` | `LanguageTextInput` | Overrides the built-in example (`COORDINATE_PLACEHOLDERS`) |

### `WellLocationMap`

Leaflet map with a draggable pin drawn in the theme's primary colour. `v-model:lat`, `v-model:lng`.

| Prop          | Type      | Description                                |
| ------------- | --------- | ------------------------------------------ |
| `readonly`    | `boolean` | No dragging or click-to-place (reactive)   |
| `tileUrl`     | `string`  | Default OpenStreetMap (`DEFAULT_TILE_URL`) |
| `attribution` | `string`  | Default `DEFAULT_TILE_ATTRIBUTION`         |
| `height`      | `string`  | CSS height, default `16rem`                |

### `WellLocationPicker`

DD/DMS toggle, latitude/longitude inputs, optional elevation and the map. `v-model:lat`, `v-model:lng`, `v-model:elevation`, `v-model:format` (when unbound: `createWelldot({ coordinateFormat })`, then local state).

| Prop            | Type                       | Description                                                                 |
| --------------- | -------------------------- | --------------------------------------------------------------------------- |
| `showElevation` | `boolean`                  | Default `true`                                                              |
| `labels`        | `WellLocationPickerLabels` | `coordinates`, `latitude`, `longitude`, `elevation` (unit appended), `hint` |

---

## Composables

| Export                                         | Returns                                             | Description                                                                                 |
| ---------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `useWelldotConfig()`                           | `ResolvedWelldotConfig`                             | Active `locale`, `units`, `coordinateFormat`, `components`                                  |
| `useWellText()`                                | `(text?: LanguageTextInput) => string \| undefined` | Resolves text for the configured locale; empty → `undefined`                                |
| `useWellUnits(type, override?)`                | `{ unit, toDisplay, toCanonical }`                  | SI ↔ display conversion for one quantity; `type` and `override` are values, refs or getters |
| `useWellNumberFormat()`                        | `{ formatNumber, resolvedLocale }`                  | Locale-aware number formatting                                                              |
| `resolvePart(name, prop?, fallback?, config?)` | `Component \| undefined`                            | Picks a part by precedence; a `prop` override is returned `markRaw(toRaw(…))`               |

---

## Theme

`@welldot/vue/theme` exports:

- `WelldotPreset`: `{ preset, options }` for PrimeVue's `theme` option (prefix `w`, dark mode on `.dark-mode`, CSS layer `primevue`);
- `welldotPt`: the global pass-through (filled inputs, full-width fields, …).

```ts
app.use(PrimeVue, { theme: WelldotPreset, pt: welldotPt });
```

Toggle dark mode with the `dark-mode` class on `<html>`.

### Overriding the theme

`defineWelldotTheme(overrides)` and `defineWelldotPt(overrides)` return the Welldot theme / pass-through with your overrides deep-merged on top ([`defu`](https://github.com/unjs/defu)). The exported defaults are never mutated.

- Plain objects merge key by key, so you only write what changes.
- Any other value you set wins: a PT section given as a class string or a function **replaces** the default's (it is not combined with it).
- Arrays are concatenated.
- Keep `options.prefix` at `w`: the Tailwind tokens read PrimeVue's `--w-*` variables.

```ts
import { defineWelldotPt, defineWelldotTheme } from '@welldot/vue/theme';

app.use(PrimeVue, {
  theme: defineWelldotTheme({
    preset: { semantic: { primary: { 500: '#0f766e' } } },
    options: { darkModeSelector: '.night' },
  }),
  pt: defineWelldotPt({ tabpanels: { root: 'p-0' } }),
});
```

In Nuxt, point the module at files whose **default export** is the overrides. Paths accept aliases (`~/`, `@/`) and are resolved from the project root; PT overrides may contain functions because they're imported, not serialized:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  welldot: { theme: { preset: '~/theme/preset', pt: '~/theme/pt' } },
});
```

```ts
// app/theme/pt.ts
import type { PrimeVuePTOptions } from 'primevue/config';

export default {
  tabpanels: { root: 'p-0' },
} satisfies PrimeVuePTOptions;
```

```ts
// app/theme/preset.ts
import type { WelldotThemeOverrides } from '@welldot/vue/theme';

export default {
  preset: { components: { tabs: { tab: { padding: '0.5rem 1rem' } } } },
} satisfies WelldotThemeOverrides;
```

Setting `primevue.importTheme` / `importPT` yourself still takes precedence over the module, override files included.

---

## License

Apache 2.0 — see [LICENSE](./LICENSE)
