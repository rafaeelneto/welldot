# packages/pdf — @welldot/pdf

Customizable PDF report export for `.well` profiles, built on pdfmake. Depends on `@welldot/core`, `@welldot/utils` and `@welldot/render`.

## Purpose

Turns a `Well` into a pdfmake document: header, profile SVG pages (drawn with `@welldot/render`) in one of two formats (`detailed`, default, or `compact`), legend, info grids, general metadata and every content section (construction, hydrodynamic events, history log, pumps, meters, regimes, production, permits, water samples), plus footer with QR code.

Framework-agnostic and self-contained: no Vue/Nuxt/React, no i18n library, no translations required from the consumer. Document text (titles, headers, field names, footer) ships as an en/pt pack; vocabulary values (statuses, types, fractions, parameters…) take their labels from `@welldot/core` / `@welldot/utils`. Consumers may override any document text. Everything visual is configurable: branding (logo, name, subtitle), watermark, page size/orientation/margins, theme fonts/colors/sizes, header/footer, section toggles and order, date formats, label overrides, fonts, profile renderer settings.

Used by `apps/profiler` (`app/composables/usePdfExport.ts`), which owns stores, redaction, share links and preview debouncing.

Supports `.well` v2 only. Normalize older files with `deserializeWell()` from `@welldot/core` first.

## Source layout

```
src/
  index.ts                   ← public API (named exports + one `export type` block)
  fonts.ts                   ← `@welldot/pdf/fonts` entry: WELLDOT_PDF_FONTS (vfs + families, ~1.7 MB)
  createWellPdf.ts           ← high-level browser API + buildDefaultPdfFilename
  buildDocDefinition.ts      ← pure doc assembly; PDF_SECTION_BUILDERS; toPdfContext
  context.ts                 ← resolvePdfContext (defaults, labels, page geometry), PDF_SECTION_KEYS
  formatters.ts              ← createPdfFormatters (units + vocab labels)
  test-utils.ts              ← makeTestContext, baseWell, keyT, lastSegmentT (tests only, not exported)
  types/
    options.types.ts         ← PdfExportOptions (public input), PdfContext (resolved), customization types
    pdfmake.types.ts         ← local pdfmake type shim (pdfmake ships no .d.ts)
    pdfmake-module.d.ts      ← `declare module 'pdfmake/build/pdfmake'`
    svg-module.d.ts          ← `*.svg` imports are raw markup strings
  configs/
    labels.configs.ts        ← PDF_LABELS: en/pt document text (no vocabulary values)
    labels.utils.ts          ← resolvePdfLabels (locale + overrides → typed ResolvedPdfLabels)
    labels.test.ts           ← label contract: locale fallback, overrides, vocab from core
    theme.configs.ts         ← DEFAULT_PDF_THEME, PDF_PAGE_SIZES, DEFAULT_PDF_MARGIN
    branding.configs.ts      ← WELLDOT_BRANDING, DEFAULT_BASE_URL
  assets/
    welldot-logo.svg         ← default header logo (imported as text)
    welldotLogo.ts           ← WELLDOT_LOGO_SVG
  layout/
    header.ts  footer.ts  watermark.ts
    measureProfileStart.ts   ← pdfmake layout pass of the lead content → space left for the profile
    tables.ts                ← lightLinesLayout, buildEntryDivider, buildEntryHeader, buildEntryListing, buildRule, headerCell, rightCell, valueCell, withTableTitle, withTableCaption
    glyphFallbacks.ts        ← applyGlyphFallbacks: swaps glyphs the bundled fonts lack (⁻ → −), run by buildDocDefinition
  sections/                  ← one builder per section, signature (well, ctx: PdfContext); lithologyTable/caveTable/fractureTable are compact-only
  svg/buildSvgProfiles.ts    ← DOM-only: draws the profile with WellRenderer; planProfilePanels splits the compact profile into page-filling panels
  svg/planDetailedPanels.ts  ← pure: detailed pages with contact snap + overlap
  svg/profileLayouts.ts      ← pure: per-format column geometry → RenderConfig, captions, mergeDeep
  runtime/
    pdfmake.ts               ← loadPdfMake (dynamic import)
    registerFonts.ts         ← registerPdfFonts, loadDefaultPdfFonts
  fonts/vfsFontsData.ts      ← base64 TTF data
```

## Key API

```ts
import { createWellPdf } from '@welldot/pdf';

const pdf = await createWellPdf(well, {
  locale: 'en',
  branding: { logo: { image: dataUrl }, name: 'ACME', subtitle: false },
  watermark: { text: 'DRAFT' },
  page: { size: 'LETTER', orientation: 'landscape' },
});
await pdf?.download();
```

- `PdfExportOptions` is the public, all-optional input. `resolvePdfContext()` turns it into `PdfContext`, which every builder takes.
- Builders read document text as typed properties of `ctx.labels` (`labels.operation.meter.title`), never by string key. Vocabulary values go through `fmt.vocab(LIST, value)` with the lists from `@welldot/core` (`WELL_STATUSES`, `RESULT_FRACTIONS`, `VOLUME_LIMIT_PERIODS`, …) or `@welldot/utils` (`PERMIT_STATUSES`, `CONDITION_DEADLINE_STATUSES`), and parameters through `getParameterLabel`.
- Low-level: `buildDocDefinition(well, svgs, legend, optionsOrCtx)` is pure; `buildSvgProfiles(well, container, ctx)` needs a DOM.

## Commands

```bash
pnpm test       # vitest run
pnpm build      # tsup → dist/ (index + fonts entries)
pnpm dev        # tsup --watch
```

## Documentation requirements

`README.md` must stay in sync with the public API. **Any change to `index.ts`, `PdfExportOptions`, defaults or the label pack shape requires updating `README.md` in the same commit.** Every exported function needs a JSDoc block.

## Constraints

- Never import Vue/Nuxt/i18n or app code, and never look text up by string key. New document text goes into `PDF_LABELS` with both `en` and `pt`. Labels of a value the .well format or a derivation defines go into the core/utils vocabulary that owns it, not into the pack.
- Never hardcode colors, fonts, widths (`535`), page sizes or date formats in builders; read `ctx.theme`, `ctx.page`, `ctx.dateFormats`.
- pdfmake mutates canvas nodes during layout: build rules/dividers with the factories in `layout/tables.ts`, never share one node instance.
- The hydrodynamic events table prints a `logger_series` as its type label plus the reading count (`hydrodynamicEvents.stats.readings`), with no level or rate values.
- Listing sections (pumps, meters, permits, water samples, history log) go through `buildEntryListing`. Each entry is a `buildEntryHeader` line plus a `buildFieldGrid` label/value grid (from `sections/metadataTable.ts`). Never write fields as one run-on `Label: value · …` line. Repeated rows (permit conditions/fulfillments/history, hydrodynamic events) are tables, captioned with `withTableCaption` or `withTableTitle`. Measured values in tables use `valueCell` (`noWrap`), so a number never wraps away from its unit.
- The bundled fonts lack some glyphs (`✓`, superscript `⁻`; Space Grotesk and IBM Plex Serif also lack `⁺`, `μ`, `α`). Don't put such symbols in builder output. Characters that come from data are mapped in `PDF_GLYPH_FALLBACKS`.
- The font data lives only in the `fonts` entry. `loadDefaultPdfFonts` imports it through the package's own `@welldot/pdf/fonts` subpath, which is external in `tsup.config.ts` — keep it that way or the main bundle grows by 1.7 MB.
- Profile pagination: `createWellPdf` measures where the profile starts (`measureProfileStart`) before drawing it, and the panels fill that space and then whole pages (`planDetailedPanels` for `detailed`, `planProfilePanels` for `compact`). Page body height comes only from `resolveBodyMargins` (shared with `buildDocShell`); never size panels from a hardcoded height, and never let one exceed `computePageSvgHeight` (pdfmake draws an oversized first-on-page SVG over the footer). Detailed panels pass explicit `depthRange`s to the renderer, so their drawing height must stay `(depthTo − depthFrom) · ptPerMeter`.
- Compact format: never put `pageBreak` on panels inside the profile column; each panel is sized to its page so pdfmake moves the next one over. Give the side column a numeric width (`computeCompactSideWidth`), never `*`: pdfmake sizes `*` tables inside a `*` column against the whole page and they run off its edge. Side content is built with `page.contentWidth` set to the side width. Legend strip: with `breakPages` it is an absolutely positioned node placed right after the first panel (pdfmake has one bottom margin for every page, so it can't live in the footer). Its height (`computeLegendStripHeight`, from the same labels) is reserved in the first panel by `firstPanelReserve`, and `measureLegendBreak` moves whatever else would reach it to the next page — keep the strip, the reserve and the measurement on the same height function. pdfmake node ids must be unique: suffix ids given to several nodes (`#n`). Blocks that start after the profile ends (`measureCompactSideSplit`, an extra pdfmake layout pass in `createWellPdf`) are rebuilt at full width below the columns, so `buildCompactBlocks` must give the same block count for any width.
- `buildSvgProfiles` / `createWellPdf` are browser-only (DOM + `requestAnimationFrame`). Everything else runs in Node.
- `.svg` files import as raw markup: tsup `loader: { '.svg': 'text' }` and the `svg-as-text` plugin in `vitest.config.ts` must agree.
- DOM tests opt in with `// @vitest-environment jsdom`; `@welldot/render` is mocked there (jsdom lacks SVG geometry APIs).
- The package targets ES2020: no `Array.prototype.at`.
- Pure helpers (units, coordinates, dates, readings, permit/meter labels, result formatting) come from `@welldot/utils`; closed value lists and `calculatedWellDepth` / `formatVocabList` from `@welldot/core`. Never copy them here. Words those helpers need (e.g. "not detected", "untyped meter") are passed in as plain strings from `ctx.labels`.
