# Architecture

**Pattern:** Monorepo — published TypeScript libraries + web app frontend

## Package Dependency Chain

```
@welldot/core          ← foundation: types, Zod schemas, serialization
        ↓
@welldot/utils         ← profile analysis (depth, volume, gravel pack estimates)
        ↓
@welldot/render        ← D3-based SVG renderer for .well profiles
        ↓
apps/profiler          ← Nuxt 4 web app (ACTIVE)
apps/well-profiler     ← Next.js 15 web app (DEPRECATED — being replaced)

@welldot/lint          ← private, shared ESLint configs (no runtime deps)
```

All workspace deps are declared as `workspace:*` and resolved via pnpm symlinks.

---

## Package Architectures

### `@welldot/core` — Data model & validation

Single source of truth for the `.well` JSON format.

```
src/
  types/
    well.types.ts       ← root Well type + component types (BoreHole, Lithology, etc.)
    units.types.ts      ← UnitsTypes, LengthUnits, DiameterUnits, Units
    textures.ts         ← TextureCode, Texture
  validators/
    well.validators.ts  ← Zod schemas (one per type), WellSchema, parseWell()
  utils/
    well.utils.ts       ← serialize/deserialize, v1→v2 migration helpers
    fgdc.textures.ts    ← FGDC geological pattern code library
    units.ts            ← unit conversion utilities (m↔ft, mm↔in)
```

Key types from `well.types.ts` (v2 schema):

- `Well` — root: `{ version: 2, name, well_type, units, location?, well_id?, profiles, hydrodynamic_events?, aquifer_analysis?, history_logs?, ... }`
- `profiles` array contains per-profile data: `{ bore_hole[], well_case[], well_screen[], reduction[], surface_case[], hole_fill[], lithology[], fractures[], caves[], ... }`
- `Location` — `{ lat, lng, elevation?, properties? }` (replaces flat lat/lng/elevation in v1)
- `WellId` — `{ authority, id, primary? }`
- `HydrodynamicEvent` — union of pumping test event types: `ConstantRateEvent`, `StepDrawdownEvent`, `AirliftEvent`, `SpotMeasurementEvent`, `RecoveryOnlyEvent`
- `AquiferAnalysis` — Jacob analysis results (transmissivity, hydraulic conductivity, etc.)
- All depth-bearing components carry `{ from, to }` (in meters from ground) + component-specific fields

Key patterns:

- Runtime validation at deserialization boundary only (`parseWell()` / `deserializeWell()`)
- v1→v2 migration handled transparently in `deserializeWell()` (flat lat/lng → `location`, `fgdc_texture` → `texture`, `screen_slot_mm` → `screen_slot`)
- Legacy `convertProfileFromJSON()` / `profileToWell()` bridges for old pre-v1 format
- `EMPTY_WELL` constant for safe default initialization

---

### `@welldot/utils` — Profile analysis

Thin pure-function layer on top of `@welldot/core` types.

```
src/
  profile.utils.ts    ← all analysis helpers
  profile.utils.test.ts
```

Key functions:

**Depth & geometry:**
- `getProfileMaxDepth(well)` → `number`
- `getProfileLastItemsDepths(well)` → `{ [component]: number }` (max depth per component)
- `getProfileDiamValues(constructive)` → `number[]`
- `getConstructivePropertySummary(data, prop)` → extracted values across all constructive arrays
- `getEstimatedGravelPackVolume(...)` → `number`

**Hydrodynamic calculations (Jacob / Theis):**
- `calculateDrawdown(readingDepth, staticLevel)` → `number` (m)
- `calculateSpecificCapacity(flowRate, drawdown)` → `number` (m²/h)
- `calculateUnitDrawdown(drawdown, flowRate)` → `number` (h/m²)
- `calculateFormationLoss(jacobB, flowRate)` → `number` (m)
- `calculateWellLoss(jacobC, flowRate)` → `number` (m)
- `calculateHydraulicConductivity(transmissivity, aquiferThickness)` → `number` (m/h)

**Well data queries:**
- `getLatestStaticLevel(well)` → most recent static water level from `hydrodynamic_events`
- `getLatestAquiferAnalysisField(well, field)` → most recent value of named field from `aquifer_analysis`

---

### `@welldot/render` — D3 SVG visualization

Orchestrator + specialized renderer delegation pattern.

```
src/
  Renderer.ts            ← WellRenderer class (public API)
  renderers/             ← one file per visual component
    lithology.renderer.ts
    construction.renderer.ts
    construction-labels.renderer.ts
    fractures.renderer.ts
    caves.renderer.ts
    annotation-labels.renderer.ts
    unit-labels.renderer.ts
    highlights.renderer.ts
    legend.renderer.ts
  configs/
    render.configs.ts    ← DEFAULT_WELL_THEME, default RenderConfig
    render.classnames.ts ← BEM CSS class name constants
    render.textures.ts   ← texture fill pipeline
  types/
    render.types.ts      ← WellTheme, RenderConfig, DrawContext, SvgInstance, RenderableWell, WithKey
  utils/
    d3.utils.ts          ← D3 selection helpers
    format.utils.ts      ← formatLength(), formatDiameter(), unit conversion
    geometry.utils.ts    ← SVG path helpers (smooth curves, wavy contacts)
    key.utils.ts         ← stable D3 key generation (replaces coordinate-based keys)
    render.utils.ts      ← texture loading, tooltip population
    render.styles.ts     ← dynamic CSS string generation
    tooltips.utils.ts
    fgdcTextures.ts      ← FGDC texture importer
  data/
    fgdcTextures.json    ← FGDC pattern data consumed by textures.js
```

**Key types in `render.types.ts`:**

- `RenderableWell` — a well profile (single entry from `Well.profiles`) where every feature element may carry an optional `key?: string | number` for stable D3 data-join identity. When `key` is absent the renderer falls back to coordinate-based keys.
- `WithKey<T>` — `T & { key?: string | number }` (replaces former `WithId`)
- `Highlights` — per-component overlay config passed to `draw()`

**WellRenderer lifecycle:**

1. Constructor: configure `svgInstances[]`, `theme`, `renderConfig`, `units`
2. `prepareSvg()`: load FGDC textures, set up SVG containers, defs
3. `draw(profile)`: delegate to each specialized renderer with a `DrawContext`
4. `updateTheme()` / `updateRenderConfig()`: hot-swap config and redraw
5. `highlightLayers()` / `clearHighlights()`: layer selection API

**DrawContext** is a shared object passed to all renderers:

```typescript
{
  svg: SvgSelection;
  profile: Well;
  theme: WellTheme;
  config: RenderConfig;
  scale: d3.ScaleLinear;
  units: Units;
  textures: WellTextures;
}
```

**Multi-panel layout:** `svgInstances[]` supports multiple side-by-side SVG panels for long wells (split at configured depth breaks).

---

### `apps/profiler` — Nuxt 4 web app (active)

```
app/
  app.vue              ← root Vue component
  composables/         ← Vue composition utilities (auto-imported by Nuxt)
  core/                ← EventBus and app-level services
  plugins/             ← Nuxt plugin registrations
  theme/               ← PrimeVue theme config + Tailwind token overrides
  utils/               ← app-level utility helpers
  assets/
    icons/             ← custom Welldot icons
```

- **State**: Pinia stores (auto-imported via `@pinia/nuxt`)
- **EventBus**: custom event bus in `app/core/` for cross-component communication
- **UI theme**: PrimeVue 4 with `@primeuix/themes` + custom preset in `app/theme/`
- **Routing**: Nuxt file-based routing (`app/pages/` — scaffolded but empty at analysis time)
- **Deployment target**: Cloudflare Pages (`nuxt.config.ts` preset + `wrangler.json`)

---

## Data Flow

### Well rendering pipeline (libraries)

```
User loads .well JSON
        ↓
deserializeWell(json)  [core]
        ↓
parseWell(data)        [core — Zod validation]
        ↓
getProfileMaxDepth()   [utils — for scale setup]
        ↓
WellRenderer.draw(profile)   [render]
        ↓
DrawContext → specialized renderers → D3 SVG DOM mutations
```

### File format migration (legacy)

```
Old profile JSON format
        ↓
convertProfileFromJSON()  [core]
        ↓
profileToWell()           [core]
        ↓
Well (current schema)
```

---

## Build Architecture

All libraries use tsup with dual ESM+CJS output. Turbo orchestrates build order via `"dependsOn": ["^build"]`, ensuring `@welldot/core` builds before `@welldot/utils`, which builds before `@welldot/render`, before apps.

Path alias `~/*` → `./src/*` is configured in both tsconfig and tsup for the render package.
