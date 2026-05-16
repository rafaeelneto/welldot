# packages/utils — @welldot/utils

Profile analysis utilities. Depends on `@welldot/core`. No UI or rendering dependencies.

## Purpose

Provides computational helpers for analyzing `.well` profiles: depth calculations, diameter extraction, gravel pack estimates, and other derived data. Used by `@welldot/render` and by apps.

## Source layout

```
src/
  index.ts              ← re-exports everything from profile.utils.ts
  profile.utils.ts      ← all exported functions
  profile.utils.test.ts ← Vitest tests (comprehensive coverage)
```

## Key exports

| Function                                      | Purpose                                                               |
| --------------------------------------------- | --------------------------------------------------------------------- |
| `getProfileLastItemsDepths(well)`             | Max depth per component array (lithology, fractures, bore_hole, etc.) |
| `getProfileDiamValues(constructive)`          | All diameter values in a constructive section                         |
| `getPropertyFromConstructiveData(data, prop)` | Extract a named property from all constructive component arrays       |

All functions operate on `Well` / `Constructive` types from `@welldot/core`. No side effects, no state.

## Commands

```bash
pnpm test       # vitest run
pnpm build      # tsup → dist/
pnpm dev        # tsup --watch
```

## Documentation requirements

`packages/utils` has no README today. If one is added, it must be kept in sync. Until then, the `src/profile.utils.ts` JSDoc comments **are** the public documentation — keep them accurate.

Update JSDoc when:

- A function's parameter types or return type changes (update `@param` / `@returns`)
- A function's behavior changes in a way that would surprise a caller
- A new exported function is added — it must have a JSDoc block before merging

If a `README.md` is added to this package, update it whenever a function is added to or removed from `src/index.ts`.

## Constraints

- Pure functions only — no state, no side effects.
- Do not add rendering, DOM, or framework dependencies.
- Every exported function must have a corresponding Vitest test.
