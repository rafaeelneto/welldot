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
    units.ts                ← Unit conversions (incl. water quality import helpers)
    fgdc.textures.ts        ← FGDC_TEXTURES_OPTIONS mapping (code → label/pattern)
  vocab/
    waterQuality.vocab.ts   ← WATER_QUALITY_PARAMETERS (98 welldot codes, versioned), getParameterDefinition,
                               parameterKey, isKnownParameter
    waterQuality.limits.ts  ← Limit sets (WHO_GDWQ_2022, BR_GM_MS_888_2021, EU_2020_2184), getLimitSet
```

## Key domain concepts

- **`Well`** — root type; contains `geologic` (lithology, fractures, caves) and `constructive` (bore_hole, casing, screen, gravel pack, etc.) sections plus metadata, the event/analysis/log blocks, and (since v2.3) root `attachments`, `pump_installations`, `permits`, `meters`, `production`, `operating_regime` and `water_samples`.
- **Block kinds** (v2.3) — `hydrodynamic_events`, `production` and `water_samples` are ledgers (corrected via `corrects`, never edited); `history_logs`, `permits` (incl. their `history` and condition `fulfillments`) and `operating_regime` are mutable records; `Permit.status` is a closed administrative vocabulary (absent = `granted`) and `identifier`/`request_identifier` are optional verbatim strings; `pump_installations` and `meters` are installation blocks (`installed_at`/`removed_at`). Permit dates are calendar dates (`YYYY-MM-DD`) and condition offsets are ISO 8601 date durations (`P90D`); everything else is an RFC 3339 instant. `production` is a discriminated union (`meter_reading` | `declared_volume`, `x-` types pass through); register values and volumes are m³ and totals are never stored. `history_logs` category-specific fields are flat optional fields on `HistoryLogEntry`: `maintenance` (`maintenance_type`, `pump_installation_id`, `meter_id`, `event_id`), `status_change` (`status`); permit condition fulfillment is not a log category, it lives in `permits[].conditions[].fulfillments`. Derivations that honor these rules (current pump, retracted events/production, permit status, condition deadlines, meter volumes, current regime, current well status, operation warnings) live in `@welldot/utils`.
- **Water quality** (v2.3) — `water_samples` is a ledger (corrected via `corrects`) of `WaterSample`s, each with ≥1 `WaterQualityResult`. A result has exactly one of `value`/`presence`/`text` (none only with `qualifier: 'not_detected'`); parameters are `{ code, vocabulary }` with `welldot` | `cas` | `x-…`, and `unit` exists only for `x-` codes (the unit of `welldot`/`cas` codes comes from the vocabulary; substances are always mg/L). `depth` is exclusive with `from`/`to`; `*_resolution` is the literal `'day'`. The vocabulary (`src/vocab/waterQuality.vocab.ts`) is versioned data — bump `WATER_QUALITY_VOCABULARY_VERSION` when codes change and update the vocabulary table in `docs/spec/v2/water-quality.md`. Limit sets (`src/vocab/waterQuality.limits.ts`) are display-time data, never written to files; their values must be verified against the official sources. `HistoryLogEntry.sample_id` (on `maintenance`) and `ConditionFulfillment.sample_id` link to a sample. `SectionKey` includes `'water_quality'` (redacted by `redactWell`). Derivations (ion balance, RPD, holding times, exceedances, warnings) live in `@welldot/utils`.
- **New top-level blocks** must be mapped explicitly in `decodeV2Well`, `serializeWell` (which whitelists fields) and `redactWell`.
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
      water-quality.md      ← water_samples schemas, result rules, recommended values, unit rules,
                               parameter vocabulary table, regulatory profiles (since v2.3)
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
- A minor revision ships: add a "Changes in v2.x" section at the top (latest first), with additions, clarifications and deprecations (see v2.3, v2.1).

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

- A field is added, removed, or renamed on any object type (`BoreHole`, `WellCase`, `Reduction`, `WellScreen`, `SurfaceCase`, `HoleFill`, `Centralizer`, `CementPad`, `Lithology`, `Texture`, `Fracture`, `Cave`, `PumpingStep`, `LevelReading`, `RecoveryPhase`, `AquiferAnalysis`, `HistoryLogEntry`, `Attachment`, `PumpInstallation`, `PumpElectrical`, `Permit`, `PermitCondition`, `PermitHistoryEntry`, `ConditionFulfillment`, `VolumeLimit`, `MonthlyGrant`, `Meter`, `MeterReading`, `DeclaredVolume`, `OperatingRegime`, or any `hydrodynamic_events` event type).
- A new event type is added to `hydrodynamic_events`.
- The Complete Example JSON no longer validates against the current types.

What to update: the field table for the changed type and the Complete Example JSON if the change affects it.

### `docs/spec/v2/water-quality.md`

Update when:

- A field is added, removed, or renamed on `WaterSample`, `SamplingPoint`, `Purge`, `PurgeReading`, `Laboratory`, `WaterQualityResult`, `Parameter`, `Filtration` or `ResultValidation`.
- A code is added to or changed in `WATER_QUALITY_PARAMETERS` (keep the vocabulary table in sync and bump `WATER_QUALITY_VOCABULARY_VERSION`).
- A water quality validation rule, recommended value or unit rule changes.

Cross-cutting rows (datetime, canonical units, cross-references, precision) stay in `format-reference.md`; the Complete Example stays in `object-schemas.md`.

### `docs/schema/v2/well.schema.json`

Regenerate (do not hand-edit) after any change to `src/validators/well.validators.ts`. CI (`publish-core.yml`) fails when the committed schema is stale:

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
