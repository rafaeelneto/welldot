# Testing Infrastructure

## Test Frameworks

**Unit/Integration:** Vitest 4.1.5
**E2E:** None configured
**Coverage:** Not configured (no `@vitest/coverage-*` in any package.json)

## Test Organization

**Location:** Co-located with source — `*.test.ts` files sit next to the code they test
**Naming:** `{module}.test.ts` (e.g., `well.utils.test.ts`, `profile.utils.test.ts`)
**Runner:** `vitest run` per package, orchestrated via `turbo test`

## Testing Patterns

### Unit Tests — library packages

**Packages:** `@welldot/core`, `@welldot/utils`, `@welldot/render`

**Approach:** Pure function unit tests. Input → assertion. No mocking of internal dependencies.

**Locations:**

- `packages/core/src/utils/well.utils.test.ts` — serialization/deserialization, legacy migration
- `packages/utils/src/profile.utils.test.ts` — depth/diameter/volume calculations
- `packages/render/src/utils/render.utils.test.ts` — texture utilities
- `packages/render/src/utils/render.styles.test.ts` — CSS generation functions

**Structure pattern:**

```typescript
describe('getProfileLastItemsDepths', () => {
  it('returns 0 for empty component arrays', () => {
    const result = getProfileLastItemsDepths(createEmptyWell());
    expect(result[0]).toBe(0);
  });
});
```

### DOM-dependent Tests — render package

**Config:** `packages/render/vitest.config.ts` sets environment to `jsdom`

**Approach:** Tests for functions that operate on or generate DOM/SVG strings use jsdom to provide a browser-like environment without a real browser.

## Test Execution

**Single package:**

```bash
cd packages/utils && pnpm test     # vitest run
cd packages/render && pnpm test
cd packages/core && pnpm test
```

**All packages (via Turbo):**

```bash
pnpm test
```

Turbo requires `^build` before `test`, so tests always run against built artifacts.

**Watch mode:** Not configured in scripts; run `vitest` (without `run`) manually for watch.

## Coverage Targets

**Current:** Not measured — no coverage tooling configured.
**Goals:** Not documented.
**Enforcement:** None — `prepublishOnly` runs tests but does not check coverage thresholds.

## Gaps

- No E2E or browser-level tests for the rendered SVG output
- `apps/profiler` (Nuxt) has no tests at all (scaffolded, not yet tested)
- `apps/well-profiler` (deprecated) had component tests that are not being carried forward
- No coverage gates — tests can pass with 0% coverage
- The main `WellRenderer` class and all renderer modules in `packages/render/src/renderers/` have no tests; only utility functions are covered
