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

**Any change that touches types, validators, or FGDC textures requires updating the relevant doc files in the same commit.**

### Doc layout

```
docs/
  spec/
    v1/
      well-format.md        ← v1 format spec (stable; update only for corrections)
    v2/
      overview.md           ← Changes from v1, Purpose, Design Principles, Known Limitations
      format-reference.md   ← Top-level fields, Datetime, Units, Precision, CRS/location/well_id/profiles,
                               Extensibility, Cross-reference & uniqueness rules
      object-schemas.md     ← All object schemas + hydrodynamic_events + aquifer_analysis +
                               history_logs + Complete Example JSON
      interoperability.md   ← JSON-LD Context, GWML2 relationship, Schema Validation
  schema/
    v1/                     ← stub; v1 schema TBD
    v2/
      well.schema.json      ← generated from src/validators/well.validators.ts via zod-to-json-schema;
                               mirrors welldot.org/schema/v2/well.schema.json — DO NOT hand-edit
      profiles/             ← stub for profile schemas (e.g. brazil-ana/v1/schema.json)
  reference/
    fgdc-textures.md        ← FGDC texture code reference (code → label, pending status)
  profiles/                 ← stub for future profile spec docs
```

### `docs/spec/v1/well-format.md`

Update only for corrections (factual errors, broken examples). This spec is stable and shipped; no additive changes belong here.

### `docs/spec/v2/overview.md`

Update when:
- A new known limitation is recognized.
- A design principle is revised during the ratification process.
- The "Changes from v1" section gains a new entry (e.g. v2.1 additions).

### `docs/spec/v2/format-reference.md`

Update when:
- A field is added, removed, or renamed on any top-level type (`Well`, `WellId`, `Location`, `LocationProperties`).
- The canonical unit of any field changes.
- A new precision field is added.
- The deprecation policy lifecycle rules change.
- Cross-reference or uniqueness rules change.

What to update: the relevant field table, the field-to-unit binding list if the field has a length/diameter/flow/time unit, and version notes if the change is breaking.

### `docs/spec/v2/object-schemas.md`

Update when:
- A field is added, removed, or renamed on any object type (`BoreHole`, `WellCase`, `Reduction`, `WellScreen`, `SurfaceCase`, `HoleFill`, `CementPad`, `Lithology`, `Texture`, `Fracture`, `Cave`, `PumpingStep`, `LevelReading`, `RecoveryPhase`, `AquiferAnalysis`, `HistoryLogEntry`, `Attachment`, or any `hydrodynamic_events` event type).
- A new event type is added to `hydrodynamic_events`.
- The Complete Example JSON no longer validates against the current types.

What to update: the field table for the changed type and the Complete Example JSON if the change affects it.

### `docs/schema/v2/well.schema.json`

Regenerate (do not hand-edit) after any change to `src/validators/well.validators.ts`. Generation command (once `zod-to-json-schema` is wired into the build):

```bash
pnpm generate:schema
```

### `docs/reference/fgdc-textures.md`

Update when:
- A new texture code is added to `FGDC_TEXTURES_OPTIONS` in `src/utils/fgdc.textures.ts`.
- A texture's `label` or `pending` status changes.
- The series summary at the top (counts of available vs pending) changes.

What to update: the row in the corresponding series table and the summary counts in the preamble.

### `README.md`

Update when:
- A function or type is added to or removed from the public API (`src/index.ts`).
- Installation requirements change (new peer deps, Node version, etc.).
- A code example in the README no longer compiles against the current types.

What to update: the relevant Quick Start example, the exports table, and any mention of the changed symbol.

## Constraints

- Zero runtime dependencies except `zod`. Do not add UI, D3, or framework deps here.
- All exports must go through `src/index.ts`.
- Validators must stay in sync with types — if you add a field to a type, add it to the Zod schema too.
- `well.utils.ts` is for serialization only, not analysis. Analysis lives in `@welldot/utils`.
