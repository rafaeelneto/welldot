# @welldot/pdf

Customizable PDF reports for `.well` water well profiles, built on [pdfmake](https://pdfmake.github.io/docs/). Part of the [welldot](https://github.com/rafaeelneto/welldot) open-source ecosystem.

One call turns a well into a paginated report: lithology/construction profile, legend, general information, construction tables, hydrodynamic tests, history log, pumps, meters, operating regimes, production, permits and water quality. Labels ship in English and Portuguese. Branding, watermark, page layout, theme, sections and every label can be customized.

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
  fontSizes: { body: 11, title: 12, sectionTitle: 13 },
}
```

See `DEFAULT_PDF_THEME` for every key. Font names must be registered with pdfmake (see Fonts).

### Header and footer

```ts
header: { showPageNumbers: true, enabled: true, content: (page, count) => ({ text: `${page}/${count}` }) },
footer: { text: 'ACME — internal', showQr: true, qrUrl: 'https://acme.com', showHost: false, enabled: true },
```

`content` replaces the built-in header or footer entirely.

### Sections

```ts
sections: {
  include: { production: false, waterSamples: false },
  order: ['waterSamples', 'construction'], // the rest follow in default order
}
```

Keys: `construction`, `hydrodynamicEvents`, `historyLog`, `pumpInstallations`, `meters`, `operatingRegimes`, `production`, `permits`, `waterSamples`. Empty sections are always skipped.

### Dates and labels

```ts
dateFormats: { date: 'yyyy-MM-dd', dateTime: 'yyyy-MM-dd HH:mm' }, // date-fns patterns
labels: {
  general: { name: 'Well name' },                 // plain string
  document: { page: { en: 'Sheet', es: 'Hoja' } }, // or LanguageText
},
```

Every label lives in `PDF_LABELS` with `en` and `pt` text. A locale with no entry falls back to its base language, then Portuguese.

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

### `buildDocDefinition(well, svgs, legendSvg, options?)`

Pure document assembly. Takes raw options or a resolved context. Use it with your own SVGs, or in Node with `svgs: []`.

### `buildSvgProfiles(well, container, ctx)`

Draws the profile and legend with `WellRenderer` and returns their markup. Needs an attached DOM element. Page-geometry helpers: `computePageHeights`, `computePageSvgHeight`, `computeProfileWidth`, `computeTotalSvgHeight`, `computeFirstPageAvailableHeight`.

### `resolvePdfContext(options?)`

Applies defaults (`resolvePdfUnits`, `resolvePdfPage`), resolves labels for the locale and computes page geometry. Every section builder takes this `PdfContext`.

### Section builders

`buildMetadataTable`, `buildSectionTables`, `buildHydrodynamicEventsSection`, `buildHistoryLogSection`, `buildPumpInstallationSection`, `buildMeterSection`, `buildOperatingRegimeSection`, `buildProductionSection`, `buildPermitSection`, `buildWaterSampleSection`. All take `(well, ctx)`. `PDF_SECTION_BUILDERS` maps section keys to them.

### Layout helpers

`buildHeaderContent`, `buildFooterContent`, `buildTextWatermark`, `buildImageWatermark`, `lightLinesLayout`, `buildEntryDivider`, `buildRule`, `headerCell`, `rightCell`, `withTableTitle`.

### Runtime

`loadPdfMake()`, `registerPdfFonts(pdfMake, fonts?)`, `loadDefaultPdfFonts()`. From `@welldot/pdf/fonts`: `WELLDOT_PDF_FONTS`.

### Configs

`PDF_LABELS`, `resolvePdfLabels(locale, overrides?)`, `createPdfTranslate(labels)`, `DEFAULT_PDF_THEME`, `PDF_PAGE_SIZES`, `WELLDOT_BRANDING`, `WELLDOT_LOGO_SVG`, `createPdfFormatters(ctx)`.

---

## Data format

Input is a `.well` v2 `Well` from [`@welldot/core`](../core). Run `deserializeWell()` first on older files. Apply `redactWell()` before exporting if parts must stay private, and set `omitShareBlock` so the QR does not point to the full profile.

---

## License

Apache 2.0 — see [LICENSE](../../LICENCE.md)
