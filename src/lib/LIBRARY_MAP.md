# Well Profiler – Library Map

Overview of all drawer/profile functions, their signatures, and dependency chains under `src/lib/`.

---

## File Structure

```
src/lib/
├── @types/
│   ├── well.types.ts          — All domain type definitions
│   ├── drawer.types.ts        — ComponentsClassNames, SvgInstance, Colors, ColorsOverride
│   ├── units.types.ts         — Units, LengthUnits, DiameterUnits
│   └── generic.types.ts       — DeepPartial<T>
├── utils/
│   ├── well.utils.ts          — Profile data utilities
│   └── well.utils.test.ts     — Test suite for well.utils
└── wellDrawer/
    ├── WellDrawer.ts          — Interactive D3 visualizer
    ├── WellDrawerPDF.ts       — Paginated PDF visualizer
    ├── drawer.utils.ts        — Shared SVG/drawing helpers
    └── drawer.textures.ts     — Shared well texture definitions (createWellTextures)
```

---

## Types — `@types/well.types.ts`

### Constructive (physical well structure)

| Type | Key Fields |
|------|-----------|
| `BoreHole` | `from, to, diameter, drilling_method?` |
| `WellCase` | `from, to, type, diameter` |
| `Reduction` | `from, to, diam_from, diam_to, type` |
| `WellScreen` | `from, to, type, diameter, screen_slot_mm` |
| `HoleFill` | `from, to, type ('gravel_pack' \| 'seal'), diameter, description` |
| `SurfaceCase` | `from, to, diameter` |
| `CementPad` | `type, width, thickness, length` |
| `Constructive` | Container: `bore_hole[], well_case[], reduction[], well_screen[], surface_case[], hole_fill[], cement_pad` |

### Geologic

| Type | Key Fields |
|------|-----------|
| `Lithology` | `from, to, description, color, fgdc_texture, geologic_unit, aquifer_unit` |
| `Fracture` | `depth, water_intake, description, swarm, azimuth, dip` |
| `Cave` | `from, to, water_intake, description` |
| `Geologic` | Container: `lithology[], fractures[], caves[]` |

### Root

| Type | Description |
|------|-------------|
| `Well` | Full profile: combines `Constructive` + `Geologic` + metadata fields (`name`, `lat`, `lng`, `elevation`, etc.) |

---

## Utilities — `utils/well.utils.ts`

### Functions

#### `getProfileLastItemsDepths(profile: Well): number[]`
Returns the maximum `to` depth from each constructive/geologic section of the profile.  
**Used by:** `WellDrawer.drawLog`, `WellDrawerPDF.buildSvgProfiles`, `profile2Export`

#### `getProfileDiamValues(constructionData: Constructive): number[]`
Collects all diameter values from bore holes, cases, screens, etc.  
**Used by:** `WellDrawer.drawLog`, `WellDrawerPDF.buildSvgProfiles`

#### `getConstructivePropertySummary<T>(constructionData: any, property: string): T[]`
Generic extractor — pulls a named property from all items across constructive arrays.

#### `checkIfProfileIsEmpty(profile: any): boolean`
Returns `true` if the profile has no meaningful data.  
**Used by:** `WellDrawer.drawLog`, `profile2Export`

#### `calculateCilindricVolume(diameter: number, height: number): number`
Volume of a cylinder in m³. Inputs: diameter in mm, height in m.  
**Used by:** `calculateHoleFillVolume`

#### `calculateHoleFillVolume(type: string, profile: Well): number`
Volume of a given fill type, subtracting overlapping casing/screen volumes.  
**Depends on:** `calculateCilindricVolume`, `Well.hole_fill`, `Well.well_case`, `Well.well_screen`  
**Used by:** `pdfGenerate.tsx`

#### `profileToWell(profile: Well): string`
Serializes a `Well` to the `.well` v1 JSON string format.

#### `convertProfileFromJSON(jsonString: string): Well | null`
Parses multiple legacy formats and the current `.well` format.  
Handles: `geologic[]→lithology[]`, `diam_pol→diameter`, inch→mm conversions.  
**Depends on:** `getEmptyProfile` (from `src/data/profile/profile.data`), `checkIfProfileIsEmpty`

### Constant

#### `numberFormater: Intl.NumberFormat`
pt-BR locale, 2 decimal places.

---

## Well Textures — `wellDrawer/drawer.textures.ts`

### `createWellTextures(): WellTextures`

Factory that returns fresh `textures` library instances for all well-drawing fill patterns. Both drawers call this — `WellDrawer` once at module level, `WellDrawerPDF` once per `drawLog` call (fresh instances per SVG).

| Key | Description |
|-----|-------------|
| `pad` | Cement pad — horizontal lines, heavy/thin |
| `conflict` | Casing/screen overlap warning — red lines |
| `cave_dry` | Dry cave band — diagonal lines, dark gray |
| `cave_wet` | Wet cave band — diagonal lines, blue |
| `seal` | Hole seal fill — thick lines |
| `gravel_pack` | Gravel pack fill — circles complement |
| `well_screen` | Well screen fill — short horizontal dashes |

**Used by:** `WellDrawer.ts`, `WellDrawerPDF.ts`

---

## Drawing Utilities — `wellDrawer/drawer.utils.ts`

### Functions

#### `responsivefy(svg): svg`
Makes an SVG element responsive to container resizes. Adds a `resize` listener to `window`.  
**Used by:** `WellDrawer.drawLog`

#### `getLithologicalFillList(data: Lithology[]): { [key: string]: Texture }`
Builds FGDC-based texture objects for lithology fill patterns.  
Key format: `"${fgdc_texture}.${from}"`.  
**Depends on:** `textures` library, `fgdcTextures` lookup table

#### `getConflictAreas(array1: any[], array2: any[]): { from, to, diameter }[]`
Finds depth-interval overlaps between two arrays (e.g. well_case vs well_screen).  
Pure computation — no external dependencies.  
**Used by:** `WellDrawer.drawLog`, `WellDrawerPDF.buildSvgProfiles`

#### `mergeConflicts(conflicts: { from, to, diameter }[], buffer: number): { from, to, diameter }[]`
Merges adjacent conflict regions, accounting for a buffer distance.  
Pure computation.  
**Used by:** `WellDrawer.drawLog`, `WellDrawerPDF.buildSvgProfiles`

#### `getYAxisFunctions(yScale: d3.ScaleLinear): { getHeight, getYPos }`
Returns accessor functions that convert depth values to SVG y-coordinates.  
**Depends on:** D3 scale object  
**Used by:** `WellDrawer.drawLog`, `WellDrawerPDF.buildSvgProfiles`

#### `getLithologyFill(geologyData: Lithology[], svg): (d: Lithology) => string`
Higher-order function — registers textures with the SVG and returns a fill accessor.  
**Depends on:** `getLithologicalFillList`  
**Used by:** `WellDrawer` (geology rendering)

#### `wavyContact(xLeft, xRight, baseY, amp, steps, rng): [number, number][]`
Generates a wavy geological contact line using a damped random walk.  
**Depends on:** caller-supplied seeded PRNG (`rng`)  
**Used by:** `WellDrawer` and `WellDrawerPDF` (cave rendering)

#### `ptsToSmoothPath(pts: [number, number][]): string`
Converts a point array to an SVG path `d` string via Catmull-Rom cubic Bézier.  
**Used by:** `WellDrawer` and `WellDrawerPDF` (cave/contact rendering)

#### `makeCavePrng(seed: number): () => number`
Creates a seeded LCG PRNG. Ensures cave shapes are identical across zoom levels and redraws.  
**Used by:** `WellDrawer.drawLog`, `WellDrawerPDF.buildSvgProfiles`

---

## Shared Types — `@types/drawer.types.ts`

### `ComponentsClassNames`

Nested semantic class-name map. Every drawn element has a named slot. Passed to `WellDrawer` constructor and to `populateTooltips`.

```
tooltip       → { root, title, primaryInfo, secondaryInfo }
yAxis         → string
wellGroup     → string
geologicGroup → string
lithology     → { group, rect }
fractures     → { group, item, hitArea, line, polyline }
caves         → { group, item, fill, contact }
constructionGroup → string
cementPad     → { group, item }
boreHole      → { group, rect }
surfaceCase   → { group, rect }
holeFill      → { group, rect }
wellCase      → { group, rect }
wellScreen    → { group, rect }
conflict      → { group, rect }
```

| Sub-key | Element |
|---------|---------|
| `*.group` | `<g>` container appended during `prepareSvg` |
| `*.item` | Per-datum `<g>` appended per fracture / cave |
| `*.rect` | `<rect>` data elements |
| `fractures.hitArea` | Transparent hit buffer rect inside each fracture group |
| `fractures.line` | `<line>` crack and bridge elements |
| `fractures.polyline` | `<polyline>` wavy stroke paths |
| `caves.fill` | Closed textured fill `<path>` |
| `caves.contact` | Top and bottom contact stroke `<path>` elements |

### `Colors` / `ColorsOverride`

`Colors` is the full type for the default color palette. `ColorsOverride` is `DeepPartial<Colors>`, used as the `colors` option in the constructor.

### `SvgInstance`

Shape passed per SVG panel: `{ selector, height, width, margins }`.

---

## Generic Types — `@types/generic.types.ts`

### `DeepPartial<T>`

Recursively makes all properties optional. Used by `ColorsOverride` and the `classNames` constructor option.

---

## Interactive Visualizer — `wellDrawer/WellDrawer.ts`

### `class WellDrawer`

```typescript
constructor(
  svgs: SvgInstance[],
  options?: {
    classNames?: DeepPartial<ComponentsClassNames>;
    units?:      Units;
    colors?:     ColorsOverride;
  }
)
```

All three options are deep-merged with their defaults via `defu`, so partial overrides are safe at any nesting depth.

#### Public Properties

| Property | Type | Description |
|----------|------|-------------|
| `classes` | `ComponentsClassNames` | Resolved class-name map (defaults merged with overrides) |

#### Public Methods

| Method | Description |
|--------|-------------|
| `prepareSvg(): Promise<void>` | Initializes SVG groups, clip paths, and D3 structure |
| `drawLog(profile: Well, options?: { units?: Units }): void` | **Main entry point** — renders the full well profile |

#### Internal Rendering Closures (within `drawLogToInstance`)

| Function | Renders |
|----------|---------|
| `drawLithology(data, yScale)` | Lithology `rect` elements with fills and tooltips |
| `drawCaves(data, yScale)` | Wavy-edged cave bands: fill path + two contact paths |
| `drawFractures(data, yScale)` | Fracture groups: hit area, lines, polylines, swarms |
| `drawWellConstructive(data, yScale)` | Bore hole, casings, screens, hole fill, cement pad, conflicts |
| `drawProfile()` | Orchestrates all `draw*` calls for the initial render |
| `zooming(e)` | Zoom handler — rescales y-axis, repositions rects and fracture groups, redraws caves |

#### Dependencies

| Dependency | What is used |
|-----------|--------------|
| `d3`, `d3-tip` | SVG rendering, scales, zoom, tooltips |
| `defu` | Deep-merge for `classNames`, `units`, `colors` options |
| `drawer.types` | `ComponentsClassNames`, `SvgInstance`, `Colors`, `ColorsOverride` |
| `generic.types` | `DeepPartial<T>` |
| `well.types` | All domain type definitions |
| `well.utils` | `checkIfProfileIsEmpty`, `getProfileDiamValues`, `getProfileLastItemsDepths` |
| `drawer.utils` | `responsivefy`, `getYAxisFunctions`, `getConflictAreas`, `mergeConflicts`, `getLithologyFill`, `wavyContact`, `ptsToSmoothPath`, `makeCavePrng`, `populateTooltips` |
| `drawer.textures` | `createWellTextures` |

---

## PDF Visualizer — `wellDrawer/WellDrawerPDF.ts`

### `A4_SVG_HEIGHT: number`
`480 * 1.33` ≈ 638.4 px — height of a single A4 page SVG.

### `buildSvgProfiles(props): SvgInfo[]`

```typescript
buildSvgProfiles(props: {
  profile: Well;
  lengthUnits: LengthUnits;
  diameterUnits: DiameterUnits;
  breakPages?: boolean;
  zoomLevel?: number;
  firstPageAvailableHeight?: number;
}): SvgInfo[]   // SvgInfo = { id: string, height: number }
```

Creates one or more `<svg>` elements inside `#svgDraftContainer`, each representing a vertical page slice of the profile.

#### Internal Rendering Closures

| Function | Renders |
|----------|---------|
| `drawLog(svgInfo)` | Single SVG page (depth-sliced) |
| `updateGeology(data, yScale)` | Lithology rectangles |
| `updateCaves(data, yScale)` | Wavy cave bands |
| `updateLithologyLabels(data, yScale)` | Depth/description labels |
| `drawUnitLabels(data, yScale)` | Geologic and aquifer unit labels |
| `updateFractures(data, yScale)` | Fracture symbols |
| `updatePoco(data, yScale)` | Constructive elements |

#### Canvas Constants

| Constant | Value | Meaning |
|----------|-------|---------|
| `WIDTH` | `485.28 pt` | A4 width minus margins |
| `POCO_CENTER` | `350` | X center for construction drawing |
| `GEOLOGY_X_POS` | `35` | Left edge of geology column |
| `GEOLOGY_WIDTH` | `220` | Width of geology column |

#### Dependencies

| Dependency | What is used |
|-----------|--------------|
| `d3`, `textures` | SVG rendering and fill patterns |
| `well.types` | All type definitions |
| `well.utils` | `getProfileLastItemsDepths`, `getProfileDiamValues` |
| `drawer.utils` | `getYAxisFunctions`, `getConflictAreas`, `mergeConflicts`, `wavyContact`, `ptsToSmoothPath`, `makeCavePrng` |
| `src_old/utils/wrap` | SVG text wrapping |
| `src_old/utils/fgdcTextures` | Geological texture patterns |
| `src_old/utils/profileD3.utils` | Legacy D3 utilities |
| `ui.store` | `LengthUnits`, `DiameterUnits` |

---

## Dependency Graph

```
WellDrawer.ts
  ├── d3, d3-tip, defu
  ├── @types/well.types
  ├── @types/drawer.types  (ComponentsClassNames, SvgInstance, Colors, ColorsOverride)
  ├── @types/generic.types (DeepPartial)
  ├── @types/units.types
  ├── utils/well.utils
  │     └── @types/well.types
  │     └── data/profile.data (getEmptyProfile)
  ├── wellDrawer/drawer.utils
  │     ├── d3, textures
  │     ├── @types/well.types
  │     └── src_old/utils/fgdcTextures
  └── wellDrawer/drawer.textures  (createWellTextures)

WellDrawerPDF.ts
  ├── d3, textures (textures kept for legend custom-color cave)
  ├── @types/well.types
  ├── utils/well.utils
  ├── wellDrawer/drawer.utils
  ├── wellDrawer/drawer.textures  (createWellTextures)
  ├── src_old/utils/wrap
  ├── src_old/utils/fgdcTextures
  ├── src_old/utils/profileD3.utils
  └── store/ui.store

views/PDFExport/pdfGenerate.tsx
  ├── pdfmake, date-fns
  ├── @types/well.types
  ├── utils/well.utils  (calculateHoleFillVolume, numberFormater)
  ├── wellDrawer/WellDrawerPDF  (buildSvgProfiles, A4_SVG_HEIGHT)
  ├── utils/coords.utils  (formatCoord)
  └── store/ui.store

views/PDFExport/profile2Export.component.ts
  ├── @types/well.types
  ├── utils/well.utils  (checkIfProfileIsEmpty, getProfileLastItemsDepths, getProfileDiamValues)
  ├── views/PDFExport/pdfGenerate  (innerRenderPdf, printPdf, downloadPdf)
  └── store/ui.store
```

---

## Quick Reference

| Function | Module | Signature | Returns |
|----------|--------|-----------|---------|
| `getProfileLastItemsDepths` | well.utils | `(profile: Well)` | `number[]` |
| `getProfileDiamValues` | well.utils | `(constructionData: Constructive)` | `number[]` |
| `checkIfProfileIsEmpty` | well.utils | `(profile: any)` | `boolean` |
| `calculateCilindricVolume` | well.utils | `(diameter: number, height: number)` | `number` (m³) |
| `calculateHoleFillVolume` | well.utils | `(type: string, profile: Well)` | `number` (m³) |
| `convertProfileFromJSON` | well.utils | `(jsonString: string)` | `Well \| null` |
| `profileToWell` | well.utils | `(profile: Well)` | `string` |
| `responsivefy` | drawer.utils | `(svg)` | `svg` |
| `getLithologicalFillList` | drawer.utils | `(data: Lithology[])` | `{ [key]: Texture }` |
| `getConflictAreas` | drawer.utils | `(array1, array2)` | `Conflict[]` |
| `mergeConflicts` | drawer.utils | `(conflicts, buffer)` | `Conflict[]` |
| `getYAxisFunctions` | drawer.utils | `(yScale)` | `{ getHeight, getYPos }` |
| `getLithologyFill` | drawer.utils | `(geologyData, svg)` | `(d: Lithology) => string` |
| `wavyContact` | drawer.utils | `(xL, xR, y, amp, steps, rng)` | `[number, number][]` |
| `ptsToSmoothPath` | drawer.utils | `(pts: [number, number][])` | `string` (SVG path `d`) |
| `makeCavePrng` | drawer.utils | `(seed: number)` | `() => number` |
| `populateTooltips` | drawer.utils | `(svg, classes, units)` | tooltip map |
| `WellDrawer.drawLog` | WellDrawer | `(profile, options?: { units? })` | `void` |
| `buildSvgProfiles` | WellDrawerPDF | `(props)` | `SvgInfo[]` |
