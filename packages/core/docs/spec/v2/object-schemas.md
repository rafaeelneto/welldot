# `.well` File Format Specification — Version 2.3: Object Schemas

**See also:** [overview.md](./overview.md) · [format-reference.md](./format-reference.md) · [interoperability.md](./interoperability.md)

---

## Common Types _(since v2.3)_

### `Attachment`

The `.well` format is not a file container. Attachments are referenced by URL. Since v2.3, `Attachment` is a common type used in several places.

| Field           | Type   | Required | Description                                                                                |
| --------------- | ------ | -------- | ------------------------------------------------------------------------------------------ |
| `id`            | string | yes      | Unique within its owning `attachments` array. UUID v4 recommended.                         |
| `uri`           | string | yes      | Full HTTPS URL. Relative paths are not permitted.                                          |
| `media_type`    | string | yes      | MIME type (e.g. `image/jpeg`, `application/pdf`).                                          |
| `document_type` | string | no       | What the document is. See format-reference.md § `Attachment.document_type`. _(since v2.3)_ |
| `filename`      | string | no       | Original filename for display.                                                             |
| `description`   | string | no       | Caption or content description.                                                            |
| `sha256`        | string | no       | SHA-256 hash of the file in lowercase hex. Consumers SHOULD validate after download.       |

#### Where attachments are allowed

| Location                            | Purpose                                                                     |
| ----------------------------------- | --------------------------------------------------------------------------- |
| Root `attachments[]`                | Documents about the well as a whole, not tied to any record. _(since v2.3)_ |
| `history_logs[].attachments`        | Supporting documents or photos of a log entry.                              |
| `permits[].attachments`             | The legal document (portaria, certificate). _(since v2.3)_                  |
| `pump_installations[].attachments`  | Pump curves, invoices, photos. _(since v2.3)_                               |
| `hydrodynamic_events[].attachments` | Field sheets, logger exports. _(since v2.3)_                                |
| `aquifer_analysis[].attachments`    | Interpretation reports. _(since v2.3)_                                      |

An attachment belongs to the record it documents. A document that concerns several records is repeated on each; the repetition is one URI and one hash, and the hash guarantees both copies point to the same file. The root array is not a registry, and records do not reference root attachments by id. Nor is it an aggregate: it holds only general files about the well as a whole (e.g. the drilling report), never copies of the attachments of `history_logs`, `permits`, `pump_installations`, `hydrodynamic_events` or `aquifer_analysis` entries.

`Attachment.id` is unique within its owning array: the root `attachments[]`, or the `attachments` array of one record. The same id may appear under different records.

#### URL resolvability

The `uri` field is a reference, not a guarantee. URLs may become unreachable over time; consumers MUST handle fetch failures gracefully and MUST NOT treat them as file-format errors. When `sha256` is present, consumers that successfully fetch the attachment MUST validate the hash and MUST reject content that fails validation. Producers SHOULD include `sha256` for any attachment intended for long-term preservation.

### Date duration

Relative deadlines and recurrences (`permits[].conditions[].due_after`, `recurrence`) are ISO 8601 durations restricted to date components: `PnY`, `PnM`, `PnW`, `PnD` and their combinations, such as `P1Y6M`. At least one component is required. Time components (`T…`) are malformed. Durations are added to calendar dates, never to instants; see format-reference.md § Datetime Conventions.

---

## Object Schemas

### `BoreHole` — `bore_hole[]`

A drilled interval of the borehole. Multiple entries describe a telescoping borehole.

| Field             | Type   | Required | Description                                                                                                                                                                                               |
| ----------------- | ------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `from`            | number | yes      | Start depth in meters.                                                                                                                                                                                    |
| `to`              | number | yes      | End depth in meters.                                                                                                                                                                                      |
| `diameter`        | number | yes      | Borehole diameter in millimeters.                                                                                                                                                                         |
| `drilling_method` | string | no       | Free text description of the method used (e.g. `rotary`, `percussion`, `cable_tool`, `auger`, `air_hammer`). These example values are common terms, not an enforced enumeration — any free text is valid. |

```json
{ "from": 0, "to": 80, "diameter": 250, "drilling_method": "rotary" }
```

---

### `WellCase` — `well_case[]`

Steel or plastic casing installed inside the borehole.

| Field      | Type   | Required | Description                           |
| ---------- | ------ | -------- | ------------------------------------- |
| `from`     | number | yes      | Start depth in meters.                |
| `to`       | number | yes      | End depth in meters.                  |
| `type`     | string | yes      | Casing material. Free Text            |
| `diameter` | number | yes      | Casing outer diameter in millimeters. |

---

### `Reduction` — `reduction[]`

A transition piece connecting two casing or screen sections of different diameters.

| Field       | Type   | Required | Description                                      |
| ----------- | ------ | -------- | ------------------------------------------------ |
| `from`      | number | yes      | Start depth in meters.                           |
| `to`        | number | yes      | End depth in meters.                             |
| `diam_from` | number | yes      | Diameter at top in millimeters.                  |
| `diam_to`   | number | yes      | Diameter at bottom in millimeters.               |
| `type`      | string | yes      | Reducer type material and description. Free Text |

---

### `WellScreen` — `well_screen[]`

Slotted or wire-wound screen section.

| Field         | Type   | Required | Description                                 |
| ------------- | ------ | -------- | ------------------------------------------- |
| `from`        | number | yes      | Start depth in meters.                      |
| `to`          | number | yes      | End depth in meters.                        |
| `type`        | string | yes      | Screen type/material description. Free text |
| `diameter`    | number | yes      | Screen outer diameter in millimeters.       |
| `screen_slot` | number | yes      | Slot opening size in millimeters.           |

> **v1 migration:** v1's `screen_slot_mm` field is renamed to `screen_slot` in v2. The value is in millimeters before and after — no conversion needed. See § Units for the rule that screen slot is always in millimeters regardless of any application's display preference.

---

### `SurfaceCase` — `surface_case[]`

Outer protective casing installed near the surface.

| Field      | Type   | Required | Description                           |
| ---------- | ------ | -------- | ------------------------------------- |
| `from`     | number | yes      | Start depth in meters.                |
| `to`       | number | yes      | End depth in meters.                  |
| `diameter` | number | yes      | Casing outer diameter in millimeters. |

---

### `HoleFill` — `hole_fill[]`

Material placed in the annular space between casing and borehole wall.

| Field         | Type   | Required | Description                                          |
| ------------- | ------ | -------- | ---------------------------------------------------- |
| `from`        | number | yes      | Start depth in meters.                               |
| `to`          | number | yes      | End depth in meters.                                 |
| `type`        | string | yes      | Either `gravel_pack` or `seal`.                      |
| `diameter`    | number | yes      | Outer diameter of the filled annulus in millimeters. |
| `description` | string | yes      | Material description (e.g. grain size, material).    |

---

### `Centralizer` — `centralizers[]` _(since v2.1)_

Centralizers clamped to a casing or screen string to keep it concentric in the borehole, so the gravel pack and annular seal have uniform thickness. Each entry describes a depth interval over which centralizers are installed at a regular spacing, which is how drilling reports usually give them.

| Field         | Type   | Required | Description                                                                                                   |
| ------------- | ------ | -------- | ------------------------------------------------------------------------------------------------------------- |
| `from`        | number | yes      | Start depth in meters (depth of the first centralizer).                                                       |
| `to`          | number | yes      | End depth in meters (depth of the last centralizer). `from === to` denotes a single centralizer.              |
| `spacing`     | number | no       | Spacing between consecutive centralizers in meters. Must be positive. Omit when the spacing is unknown.       |
| `type`        | string | yes      | Centralizer type. Recommended: `spring_bow`, `rigid`, `semi_rigid`, `polymer`. Non-canonical values use `x-`. |
| `diameter`    | number | no       | As-built outer diameter in millimeters.                                                                       |
| `description` | string | no       | Free-text description (e.g. material, manufacturer).                                                          |

- The array is **optional**. v2.0 documents without it remain valid.
- Individual positions are derived from `from`, `to`, and `spacing` (`from`, `from + spacing`, … up to `to`). The count is derived and MUST NOT be stored.
- Each entry SHOULD fall within a `well_case` or `well_screen` interval. Validators MUST NOT reject documents that violate this.
- Centralizers do not contribute to the calculated well depth.

---

### `CementPad` — `cement_pad`

Concrete wellhead pad. **All dimensions are in meters**.

| Field       | Type   | Required | Description                                                                                                                                                        |
| ----------- | ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `type`      | string | yes      | Free text description of the pad, typically its material (e.g. `concrete`) but may also describe its shape (e.g. `circular`) or both. Not an enforced enumeration. |
| `width`     | number | yes      | Width in meters.                                                                                                                                                   |
| `thickness` | number | yes      | Thickness in meters.                                                                                                                                               |
| `length`    | number | yes      | Length in meters.                                                                                                                                                  |

> Note: A typical residential cement pad has dimensions on the order of `1.0` meter. Applications presenting these values in non-metric units (e.g. feet for US users) must convert `cement_pad` dimensions along with all other length fields.

---

### `Lithology` — `lithology[]`

Geological description of a depth interval.

| Field           | Type      | Required | Description                                                          |
| --------------- | --------- | -------- | -------------------------------------------------------------------- |
| `from`          | number    | yes      | Start depth in meters.                                               |
| `to`            | number    | yes      | End depth in meters.                                                 |
| `description`   | string    | yes      | Free-text geological description.                                    |
| `color`         | string    | yes      | Representative color as a CSS hex value.                             |
| `texture`       | `Texture` | yes      | Lithology pattern reference. See below.                              |
| `geologic_unit` | string    | yes      | Stratigraphic or geologic unit name.                                 |
| `aquifer_unit`  | string    | yes      | Aquifer unit name like "Aquifero Pirabas" or "Massachusetts Aquifer" |

### `Texture`

| Field        | Type             | Required | Description                                                                                            |
| ------------ | ---------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| `code`       | string \| number | yes      | The texture code within the declared vocabulary.                                                       |
| `vocabulary` | string           | no       | Either a short canonical token or an HTTPS URI identifying the vocabulary. Default: `fgdc`. See below. |

#### `vocabulary` values

The `vocabulary` field accepts two forms:

**Short canonical tokens** — well-known vocabularies maintained by the welldot project or by widely-adopted standards bodies. The v2.0 canonical set is:

| Token    | Vocabulary                                                                                                                                                                                            |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fgdc`   | FGDC Digital Cartographic Standard for Geologic Map Symbolization (FGDC-STD-013-2006), Chapter 25 — Lithology. Codes are integers.                                                                    |
| `cgi`    | Commission for the Management and Application of Geoscience Information (CGI) Simple Lithology vocabulary. Codes are URIs or short tokens per CGI.                                                    |
| `custom` | Application-defined vocabulary with no interoperability guarantee. Codes are opaque strings. Use of `custom` is discouraged when a documented alternative exists; prefer publishing a vocabulary URI. |

**HTTPS URIs** — when a regulator, geological survey, or institution maintains its own lithology vocabulary, the URI of its definition document is a valid `vocabulary` value. The URI SHOULD resolve to a machine-readable vocabulary description (SKOS, JSON-LD, or a documented JSON list of `{code, label}` entries), though parsers do not fetch it.

```json
{ "vocabulary": "fgdc", "code": 607 }
{ "vocabulary": "cgi", "code": "sandstone" }
{ "vocabulary": "https://brgm.fr/vocab/lithology/v1", "code": "GRES" }
{ "vocabulary": "https://welldot.org/vocab/lithology-extended/v1", "code": "LATERITA" }
```

Profiles SHOULD constrain the `vocabulary` field to a specific URI or short token relevant to their regulatory context.

> **v1 migration:** A v1 file's bare `fgdc_texture: "<code>"` field is treated as `texture: { code: "<code>", vocabulary: "fgdc" }`.

```json
{
  "from": 0,
  "to": 20,
  "description": "Areia fina amarelada",
  "color": "#f5deb3",
  "texture": { "code": 607, "vocabulary": "fgdc" },
  "geologic_unit": "Quaternário",
  "aquifer_unit": "freático"
}
```

---

### `Fracture` — `fractures[]`

A discrete fracture or fracture zone.

| Field             | Type    | Required | Description                                                          |
| ----------------- | ------- | -------- | -------------------------------------------------------------------- |
| `depth`           | number  | yes      | Depth of fracture in meters.                                         |
| `water_intake`    | boolean | yes      | Whether the fracture produces water.                                 |
| `description`     | string  | yes      | Free-text description.                                               |
| `swarm`           | boolean | yes      | Whether this fracture belongs to a swarm.                            |
| `azimuth`         | number  | yes      | Azimuth in degrees from geographic north (0–360).                    |
| `dip`             | number  | yes      | Dip angle in degrees from horizontal (0–90).                         |
| `depth_precision` | number  | no       | One-sigma precision of `depth` in meters. Default handled by editors |

---

### `Cave` — `caves[]`

A cavity or void zone.

| Field          | Type    | Required | Description                      |
| -------------- | ------- | -------- | -------------------------------- |
| `from`         | number  | yes      | Start depth in meters.           |
| `to`           | number  | yes      | End depth in meters.             |
| `water_intake` | boolean | yes      | Whether the cave produces water. |
| `description`  | string  | yes      | Free-text description.           |

---

## `hydrodynamic_events[]`

A chronological, append-only ledger of all hydrodynamic observations. Events are ordered by `datetime` ascending (UTC-normalized instants); parsers MUST NOT assume order and SHOULD sort by `datetime` when querying. When two events share the same instant, an optional `sequence` integer breaks the tie.

> **Note — interpretive contracts, not pumping methods.** Each `type` value identifies a _category of field record_ with a distinct semantic contract, not a pumping technique or equipment class. Equipment belongs in the `equipment` field; test-analysis method belongs in `method` on `aquifer_analysis`. The contract for each type specifies what data it reliably supplies, how many steps it may carry, whether recovery is permitted, and whether its event ID is valid input to `source_event_ids` on an `aquifer_analysis` entry.

### Event types

| `type`             | Português (BR)            | What it records                                                                                                  | `steps` constraint | `recovery` | Valid in `source_event_ids`      |
| ------------------ | ------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------ | ---------- | -------------------------------- |
| `spot_measurement` | Medição pontual           | Static water level during a routine visit; optionally an informal brief pump observation. Not a controlled test. | 0 or 1             | Optional   | As `static_level_source_id` only |
| `constant_rate`    | Teste de vazão constante  | Controlled pump test at exactly one fixed rate.                                                                  | Exactly 1          | Optional   | Yes                              |
| `step_drawdown`    | Teste de vazão escalonada | Controlled pump test at two or more successive rates in ascending order.                                         | ≥ 2, ascending     | Optional   | Yes                              |
| `airlift`          | Air-lift                  | Historical fact that air-lift development was performed and produced an estimated yield.                         | ≥ 1                | Optional   | No — see § airlift               |
| `recovery_only`    | Apenas recuperação        | Recovery after a pumping event whose drawdown data was not recorded.                                             | None               | Required   | Yes                              |

The `type` field accepts any string. Non-canonical values SHOULD use the `x-` prefix.

### Common fields (all event types)

Only `id`, `type`, and `datetime` are required. All others are optional for all types.

| Field         | Type           | Required | Description                                                                                                   |
| ------------- | -------------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| `id`          | string         | yes      | Unique within `hydrodynamic_events`. UUID v4 recommended.                                                     |
| `type`        | string         | yes      | Event type.                                                                                                   |
| `datetime`    | string         | yes      | RFC 3339 datetime with mandatory UTC offset (e.g. `"2006-03-14T08:00:00-03:00"`). See § Datetime Conventions. |
| `sequence`    | integer        | no       | Tiebreaker for events sharing the same instant. Lower values sort first.                                      |
| `operator`    | string         | no       | Person or company conducting the measurement or test.                                                         |
| `equipment`   | string         | no       | Equipment description.                                                                                        |
| `notes`       | string         | no       | Free-text observations.                                                                                       |
| `corrects`    | string         | no       | `hydrodynamic_events[].id` of the event this one retracts. See below. _(since v2.3)_                          |
| `attachments` | `Attachment[]` | no       | Field sheets, logger exports. See § Attachment. _(since v2.3)_                                                |

### Corrections _(since v2.3)_

`hydrodynamic_events` is a ledger: an erroneous event is never edited in place. The correction is a new event whose `corrects` holds the id of the retracted event.

- A retracted event stays in the file but is excluded from every derivation (current static level, analyses, charts).
- Chains are allowed (C corrects B, which corrected A); only the last uncorrected entry counts.
- A `corrects` cycle is malformed and emits a warning. A `corrects` value that does not resolve is a dangling reference.
- An `aquifer_analysis` whose `source_event_ids` or `static_level_source_id` points to a retracted event emits a warning naming both ids.

---

### `spot_measurement`

| Field                    | Type            | Required | Description                                                                                                                                   |
| ------------------------ | --------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `static_level`           | number          | yes      | Depth to water surface from ground level, in meters. Negative when the level is above ground (flowing artesian). See § Level sign convention. |
| `static_level_precision` | number          | no       | One-sigma precision of `static_level`.                                                                                                        |
| `measurement_method`     | string          | no       | Recommended: `electric_probe`, `pressure_transducer`, `air_line`, `tape`.                                                                     |
| `steps`                  | `PumpingStep[]` | no       | At most one step. For an informal brief pump observation during the visit — not a controlled test. Use `constant_rate` for a formal test.     |
| `recovery`               | `RecoveryPhase` | no       | Recovery after the optional pumping step.                                                                                                     |

---

### `constant_rate`

| Field                    | Type            | Required | Description                                                                                                  |
| ------------------------ | --------------- | -------- | ------------------------------------------------------------------------------------------------------------ |
| `static_level`           | number          | no       | Pre-test static level in meters. Omit if not measured.                                                       |
| `static_level_precision` | number          | no       | One-sigma precision of `static_level`.                                                                       |
| `steps`                  | `PumpingStep[]` | no       | Exactly one entry. A second step would make this a `step_drawdown`. Omit if only recovery data is available. |
| `recovery`               | `RecoveryPhase` | no       | Recovery measurements after pump shutdown.                                                                   |

---

### `step_drawdown`

Jacob's `B` and `C` are derived — store them in `aquifer_analysis`, never here.

| Field                    | Type            | Required | Description                                        |
| ------------------------ | --------------- | -------- | -------------------------------------------------- |
| `static_level`           | number          | no       | Pre-test static level in meters.                   |
| `static_level_precision` | number          | no       | One-sigma precision of `static_level`.             |
| `steps`                  | `PumpingStep[]` | yes      | Two or more steps in ascending order of flow rate. |
| `recovery`               | `RecoveryPhase` | no       | Recovery after the final step.                     |

---

### `airlift`

This type exists to record the historical fact that air-lift development was performed and produced an estimated yield. It is **not** suitable input for `aquifer_analysis`: tools producing `aquifer_analysis` entries MUST refuse to accept `airlift` event IDs in `source_event_ids` and MUST emit a warning if one is supplied.

Static level is not reliably measurable during air-lift and SHOULD be omitted.

| Field      | Type            | Required | Description                                                    |
| ---------- | --------------- | -------- | -------------------------------------------------------------- |
| `steps`    | `PumpingStep[]` | yes      | One or more steps. Each step may carry time-series `readings`. |
| `recovery` | `RecoveryPhase` | no       | Recovery measurements after air-lift shutdown, if recorded.    |

---

### `recovery_only`

| Field              | Type            | Required | Description                                      |
| ------------------ | --------------- | -------- | ------------------------------------------------ |
| `pumping_rate`     | number          | no       | Estimated preceding flow rate in m³/h.           |
| `pumping_duration` | number          | no       | Estimated preceding pumping duration in minutes. |
| `recovery`         | `RecoveryPhase` | yes      | Recovery time-series.                            |

---

## Supporting Object Schemas

### `PumpingStep`

| Field            | Type             | Required | Description                                                       |
| ---------------- | ---------------- | -------- | ----------------------------------------------------------------- |
| `rate`           | number           | yes      | Pumping rate in m³/h.                                             |
| `rate_precision` | number           | no       | One-sigma precision of `rate`.                                    |
| `duration`       | number           | no       | Duration in minutes.                                              |
| `readings`       | `LevelReading[]` | no       | Time-series during this step. A single terminal reading is valid. |

### `LevelReading`

| Field             | Type   | Required | Description                                                       |
| ----------------- | ------ | -------- | ----------------------------------------------------------------- |
| `elapsed`         | number | yes      | Time since step start (or pump shutdown for recovery) in minutes. |
| `depth`           | number | yes      | Depth to water surface from ground level in meters.               |
| `depth_precision` | number | no       | One-sigma precision of `depth`.                                   |
| `pressure`        | number | no       | Pressure transducer reading in kPa.                               |

### `RecoveryPhase`

| Field      | Type             | Required | Description                                                        |
| ---------- | ---------------- | -------- | ------------------------------------------------------------------ |
| `readings` | `LevelReading[]` | yes      | Time-series after pump shutdown. `elapsed` measured from shutdown. |

---

## `aquifer_analysis[]`

An array of interpreted aquifer parameter sets. Multiple entries may coexist, representing different methods or analysts.

| Field                     | Type           | Required | Description                                                                                                                                                                                                                                                                     |
| ------------------------- | -------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                      | string         | yes      | Unique within `aquifer_analysis`.                                                                                                                                                                                                                                               |
| `datetime`                | string         | yes      | RFC 3339 datetime with mandatory UTC offset.                                                                                                                                                                                                                                    |
| `analyst`                 | string         | no       | Name of the hydrogeologist.                                                                                                                                                                                                                                                     |
| `source_event_ids`        | string[]       | yes      | IDs of source `hydrodynamic_events` from this same file. See § Cross-reference and Uniqueness Rules.                                                                                                                                                                            |
| `method`                  | string         | no       | See vocabulary below.                                                                                                                                                                                                                                                           |
| `static_level`            | number         | no       | Static level used as reference, in meters.                                                                                                                                                                                                                                      |
| `static_level_precision`  | number         | no       | One-sigma precision of `static_level`.                                                                                                                                                                                                                                          |
| `static_level_source_id`  | string         | no       | ID of the event from which `static_level` was taken.                                                                                                                                                                                                                            |
| `dynamic_level`           | number         | no       | Stabilized dynamic level in meters.                                                                                                                                                                                                                                             |
| `dynamic_level_precision` | number         | no       | One-sigma precision of `dynamic_level`.                                                                                                                                                                                                                                         |
| `flow_rate`               | number         | no       | Flow rate associated with `dynamic_level`, in m³/h.                                                                                                                                                                                                                             |
| `flow_rate_precision`     | number         | no       | One-sigma precision of `flow_rate`.                                                                                                                                                                                                                                             |
| `max_flow_rate`           | number         | no       | Maximum recommended sustained extraction rate in m³/h, as judged by the analyst from the source events. This is an interpretive recommendation, not the test rate. Distinct from `flow_rate`, which is the rate actually applied during the test that produced `dynamic_level`. |
| `max_flow_rate_precision` | number         | no       | One-sigma precision of `max_flow_rate` in m³/h.                                                                                                                                                                                                                                 |
| `max_flow_rate_basis`     | string         | no       | Free-text justification: safety factor applied, regulatory framework referenced (e.g. `"80% of test rate per ANA practice"`, `"limited by available drawdown to top of screen"`), or assumptions about long-term recharge.                                                      |
| `specific_capacity`       | number         | no       | `Q/s` in m³/h per m (i.e. m²/h).                                                                                                                                                                                                                                                |
| `transmissivity`          | number         | no       | Aquifer transmissivity `T` in m²/s.                                                                                                                                                                                                                                             |
| `storativity`             | number         | no       | Dimensionless storativity `S`.                                                                                                                                                                                                                                                  |
| `hydraulic_conductivity`  | number         | no       | Hydraulic conductivity `K` in m/s. Requires `aquifer_thickness`.                                                                                                                                                                                                                |
| `aquifer_thickness`       | number         | no       | Saturated aquifer thickness in meters.                                                                                                                                                                                                                                          |
| `jacob_b`                 | number         | no       | Formation loss coefficient from Jacob's equation.                                                                                                                                                                                                                               |
| `jacob_c`                 | number         | no       | Well loss coefficient from Jacob's equation.                                                                                                                                                                                                                                    |
| `well_efficiency_pct`     | number         | no       | Well efficiency as a percentage.                                                                                                                                                                                                                                                |
| `attachments`             | `Attachment[]` | no       | Interpretation reports. See § Attachment. _(since v2.3)_                                                                                                                                                                                                                        |
| `notes`                   | string         | no       | Methodology notes, assumptions, data quality remarks.                                                                                                                                                                                                                           |

### `method` — Recommended values

`cooper_jacob`, `theis`, `neuman`, `hantush`, `birsoy_summers`, `eden_hazel`, `visual_inspection`. Non-canonical values SHOULD use the `x-` prefix.

---

## Derived Parameters — Computation Reference

The following values are **never stored**. Applications compute them on demand.

| Parameter                    | Formula                                      | Inputs                                         |
| ---------------------------- | -------------------------------------------- | ---------------------------------------------- |
| Drawdown `s` at time `t`     | `depth(t) − static_level`                    | `LevelReading.depth`, event `static_level`     |
| Residual drawdown (recovery) | `depth(t) − static_level`                    | `RecoveryPhase.readings`, event `static_level` |
| Specific capacity `Q/s`      | `flow_rate / (dynamic_level − static_level)` | `AquiferAnalysis` fields                       |
| Unit drawdown `s/Q`          | `(dynamic_level − static_level) / flow_rate` | `AquiferAnalysis` fields                       |
| Formation loss               | `jacob_b × Q`                                | `AquiferAnalysis.jacob_b`, `flow_rate`         |
| Well loss                    | `jacob_c × Q²`                               | `AquiferAnalysis.jacob_c`, `flow_rate`         |
| Hydraulic conductivity `K`   | `transmissivity / aquifer_thickness`         | `AquiferAnalysis` fields                       |

---

## Querying Current State

**Current static level (NE):** Exclude retracted events (§ Corrections), filter the remaining events where `static_level` is present, sort by `datetime` descending (UTC-normalized), take the first result.

**Current specific capacity:** Find the most recent `aquifer_analysis` with `specific_capacity` present.

**Current transmissivity:** Find the most recent `aquifer_analysis` with `transmissivity` present.

**Recommended maximum flow:** Read the most recent `aquifer_analysis[].max_flow_rate`, with `max_flow_rate_basis` and `max_flow_rate_precision`.

**Current pump:** The `pump_installations` entry without `removed_at`. See § `pump_installations[]`.

---

## `history_logs[]`

A mutable chronological record of physical interventions, inspections, and incidents. Entries may be edited or removed to correct field errors.

Each entry carries two distinct timestamps:

- **`datetime`** — when the logged event actually occurred in the field.
- **`updated_at`** — when this log entry was most recently created or edited in the record system. This timestamp tracks the data lineage of the entry itself, not the event it describes.

These timestamps may differ substantially: a maintenance intervention `datetime` of 2018-06-12 may be paired with an `updated_at` of 2024-03-15 if the entry was added retroactively or corrected.

### Categories

| `category`         | Portuguese (BR)              | Description                                                                                                                                       |
| ------------------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `maintenance`      | Manutenção                   | Physical intervention: pump replacement, casing repair, cleaning, redevelopment.                                                                  |
| `inspection`       | Inspeção                     | Site visit without physical alteration: visual survey, camera inspection, sample collection.                                                      |
| `incident`         | Incidente                    | Unplanned event: partial collapse, contamination, prolonged drought, vandalism.                                                                   |
| `event`            | Evento                       | Generic milestone: construction completion, commissioning, deactivation, reactivation, ownership transfer, rehabilitation, data-integrity repair. |
| `change_of_use`    | Mudança de uso               | _(since v2.1)_ The well's purpose changed (e.g. production → monitoring). Update `well_purpose` to the new use and log the change here.           |
| `permit_condition` | Cumprimento de condicionante | _(since v2.3)_ A permit condition deadline was fulfilled. Carries the category-specific fields below.                                             |

Vocabulary is open. Non-canonical values SHOULD use the `x-` prefix.

### `HistoryLogEntry`

| Field         | Type           | Required | Description                                                                                                                                                                                                              |
| ------------- | -------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`          | string         | yes      | Unique within `history_logs`.                                                                                                                                                                                            |
| `datetime`    | string         | yes      | RFC 3339 datetime with mandatory UTC offset. When the logged event occurred.                                                                                                                                             |
| `updated_at`  | string         | no       | RFC 3339 datetime with mandatory UTC offset. When this entry was most recently created or edited. When omitted, treated as equal to `datetime`. Producers SHOULD set this field whenever they create or modify an entry. |
| `category`    | string         | yes      | Event category.                                                                                                                                                                                                          |
| `description` | string         | yes      | Free-text account: work performed, findings, or incident narrative.                                                                                                                                                      |
| `author`      | string         | no       | Person or company responsible for the record.                                                                                                                                                                            |
| `severity`    | string         | no       | Recommended: `low`, `medium`, `high`, `critical`.                                                                                                                                                                        |
| `attachments` | `Attachment[]` | no       | Supporting documents or photos. See § Attachment.                                                                                                                                                                        |

### `updated_at` semantics

- `updated_at` MUST NOT be earlier than `datetime` only in the case of pre-dated logging — typically retroactive entry of historical events. There is no validation rule prohibiting `updated_at < datetime`; both orderings are legal.
- When a producer modifies the `description`, `category`, `severity`, `author`, or `attachments` of an existing entry, it SHOULD update `updated_at` to the current instant.
- When a producer modifies only the `id` (e.g. during duplicate-resolution), it SHOULD NOT update `updated_at`, since the substantive content of the entry has not changed.
- The `updated_at` field is not retroactive: parsers reading a v1 or early-v2.0 file without `updated_at` MUST NOT synthesize one.

`Attachment` is a common type since v2.3; see § Common Types — `Attachment`.

### Category-specific fields _(since v2.3)_

Category-specific fields MUST be absent on entries of other categories; their presence emits a warning.

#### `permit_condition`

| Field          | Type          | Required | Description                                                                       |
| -------------- | ------------- | -------- | --------------------------------------------------------------------------------- |
| `permit_id`    | string        | yes      | `permits[].id`.                                                                   |
| `condition_id` | string        | yes      | `permits[].conditions[].id` within that permit.                                   |
| `due_date`     | string (date) | no       | Calendar date of the deadline this entry fulfills. Absent for undated conditions. |
| `event_id`     | string        | no       | `hydrodynamic_events[].id` that satisfied the obligation, when applicable.        |

The entry's `datetime` is when the obligation was fulfilled, for example when a report was filed. Each entry fulfills one deadline. Proof of submission goes in `attachments` with `document_type: "condition_evidence"`. See § `permits[]` — Condition fulfillment.

---

## `pump_installations[]` _(since v2.3)_

An installation block: each entry is one installation of a pump in the well, present from `installed_at` until `removed_at`. Entries are edited in place, and `updated_at` records the last edit. The current pump and its submergence are derived, never stored.

- `removed_at` earlier than or equal to `installed_at` is malformed and emits a warning.
- Each entry is one installation, not one piece of equipment. A unit pulled and reinstalled gets a new entry with the same `serial`.
- Overlapping open installations emit a warning, not an error. Standby pumps exist.

### `PumpInstallation`

| Field             | Type             | Required | Unit | Description                                                  |
| ----------------- | ---------------- | -------- | ---- | ------------------------------------------------------------ |
| `id`              | string           | yes      |      | Unique within `pump_installations`. UUID v4 recommended.     |
| `installed_at`    | string (instant) | yes      |      | RFC 3339 instant when the pump entered service in this well. |
| `removed_at`      | string (instant) | no       |      | When it left. Absent means currently installed.              |
| `type`            | string           | yes      |      | See format-reference.md § `pump_installations[].type`.       |
| `power_source`    | string           | no       |      | `grid`, `solar`, `diesel`, `hybrid`, `x-…`                   |
| `manufacturer`    | string           | no       |      |                                                              |
| `model`           | string           | no       |      |                                                              |
| `serial`          | string           | no       |      | Links reinstallations of the same unit.                      |
| `intake_depth`    | number           | no       | m    | Depth of the pump intake (crivo), from ground level.         |
| `rated_flow_rate` | number           | no       | m³/h | Nameplate duty-point flow.                                   |
| `rated_head`      | number           | no       | m    | Nameplate duty-point head.                                   |
| `rated_power`     | number           | no       | kW   | Motor power.                                                 |
| `stages`          | integer          | no       |      | Number of stages.                                            |
| `riser_diameter`  | number           | no       | mm   | Riser pipe (edutor), as-built outer diameter.                |
| `riser_material`  | string           | no       |      | Same vocabulary as `well_case.type`.                         |
| `check_valve`     | boolean          | no       |      | Whether a check valve is installed.                          |
| `electrical`      | `PumpElectrical` | no       |      | See below.                                                   |
| `notes`           | string           | no       |      |                                                              |
| `updated_at`      | string (instant) | no       |      | Last edit of this record.                                    |
| `attachments`     | `Attachment[]`   | no       |      | Pump curves, invoices, photos. See § Attachment.             |

### `PumpElectrical`

All fields optional.

| Field           | Type    | Unit       |
| --------------- | ------- | ---------- |
| `voltage`       | number  | V          |
| `phases`        | integer | `1` or `3` |
| `cable_section` | number  | mm²        |
| `cable_length`  | number  | m          |

### Validation (warnings, never rejection)

- `intake_depth` greater than `well_depth`, or below the bottom of the deepest `bore_hole` interval.
- `intake_depth` inside a `well_screen` interval.
- More than one entry without `removed_at`.
- `removed_at` earlier than or equal to `installed_at`.

### Derived values

- **Current pump:** the entry without `removed_at`; if all are removed, none.
- **Submergence:** `intake_depth − dynamic_level`, using the most recent applicable reading during pumping. A negative value means the intake is above the water level.
- **Time in service per unit:** sum of installation durations sharing a `serial`.

### Rendering

Renderers draw the current pump ending at `intake_depth` and its riser from the surface. Earlier installations are not drawn by default.

---

## `permits[]` _(since v2.3)_

A mutable record block: each entry transcribes one legal instrument governing abstraction from the well (outorga, dispensa, cadastro). Entries are edited in place, and `updated_at` records the last edit. The attached document is authoritative. Permit status and condition deadlines are always derived, never stored.

### `Permit`

| Field                  | Type                | Required | Unit | Description                                                                  |
| ---------------------- | ------------------- | -------- | ---- | ---------------------------------------------------------------------------- |
| `id`                   | string              | yes      |      | Unique within `permits`. UUID v4 recommended.                                |
| `type`                 | string              | yes      |      | See format-reference.md § `permits[].type`.                                  |
| `authority`            | string              | yes      |      | Issuing body, e.g. `ANA`, `SEMAS-PA`. Same semantics as `well_id.authority`. |
| `number`               | string              | yes      |      | Portaria or process number, preserved verbatim.                              |
| `issued_at`            | string (date)       | no       |      | Issue date.                                                                  |
| `valid_from`           | string (date)       | no       |      | Absent means valid from `issued_at`.                                         |
| `valid_until`          | string (date)       | no       |      | Absent means no fixed expiry.                                                |
| `renewal_requested_at` | string (date)       | no       |      | Date a renewal request was filed.                                            |
| `water_use`            | string[]            | no       |      | See format-reference.md § `permits[].water_use`.                             |
| `flow_rate`            | number              | no       | m³/h | Maximum granted flow.                                                        |
| `daily_operating_time` | number              | no       | h    | Maximum granted daily operating time, 0–24.                                  |
| `volume_limits`        | `VolumeLimit[]`     | no       |      | Only volumes stated in the document.                                         |
| `monthly_schedule`     | `MonthlyGrant[]`    | no       |      | Month-by-month grant.                                                        |
| `conditions`           | `PermitCondition[]` | no       |      | Obligations (condicionantes).                                                |
| `supersedes`           | string              | no       |      | `permits[].id` of the instrument this one legally replaces.                  |
| `notes`                | string              | no       |      |                                                                              |
| `updated_at`           | string (instant)    | no       |      | Last edit of this record.                                                    |
| `attachments`          | `Attachment[]`      | no       |      | The legal document. See § Attachment.                                        |

`water_use` describes what the abstracted water is for. It is distinct from the top-level `well_purpose`, which describes the well's role.

A renewal is not a permit type: it is a new permit of the same type whose `supersedes` points to the previous one. `supersedes` expresses legal succession between two valid instruments and is not a correction mechanism.

### `VolumeLimit`

| Field    | Type   | Required | Unit | Description                                                     |
| -------- | ------ | -------- | ---- | --------------------------------------------------------------- |
| `period` | string | yes      |      | `daily`, `monthly`, `annual`. Each period appears at most once. |
| `volume` | number | yes      | m³   |                                                                 |

Volumes implied by flow × time × days are derived and MUST NOT be stored here.

### `MonthlyGrant`

| Field                  | Type    | Required | Unit | Description                             |
| ---------------------- | ------- | -------- | ---- | --------------------------------------- |
| `month`                | integer | yes      |      | 1–12, unique within the schedule.       |
| `flow_rate`            | number  | no       | m³/h |                                         |
| `daily_operating_time` | number  | no       | h    | 0–24.                                   |
| `days`                 | integer | no       |      | Days of operation granted in the month. |

When `monthly_schedule` is present, a month absent from it has no abstraction granted. The top-level `flow_rate` and `daily_operating_time` hold the maximum across months; a monthly value above them emits a warning.

### `PermitCondition`

| Field         | Type              | Required | Description                                                      |
| ------------- | ----------------- | -------- | ---------------------------------------------------------------- |
| `id`          | string            | yes      | Unique within the permit's `conditions` array.                   |
| `description` | string            | yes      | Text of the condition as written in the document.                |
| `category`    | string            | no       | See format-reference.md § `permits[].conditions[].category`.     |
| `first_due`   | string (date)     | no       | Explicit date of the first deadline.                             |
| `due_after`   | string (duration) | no       | First deadline relative to the permit's start date, e.g. `P90D`. |
| `recurrence`  | string (duration) | no       | Interval between deadlines, e.g. `P6M`. Absent means one-time.   |
| `last_due`    | string (date)     | no       | No deadline is generated after this date.                        |
| `occurrences` | integer           | no       | Maximum number of deadlines, counting the first.                 |

`first_due` and `due_after` are mutually exclusive; a condition carrying both is malformed and `first_due` wins. A condition with neither is undated: it is valid and is displayed, but generates no deadlines. Durations follow § Common Types — Date duration.

### Deadline generation (normative)

Applications generate a condition's deadlines as follows.

1. **Start date** of the permit: `valid_from`, else `issued_at`. Without either, `due_after` cannot be resolved and the condition is undated.
2. **Anchor**: `first_due`, else start date + `due_after`.
3. **Deadline n** (n = 0, 1, 2 …) = anchor + n × `recurrence`, always computed from the anchor, never from the previous deadline. Years and months are added first; when the resulting day does not exist in the target month, that month's last day is used. Weeks and days are then added. Without `recurrence`, only n = 0 exists.
4. **Stop** when any limit is reached: `occurrences` deadlines generated; the date passes `last_due`; or the date passes the permit's effective end.
5. **Effective end** of the permit: if another permit supersedes it, the day before the successor's start date; otherwise `valid_until`; while the status is `active_pending_renewal`, there is no end. With no end, applications generate deadlines up to a horizon of their choice.

Computing every deadline from the anchor prevents drift: a monthly obligation anchored on 31 January falls on 28 or 29 February and back on 31 March.

| Document wording                             | Encoding                                               |
| -------------------------------------------- | ------------------------------------------------------ |
| Install a meter within 90 days               | `due_after: "P90D"`                                    |
| Semiannual report from issuance              | `due_after: "P6M", recurrence: "P6M"`                  |
| Semiannual report by 31 Jan and 31 Jul       | `first_due: "2027-01-31", recurrence: "P6M"`           |
| Monthly level readings during the first year | `due_after: "P1M", recurrence: "P1M", occurrences: 12` |
| Annual water analysis                        | `due_after: "P1Y", recurrence: "P1Y"`                  |
| Request renewal 90 days before expiry        | `first_due` set to that date by the author             |

### Condition fulfillment

Fulfillment is recorded as a `history_logs` entry with category `permit_condition` (see § `history_logs[]` — Category-specific fields). Each entry fulfills one deadline, identified by `permit_id`, `condition_id` and `due_date`.

Derived status of each deadline, evaluated on the local civil date at the well site:

- **fulfilled** — a `permit_condition` entry matches it. **Fulfilled late** when that entry's local date (the date part of its `datetime`, in the offset it carries) is after `due_date`.
- **upcoming** — no match and today is on or before `due_date`.
- **overdue** — no match and today is after `due_date`.

An undated condition is fulfilled by an entry without `due_date`. A `permit_condition` entry whose `due_date` matches no generated deadline, or whose `permit_id` / `condition_id` does not resolve, emits a warning. Conditions belong to their permit: when a permit is superseded, its deadlines stop at its effective end and the successor's conditions take over.

### Permit status (derived)

Evaluated on the local civil date at the well site, in order:

1. Another permit `supersedes` it → `superseded`.
2. Today is before its start date → `pending`.
3. `valid_until` is absent, or today is on or before it → `active`.
4. `renewal_requested_at` is present and on or before `valid_until` → `active_pending_renewal`.
5. Otherwise → `expired`.

The lead time a renewal request requires varies by jurisdiction; it is evaluated by applications or regulatory profiles, not by the format.

### Validation (warnings, never rejection)

- `valid_until` earlier than the start date.
- A `supersedes` cycle, or a `supersedes` reference that does not resolve.
- Two non-superseded permits of the same `type` with overlapping validity.
- A `daily_operating_time` outside 0–24, on the permit or in `monthly_schedule`.
- A `monthly_schedule` value above the permit's top-level maximum.
- A duplicate `month`, `volume_limits` period or condition `id` within one permit.
- A condition with both `first_due` and `due_after`.

A collective grant covering several wells is repeated in each well's file until cross-file references arrive in v3.

---

## Complete Example

```json
{
  "$schema": "https://welldot.org/schema/v2/well.schema.json",
  "@context": "https://welldot.org/context/v2.jsonld",
  "version": 2,
  "well_type": "tubular",
  "well_purpose": ["production"],
  "name": "Poço PP-01",
  "well_driller": "Perfuradora XYZ",
  "construction_date": "2006-03-10",
  "obs": "Sem anomalias observadas durante a perfuração.",

  "well_id": [
    { "authority": "SIAGAS", "id": "SP-0042819", "primary": true },
    { "authority": "ANA", "id": "02000.001234/2006-78" }
  ],

  "location": {
    "lat": -1.4558,
    "lng": -48.5039,
    "elevation": 12.5,
    "properties": {
      "elevation_datum": "wgs84_ellipsoid",
      "crs": "EPSG:4326",
      "elevation_precision": 0.5
    }
  },

  "profiles": ["https://welldot.org/profiles/brazil-ana/v1/schema.json"],

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
      "description": "Seixo 2-4mm"
    },
    {
      "from": 3,
      "to": 60,
      "type": "seal",
      "diameter": 250,
      "description": "Cimento"
    }
  ],
  "centralizers": [
    {
      "from": 6,
      "to": 54,
      "spacing": 12,
      "type": "spring_bow",
      "diameter": 245
    }
  ],
  "cement_pad": {
    "type": "square",
    "width": 1.0,
    "thickness": 0.15,
    "length": 1.0
  },

  "lithology": [
    {
      "from": 0,
      "to": 20,
      "description": "Areia fina amarelada",
      "color": "#f5deb3",
      "texture": { "code": 607, "vocabulary": "fgdc" },
      "geologic_unit": "Quaternário",
      "aquifer_unit": "freático"
    },
    {
      "from": 20,
      "to": 80,
      "description": "Granito fraturado cinza",
      "color": "#a9a9a9",
      "texture": { "code": 718, "vocabulary": "fgdc" },
      "geologic_unit": "Embasamento Cristalino",
      "aquifer_unit": "fraturado"
    }
  ],

  "fractures": [
    {
      "depth": 45.2,
      "depth_precision": 0.1,
      "water_intake": true,
      "description": "Fratura aberta",
      "swarm": false,
      "azimuth": 120,
      "dip": 35
    }
  ],

  "caves": [],

  "hydrodynamic_events": [
    {
      "id": "d4e5f6a7-b8c9-0123-defa-234567890123",
      "type": "airlift",
      "datetime": "2006-03-10T14:00:00-03:00",
      "operator": "Perfuradora XYZ",
      "steps": [
        {
          "rate": 340.0,
          "duration": 30,
          "readings": [
            { "elapsed": 30, "depth": 44.8, "depth_precision": 0.05 }
          ]
        }
      ],
      "notes": "Air-lift at end of drilling. Static level not reliable."
    },
    {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "type": "constant_rate",
      "datetime": "2006-03-14T08:00:00-03:00",
      "operator": "Perfuradora XYZ",
      "equipment": "Submersible pump 15 CV",
      "static_level": 28.74,
      "static_level_precision": 0.01,
      "steps": [
        {
          "rate": 340.0,
          "duration": 1440,
          "readings": [
            { "elapsed": 1, "depth": 32.1 },
            { "elapsed": 5, "depth": 38.4 },
            { "elapsed": 30, "depth": 42.8 },
            { "elapsed": 60, "depth": 43.9 },
            { "elapsed": 1440, "depth": 44.8 }
          ]
        }
      ],
      "recovery": {
        "readings": [
          { "elapsed": 5, "depth": 38.2 },
          { "elapsed": 15, "depth": 33.6 },
          { "elapsed": 30, "depth": 30.1 }
        ]
      },
      "notes": "Test terminated at 24h. Recovery monitored for 30 min."
    },
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "type": "spot_measurement",
      "datetime": "2010-07-22T09:15:00-03:00",
      "static_level": 31.2,
      "measurement_method": "electric_probe",
      "notes": "Routine annual monitoring."
    }
  ],

  "aquifer_analysis": [
    {
      "id": "f6a7b8c9-d0e1-2345-fabc-456789012345",
      "datetime": "2006-03-15T16:00:00-03:00",
      "analyst": "Dr. Maria Silva",
      "source_event_ids": ["b2c3d4e5-f6a7-8901-bcde-f12345678901"],
      "method": "cooper_jacob",
      "static_level": 28.74,
      "static_level_source_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "dynamic_level": 44.8,
      "flow_rate": 340.0,
      "specific_capacity": 21.17,
      "transmissivity": 4.2e-4,
      "storativity": null,
      "notes": "Cooper-Jacob straight-line fit, t=10min to t=1440min. S not determinable — no observation well."
    }
  ],

  "attachments": [
    {
      "id": "c1d2e3f4-a5b6-7890-cdef-123456789abc",
      "uri": "https://files.wellmanager.example.com/wells/pp-01/relatorio-perfuracao.pdf",
      "media_type": "application/pdf",
      "document_type": "drilling_report",
      "filename": "relatorio-perfuracao.pdf"
    }
  ],

  "pump_installations": [
    {
      "id": "e1f2a3b4-c5d6-7890-efab-234567890abc",
      "installed_at": "2006-03-20T10:00:00-03:00",
      "removed_at": "2018-06-12T09:30:00-03:00",
      "type": "submersible",
      "power_source": "grid",
      "rated_power": 11.0,
      "intake_depth": 52
    },
    {
      "id": "f2a3b4c5-d6e7-8901-fabc-345678901bcd",
      "installed_at": "2018-06-12T15:00:00-03:00",
      "updated_at": "2024-03-15T11:42:00-03:00",
      "type": "submersible",
      "power_source": "grid",
      "manufacturer": "Schneider",
      "model": "ME-25",
      "intake_depth": 54,
      "rated_power": 7.36,
      "riser_diameter": 114.3,
      "riser_material": "galvanized_steel",
      "check_valve": true,
      "electrical": {
        "voltage": 380,
        "phases": 3,
        "cable_section": 10,
        "cable_length": 70
      },
      "attachments": [
        {
          "id": "b8c9d0e1-f2a3-4567-bcde-678901234567",
          "uri": "https://files.wellmanager.example.com/wells/pp-01/attachments/nota-fiscal-bomba-2018.pdf",
          "media_type": "application/pdf",
          "document_type": "invoice",
          "filename": "nota-fiscal-bomba-2018.pdf",
          "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        }
      ]
    }
  ],

  "permits": [
    {
      "id": "9a8b7c6d-5e4f-3210-abcd-0123456789ab",
      "type": "abstraction_permit",
      "authority": "SEMAS-PA",
      "number": "1234/2025",
      "issued_at": "2025-02-10",
      "valid_until": "2029-02-10",
      "water_use": ["human_supply"],
      "flow_rate": 340.0,
      "daily_operating_time": 20,
      "volume_limits": [{ "period": "annual", "volume": 2482000 }],
      "conditions": [
        {
          "id": "c1",
          "description": "Instalar hidrômetro na saída do poço",
          "category": "meter_installation",
          "due_after": "P90D"
        },
        {
          "id": "c2",
          "description": "Relatório semestral de nível e vazão",
          "category": "monitoring_report",
          "first_due": "2025-07-31",
          "recurrence": "P6M"
        }
      ],
      "attachments": [
        {
          "id": "d4e5f6a7-b8c9-0123-defa-456789abcdef",
          "uri": "https://files.wellmanager.example.com/wells/pp-01/portaria-1234-2025.pdf",
          "media_type": "application/pdf",
          "document_type": "permit_document"
        }
      ]
    }
  ],

  "history_logs": [
    {
      "id": "d0e1f2a3-b4c5-6789-defa-890123456789",
      "datetime": "2006-03-10T00:00:00-03:00",
      "updated_at": "2006-03-10T00:00:00-03:00",
      "category": "event",
      "description": "Well construction completed. Commissioned for public supply by COSANPA. Initial flow rate 340 m³/h via air-lift.",
      "author": "Prefeitura Municipal de Belém"
    },
    {
      "id": "a7b8c9d0-e1f2-3456-abcd-567890123456",
      "datetime": "2018-06-12T09:30:00-03:00",
      "updated_at": "2024-03-15T11:42:00-03:00",
      "category": "maintenance",
      "description": "Original 15 CV submersible pump replaced after motor burnout. New pump: Schneider ME-25 10 CV. (Description corrected 2024-03-15: model was ME-25, not ME-22 as originally logged.)",
      "author": "Manutenção Rápida Ltda.",
      "severity": "high",
      "attachments": [
        {
          "id": "b8c9d0e1-f2a3-4567-bcde-678901234567",
          "uri": "https://files.wellmanager.example.com/wells/pp-01/attachments/nota-fiscal-bomba-2018.pdf",
          "media_type": "application/pdf",
          "document_type": "invoice",
          "filename": "nota-fiscal-bomba-2018.pdf",
          "description": "Purchase invoice for replacement pump",
          "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        }
      ]
    },
    {
      "id": "e2f3a4b5-c6d7-8901-efab-23456789abcd",
      "datetime": "2025-04-02T10:00:00-03:00",
      "category": "permit_condition",
      "description": "Hidrômetro instalado e comunicado ao órgão.",
      "permit_id": "9a8b7c6d-5e4f-3210-abcd-0123456789ab",
      "condition_id": "c1",
      "due_date": "2025-05-11"
    }
  ]
}
```

---

_`.well` Format Specification v2.3_
