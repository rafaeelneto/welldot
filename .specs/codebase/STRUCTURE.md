# Project Structure

**Root:** `/Users/rafaeel/projects/well-profiler`

## Directory Tree

```
well-profiler/
├── apps/
│   ├── profiler/                   ← ACTIVE: Nuxt 4 app (Cloudflare Pages)
│   │   ├── app/
│   │   │   ├── app.vue
│   │   │   ├── assets/icons/       ← custom Welldot SVG icons
│   │   │   ├── composables/        ← auto-imported Vue composables
│   │   │   ├── core/               ← EventBus, app-level services
│   │   │   ├── plugins/            ← Nuxt plugin registrations
│   │   │   ├── theme/              ← PrimeVue theme preset + Tailwind tokens
│   │   │   └── utils/              ← app-level helpers
│   │   ├── public/
│   │   ├── nuxt.config.ts
│   │   ├── wrangler.json           ← Cloudflare Pages deployment config
│   │   └── package.json
│   │
│   └── well-profiler/              ← DEPRECATED: Next.js 15 app
│       ├── src/
│       │   ├── components/
│       │   ├── store/              ← Zustand state
│       │   ├── views/
│       │   └── utils/
│       ├── src_old/                ← legacy code being phased out
│       └── package.json
│
├── packages/
│   ├── core/                       ← @welldot/core (published)
│   │   └── src/
│   │       ├── index.ts            ← public API barrel
│   │       ├── types/
│   │       ├── validators/
│   │       └── utils/
│   │
│   ├── render/                     ← @welldot/render (published)
│   │   └── src/
│   │       ├── index.ts            ← public API barrel
│   │       ├── Renderer.ts         ← WellRenderer class
│   │       ├── renderers/          ← one file per visual component
│   │       ├── configs/
│   │       ├── types/
│   │       └── utils/
│   │
│   ├── utils/                      ← @welldot/utils (published)
│   │   └── src/
│   │       ├── index.ts
│   │       └── profile.utils.ts
│   │
│   └── lint/                       ← @welldot/lint (private, not published)
│       └── src/
│           ├── base.js
│           ├── typescript.js
│           ├── react.js
│           ├── vue.js
│           └── nuxt.js
│
├── .specs/                         ← spec-driven docs (this directory)
├── turbo.json
├── pnpm-workspace.yaml
├── package.json                    ← root scripts + shared devDeps
├── eslint.config.js
├── .prettierrc
└── CLAUDE.md
```

## Module Organization

### `packages/core`

**Purpose:** Canonical `.well` data model — single source of truth for schema, validation, and serialization.
**Location:** `packages/core/src/`
**Key files:**
- `types/well.types.ts` — Well, Constructive, Geologic, BoreHole, Lithology, etc.
- `validators/well.validators.ts` — Zod schemas + `parseWell()`
- `utils/well.utils.ts` — `serializeWell()`, `deserializeWell()`, legacy migration
- `utils/fgdc.textures.ts` — FGDC geological pattern library

### `packages/render`

**Purpose:** D3-based SVG rendering engine for well profiles.
**Location:** `packages/render/src/`
**Key files:**
- `Renderer.ts` — `WellRenderer` class, main public API
- `renderers/*.renderer.ts` — specialized drawers (lithology, construction, fractures, etc.)
- `configs/render.configs.ts` — `DEFAULT_WELL_THEME`, `DEFAULT_RENDER_CONFIG`
- `types/render.types.ts` — `DrawContext`, `WellTheme`, `RenderConfig`, `SvgInstance`

### `packages/utils`

**Purpose:** Pure analysis functions for well profile data.
**Location:** `packages/utils/src/`
**Key files:**
- `profile.utils.ts` — depth, diameter, volume helpers

### `packages/lint`

**Purpose:** Shared ESLint flat-config presets for all packages and apps.
**Location:** `packages/lint/src/`
**Key files:** `base.js`, `typescript.js`, `vue.js`, `nuxt.js`, `react.js`

### `apps/profiler`

**Purpose:** Production Nuxt 4 web app — the user-facing well profiler tool.
**Location:** `apps/profiler/app/`
**Key directories:**
- `composables/` — Vue composables (auto-imported)
- `core/` — EventBus, app initialization
- `theme/` — PrimeVue + Tailwind customization

## Where Things Live

**Well data schema:**
- Types: `packages/core/src/types/well.types.ts`
- Validation: `packages/core/src/validators/well.validators.ts`
- Serialization: `packages/core/src/utils/well.utils.ts`

**SVG visualization:**
- Orchestrator: `packages/render/src/Renderer.ts`
- Renderers: `packages/render/src/renderers/`
- Theme/config defaults: `packages/render/src/configs/render.configs.ts`

**FGDC texture patterns:**
- Library: `packages/core/src/utils/fgdc.textures.ts`
- Importer: `packages/render/src/utils/fgdcTextures.ts`

**App UI (active):**
- `apps/profiler/app/` — Nuxt pages, components, composables

**App UI (deprecated):**
- `apps/well-profiler/src/` — React/Next.js components
- `apps/well-profiler/src_old/` — legacy code (do not modify)

## Special Directories

**`apps/well-profiler/src_old/`:**
**Purpose:** Legacy code being migrated to the Nuxt app. Do not add new code here.

**`apps/profiler/app/theme/`:**
**Purpose:** PrimeVue 4 theme preset (`customTheme.ts`) and passthrough customizations (`customPt.js`).

**`packages/render/src/renderers/`:**
**Purpose:** One renderer per visual component. Each file exports a single function taking a `DrawContext` and rendering to the SVG in-place.
