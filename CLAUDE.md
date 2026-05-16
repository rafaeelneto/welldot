# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Each package and app has its own `CLAUDE.md` with deeper context:

| Workspace                           | File                                                         |
| ----------------------------------- | ------------------------------------------------------------ |
| `packages/core`                     | [packages/core/CLAUDE.md](packages/core/CLAUDE.md)           |
| `packages/utils`                    | [packages/utils/CLAUDE.md](packages/utils/CLAUDE.md)         |
| `packages/render`                   | [packages/render/CLAUDE.md](packages/render/CLAUDE.md)       |
| `packages/lint`                     | [packages/lint/CLAUDE.md](packages/lint/CLAUDE.md)           |
| `apps/profiler` _(active)_          | [apps/profiler/CLAUDE.md](apps/profiler/CLAUDE.md)           |
| `apps/well-profiler` _(deprecated)_ | [apps/well-profiler/CLAUDE.md](apps/well-profiler/CLAUDE.md) |

## Project Overview

Well-Profiler is an open-source ecosystem for geological well log visualization, built around the `.well` open file format — a JSON-based standard for water well data. The repo is a **pnpm + Turbo monorepo** consisting of three published TypeScript libraries and two web applications.

## Commands

All commands run from the repo root via Turbo unless noted.

```bash
pnpm dev          # Start all dev servers (Next.js on :3000, tsup --watch for libraries)
pnpm build        # Build all packages and app
pnpm test         # Run Vitest across all packages
pnpm lint         # ESLint across all packages
pnpm lint:fix     # Auto-fix ESLint issues
pnpm format       # Prettier formatting
```

To work on a single package (e.g., `render`):

```bash
cd packages/render
pnpm dev          # tsup --watch
pnpm test         # vitest run
pnpm build        # tsup build → dist/
```

## Architecture

### Package dependency chain

```
@welldot/core          ← foundation: TS types, Zod schemas, serialization utils
    ↓
@welldot/utils         ← profile analysis (depth, volumes, gravel pack estimates)
    ↓
@welldot/render        ← D3-based SVG renderer for .well profiles
    ↓
apps/profiler          ← Nuxt 4 web app (active, welldot.org)
apps/well-profiler     ← Next.js 15 web app (deprecated, migration in progress)
```

### Packages

**`packages/core`** — No internal dependencies. Defines the canonical `.well` schema. See [packages/core/CLAUDE.md](packages/core/CLAUDE.md).

**`packages/utils`** — Profile analysis utilities (depth, diameter, gravel pack). See [packages/utils/CLAUDE.md](packages/utils/CLAUDE.md).

**`packages/render`** — D3-based SVG visualization engine. See [packages/render/CLAUDE.md](packages/render/CLAUDE.md).

**`packages/lint`** — Private. Shared ESLint flat-config presets. See [packages/lint/CLAUDE.md](packages/lint/CLAUDE.md).

### Apps

**`apps/profiler`** — **Active app.** Nuxt 4 + Vue 3, deployed to Cloudflare Pages at welldot.org. PrimeVue UI, Tailwind CSS 4, Pinia, i18n (EN/PT). See [apps/profiler/CLAUDE.md](apps/profiler/CLAUDE.md).

**`apps/well-profiler`** — **Deprecated.** Legacy Next.js 15 app being replaced by `apps/profiler`. See [apps/well-profiler/CLAUDE.md](apps/well-profiler/CLAUDE.md).

### Build outputs

Libraries output ESM (`dist/index.js`), CJS (`dist/index.cjs`), and TypeScript declarations. The app produces standard Next.js artifacts. Turbo caches `dist/**` and `.next/**`.

## Key Tech

- **Visualization:** D3.js 7, textures.js (pattern fills)
- **UI (active app):** Vue 3, Nuxt 4, PrimeVue 4, Tailwind CSS 4, Pinia
- **UI (legacy app):** React 18, Mantine 7, Zustand, react-router-dom 6
- **Validation:** Zod 3
- **PDF export:** jsPDF + jsPDF-AutoTable, pdfmake
- **Testing:** Vitest + jsdom
- **Node:** ≥18; **pnpm:** 10.22.0
