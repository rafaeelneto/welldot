# Well Profiler – Render Package Library Map

Overview of all exported symbols, their signatures, and dependency chains under `src/`.

---

## File Structure

```
src/
├── index.ts                   — Public exports (re-exports utils from @welldot/utils)
├── Renderer.ts                — Interactive D3 visualizer (WellRenderer class)
├── configs/
│   ├── render.configs.ts      — INTERACTIVE_RENDER_CONFIG, DEFAULT_COMPONENTS_CLASS_NAMES, CSS_VAR_MAP
│   └── render.textures.ts     — WellTextures type + createWellTextures factory
├── types/
│   └── render.types.ts        — All render-specific type definitions
├── renderers/
│   ├── legend.renderer.ts     — drawWellLegend: horizontal legend for fractures & caves
│   └── WellRendererPDF.ts     — Paginated PDF visualizer (not exported; pending src_old removal)
├── utils/
│   ├── render.utils.ts        — Shared SVG/drawing helpers
│   ├── format.utils.ts        — Unit-aware length/diameter formatting
│   └── fgdcTextures.ts        — FGDC texture code lists (FGDC_TEXTURES_LIST, FGDC_TEXTURES_OPTIONS)
└── styles/
    └── main.css               — CSS custom properties (--wp-*) and element rules
```

---

## Public API — `index.ts`

### Re-exported from `@welldot/utils`

| Symbol | Description |
|--------|-------------|
| `getProfileLastItemsDepths` | Max `to` depth per constructive/geologic section |
| `getProfileDiamValues` | All diameter values from a `Constructive` |
| `getConstructivePropertySummary` | Generic named-property extractor across constructive arrays |
| `checkIfProfileIsEmpty` | Returns `true` if the profile has no meaningful data |
| `calculateCilindricVolume` | Cylinder volume in m³ (diameter mm, height m) |
| `calculateHoleFillVolume` | Fill volume for a type, subtracting casing/screen overlap |
| `numberFormater` | `Intl.NumberFormat` — pt-BR, 2 decimal places |

### Exported from this package

| Symbol | Source | Description |
|--------|--------|-------------|
| `WellRenderer` | `Renderer.ts` | Interactive SVG renderer class |
| `drawWellLegend` | `renderers/legend.renderer.ts` | Renders a horizontal fracture/cave legend into an SVG |
| `INTERACTIVE_RENDER_CONFIG` | `configs/render.configs.ts` | Default `RendererRenderConfig` preset |
| `formatLength` | `utils/format.utils.ts` | Depth value → unit-aware string |
| `formatDiameter` | `utils/format.utils.ts` | Diameter value → unit-aware string |
| `getLengthUnit` | `utils/format.utils.ts` | Label string for a `LengthUnits` value |
| `getDiameterUnit` | `utils/format.utils.ts` | Label string for a `DiameterUnits` value |

### Exported Types

| Type | Description |
|------|-------------|
| `ComponentsClassNames` | Full CSS class-name map for every SVG element |
| `CssVarsConfig` | Runtime CSS variable overrides |
| `DeepPartial<T>` | Recursive partial utility |
| `LegendRenderConfig` | Config shape for the legend renderer |
| `RendererRenderConfig` | Master renderer configuration |
| `SvgInstance` | Input descriptor `{ selector, height, width, margins }` |
| `TooltipKey` | Union of tooltip category strings |

> **Note:** `WellRendererPDF` is intentionally not exported — it depends on `src_old` legacy code pending removal.

---

## Types — `types/render.types.ts`

### `DeepPartial<T>`
Recursively makes all properties optional. Used for `classNames` and `renderConfig` constructor options.

---

### `Conflict`
```typescript
{ from: number; to: number; diameter: number }
```
Represents a depth-interval overlap between two construction element arrays.

---

### `InstanceState`
Internal per-SVG state produced by `initInstanceSvg`:
```typescript
{
  svg:       d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
  height:    number;
  width:     number;
  margins:   { left: number; right: number; top: number; bottom: number };
  clipId:    string;
  clipRectId: string;
}
```

---

### `SvgInstance`
Passed to the `WellRenderer` constructor to describe each target SVG panel:
```typescript
{
  selector: string;   // CSS selector for the <svg> element
  height:   number;
  width:    number;
  margins:  { left: number; right: number; top: number; bottom: number };
}
```

---

### `TooltipKey`
```
'geology' | 'hole' | 'surfaceCase' | 'holeFill' | 'wellCase'
| 'wellScreen' | 'conflict' | 'fracture' | 'cementPad' | 'cave'
```

---

### `CssVarsConfig`
All-optional map of CSS custom property overrides. Applied inline on the SVG element via `CSS_VAR_MAP`, overriding the `:root` defaults from `main.css`.

```
// Stroke & fill colors
lithologyStroke, caveDryStroke, caveWetStroke
fractureDryStroke, fractureWetStroke, cementPadStroke
boreHoleFill, boreHoleStroke, surfaceCaseFill
holeFillStroke, wellCaseFill, wellCaseStroke
wellScreenStroke, conflictStroke

// Widths & opacities
lithologyStrokeWidth, caveFillOpacity, caveContactStrokeWidth
cementPadStrokeWidth, boreHoleOpacity, boreHoleStrokeWidth
surfaceCaseStrokeWidth, holeFillStrokeWidth
wellCaseStrokeWidth, wellScreenStrokeWidth, conflictStrokeWidth

// Unit label strips
unitLabelGeologicFill, unitLabelAquiferFill, unitLabelStroke
```

---

### `ComponentsClassNames`

Nested semantic class-name map. Every drawn element has a named slot.

```
tooltip         → { root, title, primaryInfo, secondaryInfo }
yAxis           → string
wellGroup       → string
geologicGroup   → string
lithology       → { group, rect }
labels          → { lithology: { group, depth, label, divider } }
fractures       → { group, item, hitArea, line, polyline }
caves           → { group, item, fill, contact }
constructionGroup   → string
constructionLabels  → { group }
cementPad       → { group, item }
boreHole        → { group, rect }
surfaceCase     → { group, rect }
holeFill        → { group, rect }
wellCase        → { group, rect }
wellScreen      → { group, rect }
conflict        → { group, rect }
unitLabels      → { group, geoRect, aqRect, text }
```

---

### `LegendRenderConfig`

Controls legend layout and label text:

```typescript
{
  title:     string;
  fontSize:  number;
  itemWidth: number;
  height:    number;
  padding:   number;
  labels: {
    fractureSingle: string;
    fractureSwarm:  string;
    fractureWater:  string;
    caveDry:        string;
    caveWet:        string;
  };
}
```

---

### `RendererRenderConfig`

Master configuration object. Visual styling is handled by CSS — this controls interaction, layout, animation, and geometry.

```
zoom:         boolean
pan:          boolean
tooltips?:    TooltipKey[] | false
animation:    { duration: number; ease: d3.EasingFunction }
geologic:     { xLeft: number; xRightInset: number }
layout:       { pocoWidthRatio: number; pocoCenterRatio: number }
caves:        { pathSteps: number; amplitude: { ratio, min, max } }
fractures:    {
                widthMultiplier,
                hitBuffer: { single, swarm },
                swarm: { lineCountBase, lineCountVariance, spread,
                         centralStrokeWidth, sideStrokeWidthBase, sideStrokeWidthVariance },
                single: { mainStrokeWidth, crackStrokeWidth }
              }
construction: {
                cementPad:   { widthMultiplier, thicknessMultiplier },
                surfaceCase: { diameterPaddingRatio }
              }
constructionLabels: { active: boolean; fontSize: number; xOffset: number; labels: {...} }
unitLabels:   { active, xOffset, stripWidth, fontSize, minHeightForText,
                innerDividerWidth, outerEdgeWidth }
labels:       {
                active: boolean | ('lithology' | 'fractures' | 'caves')[],
                lithology?: boolean | ('depth' | 'description' | 'dividers')[],
                typeLabels?: { fracture?: string; cave?: string },
                style: { fontSize, depthTipHeight, depthTipPadX, ... }
              }
cssVars?:     CssVarsConfig
legend?:      LegendRenderConfig
```

---

## Interactive Visualizer — `Renderer.ts`

### `class WellRenderer`

```typescript
constructor(
  svgs: SvgInstance[],
  options?: {
    classNames?:   DeepPartial<ComponentsClassNames>;
    units?:        Units;
    renderConfig?: DeepPartial<RendererRenderConfig>;
  }
)
```

All options are deep-merged with defaults via `defu`. `renderConfig.cssVars`, when provided, is applied as inline SVG styles during `prepareSvg`, overriding `:root` CSS defaults from `main.css`.

#### Public Properties

| Property | Type | Description |
|----------|------|-------------|
| `classes` | `ComponentsClassNames` | Resolved class-name map (defaults merged with overrides) |
| `WIDTH` | `number` (getter) | Read-only instance width |

#### Public Methods

| Method | Description |
|--------|-------------|
| `prepareSvg(): Promise<void>` | Creates SVG groups, clip paths, and D3 structure; applies `cssVars` |
| `draw(profile: Well, options?: { units?: Units }): void` | **Main entry point** — renders the full well profile |

#### Internal Methods / Closures (within `drawLogToInstance`)

| Function | Renders |
|----------|---------|
| `initInstanceSvg(inst, index)` | Sets up a single SVG: clip paths, defs, group structure → `InstanceState` |
| `drawLithology(data, yScale)` | Lithology `rect` elements with texture fills and tooltips |
| `drawUnitLabels(data, yScale)` | Geologic and aquifer unit vertical strips with rotated text |
| `drawCaves(data, yScale)` | Wavy-edged cave bands: textured fill path + two contact paths |
| `drawFractures(data, yScale)` | Fracture groups: hit area, lines, polylines, swarms |
| `drawConstructionLabels(data, yScale)` | Labels for well cases and screens |
| `drawAnnotationLabels(data, yScale)` | Depth tips, lithology descriptions, divider lines |
| `drawConstructive(data, yScale)` | Bore hole, casings, screens, hole fill, cement pad, conflicts |
| `zooming(e)` | Zoom/pan handler — rescales y-axis and repositions all elements |

#### Dependencies

| Dependency | What is used |
|-----------|--------------|
| `d3`, `d3-tip` | SVG rendering, scales, zoom, tooltips |
| `defu` | Deep-merge for `classNames`, `units`, `renderConfig` |
| `@welldot/core` | All domain type definitions (`Well`, `Lithology`, etc.) |
| `@welldot/utils` | `checkIfProfileIsEmpty`, `getProfileDiamValues`, `getProfileLastItemsDepths` |
| `configs/render.configs` | `INTERACTIVE_RENDER_CONFIG`, `DEFAULT_COMPONENTS_CLASS_NAMES`, `CSS_VAR_MAP` |
| `configs/render.textures` | `createWellTextures` |
| `types/render.types` | `CssVarsConfig`, `ComponentsClassNames`, `RendererRenderConfig`, `SvgInstance`, `TooltipKey`, `InstanceState` |
| `utils/render.utils` | `getYAxisFunctions`, `getConflictAreas`, `mergeConflicts`, `getLithologyFill`, `wavyContact`, `ptsToSmoothPath`, `makeCavePrng`, `populateTooltips` |
| `utils/format.utils` | `formatLength`, `formatDiameter` |

---

## Legend Renderer — `renderers/legend.renderer.ts`

### `drawWellLegend(selector, profile, options?): void`

```typescript
drawWellLegend(
  selector: string,
  profile:  Well,
  options?: {
    config?:  Partial<LegendRenderConfig>;
    cssVars?: Partial<CssVarsConfig>;
  }
): void
```

Inspects the profile to determine which legend items are relevant (fracture single/swarm/water, cave dry/wet), then renders a horizontal legend into the target SVG. Resolves `--wp-*` CSS variables from the DOM (with fallbacks). Clears existing SVG content before each render. Does nothing if no fractures or caves are present.

**Used by:** Consumers that want a standalone legend panel alongside the main renderer.

---

## Render Config Preset — `configs/render.configs.ts`

### `INTERACTIVE_RENDER_CONFIG: RendererRenderConfig`

Complete default preset for `WellRenderer`. Key values:

| Field | Value |
|-------|-------|
| `zoom` | `true` |
| `pan` | `true` |
| `animation.duration` | `600` |
| `animation.ease` | `d3.easeCubic` |
| `geologic.xLeft` | `6` |
| `geologic.xRightInset` | `56` |
| `layout.pocoWidthRatio` | `0.25` |
| `layout.pocoCenterRatio` | `0.11` |
| `caves.pathSteps` | `40` |
| `caves.amplitude` | `{ ratio: 0.12, min: 1, max: 5.5 }` |
| `labels` | `false` (disabled) |
| `unitLabels.active` | `false` (disabled) |
| `constructionLabels.active` | `false` (disabled) |
| `legend.title` | `'LEGENDA'` |

### `DEFAULT_COMPONENTS_CLASS_NAMES: ComponentsClassNames`

Default CSS class strings for every drawn element. Consumers pass overrides to the `WellRenderer` constructor; these are the fallback values.

### `CSS_VAR_MAP: Record<keyof CssVarsConfig, string>`

Maps each `CssVarsConfig` key to its `--wp-*` CSS variable name. Used internally to apply `cssVars` overrides as inline SVG styles.

---

## Well Textures — `configs/render.textures.ts`

### `WellTextures`

```typescript
{
  pad:         Texture;  // Cement pad — horizontal lines
  conflict:    Texture;  // Overlap warning — red lines
  cave_dry:    Texture;  // Dry cave — angled lines, dark gray
  cave_wet:    Texture;  // Wet cave — angled lines, blue
  seal:        Texture;  // Hole seal — thick lines
  gravel_pack: Texture;  // Gravel pack — circles
  well_screen: Texture;  // Well screen — short diagonal dashes
}
```

### `createWellTextures(): WellTextures`

Factory that returns fresh `textures` library instances for all well fill patterns. `WellRenderer` creates one set at module load; `WellRendererPDF` creates a fresh set per page.

---

## Drawing Utilities — `utils/render.utils.ts`

### `responsivefy(svg): svg`
Makes an SVG responsive to container resizes. Adds a `resize` listener to `window`.

### `getLithologicalFillList(data: Lithology[]): { [key: string]: Texture }`
Builds FGDC-based texture objects for lithology fill patterns. Key format: `"${fgdc_texture}.${from}"`.

### `getConflictAreas(array1: any[], array2: any[]): Conflict[]`
Finds depth-interval overlaps between two arrays (e.g. well_case vs well_screen). Pure computation.  
**Used by:** `WellRenderer`, `WellRendererPDF`

### `mergeConflicts(conflicts: Conflict[], buffer: number): Conflict[]`
Merges adjacent conflict regions within a buffer distance. Pure computation.  
**Used by:** `WellRenderer`, `WellRendererPDF`

### `getYAxisFunctions(yScale: d3.ScaleLinear, clamp?: boolean): { getHeight, getYPos }`
Returns accessor functions converting depth values to SVG y-coordinates. Optional `clamp` flag clamps outputs to the scale domain.  
**Used by:** `WellRenderer`, `WellRendererPDF`

### `getLithologyFill(geologyData: Lithology[], svg): (d: Lithology) => string`
Higher-order function — registers textures with the SVG and returns a per-datum fill accessor.  
**Depends on:** `getLithologicalFillList`

### `wavyContact(xLeft, xRight, baseY, amp, steps, rng): [number, number][]`
Generates a wavy geological contact line using a damped random walk. Deterministic via caller-supplied seeded PRNG.  
**Used by:** `WellRenderer`, `WellRendererPDF` (cave rendering)

### `ptsToSmoothPath(pts: [number, number][]): string`
Converts a point array to an SVG path `d` string via Catmull-Rom cubic Bézier (tension 0.35).  
**Used by:** `WellRenderer`, `WellRendererPDF`

### `makeCavePrng(seed: number): () => number`
Seeded LCG PRNG (Park-Miller). Ensures cave shapes are identical across zoom levels and redraws.  
**Used by:** `WellRenderer`, `WellRendererPDF`

### `populateTooltips(svg, customClasses, units, tooltipConfig?): TooltipMap`
Registers `d3-tip` tooltips on all drawn elements. `tooltipConfig` controls which types are active; `false` disables all.  
**Depends on:** `d3-tip`, `formatLength`, `formatDiameter`  
**Used by:** `WellRenderer`

---

## Format Utilities — `utils/format.utils.ts`

### `formatLength(m: number, units: LengthUnits): string`
Converts a metre value to the target unit and returns a formatted string (× 3.28084 for `'ft'`).

### `formatDiameter(mm: number, units: DiameterUnits): string`
Converts a millimetre diameter to the target unit (× 0.0393701 for `'inches'`).

### `getLengthUnit(units: LengthUnits): string`
Returns `'m'` or `'ft'`.

### `getDiameterUnit(units: DiameterUnits): string`
Returns `'mm'` or `'"'` (inch symbol).

---

## FGDC Textures — `utils/fgdcTextures.ts`

### `FGDC_TEXTURES_LIST: number[]`
Array of valid FGDC texture codes (120, 123, 132, 601–733).

### `FGDC_TEXTURES_OPTIONS: Array<{ value: number; label: string }>`
Key-value pairs for UI texture-code dropdowns.

---

## Styles — `styles/main.css`

Defines all `--wp-*` CSS custom properties on `:root` and applies them to SVG elements scoped to `.well-group`. Single source of truth for default visual appearance — stroke colors, fill colors, opacities, stroke widths.

### CSS Custom Properties

| Variable | Default | Applied to |
|----------|---------|-----------|
| `--wp-lithology-stroke` | `#101010` | lithology rect stroke |
| `--wp-cave-dry-stroke` | `#333333` | dry cave contact stroke |
| `--wp-cave-wet-stroke` | `#1a6fa8` | wet cave contact stroke |
| `--wp-fracture-dry-stroke` | `#000000` | dry fracture line/poly stroke |
| `--wp-fracture-wet-stroke` | `#1a6fa8` | wet fracture line/poly stroke |
| `--wp-cement-pad-stroke` | `#303030` | cement pad rect stroke |
| `--wp-bore-hole-fill` | `#ffffff` | bore hole rect fill |
| `--wp-bore-hole-stroke` | `#303030` | bore hole rect stroke |
| `--wp-surface-case-fill` | `#000000` | surface case rect fill |
| `--wp-hole-fill-stroke` | `#303030` | hole fill rect stroke |
| `--wp-well-case-fill` | `#ffffff` | well case rect fill |
| `--wp-well-case-stroke` | `#303030` | well case rect stroke |
| `--wp-well-screen-stroke` | `#303030` | well screen rect stroke |
| `--wp-conflict-stroke` | `#E52117` | conflict rect stroke |
| `--wp-lithology-stroke-width` | `1px` | lithology rect stroke-width |
| `--wp-cave-fill-opacity` | `0.6` | cave fill path fill-opacity |
| `--wp-cave-contact-stroke-width` | `1.2px` | cave contact path stroke-width |
| `--wp-cement-pad-stroke-width` | `2px` | cement pad rect stroke-width |
| `--wp-bore-hole-opacity` | `0.6` | bore hole rect opacity |
| `--wp-bore-hole-stroke-width` | `1px` | bore hole rect stroke-width |
| `--wp-surface-case-stroke-width` | `2px` | surface case rect stroke-width |
| `--wp-hole-fill-stroke-width` | `2px` | hole fill rect stroke-width |
| `--wp-well-case-stroke-width` | `2px` | well case rect stroke-width |
| `--wp-well-screen-stroke-width` | `2px` | well screen rect stroke-width |
| `--wp-conflict-stroke-width` | `4px` | conflict rect stroke-width |
| `--wp-unit-geo-fill` | `#f0f0f0` | geologic_unit strip fill |
| `--wp-unit-aq-fill` | `#dff0ff` | aquifer_unit strip fill |
| `--wp-unit-label-stroke` | `#303030` | unit strip stroke and text color |

All of these can be overridden at runtime via `RendererRenderConfig.cssVars`.

---

## PDF Visualizer — `renderers/WellRendererPDF.ts` _(not exported)_

### `A4_SVG_HEIGHT: number`
`480 * 1.33` ≈ 638.4 px — height of a single A4 page SVG panel.

### `buildSvgProfiles(props): SvgInfo[]`

```typescript
buildSvgProfiles(props: {
  profile:                  Well;
  lengthUnits:              LengthUnits;
  diameterUnits:            DiameterUnits;
  breakPages?:              boolean;
  zoomLevel?:               number;
  firstPageAvailableHeight?: number;
}): SvgInfo[]   // SvgInfo = { id: string; height: number }
```

Creates one or more `<svg>` elements inside `#svgDraftContainer`, each representing a vertical page slice of the profile. Not exported — still depends on `src_old` legacy utilities (`wrap`, `fgdcTextures`, `profileD3.utils`) pending removal.

---

## Dependency Graph

```
@welldot/render (index.ts)
  ├── Renderer.ts (WellRenderer)
  │     ├── d3, d3-tip, defu
  │     ├── @welldot/core          (Well, Lithology, Fracture, etc.)
  │     ├── @welldot/utils         (getProfileLastItemsDepths, getProfileDiamValues, checkIfProfileIsEmpty)
  │     ├── configs/render.configs (INTERACTIVE_RENDER_CONFIG, DEFAULT_COMPONENTS_CLASS_NAMES, CSS_VAR_MAP)
  │     ├── configs/render.textures (createWellTextures)
  │     ├── types/render.types
  │     ├── utils/render.utils
  │     └── utils/format.utils
  ├── renderers/legend.renderer.ts (drawWellLegend)
  │     ├── d3
  │     ├── @welldot/core
  │     ├── configs/render.configs (INTERACTIVE_RENDER_CONFIG)
  │     ├── configs/render.textures (createWellTextures)
  │     └── types/render.types
  ├── configs/render.configs.ts
  │     └── types/render.types
  └── utils/format.utils.ts

renderers/WellRendererPDF.ts  [not exported]
  ├── d3, textures
  ├── @welldot/core
  ├── @welldot/utils
  ├── utils/format.utils
  ├── utils/render.utils
  ├── configs/render.textures
  ├── src_old/utils/wrap          (legacy)
  ├── src_old/utils/fgdcTextures  (legacy)
  └── src_old/utils/profileD3.utils (legacy)
```

---

## Quick Reference

| Symbol | Module | Signature | Returns |
|--------|--------|-----------|---------|
| `WellRenderer` | `Renderer.ts` | `new WellRenderer(svgs, options?)` | instance |
| `WellRenderer.prepareSvg` | `Renderer.ts` | `()` | `Promise<void>` |
| `WellRenderer.draw` | `Renderer.ts` | `(profile, options?)` | `void` |
| `drawWellLegend` | `renderers/legend.renderer.ts` | `(selector, profile, options?)` | `void` |
| `INTERACTIVE_RENDER_CONFIG` | `configs/render.configs.ts` | — | `RendererRenderConfig` |
| `createWellTextures` | `configs/render.textures.ts` | `()` | `WellTextures` |
| `getConflictAreas` | `utils/render.utils.ts` | `(array1, array2)` | `Conflict[]` |
| `mergeConflicts` | `utils/render.utils.ts` | `(conflicts, buffer)` | `Conflict[]` |
| `getYAxisFunctions` | `utils/render.utils.ts` | `(yScale, clamp?)` | `{ getHeight, getYPos }` |
| `getLithologyFill` | `utils/render.utils.ts` | `(geologyData, svg)` | `(d: Lithology) => string` |
| `wavyContact` | `utils/render.utils.ts` | `(xL, xR, y, amp, steps, rng)` | `[number, number][]` |
| `ptsToSmoothPath` | `utils/render.utils.ts` | `(pts)` | `string` (SVG path `d`) |
| `makeCavePrng` | `utils/render.utils.ts` | `(seed)` | `() => number` |
| `populateTooltips` | `utils/render.utils.ts` | `(svg, classes, units, tooltipConfig?)` | tooltip map |
| `formatLength` | `utils/format.utils.ts` | `(m, units)` | `string` |
| `formatDiameter` | `utils/format.utils.ts` | `(mm, units)` | `string` |
| `getLengthUnit` | `utils/format.utils.ts` | `(units)` | `string` |
| `getDiameterUnit` | `utils/format.utils.ts` | `(units)` | `string` |
| `buildSvgProfiles` | `renderers/WellRendererPDF.ts` | `(props)` | `SvgInfo[]` |
