# Codebase Concerns

**Analysis Date:** 2026-05-10

## Tech Debt

**Legacy migration code in `@welldot/core`:**

- Issue: `convertProfileFromJSON()` and `profileToWell()` in `packages/core/src/utils/well.utils.ts` are compatibility bridges for an old format. The `.well` schema has also carried over a typo tolerance (`"bole_hole"` alongside `"bore_hole"`) and a legacy field alias (`diam_pol` → `diameter`).
- Files: `packages/core/src/utils/well.utils.ts`
- Why: Forward-compatibility for existing user-saved files in the old profile format.
- Impact: Schema complexity; validators must handle both spellings; unit tests must cover both paths.
- Fix approach: Once a migration tool is shipped that upgrades files in-place, these compatibility shims can be removed with a major version bump of `@welldot/core`.

**`apps/well-profiler/src_old/`:**

- Issue: Legacy Next.js code sitting in `src_old/` — not deleted, not actively migrated.
- Files: `apps/well-profiler/src_old/`
- Why: Progressive migration; parts may still be referenced for reference during Nuxt rewrite.
- Impact: Cognitive overhead; risk of someone accidentally using old patterns.
- Fix approach: Delete once Nuxt app reaches feature parity. Do not touch `src_old/` for any new development.

**`apps/well-profiler` (deprecated Next.js app):**

- Issue: Fully deprecated app still present in the monorepo. Its `turbo.json` tasks (build, lint, test) still run in CI as part of `turbo build` / `turbo test`.
- Files: `apps/well-profiler/`
- Impact: CI time, developer confusion, risk of cross-contamination with new patterns.
- Fix approach: Once Nuxt app is in production, remove `apps/well-profiler` from the workspace and monorepo entirely.

---

## Fragile Areas

**`WellRenderer` + specialized renderers (no test coverage):**

- Files: `packages/render/src/Renderer.ts`, `packages/render/src/renderers/*.renderer.ts`
- Why fragile: All D3 rendering logic is untested. Changes to scale calculations, data joins, or depth math can silently produce incorrect visual output.
- Common failures: Depth scale misalignment when `profile` has unusual depth ranges; stable key collisions when layer order changes.
- Safe modification: Run the app manually against edge-case `.well` files (empty profiles, single-layer profiles, very deep wells, negative depths) after any renderer change.
- Test coverage: Only utility functions (`render.utils`, `render.styles`, `d3.utils`) have tests. The main renderer and all component renderers are untested.

**FGDC texture loading (async, order-dependent):**

- Files: `packages/render/src/utils/fgdcTextures.ts`, `packages/render/src/configs/render.textures.ts`
- Why fragile: `prepareSvg()` must be called before `draw()` — textures must be loaded into D3 `<defs>` first. If the call order is wrong, patterns silently fall back to solid fills.
- Safe modification: Any refactor of the renderer lifecycle must preserve the `prepareSvg → draw` order. Consider adding a guard/assertion in `draw()` that throws if textures have not been loaded.

---

## Test Coverage Gaps

**`@welldot/render` — all rendering logic:**

- What's not tested: `WellRenderer.draw()`, all files in `renderers/`, scale calculations, multi-panel layout logic, `highlightLayers()`.
- Risk: Silent visual regressions on any geometry or D3 data-join change.
- Priority: High
- Difficulty: Medium — requires jsdom + SVG query assertions or snapshot testing; D3 operates on real DOM nodes.

**`apps/profiler` — zero test coverage:**

- What's not tested: All Vue composables, Pinia stores, EventBus, theme configuration.
- Risk: Regressions in app-level state management and UI behavior go undetected.
- Priority: Medium (app is early-stage scaffolding)
- Difficulty: Low-medium — Vitest + `@nuxt/test-utils` would cover composables and stores.

**Zod validators — missing edge cases:**

- What's not tested: `parseWell()` with malformed or partial payloads; boundary values for `depth_from`/`depth_to`; negative depths.
- Files: `packages/core/src/validators/well.validators.ts`
- Risk: Invalid `.well` files could produce runtime errors downstream in the renderer rather than clean validation errors at the boundary.
- Priority: Medium
- Difficulty: Low — pure function, no DOM needed.

---

## Dependencies at Risk

**`d3-tip` (0.9.1):**

- Risk: Unmaintained since 2020; last release is `0.9.1`. Not compatible with D3 v7's module system without shims.
- Impact: Tooltips in the renderer break if D3 is upgraded past v7 or if Node/bundler requirements tighten.
- Migration plan: Replace with a custom tooltip implementation using D3 v7's built-in `selection.on('mouseover')` or a lightweight alternative. The surface area is small — only `tooltips.utils.ts` and the construction renderer use it.

**`textures.js` (1.2.3):**

- Risk: Low-activity library. Core to the FGDC geological pattern fills — if it becomes incompatible with a future D3 or bundler version, all texture fills break.
- Impact: Loss of FGDC pattern rendering; affected files: `packages/render/src/configs/render.textures.ts`.
- Migration plan: If abandoned, the FGDC patterns could be reimplemented as inline SVG `<pattern>` elements in `render.textures.ts`, removing the dependency.

---

## Missing Critical Features

**PDF export in `apps/profiler`:**

- Problem: The deprecated Next.js app had PDF export via jsPDF/pdfmake. The new Nuxt app has no equivalent.
- Current workaround: Users must use the old app or browser print.
- Blocks: Production-readiness of the Nuxt migration.
- Implementation complexity: Medium — jsPDF works in the browser; the render package outputs SVG which can be rasterized. A Nuxt-compatible PDF export module needs to be designed.

**Well file import/upload UI:**

- Problem: `apps/profiler` is scaffolded but has no UI for loading `.well` files yet. Pages directory appears empty at analysis time.
- Blocks: Core user flow (loading a well profile for visualization).
- Implementation complexity: Low-medium — composable for file reading + Pinia store integration.

---

_Concerns audit: 2026-05-10_
_Update as issues are fixed or new ones discovered_
