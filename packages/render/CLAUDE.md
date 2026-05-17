# packages/render — @welldot/render

D3-based SVG visualization engine for geological well profiles. Depends on `@welldot/core` and `@welldot/utils`.

## Purpose

Renders `.well` profile data into an SVG element. Consumers instantiate `Renderer`, call `draw()` with a `Well` and a config, and the library mutates a provided DOM container. Used by both apps.

Supports `.well` format v2 only. Consumers must normalize older files with `deserializeWell()` from `@welldot/core` before calling `draw()`.

## Source layout

```
src/
  index.ts                          ← public API
  Renderer.ts                       ← main class; orchestrates all sub-renderers
  types/
    render.types.ts                 ← RenderConfig, WellTheme, DrawContext, Highlights, etc.
  configs/
    render.configs.ts               ← DEFAULT_WELL_THEME, INTERACTIVE_RENDER_CONFIG
    render.textures.ts              ← texture setup (textures.js integration)
    render.classnames.ts            ← CSS class name constants
  renderers/                        ← one file per visual layer
    lithology.renderer.ts
    construction.renderer.ts
    construction-labels.renderer.ts
    fractures.renderer.ts
    caves.renderer.ts
    highlights.renderer.ts
    legend.renderer.ts
    unit-labels.renderer.ts
    annotation-labels.renderer.ts
  utils/
    d3.utils.ts
    format.utils.ts
    geometry.utils.ts
    key.utils.ts
    render.utils.ts                 ← filterByDepth, populateTooltips, preloadFgdcTextures
    render.styles.ts                ← buildSvgStyleBlock (inlined CSS)
    tooltips.utils.ts
  data/
    fgdcTextures.json               ← FGDC pattern data used by textures.js
```

## Key API

```ts
import { Renderer } from '@welldot/render';

const renderer = new Renderer(containerEl, options);
renderer.draw(well, renderConfig, highlights);
renderer.clear();
```

- `RenderConfig` (deep-partial) controls which layers are visible, label formats, depth range, units, etc.
- `WellTheme` controls colors, stroke widths, and pattern fills.
- `Highlights` overlays colored depth-range bands — one optional array per component type.

## Commands

```bash
pnpm test       # vitest run
pnpm build      # tsup → dist/
pnpm dev        # tsup --watch
```

## Documentation requirements

`packages/render` ships a `README.md` that must stay in sync with the public API. **Any change that affects the renderer's public surface requires updating `README.md` in the same commit.**

### `README.md`

Update when:

- The `Renderer` constructor signature changes (new options, changed defaults)
- `draw()`, `clear()`, or any other public method changes its signature or behavior
- A new `RenderConfig` or `WellTheme` option is added, removed, or renamed
- The `Highlights` type gains or loses a component key
- A new renderer layer (new file in `renderers/`) is added and becomes user-configurable
- The install instructions or peer-dep requirements change

What to update: the Quick Start example if it no longer compiles, the options/config section, and any renderer feature list that mentions the changed layer or option.

## Constraints

- The renderer mutates a DOM node — it is not SSR-safe. In Next.js/Nuxt use dynamic imports or client-only wrappers.
- Import the full `d3` bundle (known perf trade-off, tracked as TODO in `Renderer.ts:1`).
- `textures.js` and `d3-tip` are runtime deps; do not remove them.
- `sanitize-html` is used before injecting any user-supplied strings into SVG.
- All sub-renderers receive a `DrawContext` (scales, groups, config) — do not pass the raw `Well` to them directly.
- Only `.well` v2 (`version: 2`) is supported. v1 files must be normalized via `deserializeWell()` from `@welldot/core` before rendering.
