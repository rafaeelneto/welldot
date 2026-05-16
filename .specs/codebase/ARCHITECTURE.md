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
    well.utils.ts       ← serialize/deserialize, legacy format migration helpers
    fgdc.textures.ts    ← FGDC geological pattern code library
```

Key types from `well.types.ts`:

- `Well` — root profile: `{ id, name, units, constructive, geologic, ... }`
- `Constructive` — `{ bore_hole[], well_case[], reduction[], well_screen[], surface_case[] }`
- `Geologic` — `{ lithology[], fractures[], caves[] }`
- All depth-bearing components carry `{ depth_from, depth_to }` + component-specific fields

Key patterns:

- Runtime validation at deserialization boundary only (`parseWell()` / `deserializeWell()`)
- Legacy migration handled in `well.utils.ts` (`profileToWell`, `convertProfileFromJSON`)
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

- `getProfileMaxDepth(profile)` → `number`
- `getProfileLastItemsDepths(profile)` → `number[]` (max depth per component array)
- `getProfileDiamValues(constructionData)` → `number[]`
- `getConstructivePropertyValues<T>(constructive, key)` → `T[]`
- `getEstimatedGravelPackVolume(...)` → `number`

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
    render.types.ts      ← WellTheme, RenderConfig, DrawContext, SvgInstance
  utils/
    d3.utils.ts          ← D3 selection helpers, stable layer keys
    format.utils.ts      ← formatLength(), formatDiameter(), unit conversion
    geometry.utils.ts    ← SVG path helpers (smooth curves, wavy contacts)
    render.utils.ts      ← texture loading, tooltip population
    render.styles.ts     ← dynamic CSS string generation
    tooltips.utils.ts
    fgdcTextures.ts      ← FGDC texture importer
```

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
