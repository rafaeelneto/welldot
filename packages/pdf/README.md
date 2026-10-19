# @welldot/pdf

## Overview

Customizable PDF reports for `.well` water well profiles, built on [pdfmake](https://pdfmake.github.io/docs/). Part of the [welldot](https://github.com/rafaeelneto/welldot) open-source ecosystem.

One call turns a well into a paginated report: lithology/construction profile, legend, general information, construction tables, hydrodynamic tests, history log, pumps, meters, operating regimes, production, permits and water quality. Labels ship in English and Portuguese. Branding, watermark, page layout, theme, sections and every label can be customized.

This README covers installation, a quick start, every customization option, and the API reference for the document builders, measurement helpers and configs.

## Table of contents

- [Install](#install)
- [Quick start](#quick-start)
- [Customization](#customization)
  - [Content](#content)
  - [Branding](#branding)
  - [Watermark](#watermark)
  - [Page](#page)
  - [Theme](#theme)
  - [Header and footer](#header-and-footer)
  - [Profile format](#profile-format)
  - [Legend](#legend)
  - [Sections](#sections)
  - [Dates and labels](#dates-and-labels)
  - [Fonts](#fonts)
  - [Profile and pdfmake hooks](#profile-and-pdfmake-hooks)
- [API](#api)
  - [`createWellPdf(well, options?)`](#createwellpdfwell-options)
  - [`buildDocDefinition(well, svgs, legend, options?, extras?)`](#builddocdefinitionwell-svgs-legend-options-extras)
  - [`buildSvgProfiles(well, container, ctx, { firstPageRemaining?, startPage?, drawingHeight? })`](#buildsvgprofileswell-container-ctx--firstpageremaining-startpage-drawingheight-)
  - [`measureProfileStart(well, options, pdfMake)`](#measureprofilestartwell-options-pdfmake)
  - [`measureLegendBreak(well, svgs, legend, options, pdfMake, extras?)`](#measurelegendbreakwell-svgs-legend-options-pdfmake-extras)
  - [`measureCompactSideSplit(well, svgs, legend, options, pdfMake, extras?)`](#measurecompactsidesplitwell-svgs-legend-options-pdfmake-extras)
  - [`measureCompactContentHeight(well, options, pdfMake)`](#measurecompactcontentheightwell-options-pdfmake)
  - [`resolvePdfContext(options?)`](#resolvepdfcontextoptions)
  - [Section builders](#section-builders)
  - [Layout helpers](#layout-helpers)
  - [Runtime](#runtime)
  - [Configs](#configs)
- [Data format](#data-format)
- [License](#license)

---

## Install

```bash
npm install @welldot/pdf
```

`@welldot/core`, `@welldot/utils`, `@welldot/render` and `pdfmake` are installed as dependencies.

---

## Quick start

```ts
import { deserializeWell } from '@welldot/core';
import { createWellPdf } from '@welldot/pdf';

const well = deserializeWell(fileContents);

const pdf = await createWellPdf(well, { locale: 'en' });
await pdf?.download(); // welldot_<name>_<dd_MM_yyyy_HH_mm>.pdf
```

`createWellPdf` runs in the browser. It draws the profile into a hidden element, lazy-loads pdfmake and the default fonts, and returns:

| Member                | Description                                      |
| --------------------- | ------------------------------------------------ |
| `docDefinition`       | The pdfmake document definition                  |
| `pdf`                 | The pdfmake created document                     |
| `getBlob()`           | PDF as a `Blob` (e.g. for an `<iframe>` preview) |
| `download(filename?)` | Saves the file                                   |
| `print()`             | Opens the print dialog                           |

It resolves to `null` when `isCancelled()` returns `true` between steps.

---

## Customization

All options are optional.

### Content

```ts
await createWellPdf(well, {
  locale: 'pt', // labels, vocabularies, profile text
  title: 'PERFIL CONSTRUTIVO', // default: localized "GEOLOGICAL PROFILE"
  breakPages: true, // false = one auto-height page
  scale: 500, // profile scale 1:N
  format: 'detailed', // 'detailed' | 'compact'
  profileFit: 'scale', // 'scale' | 'page' | 'content' (compact, no breakPages)
  metadataPosition: 'before', // 'before' | 'after' | null
  headingInfo: [{ label: 'Client', value: 'ACME' }],
  endInfo: [{ label: 'Technician', value: 'J. Doe' }],
  units: {
    length: 'm',
    diameter: 'inches',
    flow: 'm3/h',
    power: 'kW',
    volume: 'm3',
  },
  coordinateFormat: 'DMS',
  waterQualityLimitSet: 'who_gdwq_2022',
  baseUrl: 'https://welldot.org',
  shareUrl: 'https://welldot.org/editor?share=abc',
  shareExpiresAt: '2026-12-31T00:00:00Z',
  omitShareBlock: false,
});
```

### Branding

The Welldot logo, name and site are the default. Replace or hide each part.

```ts
branding: {
  logo: { svg: '<svg …>', width: 24, height: 24 },  // or { image: 'data:image/png;base64,…' }, or false
  name: 'ACME Drilling',                             // or false
  subtitle: 'acme.com',                              // or false
}
```

### Watermark

```ts
watermark: { text: 'DRAFT', color: '#b91c1c', opacity: 0.1, angle: -45, fontSize: 80 }
// or an image centered on every page
watermark: { image: 'data:image/png;base64,…', imageWidth: 300, opacity: 0.06 }
```

### Page

```ts
page: {
  size: 'A4',              // 'A4' | 'A3' | 'LETTER' | 'LEGAL' | { width, height } in points
  orientation: 'portrait', // or 'landscape'
  margins: 30,             // or [left, top, right, bottom]
}
```

The profile height per page and its width follow the page size.

### Theme

```ts
theme: {
  fonts: { body: 'jetBrainsMono', heading: 'ibmPlexSerif', label: 'spaceGrotesk' },
  colors: { text: '#3d3d3d', title: '#001537', tableHeader: '#555555', exceedance: '#b91c1c' },
  fontSizes: { body: 10, title: 12, sectionTitle: 13 },
}
```

See `DEFAULT_PDF_THEME` for every key. Font names must be registered with pdfmake (see Fonts).

### Header and footer

```ts
header: { showPageNumbers: true, enabled: true, content: (page, count) => ({ text: `${page}/${count}` }) },
footer: { text: 'ACME — internal', showQr: true, qrUrl: 'https://acme.com', showHost: false, enabled: true },
```

`content` replaces the built-in header or footer entirely.

### Profile format

`format` picks the profile layout:

- **`detailed`** (default) — a full-width profile with column titles (depth, lithology, construction, geological description), the lithology strip, the construction with its labels on the right, and each layer's description (unit, description, aquifer) aligned to its depth. With `breakPages`, `planDetailedPanels` pages it: a page break that falls just below a lithology contact (within `SNAP_RATIO`, 15 % of the page's depth span) moves up onto that contact, each page repeats the bottom `OVERLAP_HEIGHT` (24 pt) of the previous one as a hatched band, and a mini-map in the left margin outlines the page's depths. Captions read `continues ↓ to 455 m` or `break set at the 455 m contact (Serra Geral / Botucatu)`. Without `breakPages` it is one long page, without mini-map.
- **`compact`** — a narrow profile column (`COMPACT_PROFILE_RATIO`, 32 % of the content width) with numbered layer markers and `F{n}` fracture markers, starting right under the page header, beside a column holding the general information (`metadataPosition: 'before'`, in two columns), the lithology, caves and fractures tables, the construction tables and every other section. The profile continues beside the tables on the next pages, captioned `1:2,000 · continues on p. 2 ↓`, and the last panel just `1:2,000`. Once the profile ends, the tables that start below it take the full page width (`createWellPdf` finds the split with `measureCompactSideSplit`).

`profileFit` replaces `scale`: `'page'` fits the whole profile into the space left on one page, in either format and with or without `breakPages` (with page breaks, everything after the profile still flows onto further pages); `'content'` (compact without `breakPages` only, otherwise it resolves to `'scale'`) draws it as tall as the tables beside it.

### Legend

The legend is a compact strip — a rule, the uppercase legend title, then each entry's symbol (scaled to 20 pt) and label on one line, wrapping to more lines when needed — in both formats:

- With `breakPages`, it sits at the foot of the **first page that holds the profile**, just above the footer. That page's first profile panel is shortened by the strip height (`firstPanelReserve`), and anything else on that page that would run into the strip — a compact side table, the full-width tables after a short profile, the detailed sections after a one-page profile — starts on the next page instead (`measureLegendBreak`); a table cut there repeats its title and header. In the compact format, when the profile ends on that page, what moves continues at full width on the next page instead of beside an empty profile column. No other page loses space.
- Without `breakPages`, it follows the profile in the flow.

### Sections

```ts
sections: {
  include: { production: false, waterSamples: false },
  order: ['waterSamples', 'construction'], // the rest follow in default order
}
```

Keys: `lithology`, `caves`, `fractures`, `construction`, `hydrodynamicEvents`, `historyLog`, `pumpInstallations`, `meters`, `operatingRegimes`, `production`, `permits`, `waterSamples`. Empty sections are always skipped. `lithology`, `caves` and `fractures` only produce tables in the `compact` format (the `detailed` profile already shows them), and `caves` and `fractures` always follow `lithology`, in that order, whatever the custom order.

### Dates and labels

```ts
dateFormats: { date: 'yyyy-MM-dd', dateTime: 'yyyy-MM-dd HH:mm' }, // date-fns patterns
labels: {
  general: { name: 'Well name' },                 // plain string
  document: { page: { en: 'Sheet', es: 'Hoja' } }, // or LanguageText
},
```

Document text lives in `PDF_LABELS` with `en` and `pt` text; a locale with no entry falls back to its base language, then Portuguese. Override any entry by its path, as plain text or per language. Vocabulary values (well and permit status, sample type, fraction, parameter names, …) are labeled by `@welldot/core` and `@welldot/utils`, so the PDF reads the same as any other welldot tool and needs no translations from you.

### Fonts

The default fonts (JetBrains Mono, Space Grotesk, IBM Plex Serif) live in a separate ~1.7 MB entry, `@welldot/pdf/fonts`, loaded only when needed. Bring your own:

```ts
await createWellPdf(well, {
  fonts: { vfs: { 'Roboto-Regular.ttf': base64, … }, fonts: { roboto: { normal: 'Roboto-Regular.ttf', … } } },
  theme: { fonts: { body: 'roboto', heading: 'roboto', label: 'roboto' } },
});
```

### Profile and pdfmake hooks

```ts
profile: { renderConfig: { /* @welldot/render RenderConfig */ }, theme: { /* WellTheme */ } },
metadata: { author: 'ACME', subject: 'Well report' },
transformDocDefinition: doc => ({ ...doc, pageMargins: 40 }),
container: myHiddenDiv,   // reuse an attached element for drawing
pdfMake: myPdfMakeInstance,
```

---

## API

### `createWellPdf(well, options?)`

High-level browser export described above. `buildDefaultPdfFilename(well, date?, prefix?)` builds the default file name.

### `buildDocDefinition(well, svgs, legend, options?, extras?)`

Pure document assembly. Takes raw options or a resolved context. Use it with your own SVGs, or in Node with `svgs: []` and `legend: []`. `extras.lithologySwatches` (`PdfRenderedExtras`) holds the compact lithology table's swatches; a missing one falls back to a square of the layer `color`. In the `detailed` format, a profile panel starts on a new page when its `breakBefore` is `true`; without the flag, every panel but the first does (with `breakPages`). In the `compact` format the panels are stacked in the profile column of a two-column block (each sized to its page, so pdfmake moves the next one to the next page) and `buildCompactSideContent(well, ctx, extras)` fills the side column, built with the side column (`computeCompactSideWidth`) as the content width. The document is built from `buildLeadContent(well, ctx)` (heading info and, except in the compact format, the `'before'` metadata table, i.e. everything above the profile, starting a small `LEAD_TOP_GAP` under the page header) and `buildDocShell(ctx)` (page size, `pageMargins` from `resolveBodyMargins`, styles). `legend` is a list of `RenderedLegendItem` (`{ label, symbol: RenderedSvg }`), drawn as the legend strip (`buildLegendStrip`, rows from `packLegendRows`, height from `computeLegendStripHeight`). With `breakPages` the strip is placed (`LEGEND_STRIP_ID`, absolutely positioned) right after the first profile panel, so it lands at the foot of that page; `extras.legendBreak` (from `measureLegendBreak`) starts the piece that would run into it on the next page (`startOnNextPage`). The six-column `buildLegendTable` (`LEGEND_COLUMNS`) is still exported but no longer used.

### `buildSvgProfiles(well, container, ctx, { firstPageRemaining?, startPage?, drawingHeight? })`

Draws the profile panels of `ctx.format`, one standalone symbol per legend entry and, in the compact format, one swatch per lithology layer with `WellRenderer`, and returns their markup (`{ svgs, legendItems, lithologySwatches, scale }`). Each panel (`RenderedProfilePanel`) carries `breakBefore`, `depthFrom` and `depthTo`; captions are drawn in its bottom margin. `startPage` numbers the compact captions; `drawingHeight` replaces `scale` with the scale that fits that height when `profileFit` is not `'scale'`; the scale drawn at is returned as `scale`. Needs an attached DOM element.

The detailed profile is split by `planDetailedPanels({ totalDepth, topDepth?, ptPerMeter, contacts, breakPages, pageHeight, firstPageRemaining?, padding })` (`topDepth`, default `0`, is negative when pipes stick up above the ground — `buildSvgProfiles` passes `getProfileTopDepth(well)` from `@welldot/render`, so the first page starts there) (contacts from `getLithologyContacts(lithology)`), which returns `DetailedPanel`s with `depthFrom`, `depthTo`, `repeatedTo` and `snap`. The compact profile is split by `planProfilePanels`:

- The first panel fills `firstPageRemaining`, the height left under the content above the profile. If less than `MIN_FIRST_PANEL_HEIGHT` (120pt) of drawing fits there, the profile starts on the next page instead.
- Every other panel fills a whole page body (`computePageSvgHeight`: page height minus margins and the `PAGE_CHROME` header/footer reserve, minus `FIT_EPSILON`), so no panel ever overflows into the footer.
- Panel drawing heights add up to `computeTotalSvgHeight(depth, scale)`, so the printed scale is exactly 1:N.
- Each returned panel carries `breakBefore`.

Without `firstPageRemaining`, a rough `computeFirstPageAvailableHeight` estimate is used. `createWellPdf` passes the real value from `measureProfileStart`.

Other geometry helpers: `computeProfileWidth`, `resolveBodyMargins`.

### `measureProfileStart(well, options, pdfMake)`

Lays out only the content above the profile with pdfmake (fonts must be registered) and resolves to `{ pageNumber, remaining }`: the page the profile starts on and the height left on it. Resolves to `null` when `breakPages` is off or the layout fails.

### `measureLegendBreak(well, svgs, legend, options, pdfMake, extras?)`

With `breakPages` and a legend, lays the document out once and resolves to the first piece — table row, stack item or whole block, in the compact side column (`scope: 'side'`) or in the content after the profile (`scope: 'after'`) — that would run into the legend strip on the first profile page, or `undefined` when nothing reaches it. Pass it as `extras.legendBreak`. The panel planners (`planProfilePanels`, `planDetailedPanels`) take `firstPanelReserve` to keep the strip's height (plus `LEGEND_GAP`) free under the first panel; `buildSvgProfiles` sets it from the legend labels.

### `measureCompactSideSplit(well, svgs, legend, options, pdfMake, extras?)`

Lays the compact document out with every block (`buildCompactBlocks`) beside the profile and resolves to the index of the first block that starts after the profile ends (less than `COMPACT_SPLIT_MIN_ROOM`, 60 pt, above its bottom), or `undefined` when all of them start beside it. Pass it to `buildDocDefinition` as `extras.compactSideSplit`: blocks from that index on are rebuilt at full width below the two columns.

### `measureCompactContentHeight(well, options, pdfMake)`

Lays out the compact side column beside an empty profile column on one auto-height page and resolves to its height in points (`null` when the layout fails). `createWellPdf` uses it for `profileFit: 'content'`.

### `resolvePdfContext(options?)`

Applies defaults (`resolvePdfUnits`, `resolvePdfPage`), resolves labels for the locale and computes page geometry. Every section builder takes this `PdfContext`.

### Section builders

`buildMetadataTable`, `buildLithologySection`, `buildCaveSection`, `buildFractureSection`, `buildSectionTables`, `buildHydrodynamicEventsSection`, `buildHistoryLogSection`, `buildPumpInstallationSection`, `buildMeterSection`, `buildOperatingRegimeSection`, `buildProductionSection`, `buildPermitSection`, `buildWaterSampleSection`. All take `(well, ctx)` (`buildLithologySection` also takes `extras`). `PDF_SECTION_BUILDERS` maps section keys to them.

How the operation sections are laid out:

- **Hydrodynamic events**: one table, newest first. Columns: date/time, type, static level, last dynamic level, flow rate and operator, plus a notes column when an event has notes. Unknown values print as "—".
- **Pumps, meters, permits, water samples**: one entry per item. Each entry has a header line (type, status or "current" marker, date or period) and a label/value grid in the general-information style (`buildFieldGrid`). Notes and attachments each take a full-width row. Entries are separated by `buildEntryDivider`.
- **Permits** also get captioned tables: conditions (numbered, with responsible and deadline status), fulfillments (by condition number, deadline, author, description) and administrative history.
- **Water samples**: the results table drops the fraction, location, method and flags columns when no result has a value for them.

The grids use 4 columns, or 2 when `page.contentWidth` is under `WIDE_FIELD_GRID_MIN_WIDTH` (420 pt), for example in the compact side column.

### Layout helpers

`buildHeaderContent`, `buildFooterContent`, `buildTextWatermark`, `buildImageWatermark`, `buildLegendTable(items, ctx, columns = LEGEND_COLUMNS)`, `lightLinesLayout`, `buildRule(width, color, margin?, lineWidth = 0.5)`, `headerCell`, `rightCell`, `withTableTitle`.

Helpers for listing sections:

- `buildEntryListing(title, entries, ctx)` keeps the title on the first entry's header and separates entries with `buildEntryDivider`, a 0.75 pt rule in `theme.colors.pageRule`.
- `buildEntryHeader(title, marker, right)` builds an entry's header line.
- `buildFieldGrid(fields, ctx, wide?)` and `buildLabelValueTable(fields, columns, wide?)` build label/value grids. `fieldGridColumns(ctx)` gives the column count.
- `withTableCaption(caption, table)` adds a small caption that repeats with the table header and is never left alone at a page bottom.
- `valueCell(text)` is a right-aligned cell that keeps a number on one line with its unit.
- `attachmentName(attachment)` gives an attachment's display name.

`buildDocDefinition` passes the content through `applyGlyphFallbacks`. It swaps characters the bundled fonts lack (`PDF_GLYPH_FALLBACKS`: superscript `⁻` → `−`, `⁺` → `+`, as in `HCO₃⁻`), so they don't print as missing-glyph boxes. SVG markup is left untouched.

### Runtime

`loadPdfMake()`, `registerPdfFonts(pdfMake, fonts?)`, `loadDefaultPdfFonts()`. From `@welldot/pdf/fonts`: `WELLDOT_PDF_FONTS`.

### Configs

`PDF_LABELS`, `resolvePdfLabels(locale, overrides?)` (typed result, read as `labels.general.name`), `DEFAULT_PDF_THEME`, `PDF_PAGE_SIZES`, `WELLDOT_BRANDING`, `WELLDOT_LOGO_SVG`, `createPdfFormatters(ctx)` (also `formatDepth` / `formatDepthRange`). The label pack has `profile.columns`, `profile.caption`, `profile.continuation`, `profile.overlapRepeated`, `lithology`, `caves` and `fractures` groups for the profile formats, and the theme has `colors.profileCaption` and `colors.snapNote`. New labels for the operation sections:

- `operation.attachments`
- `operation.permit.conditions.{condition,number,status}`
- `operation.permit.fulfill.{title,fulfilledAt,by,description}`
- `operation.permit.history.{date,type,description,situation}`
- `hydrodynamicEvents.fields.{datetime,type,notes}`
- `waterQuality.pdf.flagsValidation`

---

## Data format

Input is a `.well` v2 `Well` from [`@welldot/core`](../core). Run `deserializeWell()` first on older files. Apply `redactWell()` before exporting if parts must stay private, and set `omitShareBlock` so the QR does not point to the full profile.

---

## License

Apache 2.0 — see [LICENSE](../../LICENCE.md)
