# `.well` Format Specification — Quick Reference (v2.3)

**Extension:** `.well` | **Encoding:** UTF-8 | **Base format:** JSON
**MIME type:** `application/vnd.well+json`

This is a condensed reference for extraction. The normative source is
`packages/core/docs/spec/v2/{format-reference,object-schemas}.md` in the repo — when in doubt, that wins.

---

## Units (all SI, no per-file declaration)

| Measure                                                                          | Unit                                                                                                                                                   |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Depths, lengths, elevation                                                       | meters                                                                                                                                                 |
| Diameters, screen slot                                                           | millimeters                                                                                                                                            |
| Coordinates                                                                      | WGS84 decimal degrees                                                                                                                                  |
| Volumetric flow rate                                                             | m³/h                                                                                                                                                   |
| Elapsed time, duration                                                           | minutes                                                                                                                                                |
| Transmissivity                                                                   | m²/s                                                                                                                                                   |
| Hydraulic conductivity                                                           | m/s                                                                                                                                                    |
| Pressure                                                                         | kPa                                                                                                                                                    |
| Azimuth (0–360), dip (0–90)                                                      | degrees                                                                                                                                                |
| `construction_date`                                                              | ISO 8601 calendar date, `YYYY-MM-DD` — no time, no offset                                                                                              |
| Every other datetime (`hydrodynamic_events`, `aquifer_analysis`, `history_logs`) | RFC 3339 instant with **mandatory UTC offset**, e.g. `2006-03-14T08:00:00-03:00` or `...Z`. A naked timestamp with no offset is malformed — reject it. |

---

## Top-level structure

```json
{
  "version": 2,
  "well_type": "tubular",
  "well_purpose": ["production"],
  "name": "...",
  "well_driller": "...",
  "construction_date": "YYYY-MM-DD",
  "obs": "...",
  "well_depth": 42.0,

  "well_id": [ { "authority": "...", "id": "...", "primary": true } ],
  "location": {
    "lat": -1.4558, "lng": -48.5039, "elevation": 12.5,
    "properties": { "elevation_datum": "wgs84_ellipsoid", "crs": "EPSG:4326" }
  },
  "profiles": [],

  "bore_hole": [...], "well_case": [...], "reduction": [...], "well_screen": [...],
  "surface_case": [...], "hole_fill": [...], "centralizers": [...], "cement_pad": {...},

  "lithology": [...], "fractures": [...], "caves": [...],

  "hydrodynamic_events": [...], "aquifer_analysis": [...], "history_logs": [...],

  "attachments": [...], "pump_installations": [...]
}
```

`location` supersedes v1's flat top-level `lat`/`lng`/`elevation`. `elevation` is meters above the WGS84
ellipsoid unless `properties.elevation_datum` says otherwise; only report an elevation if the document
states one — never estimate it.

### `well_type` — open vocabulary (construction method only)

`tubular` | `hand_dug` | `horizontal` | `infiltration_gallery`. Any string is accepted; use
the recommended values above when they fit, otherwise write the term as an `x-`-prefixed value (e.g.
`x-radial_collector`) rather than forcing a mismatch.

**Do not emit `artesian`** (deprecated in v2.1). A report saying "poço artesiano"/"jorrante" describes a
hydraulic condition: set `well_type` to the construction method (usually `tubular`) and, if the report
gives a static level above ground, record it as a `spot_measurement` with a **negative** `static_level`.
Never invent a level to encode the condition.

### `well_purpose` — open vocabulary, array (v2.1, optional)

`production` | `monitoring` | `piezometer` | `water_level_indicator` (INA) | `observation` |
`exploration` | `injection` | `dewatering`. Only fill it when the report states the use (e.g.
"poço de monitoramento", "piezômetro", "captação para abastecimento"); omit the field otherwise.
Several values are allowed (e.g. `["production", "monitoring"]`). Non-canonical uses take the `x-` prefix.

### Level sign convention

Depths grow downward from ground level (0). Water levels **above** ground are **negative**
(`static_level`, `LevelReading.depth`, `aquifer_analysis` levels).

### `well_depth` — current/usable depth, not the drilled depth

Number, meters, optional. Distinct from the as-drilled depth, which is `bore_hole[].to` (the last/deepest
bore hole interval) — not this field. A report that states a single depth figure ("profundidade total",
"total depth") is describing the drilled depth: put it in `bore_hole`, leave `well_depth` unset. Only set
`well_depth` when the report explicitly gives a _separate_ current/usable/measured depth distinct from
the original drilled depth — e.g. a re-survey noting the well is now shallower due to siltation, debris,
or partial backfill ("profundidade útil" in SIAGAS-style Brazilian records). Never duplicate the same
number into both fields.

---

## Constructive objects

**Read this carefully — these fields split into three different tiers. Getting the tier wrong is the
single most common extraction mistake for this format.**

### `bore_hole[]`

| Field             | Type        | Required | Notes                                              |
| ----------------- | ----------- | -------- | -------------------------------------------------- |
| `from`, `to`      | number (m)  | yes      |                                                    |
| `diameter`        | number (mm) | yes      |                                                    |
| `drilling_method` | string      | no       | **Tier 1 — recommended, not enforced.** See below. |

**Tier 1 field.** Recommended values: `rotary`, `percussion`, `cable_tool`, `auger`, `air_hammer`. Use one
of these **only if the report's own wording maps to it losslessly** — no dropped nuance, no discarded
equipment/brand detail. If the method is hybrid, unusual, or described with detail beyond a bare method
name, transcribe the report's own phrase instead, in the report's own language. Never force a mismatched
canonical term just to have a canonical value.

### `well_case[]`

| Field        | Type        | Required | Notes                        |
| ------------ | ----------- | -------- | ---------------------------- |
| `from`, `to` | number (m)  | yes      |                              |
| `type`       | string      | yes      | **Tier 2 — pure free text.** |
| `diameter`   | number (mm) | yes      |                              |

**Tier 2 field — no recommended vocabulary exists in the spec at all.** There is nothing to canonicalize
toward. Always transcribe the report's material/casing description verbatim in its original language
(e.g. "aço carbono", "PVC geomecânico"). Do not invent or apply enum values like `steel`/`pvc`/`hdpe` —
those are not part of the spec.

### `reduction[]`

| Field                  | Type        | Required | Notes                                                       |
| ---------------------- | ----------- | -------- | ----------------------------------------------------------- |
| `from`, `to`           | number (m)  | yes      |                                                             |
| `diam_from`, `diam_to` | number (mm) | yes      |                                                             |
| `type`                 | string      | yes      | **Tier 2 — pure free text**, same rule as `well_case.type`. |

### `well_screen[]`

| Field         | Type        | Required | Notes                                                                                                                                          |
| ------------- | ----------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `from`, `to`  | number (m)  | yes      |                                                                                                                                                |
| `type`        | string      | yes      | **Tier 2 — pure free text.** No enforced vocabulary (do not use `wire_wound`/`bridge_slot`/etc. as an enum — transcribe the report's wording). |
| `diameter`    | number (mm) | yes      |                                                                                                                                                |
| `screen_slot` | number (mm) | yes      | v2 name — **not** `screen_slot_mm`. Value and unit unchanged from v1, only the field name changed.                                             |

### `surface_case[]`

| Field        | Type        | Required |
| ------------ | ----------- | -------- |
| `from`, `to` | number (m)  | yes      |
| `diameter`   | number (mm) | yes      |

### `hole_fill[]`

| Field         | Type        | Required | Notes                                                                                                                                                                                    |
| ------------- | ----------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `from`, `to`  | number (m)  | yes      |                                                                                                                                                                                          |
| `type`        | string      | yes      | **Tier 3 — closed enum.** Exactly `gravel_pack` or `seal`. Classify the report's material into one of these two; this is the one field in this group that must NOT be left as free text. |
| `diameter`    | number (mm) | yes      |                                                                                                                                                                                          |
| `description` | string      | yes      | Near-verbatim material description (e.g. grain size, brand). See § Free-text preservation.                                                                                               |

### `centralizers[]` (v2.1, optional — omit entirely if the report doesn't mention them)

One entry per interval where centralizers were installed at a regular spacing.

| Field         | Type        | Required | Notes                                                                                                                          |
| ------------- | ----------- | -------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `from`, `to`  | number (m)  | yes      | Depth of the first and last centralizer. `from === to` for a single centralizer.                                               |
| `spacing`     | number (m)  | no       | "a cada 6 m" → `6`. **Omit if the report doesn't give it** — never infer it from a count. Never store a count.                 |
| `type`        | string      | yes      | **Tier 1.** Recommended `spring_bow`, `rigid`, `semi_rigid`, `polymer` when the wording maps losslessly; else verbatim phrase. |
| `diameter`    | number (mm) | no       | As-built outer diameter, only when stated.                                                                                     |
| `description` | string      | no       | Near-verbatim (material, brand). See § Free-text preservation.                                                                 |

If the report only says centralizers were used along a string (no depths), use that string's interval
for `from`/`to` and omit `spacing`.

### `cement_pad` (single object, optional — omit entirely if not in the report)

| Field                          | Type       | Required | Notes                                                                                                                                                                                                                                                                                         |
| ------------------------------ | ---------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`                         | string     | yes      | **Tier 1 — recommended, not enforced.** May describe material (e.g. `concrete`), shape (e.g. `circular`), or both. Use a recommended-sounding term only where it captures everything the report says; otherwise transcribe the report's phrase (material + shape together if both are given). |
| `width`, `length`, `thickness` | number (m) | yes      |                                                                                                                                                                                                                                                                                               |

---

## Free-text preservation rule (applies to every description-like field)

`description`, `obs`, `notes`, `hole_fill[].description`, the Tier 1/Tier 2 "type" fields above,
`history_logs[].description`, and any other free-text field:

- **Never translate** the source document's language. Portuguese report → Portuguese text. Only
  translate if the user explicitly asks.
- **Stay near-verbatim.** Light trimming of filler words is fine. Summarizing or paraphrasing is only
  acceptable when it drops **zero** detail or data — no lost measurements, materials, brand/equipment
  names, or qualifiers. When in doubt, transcribe closer to the original rather than condense.

---

## `lithology[]` and `texture`

| Field           | Type       | Required | Notes                                                                                                   |
| --------------- | ---------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `from`, `to`    | number (m) | yes      |                                                                                                         |
| `description`   | string     | yes      | Near-verbatim geological description. See § Free-text preservation.                                     |
| `color`         | string     | yes      | CSS hex, geologically plausible if not stated (e.g. clay=`#8B7355`, sand=`#F5DEB3`, granite=`#A9A9A9`). |
| `texture`       | `Texture`  | yes      | `{ code, vocabulary }` — see below. Required; never omit.                                               |
| `geologic_unit` | string     | yes      |                                                                                                         |
| `aquifer_unit`  | string     | yes      |                                                                                                         |

### `Texture` object

```json
{ "code": 607, "vocabulary": "fgdc" }
```

- `vocabulary` defaults to `"fgdc"` (integer codes). **Only use a different vocabulary** (`cgi`, `custom`,
  or an HTTPS URI) when the source document itself explicitly cites that alternative standard — otherwise
  always use `fgdc`.
- `code` (fgdc): match the lithology `description` to the best-fitting code in the **FGDC Series 600/700
  table below** — these are the only two series with rendered patterns in the app today.
- **Matching rule:** geological accuracy comes first. Between two comparably good candidate codes, prefer
  the one that is **not `pending`** (i.e. from Series 600/700, excluding codes 120/123/132 — see note).
  Never force-fit a poorly-matching Series 600/700 code just to avoid a pending one: `texture` is
  required, and a well-matched pending code is still correct, valid data. If nothing in Series 600/700 is
  even a reasonable match, use the closest code from Series 100–500 despite it being pending.

### FGDC Series 600 — Sedimentary Lithology (available, most common for well logging)

| Code | Label                                                            | Code | Label                                                        |
| ---- | ---------------------------------------------------------------- | ---- | ------------------------------------------------------------ |
| 601  | Gravel or conglomerate (1st option)                              | 641  | Dolomitic limestone, limy dolostone, or limy dolomite        |
| 602  | Gravel or conglomerate (2nd option)                              | 642  | Dolostone or dolomite                                        |
| 603  | Crossbedded gravel or conglomerate                               | 643  | Crossbedded dolostone or dolomite                            |
| 605  | Breccia (1st option)                                             | 644  | Oolitic dolostone or dolomite                                |
| 606  | Breccia (2nd option)                                             | 645  | Sandy dolostone or dolomite                                  |
| 607  | Massive sand or sandstone                                        | 646  | Silty dolostone or dolomite                                  |
| 608  | Bedded sand or sandstone                                         | 647  | Argillaceous or shaly dolostone or dolomite                  |
| 609  | Crossbedded sand or sandstone (1st option)                       | 648  | Cherty dolostone or dolomite                                 |
| 610  | Crossbedded sand or sandstone (2nd option)                       | 649  | Bedded chert (1st option)                                    |
| 611  | Ripple-bedded sand or sandstone                                  | 650  | Bedded chert (2nd option)                                    |
| 612  | Argillaceous or shaly sandstone                                  | 651  | Fossiliferous bedded chert                                   |
| 613  | Calcareous sandstone                                             | 652  | Fossiliferous rock                                           |
| 614  | Dolomitic sandstone                                              | 653  | Diatomaceous rock                                            |
| 616  | Silt, siltstone, or shaly silt                                   | 654  | Subgraywacke                                                 |
| 617  | Calcareous siltstone                                             | 655  | Crossbedded subgraywacke                                     |
| 618  | Dolomitic siltstone                                              | 656  | Ripple-bedded subgraywacke                                   |
| 619  | Sandy or silty shale                                             | 657  | Peat                                                         |
| 620  | Clay or clay shale                                               | 658  | Coal                                                         |
| 621  | Cherty shale                                                     | 659  | Bony coal or impure coal                                     |
| 622  | Dolomitic shale                                                  | 660  | Underclay                                                    |
| 623  | Calcareous shale or marl                                         | 661  | Flint clay                                                   |
| 624  | Carbonaceous shale                                               | 662  | Bentonite                                                    |
| 625  | Oil shale                                                        | 663  | Glauconite                                                   |
| 626  | Chalk                                                            | 664  | Limonite                                                     |
| 627  | Limestone                                                        | 665  | Siderite                                                     |
| 628  | Clastic limestone                                                | 666  | Phosphatic-nodular rock                                      |
| 629  | Fossiliferous clastic limestone                                  | 667  | Gypsum                                                       |
| 630  | Nodular or irregularly bedded limestone                          | 668  | Salt                                                         |
| 631  | Limestone, irregular (burrow?) fillings of saccharoidal dolomite | 669  | Interbedded sandstone and siltstone                          |
| 632  | Crossbedded limestone                                            | 670  | Interbedded sandstone and shale                              |
| 633  | Cherty crossbedded limestone                                     | 671  | Interbedded ripple-bedded sandstone and shale                |
| 634  | Cherty and sandy crossbedded clastic limestone                   | 672  | Interbedded shale and silty limestone (shale dominant)       |
| 635  | Oolitic limestone                                                | 673  | Interbedded shale and limestone, shale dominant (1st option) |
| 636  | Sandy limestone                                                  | 674  | Interbedded shale and limestone, shale dominant (2nd option) |
| 637  | Silty limestone                                                  | 675  | Interbedded calcareous shale and limestone (shale dominant)  |
| 638  | Argillaceous or shaly limestone                                  | 676  | Interbedded silty limestone and shale                        |
| 639  | Cherty limestone (1st option)                                    | 677  | Interbedded limestone and shale (1st option)                 |
| 640  | Cherty limestone (2nd option)                                    | 678  | Interbedded limestone and shale (2nd option)                 |
|      |                                                                  | 679  | Interbedded limestone and shale (limestone dominant)         |
|      |                                                                  | 680  | Interbedded limestone and calcareous shale                   |
|      |                                                                  | 681  | Till or diamicton (1st option)                               |
|      |                                                                  | 682  | Till or diamicton (2nd option)                               |
|      |                                                                  | 683  | Till or diamicton (3rd option)                               |
|      |                                                                  | 684  | Loess (1st option)                                           |
|      |                                                                  | 685  | Loess (2nd option)                                           |
|      |                                                                  | 686  | Loess (3rd option)                                           |

### FGDC Series 700 — Metamorphic and Igneous Lithology (available)

| Code | Label                            | Code | Label                         |
| ---- | -------------------------------- | ---- | ----------------------------- |
| 701  | Metamorphism                     | 718  | Granite (1st option)          |
| 702  | Quartzite                        | 719  | Granite (2nd option)          |
| 703  | Slate                            | 720  | Banded igneous rock           |
| 704  | Schistose or gneissoid granite   | 721  | Igneous rock (1st option)     |
| 705  | Schist                           | 722  | Igneous rock (2nd option)     |
| 706  | Contorted schist                 | 723  | Igneous rock (3rd option)     |
| 707  | Schist and gneiss                | 724  | Igneous rock (4th option)     |
| 708  | Gneiss                           | 725  | Igneous rock (5th option)     |
| 709  | Contorted gneiss                 | 726  | Igneous rock (6th option)     |
| 710  | Soapstone, talc, or serpentinite | 727  | Igneous rock (7th option)     |
| 711  | Tuffaceous rock                  | 728  | Igneous rock (8th option)     |
| 712  | Crystal tuff                     | 729  | Porphyritic rock (1st option) |
| 713  | Devitrified tuff                 | 730  | Porphyritic rock (2nd option) |
| 714  | Volcanic breccia and tuff        | 731  | Vitrophyre                    |
| 715  | Volcanic breccia or agglomerate  | 732  | Quartz                        |
| 716  | Zeolitic rock                    | 733  | Ore                           |
| 717  | Basaltic flows                   |      |                               |

> **Note:** codes 120, 123, and 132 (Series 100) are technically non-`pending` but carry meaningless
> placeholder labels ("Surficial pattern 120", etc.) — never use them as a real match regardless of
> availability.

Quick PT/EN mappings: Areia→Sand(607), Cascalho→Gravel(601), Argila→Clay(620), Silte→Silt(616),
Calcário→Limestone(627), Granito→Granite(718), Gnaisse→Gneiss(708), Xisto→Schist(705),
Quartzito→Quartzite(702), Basalto→Basaltic flows(717), Arenito→Sandstone(607/608),
Folhelho→Shale(619/620), Carvão→Coal(658), Gesso→Gypsum(667).

---

## `fractures[]` and `caves[]` (unchanged from v1)

### `fractures[]`

| Field             | Type            | Required |
| ----------------- | --------------- | -------- |
| `depth`           | number (m)      | yes      |
| `water_intake`    | boolean         | yes      |
| `description`     | string          | yes      |
| `swarm`           | boolean         | yes      |
| `azimuth`         | number (0–360°) | yes      |
| `dip`             | number (0–90°)  | yes      |
| `depth_precision` | number (m)      | no       |

### `caves[]`

| Field          | Type       | Required |
| -------------- | ---------- | -------- |
| `from`, `to`   | number (m) | yes      |
| `water_intake` | boolean    | yes      |
| `description`  | string     | yes      |

---

## `hydrodynamic_events[]`

Chronological, append-only ledger. Each `type` is a distinct **data contract**, not an equipment class —
equipment goes in `equipment`, interpretation method goes in `aquifer_analysis.method`.

### Common fields (every event)

| Field       | Type    | Required | Notes                                                     |
| ----------- | ------- | -------- | --------------------------------------------------------- |
| `id`        | string  | yes      | Unique within `hydrodynamic_events`. UUID v4 recommended. |
| `type`      | string  | yes      | See table below.                                          |
| `datetime`  | string  | yes      | RFC 3339 with UTC offset.                                 |
| `sequence`  | integer | no       | Tiebreaker when two events share the same instant.        |
| `operator`  | string  | no       |                                                           |
| `equipment` | string  | no       |                                                           |
| `notes`     | string  | no       | Near-verbatim; see § Free-text preservation.              |

### Event types

| `type`             | What it records                                                                              | `steps`       | `recovery`   | Valid in `source_event_ids`?                                         |
| ------------------ | -------------------------------------------------------------------------------------------- | ------------- | ------------ | -------------------------------------------------------------------- |
| `spot_measurement` | Static level during a routine visit, optionally one informal reading. Not a controlled test. | 0 or 1        | optional     | Only as `static_level_source_id`                                     |
| `constant_rate`    | Controlled pump test at exactly one fixed rate.                                              | exactly 1     | optional     | yes                                                                  |
| `step_drawdown`    | Controlled pump test, ≥2 successive rates, ascending.                                        | ≥2, ascending | optional     | yes                                                                  |
| `airlift`          | Air-lift development, historical yield estimate.                                             | ≥1            | optional     | **No — refuse if the user asks to reference an airlift event here.** |
| `recovery_only`    | Recovery after a pumping event whose drawdown wasn't recorded.                               | none          | **required** | yes                                                                  |

Extra fields per type: `spot_measurement` adds `static_level` (required), `static_level_precision`,
`measurement_method` (recommended: `electric_probe`, `pressure_transducer`, `air_line`, `tape`).
`constant_rate`/`step_drawdown` add optional `static_level`(+`_precision`). `recovery_only` adds optional
`pumping_rate` (m³/h), `pumping_duration` (min).

### Supporting objects

```
PumpingStep   { rate (m³/h, required), rate_precision, duration (min), readings: LevelReading[] }
LevelReading  { elapsed (min, required), depth (m, required), depth_precision, pressure (kPa) }
RecoveryPhase { readings: LevelReading[] (required) }
```

**Metric fidelity applies here too:** if a report only gives a final drawdown value and not a time
series, record a single `LevelReading` — never fabricate intermediate readings to fill out a curve.

---

## `aquifer_analysis[]`

Interpreted parameters derived from one or more `hydrodynamic_events`. Never store derived values
(drawdown, specific capacity, etc.) on the event itself — only here.

| Field                                                              | Type                 | Required | Notes                                                                                                           |
| ------------------------------------------------------------------ | -------------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| `id`                                                               | string               | yes      | Unique within `aquifer_analysis`.                                                                               |
| `datetime`                                                         | string               | yes      | RFC 3339 with UTC offset.                                                                                       |
| `analyst`                                                          | string               | no       |                                                                                                                 |
| `source_event_ids`                                                 | string[]             | yes      | IDs from `hydrodynamic_events` in this same file. **Never an `airlift` event ID.**                              |
| `method`                                                           | string               | no       | Recommended: `cooper_jacob`, `theis`, `neuman`, `hantush`, `birsoy_summers`, `eden_hazel`, `visual_inspection`. |
| `static_level`, `static_level_precision`, `static_level_source_id` | number/number/string | no       |                                                                                                                 |
| `dynamic_level`, `dynamic_level_precision`                         | number               | no       |                                                                                                                 |
| `flow_rate`, `flow_rate_precision`                                 | number (m³/h)        | no       |                                                                                                                 |
| `max_flow_rate`, `max_flow_rate_precision`, `max_flow_rate_basis`  | number/number/string | no       | Analyst's recommendation, distinct from `flow_rate`.                                                            |
| `specific_capacity`                                                | number (m³/h per m)  | no       |                                                                                                                 |
| `transmissivity`                                                   | number (m²/s)        | no       |                                                                                                                 |
| `storativity`                                                      | number               | no       | dimensionless                                                                                                   |
| `hydraulic_conductivity`, `aquifer_thickness`                      | number               | no       |                                                                                                                 |
| `jacob_b`, `jacob_c`, `well_efficiency_pct`                        | number               | no       |                                                                                                                 |
| `notes`                                                            | string               | no       | Near-verbatim; see § Free-text preservation.                                                                    |

Only populate `aquifer_analysis` when the report contains an actual interpreted result (transmissivity,
specific capacity, etc.) — do not compute these yourself from raw readings.

---

## `history_logs[]`

Mutable chronological record of interventions/inspections/incidents — distinct from `hydrodynamic_events`
(measurements) and separate from the well's original construction data.

| Field         | Type           | Required | Notes                                                                                                                                                                  |
| ------------- | -------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`          | string         | yes      | Unique within `history_logs`.                                                                                                                                          |
| `datetime`    | string         | yes      | RFC 3339 with UTC offset. When the logged event occurred.                                                                                                              |
| `updated_at`  | string         | no       | RFC 3339 with UTC offset. When this entry was created/edited. **Never synthesize this if the report doesn't distinguish it from `datetime`** — omit rather than guess. |
| `category`    | string         | yes      | `maintenance`, `inspection`, `incident`, `event`, or `change_of_use` (v2.1) (open vocab, `x-` prefix for others).                                                      |
| `description` | string         | yes      | Near-verbatim account. See § Free-text preservation.                                                                                                                   |
| `author`      | string         | no       |                                                                                                                                                                        |
| `severity`    | string         | no       | Recommended: `low`, `medium`, `high`, `critical`.                                                                                                                      |
| `attachments` | `Attachment[]` | no       |                                                                                                                                                                        |

### `Attachment` (common type since v2.3)

Allowed at the root (`attachments[]`, documents about the whole well) and on `history_logs`,
`pump_installations`, `hydrodynamic_events` and `aquifer_analysis` entries.

| Field                               | Type   | Required | Notes                                                                                                                                                                                                    |
| ----------------------------------- | ------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                | string | yes      | Unique within its owning `attachments` array.                                                                                                                                                            |
| `uri`                               | string | yes      | Full HTTPS URL — never a relative path. Only include if the report actually references a retrievable file/URL.                                                                                           |
| `media_type`                        | string | yes      | MIME type.                                                                                                                                                                                               |
| `document_type`                     | string | no       | (v2.3) `drilling_report`, `as_built_drawing`, `registry_record`, `photo`, `permit_document`, `condition_evidence`, `pump_curve`, `field_sheet`, `test_report`, `lab_report`, `invoice`; `x-` for others. |
| `filename`, `description`, `sha256` | string | no       |                                                                                                                                                                                                          |

---

## `pump_installations[]` (v2.3, optional — omit entirely if the report has no pump data)

One entry per installation of a pump. The current pump is the entry without `removed_at`.

| Field                                | Type    | Required | Notes                                                                                                                                                           |
| ------------------------------------ | ------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                 | string  | yes      | Unique within `pump_installations`.                                                                                                                             |
| `installed_at`                       | string  | yes      | RFC 3339 instant with UTC offset. If the report gives only a date, use `T00:00:00` with the site's offset.                                                      |
| `removed_at`                         | string  | no       | RFC 3339 instant. Absent = currently installed.                                                                                                                 |
| `type`                               | string  | yes      | `submersible`, `vertical_turbine`, `jet`, `progressive_cavity`, `hand_pump`, `compressor_airlift` (`x-` for others). Solar is a `power_source`, never a `type`. |
| `power_source`                       | string  | no       | `grid`, `solar`, `diesel`, `hybrid`.                                                                                                                            |
| `manufacturer`, `model`, `serial`    | string  | no       |                                                                                                                                                                 |
| `intake_depth`                       | number  | no       | m from ground level (crivo / profundidade da bomba).                                                                                                            |
| `rated_flow_rate`                    | number  | no       | m³/h (nameplate).                                                                                                                                               |
| `rated_head`                         | number  | no       | m (nameplate).                                                                                                                                                  |
| `rated_power`                        | number  | no       | **kW** — convert cv × 0.7355, hp × 0.7457.                                                                                                                      |
| `stages`                             | integer | no       |                                                                                                                                                                 |
| `riser_diameter`                     | number  | no       | mm, as-built outer diameter of the riser (edutor).                                                                                                              |
| `riser_material`                     | string  | no       | Same vocabulary as `well_case.type`.                                                                                                                            |
| `check_valve`                        | boolean | no       |                                                                                                                                                                 |
| `electrical`                         | object  | no       | `voltage` (V), `phases` (1 or 3), `cable_section` (mm²), `cable_length` (m).                                                                                    |
| `notes`, `updated_at`, `attachments` |         | no       |                                                                                                                                                                 |

`hydrodynamic_events[]` entries may also carry `attachments` and `corrects` (id of an event this one
retracts); `aquifer_analysis[]` entries may carry `attachments` (v2.3).

---

## Complete example

```json
{
  "version": 2,
  "well_type": "tubular",
  "name": "Poço PP-01",
  "well_driller": "Perfuradora XYZ",
  "construction_date": "2006-03-10",
  "obs": "Sem anomalias observadas durante a perfuração.",

  "location": { "lat": -1.4558, "lng": -48.5039, "elevation": 12.5 },

  "bore_hole": [
    { "from": 0, "to": 80, "diameter": 250, "drilling_method": "rotary" }
  ],
  "well_case": [
    { "from": 0, "to": 60, "type": "aço carbono", "diameter": 200 }
  ],
  "reduction": [],
  "well_screen": [
    {
      "from": 60,
      "to": 80,
      "type": "wire-wound",
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
  "cement_pad": {
    "type": "concreto, formato quadrado",
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
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "type": "constant_rate",
      "datetime": "2006-03-14T08:00:00-03:00",
      "operator": "Perfuradora XYZ",
      "equipment": "Bomba submersa 15 CV",
      "static_level": 28.74,
      "steps": [
        {
          "rate": 340.0,
          "duration": 1440,
          "readings": [
            { "elapsed": 1, "depth": 32.1 },
            { "elapsed": 1440, "depth": 44.8 }
          ]
        }
      ],
      "notes": "Teste encerrado às 24h."
    }
  ],

  "aquifer_analysis": [
    {
      "id": "f6a7b8c9-d0e1-2345-fabc-456789012345",
      "datetime": "2006-03-15T16:00:00-03:00",
      "source_event_ids": ["b2c3d4e5-f6a7-8901-bcde-f12345678901"],
      "method": "cooper_jacob",
      "static_level": 28.74,
      "dynamic_level": 44.8,
      "flow_rate": 340.0,
      "specific_capacity": 21.17
    }
  ],

  "history_logs": [
    {
      "id": "d0e1f2a3-b4c5-6789-defa-890123456789",
      "datetime": "2006-03-10T00:00:00-03:00",
      "category": "event",
      "description": "Poço construído e comissionado. Vazão inicial de 340 m³/h via air-lift.",
      "author": "Prefeitura Municipal de Belém"
    }
  ]
}
```

---

## Common `aquifer_unit` values (PT-BR)

`freático`, `confinado`, `semiconfinado`, `fraturado`, `cárstico`, `poroso`
