# apps/profiler — Welldot (Nuxt 4)

**Active production app.** This is the replacement for `apps/well-profiler`. Built with Nuxt 4 + Vue 3, deployed to Cloudflare Workers at `welldot.org`.

## Stack

- **Framework:** Nuxt 4 (`srcDir: app/`) with SSR enabled
- **UI:** PrimeVue 4 + `@welldot/vue` (workspace package, see [packages/vue/CLAUDE.md](../../packages/vue/CLAUDE.md)) — base components (`Well*`), the PrimeVue theme (`WelldotPreset` + `welldotPt` pass-through) and the Tailwind tokens. Wired by the `@welldot/vue/nuxt` module
- **Styling:** Tailwind CSS 4 (Vite plugin), global styles in `app/assets/styles/main.css`
- **State:** Pinia with `pinia-plugin-persistedstate`
- **i18n:** `@nuxtjs/i18n` — English and Brazilian Portuguese (`i18n/locales/`)
- **SEO:** `@nuxtjs/seo` (schema.org, OG, sitemap, robots)
- **PWA:** `@vite-pwa/nuxt` (auto-update, disabled in dev)
- **Fonts:** Space Grotesk, IBM Plex Serif, JetBrains Mono (via `@nuxt/fonts`)
- **Icons:** Phosphor (`ph:`) via `@nuxt/icon` — **preferred**. Heroicons (`heroicons:`) remain as secondary usange when there is no phosphor good icon or is explicit said. Custom SVG icons in `app/assets/icons/` (prefix `welldot:`)
- **Onboarding tips:** `driver.js` — startup tips that highlight a UI element (`app/composables/useStartupTips.ts`)
- **Deploy:** Cloudflare Workers (Nitro `cloudflare-module` preset, static assets binding); preview via `wrangler dev`

## Directory layout

```
app/                      ← srcDir
  app.vue                 ← root component
  pages/
    index.vue             ← landing page
    editor/               ← editor; tabs in _components/tabs/ (Summary, General,
                             Construction, Geological, History, Hydrodynamic, Operation,
                             Permits, Water quality). Summary is an icon-only first tab and
                             the default one: a read-only dashboard (summary/: identity,
                             location map, current pump + regime, aquifer state from
                             `useAquiferState`, latest water sample, permit in force,
                             alerts/latest event/recent logs, construction tables) whose
                             cards switch tabs through the `summaryNavigateKey` inject.
                             Tab keys are semantic (`EDITOR_TAB` in summary/navigate.ts) and
                             the active one is kept in the URL hash (`/editor#permits`,
                             none for summary); `profileStore.wellSession` (bumped by
                             `loadWell`/`clear`) sends the editor back to the summary.
                             Operation (.well v2.3) = pump_installations, meters,
                             operating_regime and the production ledger (volumes shown
                             in the volume display unit setting); Permits (.well v2.3)
                             = permits (permits/: PermitsPanel cards; PermitDialog in
                             tabs — grant / ConditionEditor / PermitHistoryEditor;
                             ConditionEditor's ConditionScheduleDialog marks deadlines
                             fulfilled on the draft (saved with the permit);
                             ConditionFulfillDialog writing `conditions[].fulfillments`
                             via `usePermitFulfillments()`; ConditionDeadlineList is the
                             shared schedule list; and PermitViewDialog in tabs
                             — grant, full condition schedule where deadlines are marked
                             fulfilled, history/compliance timeline where history steps are
                             added/edited/completed/removed (PermitHistoryEntryDialog +
                             `usePermitHistory()`, form in PermitHistoryEntryFields) — whose open permit lives in
                             `usePermitView()` and the hash `#permits/<id>`, also opened
                             from the Summary permit card); Water quality (.well v2.3) = the
                             `water_samples` ledger (waterQuality/: panel + card,
                             WaterSampleDialog validated with core `WaterSampleSchema`
                             before save, ResultsEditor, PurgeReadingsEditor;
                             WaterSampleViewDialog in tabs — collection, full results,
                             ledger links (corrections, duplicates/splits, history logs) —
                             whose open sample lives in `useWaterSampleView()` and the
                             hash `#water-quality/<id>`, also opened from the Summary
                             water card; card and view share `useSampleDerived()`; labels in
                             utils/waterQualityVocab.ts; "compare against" limit set in
                             `uiStore.waterQualityLimitSet`; derivations/warnings from
                             @welldot/utils); History log dialog edits `maintenance`
                             fields, `status_change` status (current well status
                             tag) and the `hydrodynamic_event_ids` / `sample_ids` links
                             of any category (`WellTagSelect`: chips above a Select); root `attachments`
                             (general files) live in the General tab below Observations
  layouts/
    landing.vue           ← layout for the landing page
  components/             ← app/domain components only; base components (WellLabeledField,
                             WellChip, WellTagSelect, WellInfoPopover, WellInputNumber,
                             WellUnitInput, WellDataGrid, WellLocationPicker/Map…) come from
                             `@welldot/vue`, registered by its Nuxt module
    landing/              ← landing-page components (HeroVisual, WellJsonViewer, etc.)
    attachments/          ← AttachmentField (strip + add/edit dialog, `v-model` of the list) and
                             AttachmentDialog. Saved records write back with `assignAttachments`
                             (utils/attachments.ts) inside `profileStore.updateWell`
    records/              ← RecordCard: shared shell for every editor ledger card (history,
                             events, pumps, meters, regimes, production, permits, samples) —
                             tags + date header, body slot, footer with who/meta on the left
                             and `RecordAction[]` on the right (labels collapse to icons on
                             narrow cards via container queries; >3 actions overflow to a menu;
                             danger action always last)
  composables/
    useBus.ts             ← typed event bus composable (wraps EventBus)
    useUnitDisplay.ts     ← thin wrapper of `useWellUnits` (@welldot/vue)
    useNumberFormat.ts    ← thin wrapper of `useWellNumberFormat` (@welldot/vue)
  core/
    EventBus/             ← mitt-based typed event bus (bus.ts, Events.ts, types.ts)
  stores/                 ← Pinia stores
  plugins/
    00.i18n-head.ts       ← i18n head tags (minus canonical / og:url)
    01.canonical.ts       ← injects canonical URL
    02.primevue-services.ts ← ConfirmationService + DialogService
    03.welldot.ts         ← app layer of `createWelldot`: display units + coordinate format
                             from `useUiStore`, and the `icon` part (string icons such as
                             `<WellChip icon="ph:drop">` render through `@nuxt/icon`)
  utils/
    date.ts
    clipboard.ts
  assets/
    styles/main.css       ← imports tailwindcss, tailwindcss-primeui, @welldot/vue/tailwind.css
    icons/                ← custom SVG icon set (welldot: prefix)
i18n/
  locales/en.json
  locales/pt.json
i18n.config.ts
nuxt.config.ts
```

## Commands

```bash
pnpm dev        # nuxt dev (localhost:3000)
pnpm build      # nuxt build → .output/
pnpm generate   # static generation
pnpm preview    # wrangler dev (Cloudflare Workers preview)
pnpm lint       # eslint
```

## Key patterns

- Nuxt auto-imports components, composables, and `utils/` — no explicit imports needed for those.
- PrimeVue components are auto-imported. Check `welldotPt` (`packages/vue/src/theme/pt.ts`) before adding Tailwind classes to PrimeVue elements.
- **Base components come from `@welldot/vue`** (see [packages/vue/CLAUDE.md](../../packages/vue/CLAUDE.md)). The `@welldot/vue/nuxt` module (in `modules`) registers every `Well*` component, auto-imports `createWelldot` / `useWelldotConfig` / `useWellText` / `useWellUnits` / `useWellNumberFormat`, defaults `primevue.importTheme` / `importPT` to the Welldot theme, and wires the locale from `$i18n`. `plugins/03.welldot.ts` layers the units, coordinate format and the `icon` part on top. The components take plain strings (no i18n inside): pass `t(...)` for every label, including the aria labels (`info-label` / `label` = `t('editor.fieldInfo')`, grid `delete-label` = `t('editor.deleteRow')`, grid `labels` = `{ showPendingTextures, columnInfo }`). Grid column types come from `@welldot/vue/grid` (`WellGridColumn`). Fix base-component bugs in `packages/vue`, never by re-adding app copies.
- Breakpoints are managed by `nuxt-viewport`; prefer `useViewport()` over raw media queries.
- Locale strings live in `i18n/locales/*.json`; use `useI18n().t('key')` in components.
- **Recommended values of open `.well` fields** (permit type, condition category, pump type, materials, sample type, …) come from the `@welldot/core` vocabularies (`PERMIT_TYPES`, `CONSTRUCTION_MATERIALS`, …), never from i18n keys. In components use `useVocab()` — `vocabOptions(VOCAB, current?)` for Select/combo options (deprecated values only when `current`) and `vocabLabel(VOCAB, value)` / `vocabList(VOCAB, values)` for display; free-text and `x-` values show as-is. PDF export lives in `@welldot/pdf` (see `packages/pdf/CLAUDE.md`), which uses `getVocabLabel(…, locale)` and its own label pack. Always store the key, never the translated label. Closed vocabularies (permit status, well status, qualifiers, …): the value lists come from `@welldot/core` (`WELL_STATUS_VALUES`, `QUALIFIER_VALUES`, …) and the labels from i18n keys, looked up in `utils/*Vocab.ts`. Pure helpers (dates, coordinates, unit labels, readings, permit/meter labels) live in `@welldot/utils`; the app's `utils/*.ts` files only re-export them for auto-import next to the UI-only bits (severity maps, icons). Never re-implement them in the app.
- The `EventBus` in `core/EventBus/` is the preferred pattern for cross-component communication not suited to Pinia.
- **Startup tips:** the editor shows one non-dismissed tip per load (`useStartupTips().showStartupTip()` in `pages/editor/index.vue`). To add a tip: append an entry to the `tips` array in `useStartupTips.ts`, put a matching `data-tip="…"` attribute on the target element, and add `tips.<name>.*` keys to both locales. Dismissed tip ids persist in `uiStore.dismissedTips`; popover styling lives under `.welldot-tip` in `main.css`.

## Server routes & scheduled tasks

- `server/api/` — Nitro API routes. Profile sharing (`share.post.ts`, `share/[id].get.ts`) hashes/stores well JSON in Supabase via `server/utils/supabase.ts` (service-role key, server-only — never exposed to the client). Shares are capped at `MAX_SHARE_BYTES` and expire after `SHARE_TTL_DAYS` (`server/utils/shareConfig.ts`); the GET route edge-caches successful lookups via the Workers Cache API.
- `server/tasks/` — Nitro scheduled tasks (`experimental.tasks` in `nuxt.config.ts`). `shares:cleanup` (`server/tasks/shares/cleanup.ts`) purges expired `well_shares` rows. Wiring a task requires **both**: a `nitro.scheduledTasks` entry in `nuxt.config.ts` mapping a cron string to the task name, **and** the identical cron string in `wrangler.json`'s `triggers.crons` — Cloudflare only invokes `scheduled()` for crons declared there, and Nitro only runs a task if its cron matches an entry in `scheduledTasks`.
- `getRuntimeEnv`/`getSupabaseClient` (`server/utils/env.ts`, `supabase.ts`) accept a structural `RuntimeEnvSource`, not `H3Event`, specifically so scheduled tasks (which get a Nitro `TaskEvent`, not an `H3Event`) can reuse them.

## Documentation requirements

Update this `CLAUDE.md` when:

- A new Nuxt module is added (Stack section + any config file it introduces)
- A new top-level directory appears under `app/` (Directory layout section)
- A significant pattern changes (state management, i18n, deploy target, theme system)
- A new environment variable is required at build or runtime

`README.md` covers setup, the color system, and PrimeVue usage for human contributors. Keep it in sync when those topics change.

## Color system

Two mirrored scales — `surface` (backgrounds) and `content` (text, borders, icons) — cover all neutral colors. The scales flip between modes so no `dark:` variant is ever needed for neutrals. `primary`, `error`, `warning`, `success`, and `info` handle semantic highlights.

**Pairing rule:** `surface-N` and `content-N` at the same index always contrast, because the scales are inverses. Mixing distant indexes breaks contrast in one mode (`surface-100 + text-content-900` = near-black on near-black in dark mode).

| Scale                        | Role                                                     | Normal range                                                                   |
| ---------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `surface`                    | Backgrounds only — never text/icons                      | `0–200`; higher only for intentional inversion                                 |
| `content`                    | Text, borders, icon strokes                              | `0` (body) → `300` (muted) → `600` (subtle border); `800+` almost always wrong |
| `primary`                    | CTAs, active states, focus rings, interactive highlights | varies                                                                         |
| `error/warning/success/info` | State communication                                      | `500` default; `50–100` for bg, `700–800` for text on light bg                 |

Key rules:

- `surface` for backgrounds exclusively; `content` for everything neutral on top of it.
- Pair at the same index. Slight offset toward higher values for hierarchy is fine; a large gap (>400 steps) is a bug.
- High `surface` values (`400+`) signal a deliberate inversion (dark hero, inverted sidebar) — rare. High `content` values (`800+`) are nearly always wrong.
- Tailwind utilities (`bg-surface-*`, `text-content-*`, `bg-primary-*`, etc.) are bridged from PrimeVue CSS vars by `@welldot/vue/tailwind.css`, imported in `app/assets/styles/main.css`. Never use Tailwind grays, raw `bg-white`, or hardcoded hex — they break dark mode.

## PrimeVue components

Always prefer a PrimeVue component over a hand-rolled one. Customise in this order — stop at the first layer that solves the problem:

1. **API** — props and slots (`primevue.org/<component>`).
2. **`WelldotPreset`** (`packages/vue/src/theme/preset.ts`) — global visual change (design token override under `components`). Right for color, radius, spacing that should apply to every instance.
3. **`welldotPt`** (`packages/vue/src/theme/pt.ts`) — pass-through for structural/utility tweaks (Tailwind class or HTML attr on an internal element). One-off layout adjustments only; not for color changes.
4. **Custom component** — last resort, only when the three layers above are genuinely insufficient.

Never target PrimeVue internal class names in scoped CSS — they're unstable across minor versions. Use pass-through instead.

Use `severity` props (`"primary"`, `"success"`, `"warn"`, `"danger"`, `"info"`) on PrimeVue components rather than manually applying color classes. The theme maps severities to the semantic scales automatically.

## Constraints

- `@welldot/render` uses D3 and mutates the DOM — wrap renderer calls in `onMounted` or `<ClientOnly>`.
- SSR is enabled; avoid `window`/`document` access outside of client lifecycle hooks or `process.client` guards.
- Deployed to Cloudflare Workers (Nitro `cloudflare-module` preset) — no Node.js server runtime. All server routes must be Cloudflare/workerd-compatible.
- **Icons:** Use Phosphor (`ph:`) for all new UI. Prefer the **duotone** variant (`ph:icon-name-duotone`) as the default — it matches the editorial aesthetic. Fall back to `ph:icon-name` (regular) only when duotone is unavailable. Browse at https://icones.js.org/collection/ph. Do not use Heroicons in new components; the landing page (`layouts/landing.vue`) may keep its existing `heroicons:` usage.
- **Tailwind canonical classes only** — no arbitrary values (`w-[37px]`, `bg-[#eef0f3]`, `text-[14px]`). Use the design-token utilities (`bg-surface-*`, `text-content-*`, spacing scale, etc.) or standard Tailwind scale values. Arbitrary values bypass the token system, don't respond to mode changes, and make refactoring the theme harder.
