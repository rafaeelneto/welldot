# `.well` File Format Specification — Version 2.3: Water Quality

**See also:** [overview.md](./overview.md) · [format-reference.md](./format-reference.md) · [object-schemas.md](./object-schemas.md) · [interoperability.md](./interoperability.md)

This document specifies the `water_samples` block _(since v2.3)_: the sample and result schemas, the recommended values, the unit rules, the `welldot` parameter vocabulary and how jurisdiction requirements are expressed. Cross-cutting rules that also cover water samples stay in their general sections: datetimes and the `_resolution: "day"` convention, canonical units and field bindings, cross-references, uniqueness and precision in [format-reference.md](format-reference.md); attachments, ledger corrections and `history_logs` links in [object-schemas.md](object-schemas.md). The Complete Example in object-schemas.md includes water samples.

## Contents

- [`water_samples[]`](#water_samples)
- [Recommended values](#recommended-values)
- [Units](#units)
- [Parameter vocabulary](#parameter-vocabulary)
- [Regulatory profiles](#regulatory-profiles)

---

## `water_samples[]`

A ledger: each entry is one collection of water from the well, with the results measured on it in the field and in the laboratory. Entries are never edited in place. A corrected laboratory report, or a revalidation of data already recorded, is a new sample whose `corrects` holds the id of the retracted sample, following object-schemas.md § `hydrodynamic_events[]` — Corrections (retracted samples stay in the file and are excluded from every derivation; chains are allowed; a cycle emits a warning).

The block serves drinking-water compliance, environmental and mining monitoring under licence, and hydrochemistry, in any jurisdiction. It follows the rigor of audited monitoring (chain of custody, field QA/QC, filtration, lab flags, data validation) with almost every field optional. It is jurisdiction-neutral: limits, exceedances and national rules are never stored; see § Parameter vocabulary — Limit sets are not part of the file.

Out of scope: limits and exceedances, sampling schedules, high-frequency telemetry (only aggregates enter), interpreted assessment (class, facies), and the laboratory's internal QC (method blanks, matrix spikes).

### `WaterSample`

| Field                   | Type             | Required    | Unit | Description                                                                                                                                                   |
| ----------------------- | ---------------- | ----------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                    | string           | yes         |      | Unique within `water_samples`. UUID v4 recommended.                                                                                                           |
| `datetime`              | string (instant) | yes         |      | RFC 3339 instant of collection.                                                                                                                               |
| `sample_type`           | string           | yes         |      | `routine`, `field_duplicate`, `split_sample`, `field_blank`, `trip_blank`, `equipment_blank`, `x-…`. See format-reference.md § `water_samples[].sample_type`. |
| `parent_sample_id`      | string           | conditional |      | `water_samples[].id` of the original sample. Expected for `field_duplicate` and `split_sample` (absence emits a warning).                                     |
| `sequence`              | integer          | no          |      | Tie-breaker among samples at the same instant, lower first. Orders the samples of a vertical profile.                                                         |
| `campaign`              | string           | no          |      | Free identifier of the sampling campaign.                                                                                                                     |
| `sampling_method`       | string           | no          |      | How the well was purged: `low_flow`, `volumetric_purge`, `no_purge`, `pump_discharge`, `x-…`.                                                                 |
| `sampling_point`        | `SamplingPoint`  | no          |      | Where the water was taken. See below.                                                                                                                         |
| `purge`                 | `Purge`          | no          |      | Purge before collection. See below.                                                                                                                           |
| `static_level_event_id` | string           | no          |      | `hydrodynamic_events[].id` with the water level measured at collection.                                                                                       |
| `collected_by`          | string           | no          |      | Person or team that collected the sample.                                                                                                                     |
| `preservation`          | string           | no          |      | Preservation and packaging, free text.                                                                                                                        |
| `chain_of_custody`      | string           | no          |      | Chain of custody number.                                                                                                                                      |
| `laboratory`            | `Laboratory`     | no          |      | See below.                                                                                                                                                    |
| `corrects`              | string           | no          |      | `water_samples[].id` of the sample this one retracts.                                                                                                         |
| `notes`                 | string           | no          |      |                                                                                                                                                               |
| `attachments`           | `Attachment[]`   | no          |      | The laboratory report with `document_type: "lab_report"`. See § Attachment.                                                                                   |
| `results`               | `Result[]`       | yes         |      | At least one. Field and laboratory results in one list, distinguished by `measured_in`.                                                                       |

### `SamplingPoint`

| Field                  | Type   | Required | Unit | Description                                                                                                                                  |
| ---------------------- | ------ | -------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`                 | string | yes      |      | `pump_discharge`, `wellhead_tap`, `in_well`, `x-…`. See format-reference.md § `water_samples[].sampling_point.type`.                         |
| `depth`                | number | no       | m    | Point depth of the sampler intake, from ground level. Mutually exclusive with `from`/`to`.                                                   |
| `depth_precision`      | number | no       | m    | One-sigma precision of `depth`.                                                                                                              |
| `from`                 | number | no       | m    | Top of the isolated interval.                                                                                                                |
| `to`                   | number | no       | m    | Bottom of the isolated interval.                                                                                                             |
| `device`               | string | no       |      | What collected the water: `bailer`, `discrete_depth_sampler`, `passive_diffusion_bag`, `grab_sleeve`, `low_flow_pump`, `packer_pump`, `x-…`. |
| `pump_installation_id` | string | no       |      | `pump_installations[].id`, when the sample is taken at the production pump.                                                                  |

A sample's depth is a point, an interval, derived from the production pump, or unknown. All depths are measured from ground level.

| Situation         | `type`           | Geometry                                                      | Example                            |
| ----------------- | ---------------- | ------------------------------------------------------------- | ---------------------------------- |
| Production pump   | `pump_discharge` | `pump_installation_id`; depth derived from its `intake_depth` | Supply well                        |
| Wellhead tap      | `wellhead_tap`   | None                                                          | Routine potability                 |
| Point sampler     | `in_well`        | `depth`                                                       | Bailer, HydraSleeve, diffusion bag |
| Low-flow          | `in_well`        | `depth` of the sampling pump intake                           | ASTM D6771, ISO 5667-11            |
| Isolated interval | `in_well`        | `from` and `to`                                               | Packer, multilevel well            |
| Unknown           | `in_well`        | None                                                          | Historical record without depth    |

- `depth` together with `from` or `to` is malformed.
- With `pump_installation_id`, the depth is not repeated on the sampling point.
- Field measurements taken from the top of casing are converted to ground level by the producer, by the same rule as water levels.
- A vertical profile or a multilevel well is several samples at different depths, with the same `campaign` and `sequence` for ordering.

### `Purge`

All fields optional.

| Field        | Type             | Unit | Description                                         |
| ------------ | ---------------- | ---- | --------------------------------------------------- |
| `duration`   | number           | min  | Purge duration.                                     |
| `volume`     | number           | m³   | Purged volume.                                      |
| `flow_rate`  | number           | m³/h | Purge flow rate.                                    |
| `stabilized` | boolean          |      | Field parameters were stabilized before collection. |
| `readings`   | `PurgeReading[]` |      | Stabilization readings taken during the purge.      |

### `PurgeReading`

| Field       | Type        | Required | Unit      | Description                              |
| ----------- | ----------- | -------- | --------- | ---------------------------------------- |
| `elapsed`   | number      | yes      | min       | Time since the purge started.            |
| `parameter` | `Parameter` | yes      |           | `{ code, vocabulary }`, as in `results`. |
| `value`     | number      | yes      | canonical | Value in the parameter's canonical unit. |

`purge.readings` holds the stabilization series (pH, conductivity, temperature, dissolved oxygen, ORP, turbidity) that audits require. The final values at the time of collection go in `results` with `measured_in: "field"`.

### `Laboratory`

| Field                    | Type             | Required | Unit | Description                                                                               |
| ------------------------ | ---------------- | -------- | ---- | ----------------------------------------------------------------------------------------- |
| `name`                   | string           | yes      |      |                                                                                           |
| `accreditation`          | string           | no       |      | ISO/IEC 17025 (or equivalent) accreditation identifier.                                   |
| `report_number`          | string           | no       |      | Report number, preserved as issued.                                                       |
| `batch_id`               | string           | no       |      | Laboratory batch or work order.                                                           |
| `sample_id`              | string           | no       |      | The laboratory's own sample identifier.                                                   |
| `received_at`            | string (instant) | no       |      | When the laboratory received the sample.                                                  |
| `received_at_resolution` | string           | no       |      | `day` when only the date is known. See format-reference.md § Instants known only by date. |
| `received_temperature`   | number           | no       | °C   | Sample temperature on receipt.                                                            |

### `Result`

| Field                    | Type             | Required  | Unit      | Description                                                                   |
| ------------------------ | ---------------- | --------- | --------- | ----------------------------------------------------------------------------- |
| `parameter`              | `Parameter`      | yes       |           | What was measured. See below.                                                 |
| `value`                  | number           | one form  | canonical | Numeric result.                                                               |
| `presence`               | boolean          | one form  |           | Presence (`true`) or absence (`false`).                                       |
| `text`                   | string           | one form  |           | Qualitative result (odor, taste).                                             |
| `qualifier`              | string (enum)    | no        |           | `<`, `>`, `not_detected`, `estimated`. Censoring and estimation only.         |
| `unit`                   | string           | `x-` only |           | UCUM unit. Required for `x-` vocabularies, malformed for `welldot` and `cas`. |
| `detection_limit`        | number           | no        | canonical | Detection limit (LD / LOD).                                                   |
| `quantification_limit`   | number           | no        | canonical | Quantification limit (LQ / LOQ).                                              |
| `value_precision`        | number           | no        | canonical | One-sigma uncertainty. Expanded uncertainty from a report is divided by k.    |
| `fraction`               | string (enum)    | no        |           | `total`, `dissolved`, `suspended`.                                            |
| `filtration`             | `Filtration`     | no        |           | Filtration applied before analysis. Expected with `fraction: "dissolved"`.    |
| `measured_in`            | string (enum)    | no        |           | `field` or `lab`.                                                             |
| `method`                 | string           | no        |           | Analytical method, e.g. `ISO 7027`, `US EPA 200.8`, `SMEWW 4500-NO3 B`.       |
| `analyzed_at`            | string (instant) | no        |           | When the result was analyzed.                                                 |
| `analyzed_at_resolution` | string           | no        |           | `day` when only the date is known.                                            |
| `lab_flags`              | string[]         | no        |           | Laboratory flags as issued, uninterpreted.                                    |
| `validation`             | `Validation`     | no        |           | Data validation by a reviewer. See below.                                     |
| `notes`                  | string           | no        |           |                                                                               |

"Canonical" is the unit of the parameter in the vocabulary, or `unit` for `x-` codes. See § Units.

### `Parameter`

| Field        | Type   | Required | Description                                                                                   |
| ------------ | ------ | -------- | --------------------------------------------------------------------------------------------- |
| `code`       | string | yes      | Code in the vocabulary: a `welldot` code, a CAS Registry Number (`71-43-2`) or a custom code. |
| `vocabulary` | string | yes      | `welldot`, `cas` or `x-…`. Any other value is malformed.                                      |

The `welldot` codes, their units, value forms and CAS equivalences are listed in § Parameter vocabulary.

### `Filtration`

All fields optional.

| Field       | Type          | Unit | Description                    |
| ----------- | ------------- | ---- | ------------------------------ |
| `pore_size` | number        | µm   | Filter pore size, e.g. `0.45`. |
| `location`  | string (enum) |      | `field` or `lab`.              |

### `Validation`

| Field          | Type             | Required | Description                                                    |
| -------------- | ---------------- | -------- | -------------------------------------------------------------- |
| `status`       | string (enum)    | yes      | `unvalidated`, `validated`, `qualified`, `rejected`.           |
| `qualifier`    | string           | no       | Code of the validation guideline applied, e.g. `J`, `UJ`, `R`. |
| `guideline`    | string           | no       | Guideline used, free text.                                     |
| `validated_by` | string           | no       |                                                                |
| `validated_at` | string (instant) | no       |                                                                |

An absent `validation` is equivalent to `status: "unvalidated"`.

### Result rules

Each result has exactly one value form. Three annotation layers are kept apart: the censoring qualifier, the laboratory flags and the reviewer's validation.

| Form         | Field      | Used for                                         | `qualifier` allowed                    |
| ------------ | ---------- | ------------------------------------------------ | -------------------------------------- |
| Numeric      | `value`    | Almost every parameter                           | `<`, `>`, `estimated`                  |
| Presence     | `presence` | Presence codes (`total_coliforms`, `e_coli`)     | None                                   |
| Text         | `text`     | Odor, taste and other qualitative results        | None                                   |
| Not detected | none       | Below the detection limit with no reported value | `not_detected`, with `detection_limit` |

| Layer            | Field        | Set by                              | Example                                       |
| ---------------- | ------------ | ----------------------------------- | --------------------------------------------- |
| Censoring        | `qualifier`  | Normalized on import                | `<` 0.001                                     |
| Laboratory flags | `lab_flags`  | The laboratory, preserved as issued | `B` (blank contamination), `H` (holding time) |
| Validation       | `validation` | The data reviewer                   | `qualified` with `J`                          |

- `<` with `value` records the value the laboratory reported, usually the quantification or detection limit. It is neither zero nor absent.
- `>` covers upper bounds, such as counts above the method range.
- `estimated` marks values between the detection and quantification limits.
- `not_detected` without `detection_limit` emits a warning, because the result has no scale.
- `value_precision` is one sigma. Reports give an expanded uncertainty (usually k = 2); converters divide it by the coverage factor.
- `fraction: "dissolved"` is expected with `filtration`; without it, a warning is emitted. Dissolved metals filtered in the laboratory and in the field are not comparable in an audit.
- `lab_flags` has no vocabulary: codes vary by laboratory and country, and interpreting them is the job of validation.
- A `rejected` result is excluded from every derivation and from comparisons with limits. `qualified` results are kept.
- Revalidating the data of a recorded sample creates a new sample with `corrects`, like any ledger correction.
- The same parameter may appear twice in a sample when `fraction` or `measured_in` differ (total and dissolved iron; field and laboratory pH). An exact duplicate emits a warning.
- A `welldot` code and its CAS equivalent are the same parameter for duplicate detection and derivations.

### Malformed (rejected)

- `results` empty or absent.
- A result with more than one value form, or none without `qualifier: "not_detected"`; `not_detected` together with a value form; `<`, `>` or `estimated` without `value`.
- `unit` on a `welldot` or `cas` parameter; an `x-` parameter without `unit`; a `vocabulary` other than `welldot`, `cas` or `x-…`.
- `sampling_point.depth` together with `from` or `to`.
- An `_resolution` field with a value other than `day`; an instant without an offset.
- A value outside the closed enums `qualifier`, `fraction`, `measured_in`, `filtration.location`, `validation.status`. `sample_type`, `sampling_method`, `sampling_point.type` and `device` are open vocabularies.

### Validation (warnings, never rejection)

- `field_duplicate` or `split_sample` without `parent_sample_id`.
- `fraction: "dissolved"` without `filtration`.
- A sample depth outside every `well_screen` interval (stagnant casing water).
- A sample depth below `well_depth`.
- A sample depth above the static level of `static_level_event_id`.
- `presence` on a numeric code, or `value` on a presence code (value form different from the vocabulary's).
- `not_detected` without `detection_limit`.
- The same parameter, `fraction` and `measured_in` repeated in one sample.
- A `welldot` code unknown to the vocabulary version.
- `analyzed_at` or `laboratory.received_at` earlier than the collection `datetime`.
- A reference that does not resolve: `corrects`, `parent_sample_id`, `static_level_event_id`, `sampling_point.pump_installation_id`.
- A `corrects` cycle.

### Derived values

Derived values are computed by `@welldot/utils` and never stored. Retracted samples and `rejected` results are excluded from all of them.

- Exceedances against a selectable limit set (WHO, EU 2020/2184, Brazil, …) or the user's own limits. `<` and `not_detected` results never exceed; for presence limits, presence exceeds. `turbidity`, `turbidity_ntu` and `turbidity_fnu` compare with nephelometric limits, and `turbidity_fau` is never compared.
- Ion balance, converting mg/L to meq/L with the molar mass and charge of each code.
- Relative percent difference (RPD) between a duplicate or split and its original sample, per parameter.
- Blank contamination: parameters detected in `field_blank`, `trip_blank` or `equipment_blank` samples of the same `campaign`.
- Holding time, from `datetime` to `analyzed_at`, at the available resolution.
- Receipt temperature compliance.
- Purge stabilization from `purge.readings`.
- Acid drainage indicators (net alkalinity, sulfate/chloride ratio).
- Piper and Stiff coordinates and the hydrochemical facies.
- Effective sample depth (from `sampling_point`, or the pump's `intake_depth`) and whether the sample represents formation water (inside a screen interval and below the static level).

### History log links

A `history_logs` entry of category `maintenance` with `maintenance_type: "water_sampling"` records the task and points to the sample with `sample_id`. A `permit_condition` entry for a `water_quality_analysis` condition fulfills the deadline by pointing to the sample the same way. See object-schemas.md § `history_logs[]` — Category-specific fields.

---

## Recommended values

Non-canonical values of these open vocabularies SHOULD use the `x-` prefix.

### `water_samples[].sample_type` — Recommended values _(since v2.3)_

| Value             | Portuguese (BR)          | Description                                                                           |
| ----------------- | ------------------------ | ------------------------------------------------------------------------------------- |
| `routine`         | Amostra de rotina        | Regular sample of the well water.                                                     |
| `field_duplicate` | Duplicata de campo       | Second sample collected at the same time and point. Requires `parent_sample_id`.      |
| `split_sample`    | Amostra dividida (split) | One sample split between laboratories (interlaboratory). Requires `parent_sample_id`. |
| `field_blank`     | Branco de campo          | Analyte-free water exposed to field conditions.                                       |
| `trip_blank`      | Branco de transporte     | Analyte-free water that travels with the samples, unopened.                           |
| `equipment_blank` | Branco de equipamento    | Analyte-free water passed through the sampling equipment after decontamination.       |

Non-canonical values SHOULD use the `x-` prefix. Laboratory internal QC (method blanks, matrix spikes) is out of scope.

### `water_samples[].sampling_method` — Recommended values _(since v2.3)_

`sampling_method` describes the purge; `sampling_point.device` describes what collected the water. Portuguese terms follow ABNT NBR 15847 (métodos de purga).

| Value              | Portuguese (BR)                   | Description                                                                             |
| ------------------ | --------------------------------- | --------------------------------------------------------------------------------------- |
| `low_flow`         | Purga de baixa vazão (micropurga) | Low-flow purging with stabilization of field parameters (e.g. ASTM D6771, ISO 5667-11). |
| `volumetric_purge` | Purga de volume determinado       | Removal of a set number of well volumes before sampling.                                |
| `no_purge`         | Amostragem sem purga              | Passive or no-purge sampling.                                                           |
| `pump_discharge`   | Bomba de produção em operação     | Collected from the running production pump.                                             |

Non-canonical values SHOULD use the `x-` prefix.

### `water_samples[].sampling_point.type` — Recommended values _(since v2.3)_

| Value            | Portuguese (BR)            | Description                                                                 |
| ---------------- | -------------------------- | --------------------------------------------------------------------------- |
| `pump_discharge` | Saída da bomba de produção | Production pump discharge; depth derived from `pump_installation_id`.       |
| `wellhead_tap`   | Torneira do cavalete       | Tap at the wellhead; no depth.                                              |
| `in_well`        | Dentro do poço             | Sampler inside the well, at `depth`, over `from`/`to`, or at unknown depth. |

Non-canonical values SHOULD use the `x-` prefix.

### `water_samples[].sampling_point.device` — Recommended values _(since v2.3)_

| Value                    | Portuguese (BR)                            |
| ------------------------ | ------------------------------------------ |
| `bailer`                 | Bailer (amostrador de retenção)            |
| `discrete_depth_sampler` | Amostrador pontual de profundidade         |
| `passive_diffusion_bag`  | Bolsa de difusão passiva                   |
| `grab_sleeve`            | Amostrador passivo tipo luva (HydraSleeve) |
| `low_flow_pump`          | Bomba de baixa vazão                       |
| `packer_pump`            | Bomba com obturador (packer)               |

Non-canonical values SHOULD use the `x-` prefix.

---

## Units

A water quality result never declares a unit for a known parameter: the unit comes from the parameter code.

1. **Substances** (vocabulary `welldot` or `cas`) are always in mg/L. µg/L, ng/L and g/L are converted on import.
2. **Parameters that are not concentrations** (pH, conductivity, temperature, redox potential, turbidity, color, microbiology, radioactivity) have the unit fixed by their `welldot` code; see § Parameter vocabulary. pH is dimensionless.
3. **`x-` vocabulary codes** require `unit`, in UCUM. This is the only exception to the rule that the file never declares units. `unit` on a `welldot` or `cas` parameter is malformed, and an `x-` code without `unit` is malformed.
4. **Turbidity and microbiological counts** are separated by code, not by unit: `turbidity_ntu`, `turbidity_fnu`, `turbidity_fau` and the generic `turbidity` (FTU, formazin with no identified method); `_mpn` and `_cfu` count codes beside the presence codes.

Regional unit names are normalized on import:

| Reported unit        | Normalized to                                     |
| -------------------- | ------------------------------------------------- |
| µg/L, ng/L, g/L      | mg/L                                              |
| mS/m                 | µS/cm (×10)                                       |
| mS/cm                | µS/cm (×1000)                                     |
| uT, FTU              | generic `turbidity` code                          |
| NTU, FNU, FAU        | `turbidity_ntu`, `turbidity_fnu`, `turbidity_fau` |
| mg Pt-Co/L, PCU, TCU | uH (numerically equal)                            |

The basis of expression lives in the code, never in the unit: nitrate reported "as N" and "as NO₃⁻" are different parameters (`nitrate_as_n`, `nitrate_as_no3`). `@welldot/core` provides `concentrationToCanonical`, `milliSiemensPerMeterToMicroSiemensPerCm`, `milliSiemensPerCmToMicroSiemensPerCm`, `turbidityCodeForUnit`, `normalizeColorUnit` and `expandedToStandardUncertainty` for these conversions.

---

## Parameter vocabulary

A parameter is identified by an object `{ code, vocabulary }`, like `texture`:

```json
{ "code": "nitrate_as_n", "vocabulary": "welldot" }
{ "code": "71-43-2", "vocabulary": "cas" }
{ "code": "glyphosate_ampa", "vocabulary": "x-lab-codes" }
```

`vocabulary` is `welldot`, `cas` or an `x-…` vocabulary; any other value is malformed.

### Vocabulary rules

1. **Substances** (`welldot` or `cas`) are always in mg/L. Conversions such as µg/L → mg/L happen on import.
2. **Parameters that are not concentrations** have their unit fixed by the `welldot` vocabulary (pH, conductivity, temperature, redox potential, turbidity, color, microbiology, radioactivity).
3. **`x-` codes** require `unit`, in UCUM. This is the only exception to the spec's unit rule.
4. **The basis of expression is part of the code.** `nitrate_as_n` and `nitrate_as_no3` are different parameters. A CAS code always means the substance itself. There is no `basis` field.
5. **Preference.** When a `welldot` code exists it is used instead of the CAS number. The vocabulary publishes the equivalences, and parsers treat a `welldot` code and its equivalent CAS number as the same parameter.
6. **Labels and translations.** The canonical label is English. Translations, regional synonyms and descriptions live in the published vocabulary, which is versioned (`WATER_QUALITY_VOCABULARY_VERSION` in `@welldot/core`).
7. **Regional unit names** are normalized on import: uT and FTU → `turbidity`; mg Pt-Co/L, PCU and TCU → uH; mS/m → µS/cm (×10). See § Units.

A `welldot` code unknown to the vocabulary version emits a warning, never a rejection. Any other substance is recorded by its CAS number, in mg/L.

### Core vocabulary

The core list has 98 `welldot` codes. The Mining and redox group and the additional metals cover acid drainage, gold leaching (cyanide) and explosives (nitrogen species). The Form column gives the value form a result of that code uses (`value`, `presence` or `text`); see § `water_samples[]` — Result rules.

| Group            | Code                              | Label (EN)                                            | Portuguese (BR)                             | Unit       | Form     | CAS        |
| ---------------- | --------------------------------- | ----------------------------------------------------- | ------------------------------------------- | ---------- | -------- | ---------- |
| Physical / field | `temperature`                     | Temperature                                           | Temperatura                                 | °C         | value    |            |
| Physical / field | `ph`                              | pH                                                    | pH                                          | —          | value    |            |
| Physical / field | `specific_conductance`            | Specific conductance at 25 °C                         | Condutividade elétrica a 25 °C              | µS/cm      | value    |            |
| Physical / field | `conductivity_uncompensated`      | Electrical conductivity, uncompensated                | Condutividade sem compensação               | µS/cm      | value    |            |
| Physical / field | `dissolved_oxygen`                | Dissolved oxygen                                      | Oxigênio dissolvido                         | mg/L       | value    |            |
| Physical / field | `orp`                             | Oxidation-reduction potential vs. reference electrode | Potencial redox vs. eletrodo de referência  | mV         | value    |            |
| Physical / field | `eh`                              | Redox potential vs. SHE                               | Potencial redox corrigido vs. EPH           | mV         | value    |            |
| Physical / field | `turbidity`                       | Turbidity, formazin, method unspecified               | Turbidez, formazina sem método identificado | FTU        | value    |            |
| Physical / field | `turbidity_ntu`                   | Turbidity, nephelometric white light                  | Turbidez nefelométrica, luz branca          | NTU        | value    |            |
| Physical / field | `turbidity_fnu`                   | Turbidity, nephelometric infrared (ISO 7027)          | Turbidez nefelométrica, infravermelho       | FNU        | value    |            |
| Physical / field | `turbidity_fau`                   | Turbidity, attenuation (ISO 7027)                     | Turbidez por atenuação                      | FAU        | value    |            |
| Physical / field | `apparent_color`                  | Apparent color                                        | Cor aparente                                | uH         | value    |            |
| Physical / field | `true_color`                      | True color                                            | Cor verdadeira                              | uH         | value    |            |
| Physical / field | `odor`                            | Odor                                                  | Odor                                        | —          | text     |            |
| Physical / field | `taste`                           | Taste                                                 | Gosto                                       | —          | text     |            |
| Physical / field | `total_dissolved_solids`          | Total dissolved solids                                | Sólidos totais dissolvidos                  | mg/L       | value    |            |
| Physical / field | `total_suspended_solids`          | Total suspended solids                                | Sólidos suspensos totais                    | mg/L       | value    |            |
| Physical / field | `total_solids`                    | Total solids                                          | Sólidos totais                              | mg/L       | value    |            |
| Physical / field | `free_co2`                        | Free carbon dioxide                                   | Gás carbônico livre                         | mg/L       | value    |            |
| Aggregate        | `alkalinity_total_as_caco3`       | Total alkalinity as CaCO₃                             | Alcalinidade total como CaCO₃               | mg/L       | value    |            |
| Aggregate        | `alkalinity_bicarbonate_as_caco3` | Bicarbonate alkalinity as CaCO₃                       | Alcalinidade de bicarbonatos como CaCO₃     | mg/L       | value    |            |
| Aggregate        | `alkalinity_carbonate_as_caco3`   | Carbonate alkalinity as CaCO₃                         | Alcalinidade de carbonatos como CaCO₃       | mg/L       | value    |            |
| Aggregate        | `alkalinity_hydroxide_as_caco3`   | Hydroxide alkalinity as CaCO₃                         | Alcalinidade de hidróxidos como CaCO₃       | mg/L       | value    |            |
| Aggregate        | `acidity_total_as_caco3`          | Total acidity as CaCO₃                                | Acidez total como CaCO₃                     | mg/L       | value    |            |
| Aggregate        | `hardness_total_as_caco3`         | Total hardness as CaCO₃                               | Dureza total como CaCO₃                     | mg/L       | value    |            |
| Aggregate        | `hardness_calcium_as_caco3`       | Calcium hardness as CaCO₃                             | Dureza de cálcio como CaCO₃                 | mg/L       | value    |            |
| Major ion        | `calcium`                         | Calcium                                               | Cálcio                                      | mg/L       | value    | 7440-70-2  |
| Major ion        | `magnesium`                       | Magnesium                                             | Magnésio                                    | mg/L       | value    | 7439-95-4  |
| Major ion        | `sodium`                          | Sodium                                                | Sódio                                       | mg/L       | value    | 7440-23-5  |
| Major ion        | `potassium`                       | Potassium                                             | Potássio                                    | mg/L       | value    | 7440-09-7  |
| Major ion        | `bicarbonate`                     | Bicarbonate as HCO₃⁻                                  | Bicarbonato como HCO₃⁻                      | mg/L       | value    | 71-52-3    |
| Major ion        | `carbonate`                       | Carbonate as CO₃²⁻                                    | Carbonato como CO₃²⁻                        | mg/L       | value    | 3812-32-6  |
| Major ion        | `chloride`                        | Chloride                                              | Cloreto                                     | mg/L       | value    | 16887-00-6 |
| Major ion        | `sulfate`                         | Sulfate                                               | Sulfato                                     | mg/L       | value    | 14808-79-8 |
| Major ion        | `fluoride`                        | Fluoride                                              | Fluoreto                                    | mg/L       | value    | 16984-48-8 |
| Major ion        | `silica_as_sio2`                  | Silica as SiO₂                                        | Sílica como SiO₂                            | mg/L       | value    | 7631-86-9  |
| Nutrient         | `nitrate_as_n`                    | Nitrate as N                                          | Nitrato como N                              | mg/L       | value    |            |
| Nutrient         | `nitrate_as_no3`                  | Nitrate as NO₃⁻                                       | Nitrato como NO₃⁻                           | mg/L       | value    | 14797-55-8 |
| Nutrient         | `nitrite_as_n`                    | Nitrite as N                                          | Nitrito como N                              | mg/L       | value    |            |
| Nutrient         | `nitrite_as_no2`                  | Nitrite as NO₂⁻                                       | Nitrito como NO₂⁻                           | mg/L       | value    | 14797-65-0 |
| Nutrient         | `ammonia_as_n`                    | Ammonia nitrogen as N                                 | Nitrogênio amoniacal como N                 | mg/L       | value    |            |
| Nutrient         | `ammonia_as_nh3`                  | Ammonia as NH₃                                        | Amônia como NH₃                             | mg/L       | value    | 7664-41-7  |
| Nutrient         | `kjeldahl_nitrogen_as_n`          | Total Kjeldahl nitrogen as N                          | Nitrogênio Kjeldahl total como N            | mg/L       | value    |            |
| Nutrient         | `phosphorus_total_as_p`           | Total phosphorus as P                                 | Fósforo total como P                        | mg/L       | value    |            |
| Nutrient         | `orthophosphate_as_po4`           | Orthophosphate as PO₄³⁻                               | Ortofosfato como PO₄³⁻                      | mg/L       | value    |            |
| Organic          | `total_organic_carbon`            | Total organic carbon                                  | Carbono orgânico total                      | mg/L       | value    |            |
| Organic          | `cod`                             | Chemical oxygen demand                                | Demanda química de oxigênio (DQO)           | mg/L       | value    |            |
| Organic          | `bod5`                            | Biochemical oxygen demand, 5-day                      | Demanda bioquímica de oxigênio (DBO₅)       | mg/L       | value    |            |
| Organic          | `total_petroleum_hydrocarbons`    | Total petroleum hydrocarbons (range per method)       | Hidrocarbonetos totais de petróleo          | mg/L       | value    |            |
| Organic          | `oil_and_grease`                  | Oil and grease                                        | Óleos e graxas                              | mg/L       | value    |            |
| Disinfection     | `free_chlorine`                   | Free chlorine residual                                | Cloro residual livre                        | mg/L       | value    |            |
| Disinfection     | `total_chlorine`                  | Total chlorine residual                               | Cloro residual total                        | mg/L       | value    |            |
| Mining and redox | `ferrous_iron`                    | Ferrous iron (Fe²⁺)                                   | Ferro ferroso (Fe²⁺)                        | mg/L       | value    |            |
| Mining and redox | `chromium_hexavalent`             | Hexavalent chromium                                   | Cromo hexavalente                           | mg/L       | value    | 18540-29-9 |
| Mining and redox | `cyanide_total_as_cn`             | Total cyanide as CN⁻                                  | Cianeto total como CN⁻                      | mg/L       | value    |            |
| Mining and redox | `cyanide_wad_as_cn`               | Weak acid dissociable cyanide as CN⁻                  | Cianeto WAD como CN⁻                        | mg/L       | value    |            |
| Mining and redox | `cyanide_free_as_cn`              | Free cyanide as CN⁻                                   | Cianeto livre como CN⁻                      | mg/L       | value    |            |
| Mining and redox | `thiocyanate`                     | Thiocyanate                                           | Tiocianato                                  | mg/L       | value    | 302-04-5   |
| Mining and redox | `sulfide_total_as_s`              | Total sulfide as S                                    | Sulfeto total como S                        | mg/L       | value    |            |
| Metal / trace    | `iron`                            | Iron                                                  | Ferro                                       | mg/L       | value    | 7439-89-6  |
| Metal / trace    | `manganese`                       | Manganese                                             | Manganês                                    | mg/L       | value    | 7439-96-5  |
| Metal / trace    | `aluminum`                        | Aluminium                                             | Alumínio                                    | mg/L       | value    | 7429-90-5  |
| Metal / trace    | `antimony`                        | Antimony                                              | Antimônio                                   | mg/L       | value    | 7440-36-0  |
| Metal / trace    | `arsenic`                         | Arsenic                                               | Arsênio                                     | mg/L       | value    | 7440-38-2  |
| Metal / trace    | `barium`                          | Barium                                                | Bário                                       | mg/L       | value    | 7440-39-3  |
| Metal / trace    | `beryllium`                       | Beryllium                                             | Berílio                                     | mg/L       | value    | 7440-41-7  |
| Metal / trace    | `boron`                           | Boron                                                 | Boro                                        | mg/L       | value    | 7440-42-8  |
| Metal / trace    | `cadmium`                         | Cadmium                                               | Cádmio                                      | mg/L       | value    | 7440-43-9  |
| Metal / trace    | `chromium`                        | Chromium, total                                       | Cromo total                                 | mg/L       | value    | 7440-47-3  |
| Metal / trace    | `cobalt`                          | Cobalt                                                | Cobalto                                     | mg/L       | value    | 7440-48-4  |
| Metal / trace    | `copper`                          | Copper                                                | Cobre                                       | mg/L       | value    | 7440-50-8  |
| Metal / trace    | `lead`                            | Lead                                                  | Chumbo                                      | mg/L       | value    | 7439-92-1  |
| Metal / trace    | `lithium`                         | Lithium                                               | Lítio                                       | mg/L       | value    | 7439-93-2  |
| Metal / trace    | `mercury`                         | Mercury                                               | Mercúrio                                    | mg/L       | value    | 7439-97-6  |
| Metal / trace    | `molybdenum`                      | Molybdenum                                            | Molibdênio                                  | mg/L       | value    | 7439-98-7  |
| Metal / trace    | `nickel`                          | Nickel                                                | Níquel                                      | mg/L       | value    | 7440-02-0  |
| Metal / trace    | `selenium`                        | Selenium                                              | Selênio                                     | mg/L       | value    | 7782-49-2  |
| Metal / trace    | `silver`                          | Silver                                                | Prata                                       | mg/L       | value    | 7440-22-4  |
| Metal / trace    | `strontium`                       | Strontium                                             | Estrôncio                                   | mg/L       | value    | 7440-24-6  |
| Metal / trace    | `thallium`                        | Thallium                                              | Tálio                                       | mg/L       | value    | 7440-28-0  |
| Metal / trace    | `uranium`                         | Uranium                                               | Urânio                                      | mg/L       | value    | 7440-61-1  |
| Metal / trace    | `vanadium`                        | Vanadium                                              | Vanádio                                     | mg/L       | value    | 7440-62-2  |
| Metal / trace    | `zinc`                            | Zinc                                                  | Zinco                                       | mg/L       | value    | 7440-66-6  |
| Microbiology     | `total_coliforms`                 | Total coliforms in 100 mL                             | Coliformes totais em 100 mL                 | —          | presence |            |
| Microbiology     | `total_coliforms_mpn`             | Total coliforms, count                                | Coliformes totais, contagem                 | MPN/100 mL | value    |            |
| Microbiology     | `total_coliforms_cfu`             | Total coliforms, count                                | Coliformes totais, contagem                 | CFU/100 mL | value    |            |
| Microbiology     | `e_coli`                          | _E. coli_ in 100 mL                                   | _E. coli_ em 100 mL                         | —          | presence |            |
| Microbiology     | `e_coli_mpn`                      | _E. coli_, count                                      | _E. coli_, contagem                         | MPN/100 mL | value    |            |
| Microbiology     | `e_coli_cfu`                      | _E. coli_, count                                      | _E. coli_, contagem                         | CFU/100 mL | value    |            |
| Microbiology     | `thermotolerant_coliforms`        | Thermotolerant coliforms in 100 mL                    | Coliformes termotolerantes em 100 mL        | —          | presence |            |
| Microbiology     | `thermotolerant_coliforms_mpn`    | Thermotolerant coliforms, count                       | Coliformes termotolerantes, contagem        | MPN/100 mL | value    |            |
| Microbiology     | `thermotolerant_coliforms_cfu`    | Thermotolerant coliforms, count                       | Coliformes termotolerantes, contagem        | CFU/100 mL | value    |            |
| Microbiology     | `heterotrophic_plate_count`       | Heterotrophic plate count                             | Bactérias heterotróficas                    | CFU/mL     | value    |            |
| Radioactivity    | `gross_alpha`                     | Gross alpha activity                                  | Atividade alfa total                        | Bq/L       | value    |            |
| Radioactivity    | `gross_beta`                      | Gross beta activity                                   | Atividade beta total                        | Bq/L       | value    |            |
| Radioactivity    | `radium_226`                      | Radium-226                                            | Rádio-226                                   | Bq/L       | value    | 13982-63-3 |
| Radioactivity    | `radium_228`                      | Radium-228                                            | Rádio-228                                   | Bq/L       | value    | 15262-20-1 |
| Radioactivity    | `radon_222`                       | Radon-222                                             | Radônio-222                                 | Bq/L       | value    | 14859-67-7 |

The CAS numbers listed are the published equivalences: a result coded by that CAS number is treated as the corresponding `welldot` code. Codes whose basis differs from the substance (such as `nitrate_as_n`) or that measure an analytical fraction (such as `cyanide_wad_as_cn`) have no CAS equivalent. Radionuclides are in Bq/L even though they have CAS numbers, an exception to the mg/L rule; uranium by mass stays under `uranium` (mg/L).

### Limit sets are not part of the file

Limits, guideline values and exceedances are never written to a `.well` file, and no field names a national standard. `@welldot/core` bundles selectable limit sets as separate data (WHO Guidelines for Drinking-water Quality, EU Directive 2020/2184, Brazil GM/MS 888/2021), and consumers compare results against the set the user picks, or against their own limits. In turbidity comparisons, `turbidity`, `turbidity_ntu` and `turbidity_fnu` compare with nephelometric limits; `turbidity_fau` is never compared. Local obligations (which parameters, how often) are expressed by profiles; see § Regulatory profiles.

---

## Regulatory profiles

Jurisdiction-specific water quality requirements live in profiles, not in the core format. A drinking-water profile for one jurisdiction might require, for wells with `well_purpose` `production`:

- at least one `water_samples` entry per calendar year with results for a fixed parameter list (e.g. `e_coli`, `total_coliforms`, `turbidity_ntu`, `free_chlorine`, `nitrate_as_n`, `fluoride`);
- monthly `e_coli` and `total_coliforms` results (presence form) and half-yearly results for the full list;
- `laboratory.accreditation` on every sample and an attachment with `document_type: "lab_report"`.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.org/profiles/drinking-water/v1/schema.json",
  "allOf": [{ "$ref": "https://welldot.org/schema/v2/well.schema.json" }],
  "required": ["water_samples"],
  "properties": {
    "water_samples": {
      "items": {
        "required": ["laboratory", "attachments"],
        "properties": {
          "laboratory": { "required": ["name", "accreditation"] }
        }
      }
    }
  }
}
```

Frequency rules that JSON Schema cannot express (one sample per month, one per year) are checked by profile-aware tools and surfaced as warnings, like any profile failure. The limits that results are compared against still come from a limit set, never from the file.
