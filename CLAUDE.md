# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Well-Profiler is an open-source ecosystem for geological well log visualization, built around the `.well` open file format — a JSON-based standard for water well data. The repo is a **pnpm + Turbo monorepo** consisting of three published TypeScript libraries and a Next.js web application.

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
apps/well-profiler     ← Next.js 15 web app consuming all three libraries
```

### Packages

**`packages/core`** — No internal dependencies. Defines the canonical `.well` schema via TypeScript types (`types/well.types.ts`), Zod validators (`validators/well.validators.ts`), and serialization utilities. The `fgdc.textures.ts` utility provides FGDC geological pattern symbolization used by the renderer.

**`packages/render`** — D3-based SVG visualization engine. The main class is `Renderer.ts`; it delegates to specialized renderers in `renderers/` (construction, lithology, fractures, caves, legend, etc.). Depends on `@welldot/core` and `@welldot/utils`.

**`packages/utils`** — Profile analysis utilities. Single source file (`src/profile.utils.ts`) with comprehensive Vitest test coverage.

**`packages/lint`** — Private. Shared ESLint configs exported as `base`, `typescript`, `react`, `vue`, `nuxt`.

**`apps/well-profiler`** — Next.js 15 app. Uses the App Router (`app/`). UI built with Mantine 7 and Zustand for state. The `src/` directory contains organism-level React components; `src_old/` contains legacy code being phased out.

### Build outputs

Libraries output ESM (`dist/index.js`), CJS (`dist/index.cjs`), and TypeScript declarations. The app produces standard Next.js artifacts. Turbo caches `dist/**` and `.next/**`.

## Key Tech

- **Visualization:** D3.js 7, textures.js (pattern fills)
- **UI:** React 18, Mantine 7, Zustand, react-router-dom 6
- **Validation:** Zod 3
- **PDF export:** jsPDF + jsPDF-AutoTable, pdfmake
- **Testing:** Vitest + jsdom
- **Styling:** Sass/SCSS
- **Node:** ≥18; **pnpm:** 10.22.0
