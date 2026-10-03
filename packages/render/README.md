# @welldot/render

D3-based SVG renderer for `.well` geological well profiles. Part of the [welldot](https://github.com/rafaeelneto/welldot) open-source ecosystem.

## Install

```bash
npm install @welldot/render
```

## Quick start

```ts
import { WellRenderer, INTERACTIVE_RENDER_CONFIG } from '@welldot/render';
import type { Well } from '@welldot/core';

const renderer = new WellRenderer(
  [
    {
      selector: '#well-svg',
      height: 600,
      width: 300,
      margins: { top: 20, right: 10, bottom: 20, left: 40 },
    },
  ],
  { renderConfig: INTERACTIVE_RENDER_CONFIG },
);

await renderer.prepareSvg();
renderer.draw(profile); // profile is a Well object
```

Call `prepareSvg()` once after mounting the SVG element, then call `draw(profile)` whenever the profile data changes.

## What it renders

- **Lithology column** — geological layers with FGDC standard texture patterns and custom fill colors
- **Construction** — borehole, well casings, diameter reductions, well screens, hole fills (gravel pack / cement seal), centralizers (`.well` v2.1 — bow markers in the annulus at each derived position; size via `renderConfig.construction.centralizer.markerHalfHeight`, colors via `theme.centralizer`, tooltip key `centralizer`), and cement pad
- **Current pump** (`.well` v2.3 `pump_installations`) — the installation without `removed_at` (via `getCurrentPump` from `@welldot/utils`), drawn as a riser pipe from the surface and a pump body ending at `intake_depth`. The riser uses `riser_diameter`, falling back to `riserWidthRatio` × casing diameter. Configure via `renderConfig.construction.pump` (`active`, `bodyHeight` px, `bodyWidthRatio`, `riserWidthRatio`), colors via `theme.pump` (`fill`, `stroke`, `strokeWidth`, `riserStroke`, `riserStrokeWidth`), tooltip key `pump` (rated power shown in `units.power`: `kW`, `cv` or `hp`), legend label `legend.labels.pump`. Earlier installations are not drawn
- **Fractures** — individual and swarm fractures with dip angles and water-intake indicators
- **Caves** — cavity zones with wavy geological contact lines
- **Labels** — depth annotations, lithology descriptions, and geologic / aquifer unit strips
- **Legend** — standalone legend panel for fracture and cave symbols

Supports zoom, pan, interactive tooltips, multi-panel layout for long wells, and configurable highlights for interactive selection.

---

## API

### `WellRenderer`

The main renderer class.

```ts
new WellRenderer(svgs: SvgInstance[], options?: {
  renderConfig?: DeepPartial<RenderConfig>;
  theme?:        DeepPartial<WellTheme>;
  units?:        Units;
  locale?:       'en' | 'pt';
  classNames?:   DeepPartial<ComponentsClassNames>;
  onError?:      (err: Error) => void;
  onZoom?:       (scale: number) => void;
})
```

| Option         | Type                                | Description                                                                                                                                             |
| -------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `svgs`         | `SvgInstance[]`                     | One or more SVG panel descriptors (`{ selector, height, width, margins }`)                                                                              |
| `renderConfig` | `DeepPartial<RenderConfig>`         | Controls zoom, pan, animation, labels, tooltips, layout                                                                                                 |
| `theme`        | `DeepPartial<WellTheme>`            | Visual style overrides (merged with `DEFAULT_WELL_THEME`)                                                                                               |
| `units`        | `Units`                             | `{ length: 'm' \| 'ft'; diameter: 'mm' \| 'inches' }`                                                                                                   |
| `locale`       | `'en' \| 'pt'`                      | Locale for renderer-drawn text (diameter symbol, and any labels resolved via `applyRenderLocale`). Defaults to `'pt'` (the package's historical output) |
| `classNames`   | `DeepPartial<ComponentsClassNames>` | Override CSS class names for any SVG element                                                                                                            |
| `onError`      | `(err: Error) => void`              | Error callback                                                                                                                                          |
| `onZoom`       | `(scale: number) => void`           | Called with the current zoom scale (`1` = initial/fit) on every wheel/drag zoom-pan tick, and on `zoomBy`/`resetZoom` calls                             |

#### Methods

| Method                                                                                                             | Description                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `prepareSvg(): Promise<void>`                                                                                      | Initialise SVG DOM structure and preload FGDC textures. Call once before the first `draw`.                             |
| `draw(profile: RenderableWell, options?: { units?: Units; locale?: 'en' \| 'pt'; highlights?: Highlights }): void` | Render or re-render the full well profile.                                                                             |
| `renderLegend(selector: string, profile: Well): void`                                                              | Render a standalone legend into a separate SVG.                                                                        |
| `zoomBy(factor: number): void`                                                                                     | Multiply the current zoom scale by `factor` (e.g. `1.25` in, `1 / 1.25` out). No-op if `zoom`/`pan` are both disabled. |
| `resetZoom(): void`                                                                                                | Reset zoom/pan back to `renderConfig.zoomLevel` (default `1` — the initial fit-to-container view).                     |
| `getZoomScale(): number`                                                                                           | Current zoom scale of the first panel (`1` = initial/fit).                                                             |

`RenderableWell` extends `Well` with an optional `key` field on each feature array element, enabling stable D3 data-join keys across re-renders. A plain `Well` object is directly assignable to `RenderableWell`. **`key` is runtime-only** — keep it in memory across edits for stable animation, but strip it before serializing to a `.well` file.

#### Driving zoom from your own UI (zoom in/out/fit buttons)

`zoom`/`pan` (when enabled in `renderConfig`) already wire up mouse wheel and drag directly on the SVG. `zoomBy`/`resetZoom`/`getZoomScale` operate on that same internal zoom behavior, so wheel/drag and a custom toolbar stay in sync — including through the `onZoom` callback, which fires for both interaction sources. `renderConfig.minZoomScale`/`maxZoomScale` (default `0`–`150`, i.e. 0%–15000%) bound the scale for wheel, drag, and `zoomBy`/`resetZoom` alike, since they're enforced on the shared d3-zoom behavior itself rather than by any one call site.

```ts
const renderer = new WellRenderer(svgs, {
  renderConfig: { ...INTERACTIVE_RENDER_CONFIG, zoom: true, pan: true },
  onZoom: scale => updateScaleLabel(scale),
});

zoomInButton.onclick = () => renderer.zoomBy(1.25);
zoomOutButton.onclick = () => renderer.zoomBy(1 / 1.25);
fitButton.onclick = () => renderer.resetZoom();
```

---

### `drawWellLegend`

Render a horizontal legend panel independently, without a `WellRenderer` instance.

```ts
drawWellLegend(
  selector: string,
  profile:  Well,
  options?: {
    config?:     Partial<LegendRenderConfig>;
    theme?:      Partial<WellTheme>;
    classNames?: ComponentsClassNames['legend'];
    textures?:   TexturesConfig;
  }
): void
```

Does nothing if the profile contains no fractures or caves.

---

### Config presets

| Export                      | Description                                        |
| --------------------------- | -------------------------------------------------- |
| `INTERACTIVE_RENDER_CONFIG` | Full-featured preset: zoom, pan, animation enabled |
| `STATIC_RENDER_CONFIG`      | Zoom and pan disabled; suitable for static exports |
| `DEFAULT_WELL_THEME`        | Complete default visual theme                      |

---

### Format utilities

| Export               | Signature                                                      | Description                                                                             |
| -------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `formatLength`       | `(m: number, units: LengthUnits) => string`                    | Depth in metres → unit-aware string                                                     |
| `formatDiameter`     | `(mm: number, units: DiameterUnits) => string`                 | Diameter in mm → unit-aware string                                                      |
| `getLengthUnit`      | `(units: LengthUnits) => string`                               | Returns `'m'` or `'ft'`                                                                 |
| `getDiameterUnit`    | `(units: DiameterUnits, locale?: 'en' \| 'pt') => string`      | Returns `'mm'`, or `'"'`/`'in.'` for `inches` depending on `locale` (defaults to `'"'`) |
| `resolveRenderLabel` | `(value: RenderLocalizedText, locale: 'en' \| 'pt') => string` | Resolves a paired-locale label to a plain string, falling back to `pt`                  |

---

### Locale

Every string `@welldot/render` draws (tooltip titles/fields, construction-label prefixes, fracture/cave type words, legend entries) is sourced from `RenderConfig` — the `locale` constructor/`draw()` option only controls the diameter unit symbol (`getDiameterUnit`) directly. To get fully English-rendered text, resolve the package's built-in English label pack into your `RenderConfig` with `applyRenderLocale`:

```ts
import {
  WellRenderer,
  INTERACTIVE_RENDER_CONFIG,
  applyRenderLocale,
} from '@welldot/render';

const renderer = new WellRenderer(svgs, {
  units: { length: 'ft', diameter: 'inches' },
  locale: 'en',
  renderConfig: applyRenderLocale(INTERACTIVE_RENDER_CONFIG, 'en'),
});
```

`applyRenderLocale(config, locale)` returns a copy of `config` with `constructionLabels.labels`, `legend.labels`, `tooltipLabels`, and `labels.typeLabels` resolved from the package's canonical `RENDER_LABELS` pack — every other field of `config` is unchanged. `RENDER_LABELS` (and the `RenderLocalizedText`/`RenderLabelPack`/`TooltipLabels` types describing its shape) are also exported directly for consumers who want to resolve labels themselves. Omitting `locale`/`applyRenderLocale` entirely preserves the package's historical Portuguese-only output.

---

## Theming

Visual appearance is controlled by the `theme` option passed to `WellRenderer`. All colors, stroke widths, and opacities are defined as a `WellTheme` object. Use `DEFAULT_WELL_THEME` as a base and pass a `DeepPartial<WellTheme>` to override specific values:

```ts
new WellRenderer(svgs, {
  theme: {
    lithology: { stroke: '#222222', strokeWidth: 1.5 },
    wellCase: { fill: '#f5f5f5', stroke: '#333333', strokeWidth: 2 },
    reduction: { fill: '#f5f5f5', stroke: '#333333', strokeWidth: 2 },
  },
});
```

See `DEFAULT_WELL_THEME` in `src/configs/render.configs.ts` for all available keys.

---

## Data format

`@welldot/render` renders [`Well`](https://www.npmjs.com/package/@welldot/core) objects from `@welldot/core`. See that package for the `.well` file format specification, types, and validators.

**Version requirement:** Only `.well` v2 (`version: 2`) is supported. Pass raw JSON through `deserializeWell()` from `@welldot/core` before calling `draw()` — it normalizes v1 files to v2 automatically.

---

## License

Apache 2.0 — see [LICENSE](../../LICENCE.md).
