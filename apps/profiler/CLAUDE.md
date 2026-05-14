# apps/profiler — Welldot (Nuxt 4)

**Active production app.** This is the replacement for `apps/well-profiler`. Built with Nuxt 4 + Vue 3, deployed to Cloudflare Pages at `welldot.org`.

## Stack

- **Framework:** Nuxt 4 (`srcDir: app/`) with SSR enabled
- **UI:** PrimeVue 4 (theme via `customTheme.ts` + `customPt.js` pass-through)
- **Styling:** Tailwind CSS 4 (Vite plugin), global styles in `app/assets/styles/main.css`
- **State:** Pinia with `pinia-plugin-persistedstate`
- **i18n:** `@nuxtjs/i18n` — English and Brazilian Portuguese (`i18n/locales/`)
- **SEO:** `@nuxtjs/seo` (schema.org, OG, sitemap, robots)
- **PWA:** `@vite-pwa/nuxt` (auto-update, disabled in dev)
- **Fonts:** Space Grotesk, IBM Plex Serif, JetBrains Mono (via `@nuxt/fonts`)
- **Icons:** Heroicons via `@nuxt/icon`, custom SVG icons in `app/assets/icons/` (prefix `welldot:`)
- **Deploy:** Cloudflare Pages (Nitro `cloudflare-pages` preset); preview via `wrangler`

## Directory layout

```
app/                      ← srcDir
  app.vue                 ← root component
  pages/
    index.vue             ← landing page (only page so far)
  layouts/
    landing.vue           ← layout for the landing page
  components/
    landing/              ← landing-page components (HeroVisual, WellJsonViewer, etc.)
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
pnpm build      # nuxt build → dist/
pnpm generate   # static generation
pnpm preview    # wrangler pages dev (Cloudflare preview)
pnpm lint       # eslint
```

## Key patterns

- Nuxt auto-imports components, composables, and `utils/` — no explicit imports needed for those.
- PrimeVue components are auto-imported. Check `customPt.js` before adding Tailwind classes to PrimeVue elements.
- Breakpoints are managed by `nuxt-viewport`; prefer `useViewport()` over raw media queries.
- Locale strings live in `i18n/locales/*.json`; use `useI18n().t('key')` in components.
- The `EventBus` in `core/EventBus/` is the preferred pattern for cross-component communication not suited to Pinia.

## Documentation requirements

`apps/profiler/README.md` is currently the default Nuxt starter README and carries no project-specific content. Until it is replaced with real documentation, treat this CLAUDE.md as the authoritative reference for contributors.

Update this `CLAUDE.md` when:

- A new Nuxt module is added — add it to the Stack section and note any config file it introduces
- A new top-level directory appears under `app/` (e.g. `app/middleware/`, `app/server/`) — add it to the Directory layout section
- A significant pattern changes (state management, i18n strategy, deploy target, theme system)
- A new environment variable is required at build or runtime

When `README.md` is eventually replaced with real content, keep it in sync:

- Environment variables → `.env.example` table in the README
- Deploy steps and Cloudflare Pages config
- Any prerequisite tools beyond `pnpm` and Node

## Constraints

- `@welldot/render` uses D3 and mutates the DOM — wrap renderer calls in `onMounted` or `<ClientOnly>`.
- SSR is enabled; avoid `window`/`document` access outside of client lifecycle hooks or `process.client` guards.
- Deployed to Cloudflare Pages — no Node.js server runtime. All server routes must be Cloudflare-compatible.
- Always prefer PrimeVue icons (`@nuxt/icon` with Heroicons) over other icon libraries.
- try to use tailwind canonical classes instead of custom measurements
- always use semantic colors definition primary, secondary, surface, content
- preffer primevue components and check documentation for better usage and customization (some changes should be global level theming on customTheme.ts or customPt.js)
