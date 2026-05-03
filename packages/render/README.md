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
- **Construction** — borehole, well casings, diameter reductions, well screens, hole fills (gravel pack / cement seal), and cement pad
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
  classNames?:   DeepPartial<ComponentsClassNames>;
  onError?:      (err: Error) => void;
})
```

| Option | Type | Description |
|--------|------|-------------|
| `svgs` | `SvgInstance[]` | One or more SVG panel descriptors (`{ selector, height, width, margins }`) |
| `renderConfig` | `DeepPartial<RenderConfig>` | Controls zoom, pan, animation, labels, tooltips, layout |
| `theme` | `DeepPartial<WellTheme>` | Visual style overrides (merged with `DEFAULT_WELL_THEME`) |
| `units` | `Units` | `{ length: 'm' \| 'ft'; diameter: 'mm' \| 'inches' }` |
| `classNames` | `DeepPartial<ComponentsClassNames>` | Override CSS class names for any SVG element |
| `onError` | `(err: Error) => void` | Error callback |

#### Methods

| Method | Description |
|--------|-------------|
| `prepareSvg(): Promise<void>` | Initialise SVG DOM structure and preload FGDC textures. Call once before the first `draw`. |
| `draw(profile: Well, options?: { units?: Units; highlights?: Highlights }): void` | Render or re-render the full well profile. |
| `renderLegend(selector: string, profile: Well): void` | Render a standalone legend into a separate SVG. |

---

### `drawWellLegend`

Render a horizontal legend panel independently, without a `WellRenderer` instance.

```ts
drawWellLegend(
  selector: string,
  profile:  Well,
  options?: {
    config?:  Partial<LegendRenderConfig>;
    cssVars?: Partial<CssVarsConfig>;
  }
): void
```

Does nothing if the profile contains no fractures or caves.

---

### Config presets

| Export | Description |
|--------|-------------|
| `INTERACTIVE_RENDER_CONFIG` | Full-featured preset: zoom, pan, animation enabled |
| `STATIC_RENDER_CONFIG` | Zoom and pan disabled; suitable for static exports |
| `DEFAULT_WELL_THEME` | Complete default visual theme |

---

### Format utilities

| Export | Signature | Description |
|--------|-----------|-------------|
| `formatLength` | `(m: number, units: LengthUnits) => string` | Depth in metres → unit-aware string |
| `formatDiameter` | `(mm: number, units: DiameterUnits) => string` | Diameter in mm → unit-aware string |
| `getLengthUnit` | `(units: LengthUnits) => string` | Returns `'m'` or `'ft'` |
| `getDiameterUnit` | `(units: DiameterUnits) => string` | Returns `'mm'` or `'"'` |

---

## Theming

Visual appearance is controlled by CSS custom properties (`--wp-*`) defined on `:root`. Import the package stylesheet or override properties inline:

```ts
// Override via renderConfig at construction time
new WellRenderer(svgs, {
  renderConfig: {
    cssVars: {
      fractureWetStroke: '#0077cc',
      wellCaseFill: '#f5f5f5',
    },
  },
});
```

All CSS variables (colors, stroke widths, opacities) are listed in `src/styles/main.css`.

---

## Data format

`@welldot/render` renders [`Well`](https://www.npmjs.com/package/@welldot/core) objects from `@welldot/core`. See that package for the `.well` file format specification, types, and validators.

---

## License

Apache 2.0 — see [LICENSE](../../LICENCE.md).
