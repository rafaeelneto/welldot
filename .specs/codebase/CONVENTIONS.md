# Code Conventions

## Naming Conventions

**Files:**

- `kebab-case` with domain suffix: `well.utils.ts`, `lithology.renderer.ts`, `render.configs.ts`
- Test files: `filename.test.ts` co-located alongside source
- Type files: `*.types.ts`
- Validator files: `*.validators.ts`
- Config files: `*.configs.ts`, `*.classnames.ts`
- Vue components: `PascalCase.vue` (e.g., `WellUploader.vue`)
- React components (deprecated app): `PascalCase.tsx`

**Types / Interfaces:**

- `PascalCase`, no `I` prefix
- Examples: `Well`, `BoreHole`, `DrawContext`, `RenderConfig`, `WellTheme`

**Functions:**

- `camelCase`, verb-noun pattern
- Examples: `parseWell`, `serializeWell`, `getProfileMaxDepth`, `formatLength`, `filterByDepth`

**Constants:**

- `SCREAMING_SNAKE_CASE`
- Examples: `EMPTY_WELL`, `DEFAULT_WELL_THEME`, `DEFAULT_RENDER_CONFIG`

**Variables:**

- `camelCase`; `_`-prefixed for intentionally unused params (ESLint exemption)

## File Structure

Consistent across all library packages:

```typescript
// 1. External imports
import * as d3 from 'd3';
import { defu } from 'defu';

// 2. Workspace package imports
import { type Well, isWellEmpty } from '@welldot/core';
import { getProfileMaxDepth } from '@welldot/utils';

// 3. Internal relative/alias imports
import { DrawContext } from '~/types/render.types';
import { DEFAULT_WELL_THEME } from './configs/render.configs';
```

Import order is enforced automatically by `prettier-plugin-organize-imports`.

## File Organization Within Source Files

Large files use separator comments for visual sections:

```typescript
// ─── Types ──────────────────────────────────────────────────────────────────

// ─── Helpers ─────────────────────────────────────────────────────────────────

// ─── Public API ──────────────────────────────────────────────────────────────
```

Each package exposes its public API exclusively through `src/index.ts` (barrel export). Internal modules are not re-exported.

## Type Safety

- `strict: true` across all packages — no implicit `any`, no loose null checks
- Generic utility types used: `DeepPartial<T>` (in render) for optional config merging
- Runtime validation only at JSON deserialization boundary (`parseWell()` / `deserializeWell()`)
- Type exports via barrel (`index.ts`) — importers get types from `@welldot/core`, not internal paths
- Path alias `~/*` → `./src/*` in the render package (both tsconfig and tsup)
- Path alias `@/*` → `./app/*` in the Nuxt app

## Comments & Documentation

- JSDoc for public functions: `@param`, `@returns`, `@example` where helpful
- Inline comments explain _why_, not _what_
- No multi-line block comments except JSDoc
- Section separators in large files (see above)

Example (from `profile.utils.ts`):

```typescript
/**
 * Returns the deepest recorded depth for each component array in a well profile.
 * @param profile - The well to inspect.
 * @returns Array of maximum depths indexed by component type.
 */
export function getProfileLastItemsDepths(profile: Well): number[] { ... }
```

## Error Handling

- Validation errors surface via Zod's `safeParse` / thrown `ZodError` at the deserialization boundary
- No defensive try/catch inside pure utility functions
- Rendering errors propagate naturally (D3 operations fail loudly in development)

## Prettier Config (`.prettierrc`)

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "arrowParens": "avoid",
  "endOfLine": "lf",
  "semi": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

## Vue-Specific (Nuxt app)

- `<script setup lang="ts">` — composition API, script-setup style
- Block order enforced by ESLint: `<script>` → `<template>` → `<style>`
- Multi-word component names required
- `defineProps` before `defineEmits`
- Nuxt auto-imports active: composables and utils in `app/composables/` and `app/utils/` are globally available without explicit imports

## ESLint Rules (summary)

- `no-var` — use `const`/`let`
- `prefer-template` — template literals over concatenation
- `eqeqeq` — strict equality
- `camelcase` — enforced at naming level
- `no-plusplus` — except in for-loop afterthoughts
- `react-hooks/rules-of-hooks` — error (deprecated app)
- `@typescript-eslint/no-unused-vars` — warn (underscore prefix exemption)
- `@typescript-eslint/no-explicit-any` — warn (off in Nuxt config for auto-import flexibility)
