# packages/core — @welldot/core

Foundation package. No internal monorepo dependencies. Everything in this package must be publishable, self-contained, and framework-agnostic.

## Purpose

Defines the canonical `.well` JSON schema: TypeScript types, Zod validators, and serialization utilities. All other packages and apps consume from here — changing a type or schema here has ripple effects across the entire monorepo.

## Source layout

```
src/
  index.ts                  ← public API (re-exports everything below)
  types/
    well.types.ts           ← TypeScript types for all .well entities
    units.types.ts          ← Units / measurement types
    textures.ts             ← Texture/TextureCode types for FGDC patterns
  validators/
    well.validators.ts      ← Zod schemas mirroring each type; parseWell()
  utils/
    well.utils.ts           ← Serialize/deserialize, profileToWell, isEmpty checks
    fgdc.textures.ts        ← FGDC_TEXTURES_OPTIONS mapping (code → label/pattern)
```

## Key domain concepts

- **`Well`** — root type; contains `geologic` (lithology, fractures, caves) and `constructive` (bore_hole, casing, screen, gravel pack, etc.) sections plus metadata.
- **`Profile`** — backward-compat alias for `Well`; used in the legacy Next.js app.
- All depth values are **meters from ground level** (0 = surface, increasing downward).
- All diameter values are **millimeters**.
- `parseWell()` returns a Zod-parsed `Well` and throws on invalid input — use it at system boundaries (file upload, API response).

## Commands

```bash
pnpm test       # vitest run
pnpm build      # tsup → dist/  (ESM + CJS + .d.ts)
pnpm dev        # tsup --watch
pnpm lint       # eslint
```

## Documentation requirements

This package ships three public doc files that must be kept in sync with the code. **Any change that touches types, validators, or FGDC textures requires updating the relevant doc files in the same commit.**

### `well-specifications.md`

Update when:
- A field is added, removed, or renamed on any type (`Well`, `BoreHole`, `WellCase`, `Lithology`, etc.)
- A field changes type, unit, or constraint (e.g. a `string` becomes a union, a value becomes required)
- A new top-level section or component type is introduced
- A vocabulary value (e.g. `well_type` recommended values) is added or changed

What to update: the relevant field table, example JSON snippet if it illustrates the changed field, and version notes if the change is breaking.

### `fgdc-textures.md`

Update when:
- A new texture code is added to `FGDC_TEXTURES_OPTIONS` in `src/utils/fgdc.textures.ts`
- A texture's `label` or `pending` status changes
- The series summary at the top (counts of available vs pending) changes

What to update: the row in the corresponding series table, and the summary counts in the preamble.

### `README.md`

Update when:
- A function or type is added to or removed from the public API (`src/index.ts`)
- Installation requirements change (new peer deps, Node version, etc.)
- A code example in the README no longer compiles against the current types

What to update: the relevant Quick Start example, the exports table if one exists, and any mention of the changed symbol.

## Constraints

- Zero runtime dependencies except `zod`. Do not add UI, D3, or framework deps here.
- All exports must go through `src/index.ts`.
- Validators must stay in sync with types — if you add a field to a type, add it to the Zod schema too.
- `well.utils.ts` is for serialization only, not analysis. Analysis lives in `@welldot/utils`.
