# Tech Stack

**Analyzed:** 2026-05-10

## Core

- Monorepo: pnpm 10.22.0 + Turbo (latest)
- Language: TypeScript 5.3.3 (strict mode)
- Runtime: Node ≥18
- Package manager: pnpm with `workspace:*` protocol

## Libraries (published packages)

- Build: tsup (ESM + CJS + `.d.ts` outputs)
- Validation: Zod 3.23.8
- Visualization: D3.js 7, textures.js 1.2.3, d3-tip 0.9.1
- Deep merge: defu 6.1.4
- HTML sanitization: sanitize-html 2.17.3

## Frontend — `apps/profiler` (active Nuxt app)

- Framework: Nuxt 4.4.4 (Vue 3.5.34)
- UI: PrimeVue 4.5.5 + tailwindcss-primeui 0.6.1
- Styling: Tailwind CSS 4.3.0 (Vite plugin)
- State: Pinia 3.0.4 + pinia-plugin-persistedstate 4.7.1
- Icons: @nuxt/icon 2.2.2 + @iconify-json/heroicons
- Utils: VueUse 14.3.0, date-fns 4.1.0
- SEO: @nuxtjs/seo 3.4.0
- PWA: @vite-pwa/nuxt 1.1.1
- Images: @nuxt/image 2.0.0
- Fonts: @nuxt/fonts 0.14.0
- Viewport: nuxt-viewport 2.4.0
- Deployment: Cloudflare Pages via wrangler 4.90.0

## Frontend — `apps/well-profiler` (DEPRECATED — Next.js app being replaced)

- Framework: Next.js 15.1.0 (React 18, App Router)
- UI: Mantine 7.3.2 + @emotion/react
- State: Zustand 4.5.0
- PDF: jsPDF 4.2.1 + jspdf-autotable, pdfmake 0.3.7
- DnD: @dnd-kit

## Testing

- Unit/Integration: Vitest 4.1.5
- DOM environment: jsdom
- Coverage: not configured

## Code Quality

- Linting: ESLint 9+ (flat config), shared via `@welldot/lint`
- Formatting: Prettier 3.8.1 + prettier-plugin-organize-imports 4.3.0
- TypeScript validation: VS Code + tsup type check

## Development Tools

- Monorepo orchestration: Turbo
- Node version management: implied ≥18
- IDE: VS Code (`.vscode/settings.json` — format/lint on save)
