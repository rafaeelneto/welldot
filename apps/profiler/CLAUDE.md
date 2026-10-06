# apps/profiler — Welldot (Nuxt 4)

**Active production app.** This is the replacement for `apps/well-profiler`. Built with Nuxt 4 + Vue 3, deployed to Cloudflare Workers at `welldot.org`.

## Stack

- **Framework:** Nuxt 4 (`srcDir: app/`) with SSR enabled
- **UI:** PrimeVue 4 (theme via `customTheme.ts` + `customPt.js` pass-through)
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
                             = permits (condition fulfillment writes `permit_condition`
                             history logs); Water quality (.well v2.3) = the
                             `water_samples` ledger (waterQuality/: panel + card,
                             WaterSampleDialog validated with core `WaterSampleSchema`
                             before save, ResultsEditor, PurgeReadingsEditor; labels in
                             utils/waterQualityVocab.ts; "compare against" limit set in
                             `uiStore.waterQualityLimitSet`; derivations/warnings from
                             @welldot/utils); History log dialog edits `maintenance`
                             fields and `status_change` status (current well status
                             tag); root `attachments`
                             (general files) live in the General tab below Observations
  layouts/
    landing.vue           ← layout for the landing page
  components/
    landing/              ← landing-page components (HeroVisual, WellJsonViewer, etc.)
    attachments/          ← AttachmentField (strip + add/edit dialog, `v-model` of the list) and
                             AttachmentDialog. Saved records write back with `assignAttachments`
                             (utils/attachments.ts) inside `profileStore.updateWell`
  composables/
    useBus.ts             ← typed event bus composable (wraps EventBus)
  core/
    EventBus/             ← mitt-based typed event bus (bus.ts, Events.ts, types.ts)
  stores/                 ← Pinia stores
  theme/
    customTheme.ts        ← PrimeVue design token overrides
    customPt.js           ← PrimeVue pass-through classes
  plugins/
    01.canonical.ts       ← injects canonical URL
  utils/
    date.ts
    clipboard.ts
  assets/
    styles/main.css
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
- PrimeVue components are auto-imported. Check `customPt.js` before adding Tailwind classes to PrimeVue elements.
- Breakpoints are managed by `nuxt-viewport`; prefer `useViewport()` over raw media queries.
- Locale strings live in `i18n/locales/*.json`; use `useI18n().t('key')` in components.
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
- Tailwind utilities (`bg-surface-*`, `text-content-*`, `bg-primary-*`, etc.) are bridged from PrimeVue CSS vars in `app/assets/styles/main.css`. Never use Tailwind grays, raw `bg-white`, or hardcoded hex — they break dark mode.

## PrimeVue components

Always prefer a PrimeVue component over a hand-rolled one. Customise in this order — stop at the first layer that solves the problem:

1. **API** — props and slots (`primevue.org/<component>`).
2. **`customTheme.ts`** — global visual change (design token override under `components`). Right for color, radius, spacing that should apply to every instance.
3. **`customPt.js`** — pass-through for structural/utility tweaks (Tailwind class or HTML attr on an internal element). One-off layout adjustments only; not for color changes.
4. **Custom component** — last resort, only when the three layers above are genuinely insufficient.

Never target PrimeVue internal class names in scoped CSS — they're unstable across minor versions. Use pass-through instead.

Use `severity` props (`"primary"`, `"success"`, `"warn"`, `"danger"`, `"info"`) on PrimeVue components rather than manually applying color classes. The theme maps severities to the semantic scales automatically.

## Constraints

- `@welldot/render` uses D3 and mutates the DOM — wrap renderer calls in `onMounted` or `<ClientOnly>`.
- SSR is enabled; avoid `window`/`document` access outside of client lifecycle hooks or `process.client` guards.
- Deployed to Cloudflare Workers (Nitro `cloudflare-module` preset) — no Node.js server runtime. All server routes must be Cloudflare/workerd-compatible.
- **Icons:** Use Phosphor (`ph:`) for all new UI. Prefer the **duotone** variant (`ph:icon-name-duotone`) as the default — it matches the editorial aesthetic. Fall back to `ph:icon-name` (regular) only when duotone is unavailable. Browse at https://icones.js.org/collection/ph. Do not use Heroicons in new components; the landing page (`layouts/landing.vue`) may keep its existing `heroicons:` usage.
- **Tailwind canonical classes only** — no arbitrary values (`w-[37px]`, `bg-[#eef0f3]`, `text-[14px]`). Use the design-token utilities (`bg-surface-*`, `text-content-*`, spacing scale, etc.) or standard Tailwind scale values. Arbitrary values bypass the token system, don't respond to mode changes, and make refactoring the theme harder.
