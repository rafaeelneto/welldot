# @welldot/core

[![npm version](https://img.shields.io/npm/v/@welldot/core.svg)](https://www.npmjs.com/package/@welldot/core)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178c6.svg)](https://www.typescriptlang.org/)

TypeScript types, Zod validators, and serialization utilities for the `.well` open format — a JSON-based standard for representing water well data.

## What is `.well`?

`.well` is an open file format for encoding the complete record of a water well as a single, self-describing JSON document. A `.well` file contains:

- **Constructive data** — borehole geometry, casing strings, screens, reducers, gravel packs, centralizers, and cement pads
- **Geologic data** — lithological column, discrete fractures, and cave zones
- **Administrative metadata** — well identity, construction type and purpose (`well_type`, `well_purpose`), authority-scoped IDs (`well_id`), driller, construction date, and geographic coordinates with explicit CRS
- **Hydrodynamic events** — append-only ledger of static level readings, pumping tests (constant-rate, step-drawdown, airlift), and recovery phases
- **Aquifer analysis** — interpreted parameter sets: transmissivity, specific capacity, storativity, and Jacob loss coefficients
- **Operational history** — timestamped log of maintenance, inspections, incidents, status changes and permit condition fulfillment, with HTTPS attachment references
- **Pump installations** — installation history of the well's pumps: nameplate data, intake depth, riser and electrical data (v2.3)
- **Permits** — legal instruments governing abstraction (outorgas): validity, granted flow and daily operating time, volume limits, monthly schedule, and conditions (condicionantes) whose deadlines are derived from ISO 8601 date durations, with their fulfillments, an administrative status (requested, suspended…) and an administrative history (v2.3)
- **Meters, production and operating regime** — totalizer (hidrômetro) installation history, an append-only production ledger of meter readings and declared volumes (volumes are derived, never stored as totals), and the declared operating regime in force from a given instant (v2.3)
- **Water quality** — a `water_samples` ledger of samples, each with its field and laboratory results, sampling point and depth, purge and stabilization readings, laboratory and chain of custody, field QA/QC (duplicates, splits, blanks), per-result filtration, lab flags and data validation. Parameters are identified by `{ code, vocabulary }` against a versioned vocabulary of 98 `welldot` codes (plus CAS numbers and `x-` codes), and units come from the code. Limits are never stored in the file (v2.3)
- **Attachments** — HTTPS-referenced files typed by `document_type`: a root-level `attachments` array for general files about the well (e.g. the drilling report), plus per-record attachments on pumps, events, analyses and log entries. The root array does not collect the per-record ones (v2.3)

The format is designed for three use cases: visualization of technical well profiles, registration with regulatory bodies, and hydrogeological research.

See the [v2 format specification](./docs/spec/v2/overview.md) (current revision: v2.3) for the complete schema reference and design rationale. The [v1 spec](./docs/spec/v1/well-format.md) remains available for reference.

## Installation

```bash
# npm
npm install @welldot/core

# pnpm
pnpm add @welldot/core

# yarn
yarn add @welldot/core
```

**Requirements:** Node.js >= 18. [`zod`](https://zod.dev) is bundled as a dependency.

## Quick Start

```typescript
import type { Well, BoreHole, Lithology } from '@welldot/core';
import {
  WellSchema,
  parseWell,
  serializeWell,
  deserializeWell,
  isWellEmpty,
} from '@welldot/core';

// Parse and validate a .well JSON string — throws ZodError on invalid input
const well = parseWell(rawJsonString);

// Validate an existing object with the Zod schema directly
const result = WellSchema.safeParse(unknownData);

// Serialize a Well object to a versioned JSON string
const jsonString = serializeWell(well);

// Deserialize — handles versioned format and legacy formats
const restored = deserializeWell(jsonString);

// Check if a well contains any data
const empty = isWellEmpty(well);
```

## API Reference

### Types

All types are exported as TypeScript type-only exports (zero runtime cost).

| Type                              | Description                                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `Well`                            | Complete static record of a water well (v2)                                                                        |
| `BoreHole`                        | A drilled interval with diameter and optional drilling method                                                      |
| `WellCase`                        | Steel or plastic casing installed in the borehole                                                                  |
| `Reduction`                       | Transition piece between different casing diameters                                                                |
| `WellScreen`                      | Slotted screen section for water intake (`screen_slot` in mm)                                                      |
| `WellStatus`                      | Closed `status_change` vocabulary: `active`, `maintenance`, `inactive`, `decommissioned`, `abandoned` (v2.3)       |
| `SurfaceCase`                     | Protective casing near the surface                                                                                 |
| `HoleFill`                        | Annular fill material (`gravel_pack` or `seal`)                                                                    |
| `CementPad`                       | Concrete wellhead pad dimensions                                                                                   |
| `Centralizer`                     | Casing/screen centralizers over a depth interval with spacing (v2.1)                                               |
| `Lithology`                       | Geological description of a depth interval                                                                         |
| `Texture`                         | `{ code: string \| number; vocabulary?: string }` — lithology texture reference                                    |
| `Fracture`                        | A discrete fracture or fracture zone                                                                               |
| `Cave`                            | A cavity or void zone                                                                                              |
| `Constructive`                    | Grouped type: borehole + casings + screens + fills                                                                 |
| `Geologic`                        | Grouped type: lithology + fractures + caves                                                                        |
| `WellId`                          | Authority-scoped well identifier `{ authority, id, primary? }`                                                     |
| `Location`                        | Geographic location with optional elevation and CRS properties                                                     |
| `LocationProperties`              | CRS, datum, and precision metadata for a `Location`                                                                |
| `LevelReading`                    | A single depth/time reading during a pumping or recovery phase                                                     |
| `RecoveryPhase`                   | Time-series of level readings after pump shutdown                                                                  |
| `PumpingStep`                     | One flow-rate step in a pumping test                                                                               |
| `HydrodynamicEventBase`           | Common fields shared by all hydrodynamic event types                                                               |
| `SpotMeasurementEvent`            | A single static water level reading                                                                                |
| `ConstantRateEvent`               | A constant-rate pumping test                                                                                       |
| `StepDrawdownEvent`               | A step-drawdown pumping test                                                                                       |
| `AirliftEvent`                    | An air-lift development or test                                                                                    |
| `RecoveryOnlyEvent`               | Recovery measurements without drawdown data                                                                        |
| `HydrodynamicEvent`               | Discriminated union of all event types + x- custom events                                                          |
| `AquiferAnalysis`                 | An interpreted set of aquifer parameters                                                                           |
| `Attachment`                      | An HTTPS-referenced document, typed by `document_type` (common type since v2.3)                                    |
| `PumpInstallation`                | One installation of a pump in the well (v2.3)                                                                      |
| `PumpElectrical`                  | Electrical data of a pump installation (v2.3)                                                                      |
| `Permit`                          | A legal instrument governing abstraction — outorga, dispensa, cadastro (v2.3)                                      |
| `PermitAdministrativeStatus`      | `'requested' \| 'granted' \| 'suspended' \| 'revoked' \| 'denied' \| 'withdrawn'` (v2.3)                           |
| `PermitHistoryEntry`              | One administrative step of a permit: filing, process, notification, fee (v2.3)                                     |
| `PermitCondition`                 | An obligation (condicionante) of a permit, with derived deadlines and its `fulfillments` (v2.3)                    |
| `ConditionFulfillment`            | The record of one condition deadline being met (v2.3)                                                              |
| `VolumeLimit`                     | A volume stated in a permit for a daily, monthly or annual period (v2.3)                                           |
| `MonthlyGrant`                    | One month of a permit's month-by-month grant (v2.3)                                                                |
| `Meter`                           | One installation of a totalizer (hidrômetro) in the well (v2.3)                                                    |
| `ProductionEntryBase`             | Common fields of every `production` ledger entry (v2.3)                                                            |
| `MeterReading`                    | A totalizer register value in m³ (`type: 'meter_reading'`) (v2.3)                                                  |
| `DeclaredVolume`                  | A volume declared for a period, without a meter (`type: 'declared_volume'`) (v2.3)                                 |
| `ProductionEntry`                 | `MeterReading \| DeclaredVolume` — one entry of the `production` ledger (v2.3)                                     |
| `OperatingRegime`                 | Declared flow rate, daily operating time and days per week from `effective_from` (v2.3)                            |
| `WaterSample`                     | One water sample and its results; `water_samples` is a ledger corrected with `corrects` (v2.3)                     |
| `SamplingPoint`                   | Where the sample was taken: `type`, point `depth` or `from`/`to` interval, `device`, `pump_installation_id` (v2.3) |
| `Purge`                           | Purge before collection: duration, volume, flow rate, stabilization and readings (v2.3)                            |
| `PurgeReading`                    | One stabilization reading during the purge (v2.3)                                                                  |
| `Laboratory`                      | Laboratory, accreditation, report number, batch, receipt instant and temperature (v2.3)                            |
| `WaterQualityResult`              | One result: exactly one of `value`, `presence` or `text`, plus qualifier, limits, fraction, validation (v2.3)      |
| `ResultQualifier`                 | `'<' \| '>' \| 'not_detected' \| 'estimated'` (v2.3)                                                               |
| `Parameter`                       | `{ code; vocabulary }` — `welldot`, `cas` or `x-…` parameter identity (v2.3)                                       |
| `Filtration`                      | Filter `pore_size` (µm) and `location` (`field` \| `lab`) (v2.3)                                                   |
| `ResultValidation`                | Reviewer validation: `status` (`unvalidated`, `validated`, `qualified`, `rejected`), qualifier, guideline (v2.3)   |
| `TimeResolution`                  | `'day'` — marks an instant known only by its date (`*_resolution` fields) (v2.3)                                   |
| `HistoryLogEntry`                 | One entry in the operational history log (incl. `maintenance` and `status_change` fields, and `sample_id`)         |
| `Units`                           | `{ length; diameter; flow?; power?; volume? }` — display/input unit preferences                                    |
| `LengthUnits`                     | `'m' \| 'ft'`                                                                                                      |
| `DiameterUnits`                   | `'mm' \| 'inches'`                                                                                                 |
| `FlowUnits`                       | `'m3/h' \| 'L/s' \| 'gpm'`                                                                                         |
| `PowerUnits`                      | `'kW' \| 'cv' \| 'hp'`                                                                                             |
| `VolumeUnits`                     | `'m3' \| 'L' \| 'ft3' \| 'gal'` (`gal` is the US gallon)                                                           |
| `UnitsTypes`                      | `'metric' \| 'imperial'`                                                                                           |
| `TextureType`                     | `{ code: TextureCode; label: string }` — a single FGDC texture entry (lookup)                                      |
| `TextureCode`                     | `number \| string` — numeric FGDC code or custom string code                                                       |
| `SectionKey`                      | Section of a well for share visibility / redaction (includes `'water_quality'` since v2.3)                         |
| `ParameterDefinition`             | One vocabulary entry: code, group, EN label, translations, unit, value form, CAS, molar mass, charge (v2.3)        |
| `ParameterGroup`                  | Vocabulary group (`physical`, `major_ion`, `metal`, `microbiology`, …) (v2.3)                                      |
| `ParameterForm`                   | `'value' \| 'presence' \| 'text'` (v2.3)                                                                           |
| `ParameterUnit`                   | `{ symbol; ucum? }` — canonical unit of a parameter (v2.3)                                                         |
| `LimitSet`, `Limit`, `LimitBasis` | A jurisdiction limit set and its per-code limits (v2.3)                                                            |
| `ConcentrationUnits`              | `'mg/L' \| 'ug/L' \| 'ng/L' \| 'g/L'` (v2.3)                                                                       |

### Validators

Each schema validates its corresponding type at runtime. All schemas are Zod objects and compose with standard Zod methods (`.parse`, `.safeParse`, `.extend`, etc.).

| Export                             | Validates                                                                                                                                                         |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `WellSchema`                       | `Well` (the complete document; `.passthrough()` preserves unknown keys)                                                                                           |
| `BoreHoleSchema`                   | `BoreHole`                                                                                                                                                        |
| `WellCaseSchema`                   | `WellCase`                                                                                                                                                        |
| `ReductionSchema`                  | `Reduction`                                                                                                                                                       |
| `WellScreenSchema`                 | `WellScreen`                                                                                                                                                      |
| `WellStatusSchema`                 | `WellStatus` (z.enum — any other value is rejected)                                                                                                               |
| `SurfaceCaseSchema`                | `SurfaceCase`                                                                                                                                                     |
| `HoleFillSchema`                   | `HoleFill`                                                                                                                                                        |
| `CementPadSchema`                  | `CementPad`                                                                                                                                                       |
| `CentralizerSchema`                | `Centralizer`                                                                                                                                                     |
| `LithologySchema`                  | `Lithology`                                                                                                                                                       |
| `TextureSchema`                    | `Texture`                                                                                                                                                         |
| `FractureSchema`                   | `Fracture`                                                                                                                                                        |
| `CaveSchema`                       | `Cave`                                                                                                                                                            |
| `WellIdSchema`                     | `WellId`                                                                                                                                                          |
| `LocationPropertiesSchema`         | `LocationProperties`                                                                                                                                              |
| `LocationSchema`                   | `Location`                                                                                                                                                        |
| `LevelReadingSchema`               | `LevelReading`                                                                                                                                                    |
| `RecoveryPhaseSchema`              | `RecoveryPhase`                                                                                                                                                   |
| `PumpingStepSchema`                | `PumpingStep`                                                                                                                                                     |
| `HydrodynamicEventBaseSchema`      | `HydrodynamicEventBase`                                                                                                                                           |
| `SpotMeasurementEventSchema`       | `SpotMeasurementEvent`                                                                                                                                            |
| `ConstantRateEventSchema`          | `ConstantRateEvent`                                                                                                                                               |
| `StepDrawdownEventSchema`          | `StepDrawdownEvent`                                                                                                                                               |
| `AirliftEventSchema`               | `AirliftEvent`                                                                                                                                                    |
| `RecoveryOnlyEventSchema`          | `RecoveryOnlyEvent`                                                                                                                                               |
| `HydrodynamicEventSchema`          | `HydrodynamicEvent` (discriminated union + x- passthrough)                                                                                                        |
| `AquiferAnalysisSchema`            | `AquiferAnalysis`                                                                                                                                                 |
| `AttachmentSchema`                 | `Attachment`                                                                                                                                                      |
| `PumpInstallationSchema`           | `PumpInstallation`                                                                                                                                                |
| `PumpElectricalSchema`             | `PumpElectrical`                                                                                                                                                  |
| `PermitSchema`                     | `Permit`                                                                                                                                                          |
| `PermitConditionSchema`            | `PermitCondition`                                                                                                                                                 |
| `ConditionFulfillmentSchema`       | `ConditionFulfillment`                                                                                                                                            |
| `PermitHistoryEntrySchema`         | `PermitHistoryEntry`                                                                                                                                              |
| `PermitAdministrativeStatusSchema` | `PermitAdministrativeStatus`                                                                                                                                      |
| `VolumeLimitSchema`                | `VolumeLimit`                                                                                                                                                     |
| `MonthlyGrantSchema`               | `MonthlyGrant`                                                                                                                                                    |
| `MeterSchema`                      | `Meter` (`max_reading` > 0)                                                                                                                                       |
| `ProductionEntryBaseSchema`        | `ProductionEntryBase`                                                                                                                                             |
| `MeterReadingSchema`               | `MeterReading`                                                                                                                                                    |
| `DeclaredVolumeSchema`             | `DeclaredVolume`                                                                                                                                                  |
| `ProductionEntrySchema`            | `ProductionEntry` (discriminated union + x- passthrough; a known type missing required fields is rejected)                                                        |
| `OperatingRegimeSchema`            | `OperatingRegime` (`daily_operating_time` 0–24, integer `days_per_week` 1–7)                                                                                      |
| `HistoryLogEntrySchema`            | `HistoryLogEntry`                                                                                                                                                 |
| `WaterSampleSchema`                | `WaterSample` (`results` must have at least one entry)                                                                                                            |
| `SamplingPointSchema`              | `SamplingPoint` (`depth` and `from`/`to` are mutually exclusive)                                                                                                  |
| `PurgeSchema`                      | `Purge`                                                                                                                                                           |
| `PurgeReadingSchema`               | `PurgeReading`                                                                                                                                                    |
| `LaboratorySchema`                 | `Laboratory`                                                                                                                                                      |
| `WaterQualityResultSchema`         | `WaterQualityResult` (exactly one value form except `not_detected`; `<`/`>`/`estimated` need `value`; `unit` required for `x-` and forbidden for `welldot`/`cas`) |
| `ResultQualifierSchema`            | `ResultQualifier` (z.enum)                                                                                                                                        |
| `ParameterSchema`                  | `Parameter` (`vocabulary` must be `welldot`, `cas` or `x-…`)                                                                                                      |
| `FiltrationSchema`                 | `Filtration`                                                                                                                                                      |
| `ResultValidationSchema`           | `ResultValidation` (closed `status` enum)                                                                                                                         |
| `TimeResolutionSchema`             | `TimeResolution` (`z.literal('day')`)                                                                                                                             |

### Functions

#### `parseWell(json: string): Well`

Parses a raw JSON string and validates it against `WellSchema`. Throws a `ZodError` on validation failure. Does not handle legacy formats — use `deserializeWell` for that.

#### `serializeWell(well: Well): string`

Serializes a `Well` object to a versioned `.well` JSON string (`"version": 2`). Emits `location` when set; does not emit deprecated flat `lat`/`lng`/`elevation`. Omits `undefined` optional fields.

#### `deserializeWell(jsonString: string): Well | null`

Parses and normalizes a JSON string into a `Well`. Handles multiple formats:

- v2 format (`"version": 2`) — passes v2-specific fields through directly
- v1 format (`"version": 1`) — applies v1→v2 normalizations: `fgdc_texture` → `texture`, `screen_slot_mm` → `screen_slot`, flat `lat/lng/elevation` → `location`
- Legacy formats with `constructive` / `geologic` sub-objects
- Legacy `diam_pol` inch diameters → `diameter` mm conversion (`× 25.4`)
- Typo `bole_hole` → `bore_hole` compatibility

Returns `null` if the parsed data is empty. Throws on unrecognized version numbers.

#### `isWellEmpty(well: Well | null | undefined): boolean`

Returns `true` when all constructive and geologic arrays are empty. Accepts `null` and `undefined` (both treated as empty).

#### Unit conversion

`.well` files always store canonical SI units; these helpers convert for display and input.

| Quantity          | Functions                                                                                                                                                                                            |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Length            | `metersToFeet`, `feetToMeters`                                                                                                                                                                       |
| Diameter          | `mmToInches`, `inchesToMm`, `slotNumberToMm`, `mmToSlotNumber`                                                                                                                                       |
| Flow              | `cubicMeterPerHourToLitersPerSecond`, `litersPerSecondToCubicMeterPerHour`, `cubicMeterPerHourToUsGallonsPerMinute`, `usGallonsPerMinuteToCubicMeterPerHour`, `flowFromCanonical`, `flowToCanonical` |
| Power             | `cvToKilowatts`, `kilowattsToCv`, `hpToKilowatts`, `kilowattsToHp`, `powerFromCanonical`, `powerToCanonical`                                                                                         |
| Volume            | `litersToCubicMeters`, `cubicMetersToLiters`, `cubicMetersToCubicFeet`, `cubicFeetToCubicMeters`, `cubicMetersToUsGallons`, `usGallonsToCubicMeters`, `volumeFromCanonical`, `volumeToCanonical`     |
| Time              | `minutesToHours`, `hoursToMinutes`                                                                                                                                                                   |
| Pressure          | `kilopascalToPsi`, `psiToKilopascal`                                                                                                                                                                 |
| Transmissivity    | `squareMeterPerSecondToSquareMeterPerDay`, `squareMeterPerDayToSquareMeterPerSecond`                                                                                                                 |
| Coordinates       | `decimalDegreesToDms`, `dmsToDecimalDegrees` (`DmsCoordinate`)                                                                                                                                       |
| Concentration     | `concentrationToCanonical`, `concentrationFromCanonical` (`ConcentrationUnits`: mg/L, µg/L, ng/L, g/L ↔ canonical mg/L) (v2.3)                                                                       |
| Conductivity      | `milliSiemensPerMeterToMicroSiemensPerCm` (×10), `milliSiemensPerCmToMicroSiemensPerCm` (×1000) (v2.3)                                                                                               |
| Lab report import | `turbidityCodeForUnit` (NTU/FNU/FAU/FTU/uT → turbidity code), `normalizeColorUnit` (mg Pt-Co/L, PCU, TCU → `uH`), `expandedToStandardUncertainty` (U / k → one-sigma `value_precision`) (v2.3)       |

`*FromCanonical(value, unit)` converts from the canonical unit (m³/h, kW, m³) to the given display unit; `*ToCanonical(value, unit)` converts back.

## Water Quality Vocabulary and Limit Sets _(v2.3)_

The `welldot` water quality parameter vocabulary is published as versioned data. Each `ParameterDefinition` carries the code, group, canonical English label, translations (`labels.pt`), canonical unit (display symbol and UCUM code), value form (`value`, `presence` or `text`), the CAS equivalence when one exists, and molar mass and charge for ions used in ion balance and hydrochemical diagrams.

| Export                             | Description                                                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `WATER_QUALITY_PARAMETERS`         | The 98 `welldot` parameter definitions                                                                              |
| `WATER_QUALITY_VOCABULARY_VERSION` | Version of the published vocabulary                                                                                 |
| `WATER_QUALITY_UNITS`              | Canonical units used by the vocabulary (`mg/L`, `µS/cm`, `°C`, `mV`, NTU/FNU/FAU/FTU, `uH`, MPN/CFU counts, `Bq/L`) |
| `getParameterDefinition(param)`    | Looks up a `{ code, vocabulary }`; a `cas` code resolves through the published equivalences to its `welldot` entry  |
| `parameterKey(param)`              | Canonical identity — a `welldot` code and its CAS equivalent produce the same key (duplicate detection, grouping)   |
| `isKnownParameter(param)`          | `false` only for a `welldot` code unknown to this vocabulary version (`cas` and `x-` are always accepted)           |
| `WHO_GDWQ_2022`                    | WHO Guidelines for Drinking-water Quality (2022)                                                                    |
| `BR_GM_MS_888_2021`                | Brasil — Portaria GM/MS 888/2021                                                                                    |
| `EU_2020_2184`                     | EU Drinking Water Directive 2020/2184                                                                               |
| `WATER_QUALITY_LIMIT_SETS`         | All bundled limit sets, in display order                                                                            |
| `getLimitSet(id)`                  | Finds a bundled limit set by `id` (`who_gdwq_2022`, `br_gm_ms_888_2021`, `eu_2020_2184`)                            |
| `NEPHELOMETRIC_TURBIDITY_CODES`    | `turbidity`, `turbidity_ntu`, `turbidity_fnu` — compared with nephelometric limits; `turbidity_fau` never is        |

```typescript
import {
  getLimitSet,
  getParameterDefinition,
  parameterKey,
} from '@welldot/core';

getParameterDefinition({ code: '14808-79-8', vocabulary: 'cas' })?.code; // 'sulfate'
parameterKey({ code: 'sulfate', vocabulary: 'welldot' }); // 'sulfate'
getLimitSet('who_gdwq_2022')?.limits.find(l => l.code === 'arsenic');
```

Limits are never written to `.well` files (jurisdiction neutrality): consumers pick a set at display time and compare results with the derivation helpers of `@welldot/utils`. **The bundled limit values are transcribed from the cited sources and must be verified against the official documents before any regulatory use.**

## FGDC Texture Patterns

`FGDC_TEXTURES_OPTIONS` is a typed array of 284 texture pattern entries drawn from the **FGDC Digital Cartographic Standard for Geologic Map Symbolization (FGDC-STD-013-2006)**. Assign a `code` to the `texture` field of a `Lithology` record to attach a standardized fill pattern to a depth interval.

```typescript
import { FGDC_TEXTURES_OPTIONS } from '@welldot/core';
import type { Texture, TextureCode } from '@welldot/core';

// Lookup by code
const sandstone = FGDC_TEXTURES_OPTIONS.find(t => t.code === 607);
// { code: 607, label: 'Massive sand or sandstone' }

// Build a select list for a UI
const options = FGDC_TEXTURES_OPTIONS.map(t => ({
  value: t.code,
  label: t.label,
}));
```

Codes are grouped by series:

| Series | Category                                               |
| ------ | ------------------------------------------------------ |
| 100    | Surficial deposits                                     |
| 200    | Sedimentary patterns                                   |
| 300    | Igneous patterns                                       |
| 400    | Miscellaneous / Metamorphic patterns                   |
| 500    | Glacial / Periglacial patterns                         |
| 600    | Sedimentary lithology _(most useful for well logging)_ |
| 700    | Metamorphic and igneous lithology                      |

See [fgdc-textures.md](./docs/reference/fgdc-textures.md) for the complete annotated list of all 284 codes.

## `.well` Format Overview

All depths are in **meters** from ground level (0 = surface). All diameters are in **millimeters**. Geographic coordinates use WGS84 decimal degrees. The MIME type is `application/vnd.well+json`.

A minimal v2 `.well` document:

```json
{
  "version": 2,
  "well_type": "tubular",
  "name": "PP-01",
  "location": { "lat": -1.4558, "lng": -48.5039, "elevation": 12.5 },
  "bore_hole": [
    { "from": 0, "to": 80, "diameter": 250, "drilling_method": "rotary" }
  ],
  "well_case": [{ "from": 0, "to": 60, "type": "steel", "diameter": 200 }],
  "reduction": [],
  "well_screen": [
    {
      "from": 60,
      "to": 80,
      "type": "wire_wound",
      "diameter": 150,
      "screen_slot": 0.5
    }
  ],
  "surface_case": [{ "from": 0, "to": 3, "diameter": 300 }],
  "hole_fill": [
    {
      "from": 60,
      "to": 80,
      "type": "gravel_pack",
      "diameter": 250,
      "description": "2-4mm gravel"
    }
  ],
  "cement_pad": {
    "type": "square",
    "width": 1.0,
    "thickness": 0.15,
    "length": 1.0
  },
  "lithology": [],
  "fractures": [],
  "caves": []
}
```

For the complete schema reference, field vocabulary, and design rationale see the [`.well` v2 format specification](./docs/spec/v2/overview.md). The [v1 spec](./docs/spec/v1/well-format.md) remains available for reference.

## Contributing

Issues and pull requests are welcome. The source lives in `packages/core` within the [well-profiler monorepo](https://github.com/rafaeelneto/welldot).

```bash
git clone https://github.com/rafaeelneto/welldot.git
cd well-profiler
pnpm install
cd packages/core
pnpm build
pnpm test
```

## License

[Apache 2.0](./LICENSE) — see `LICENSE` for the full text.
