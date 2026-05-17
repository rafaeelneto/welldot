# External Integrations

## Overview

Library packages (`@welldot/core`, `@welldot/utils`, `@welldot/render`) are **fully offline** — no external API calls, no network I/O. All integration concerns live at the app layer.

---

## Deployment Platform

**Service:** Cloudflare Pages
**App:** `apps/profiler` (Nuxt 4)
**Configuration:** `apps/profiler/wrangler.json`
**Build preset:** Cloudflare Pages (`nuxt.config.ts` — `nitro.preset: 'cloudflare-pages'`)
**Deploy command:** `nuxt generate` or `nuxt build` → `wrangler pages deploy`

---

## UI Component Library

**Service:** PrimeVue 4.5.5
**Purpose:** Full component suite (forms, overlays, data display)
**Configuration:** `apps/profiler/app/theme/` — custom PrimeVue preset + passthrough styles
**Theme preset:** `@primeuix/themes` for design tokens; Tailwind CSS 4 for utility styling via `tailwindcss-primeui`
**Module:** `@primevue/nuxt-module` (auto-registers components)

---

## PWA

**Service:** Vite PWA via `@vite-pwa/nuxt`
**Purpose:** Offline capability + installable app
**Config location:** `apps/profiler/nuxt.config.ts`

---

## Iconography

**Service:** Iconify + `@nuxt/icon`
**Icon sets (priority order):**
1. **Phosphor** (`ph:`) — primary icon set for all new components; prefer duotone variant (`ph:icon-name-duotone`), fall back to regular (`ph:icon-name`)
2. **Heroicons** (`heroicons:`) — legacy; still present in some older components, not used in new ones
3. **Custom** (`welldot:`) — project-specific SVG icons in `apps/profiler/app/assets/icons/`

**Custom icons:** `apps/profiler/app/assets/icons/` — local Welldot-specific SVG icons (auto-registered as `welldot:` prefix)

---

## Third-Party Libraries (no external network calls)

| Library       | Version | Purpose                       | Package           |
| ------------- | ------- | ----------------------------- | ----------------- |
| D3.js         | ^7.0.0  | SVG visualization             | `@welldot/render` |
| textures.js   | ^1.2.3  | Geological pattern fills      | `@welldot/render` |
| d3-tip        | ^0.9.1  | SVG tooltips                  | `@welldot/render` |
| Zod           | ^3.23.8 | Runtime schema validation     | `@welldot/core`   |
| defu          | ^6.1.4  | Deep merge for config options | `@welldot/render` |
| sanitize-html | ^2.17.3 | Tooltip HTML sanitization     | `@welldot/render` |
| VueUse        | ^14.3.0 | Vue composition utilities     | `apps/profiler`   |
| date-fns      | ^4.1.0  | Date formatting               | `apps/profiler`   |
| Pinia         | ^3.0.4  | Vue state management          | `apps/profiler`   |

---

## Deprecated Integrations (in `apps/well-profiler` only)

These integrations exist only in the deprecated Next.js app and are **not being carried forward**:

- **Firebase** — config present in `firebase.json`; likely Hosting deployment
- **jsPDF / pdfmake** — PDF export; feature to be re-evaluated for Nuxt app
- **Mantine 7** — UI component library (replaced by PrimeVue in Nuxt)
- **Zustand** — state management (replaced by Pinia in Nuxt)
- **Vercel/Next.js** — serverless deployment model

---

## Environment Variables

**Library packages:** None required.

**`apps/profiler`:**

- Standard `NODE_ENV` (`development` / `production`)
- No secrets or API keys identified in source

**Note:** No `.env.example` file found in the repo. If env vars are added in the future, document them here and add `.env.example`.
