# apps/well-profiler — Legacy Next.js App

**Deprecated.** This app is being replaced by `apps/profiler` (Nuxt 4). Do not add new features here. Bug fixes only if strictly necessary.

## Stack

- **Framework:** Next.js 15, App Router, React 18
- **UI:** Mantine 7 + Emotion, Zustand for state
- **Routing:** react-router-dom 6
- **PDF export:** jsPDF + jsPDF-AutoTable, pdfmake
- **Styling:** Sass/SCSS modules, Tailwind CSS 3
- **Testing:** Vitest + jsdom

## Directory layout

```
src/
  types/              ← local profile types (pre-@welldot/core migration)
  store/              ← Zustand stores (ui.store.ts, profile/profile.store.ts)
  utils/              ← coords, profile, window utilities; ProfileDrawer class
  data/               ← static data (profile.data.ts, dataSheet columns)
  views/
    PDFExport/        ← PDF export flow (jsPDF + pdfmake)
    ProfileEditor/    ← main profile editing UI
  components/
    organisms/        ← ProfileDrawer (SVG canvas + config editor), DataSheet, Summary
src_old/              ← legacy code being phased out; do not touch
```

## Commands

```bash
pnpm dev        # next dev
pnpm build      # next build
pnpm test       # vitest
pnpm lint       # eslint
```

## Documentation requirements

This app is deprecated — no new documentation should be written here. The only doc obligation is:

- If a bug fix changes behavior visible to a user, note it in a commit message, not in a README.
- Do not update `well-specifications.md`, `fgdc-textures.md`, or any `@welldot/core` docs based on code in this app — changes to shared types must originate in `packages/core` and be documented there.

## Migration status

Active migration to `apps/profiler`. When referencing this app, assume code here may not reflect the current `@welldot/core` types — some parts still use the local `Profile` alias. The `@welldot/core` `Well as Profile` re-export exists specifically for backward compat with this app.
