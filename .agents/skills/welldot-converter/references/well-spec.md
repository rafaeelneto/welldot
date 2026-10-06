# `.well` Format Specification — Quick Reference (v2.3)

**Extension:** `.well` | **Encoding:** UTF-8 | **Base format:** JSON
**MIME type:** `application/vnd.well+json`

This is a condensed reference for extraction. The normative source is
`packages/core/docs/spec/v2/{format-reference,object-schemas}.md` in the repo — when in doubt, that wins.

---

## Units (all SI, no per-file declaration)

| Measure                                                                                                                                            | Unit                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Depths, lengths, elevation                                                                                                                         | meters                                                                                                                                                   |
| Diameters, screen slot                                                                                                                             | millimeters                                                                                                                                              |
| Coordinates                                                                                                                                        | WGS84 decimal degrees                                                                                                                                    |
| Volumetric flow rate                                                                                                                               | m³/h                                                                                                                                                     |
| Elapsed time, duration                                                                                                                             | minutes                                                                                                                                                  |
| Transmissivity                                                                                                                                     | m²/s                                                                                                                                                     |
| Hydraulic conductivity                                                                                                                             | m/s                                                                                                                                                      |
| Pressure                                                                                                                                           | kPa                                                                                                                                                      |
| Azimuth (0–360), dip (0–90)                                                                                                                        | degrees                                                                                                                                                  |
| Volume (meter readings, declared volumes, permit limits)                                                                                           | m³ (convert liters `÷ 1000`)                                                                                                                             |
| Daily operating time                                                                                                                               | hours (0–24)                                                                                                                                             |
| Power                                                                                                                                              | kW                                                                                                                                                       |
| Water quality results (v2.3)                                                                                                                       | Unit fixed by the parameter code — substances always mg/L, conductivity µS/cm at 25 °C, temperature °C, ORP mV; never write `unit` except for `x-` codes |
| Filter pore size (v2.3)                                                                                                                            | µm                                                                                                                                                       |
| Calendar dates: `construction_date`, `permits[]` dates, condition `first_due`/`last_due`, `history_logs[].due_date`                                | ISO 8601 calendar date, `YYYY-MM-DD` — no time, no offset                                                                                                |
| Every other datetime (`hydrodynamic_events`, `aquifer_analysis`, `history_logs`, installations, `production`, `operating_regime`, `water_samples`) | RFC 3339 instant with **mandatory UTC offset**, e.g. `2006-03-14T08:00:00-03:00` or `...Z`. A naked timestamp with no offset is malformed — reject it.   |

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

  "attachments": [...], "pump_installations": [...], "permits": [...],
  "meters": [...], "production": [...], "operating_regime": [...],

  "water_samples": [...]
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
| `category`    | string         | yes      | `maintenance`, `inspection`, `incident`, `event`, `change_of_use` (v2.1), `status_change` (v2.3) (open vocab, `x-` prefix for others).                                 |
| `description` | string         | yes      | Near-verbatim account. See § Free-text preservation.                                                                                                                   |
| `author`      | string         | no       |                                                                                                                                                                        |
| `severity`    | string         | no       | Recommended: `low`, `medium`, `high`, `critical`.                                                                                                                      |
| `attachments` | `Attachment[]` | no       |                                                                                                                                                                        |

Category-specific fields (v2.3) — only on entries of that category, never elsewhere:

| Category        | Fields                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `maintenance`   | `maintenance_type` (`inspection`, `cleaning`, `redevelopment`, `disinfection`, `pump_service`, `meter_calibration`, `video_inspection`, `level_measurement`, `pump_test`, `water_sampling`); optional `pump_installation_id`, `meter_id`, `event_id` (the `hydrodynamic_events` entry holding the data the task produced), `sample_id` (the `water_samples` entry a `water_sampling` task collected). Never copy measured values into the log. |
| `status_change` | `status` (closed enum — any other value is rejected): `active`, `maintenance`, `inactive`, `decommissioned`, `abandoned`. Only when the report states the change and its date. No `status_change` = status unknown — never infer one.                                                                                                                                                                                                          |

### `Attachment` (common type since v2.3)

Allowed at the root (`attachments[]`, documents about the whole well) and on `history_logs`,
`permits` (and their `history` and condition `fulfillments`), `pump_installations`, `meters`, `hydrodynamic_events`, `aquifer_analysis` and `water_samples` entries.

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
| `installed_by`, `removed_by`         | string  | no       | Person or company that installed / removed the unit (e.g. the driller or pump installer named in the report). Set `removed_by` only with `removed_at`.          |
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

## `permits[]` (v2.3, optional — omit entirely if the report has no permit data)

One entry per legal instrument (outorga, dispensa, cadastro). Status and condition deadlines are
derived by applications — never store them.

| Field                                | Type     | Required | Notes                                                                                                                                                        |
| ------------------------------------ | -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`                                 | string   | yes      | Unique within `permits`.                                                                                                                                     |
| `type`                               | string   | yes      | `abstraction_permit`, `preliminary_permit`, `exemption`, `registration`, `dewatering_permit`, `drilling_permit` (`x-` for others). Renewal is not a type.    |
| `authority`                          | string   | yes      | Issuing body, e.g. `ANA`, `SEMAS-PA`.                                                                                                                        |
| `identifier`                         | string   | no       | Identifier of the granted instrument (portaria, license code), verbatim, any format.                                                                         |
| `issued_at`                          | string   | no       | Calendar date `YYYY-MM-DD`.                                                                                                                                  |
| `valid_from`                         | string   | no       | Calendar date. Absent = valid from `issued_at`.                                                                                                              |
| `valid_until`                        | string   | no       | Calendar date. Absent = no fixed expiry.                                                                                                                     |
| `renewal_requested_at`               | string   | no       | Calendar date the renewal was filed.                                                                                                                         |
| `water_use`                          | string[] | no       | `human_supply`, `industrial`, `mining`, `irrigation`, `livestock`, `commercial`.                                                                             |
| `flow_rate`                          | number   | no       | m³/h, maximum granted.                                                                                                                                       |
| `daily_operating_time`               | number   | no       | Hours, 0–24.                                                                                                                                                 |
| `volume_limits`                      | array    | no       | `{ period: "daily" \| "monthly" \| "annual", volume }` (m³). Only volumes stated in the document.                                                            |
| `monthly_schedule`                   | array    | no       | `{ month (1–12), flow_rate?, daily_operating_time?, days? }`. Months absent = no abstraction granted.                                                        |
| `conditions`                         | array    | no       | See below.                                                                                                                                                   |
| `supersedes`                         | string   | no       | `permits[].id` this instrument legally replaces (renewal).                                                                                                   |
| `request_identifier`                 | string   | no       | Protocol / process number of the request, verbatim. At least one of the two identifiers.                                                                     |
| `status`                             | string   | no       | **Closed**: `requested`, `granted`, `suspended`, `revoked`, `denied`, `withdrawn`. Absent = `granted`. Only when stated.                                     |
| `history`                            | array    | no       | `{ id, date, type?, description, done?, due_date?, attachments? }`. `type`: `filing`, `process`, `notification`, `fee`, `inspection`, `decision`, `renewal`. |
| `notes`, `updated_at`, `attachments` |          | no       | `attachments[].document_type: "permit_document"` for the portaria.                                                                                           |

Condition (`conditions[]`): `id` (unique per permit), `description` (verbatim, required), `category`
(`monitoring`, `reporting`, `equipment_installation`, `well_protection`, `environmental`,
`legal`), and either `first_due` (date) or
`due_after` (ISO 8601 date duration from the start date, e.g. `P90D`) — never both — plus optional
`recurrence` (`P6M`), `last_due` (date), `occurrences` (integer), `responsible` (string) and
`fulfillments` (see below).

| Document wording                             | Encoding                                                |
| -------------------------------------------- | ------------------------------------------------------- |
| Install a meter within 90 days               | `due_after: "P90D"`                                     |
| Semiannual report from issuance              | `due_after: "P6M", recurrence: "P6M"`                   |
| Semiannual report by 31 Jan and 31 Jul       | `first_due: "<next of those dates>", recurrence: "P6M"` |
| Monthly level readings during the first year | `due_after: "P1M", recurrence: "P1M", occurrences: 12`  |

A recorded fulfillment goes in the condition's `fulfillments[]`: `id`, `datetime` (RFC 3339, when it
was fulfilled), `due_date` (the deadline fulfilled; absent for undated conditions), and optional
`description`, `author`, `event_id`, `sample_id`, `attachments`.

---

## `meters[]` (v2.3, optional — omit entirely if the report has no water meter)

One entry per installation of a totalizer (hidrômetro). Device facts only — register values go in
`production`, including the readings at installation and removal (`datetime` = `installed_at` /
`removed_at`).

| Field                                | Type   | Required | Notes                                                                                                                                                  |
| ------------------------------------ | ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`                                 | string | yes      | Unique within `meters`.                                                                                                                                |
| `installed_at`                       | string | yes      | RFC 3339 instant with UTC offset.                                                                                                                      |
| `removed_at`                         | string | no       | RFC 3339 instant. Absent = currently installed.                                                                                                        |
| `installed_by`, `removed_by`         | string | no       | Person or company that installed / removed the unit (e.g. the driller or pump installer named in the report). Set `removed_by` only with `removed_at`. |
| `type`                               | string | no       | `mechanical`, `electromagnetic`, `ultrasonic` (`x-` for others).                                                                                       |
| `manufacturer`                       | string | no       |                                                                                                                                                        |
| `model`                              | string | no       |                                                                                                                                                        |
| `serial`                             | string | no       |                                                                                                                                                        |
| `nominal_diameter`                   | number | no       | mm (DN).                                                                                                                                               |
| `max_reading`                        | number | no       | Register capacity in **m³**, > 0 — only if stated. Used to detect rollover.                                                                            |
| `notes`, `updated_at`, `attachments` |        | no       |                                                                                                                                                        |

---

## `production[]` (v2.3, optional — omit entirely if the report has no readings or volumes)

Append-only ledger, discriminated by `type`. Common fields: `id` (unique), `type`, `corrects` (id of
the entry this one retracts — only when the source records a correction), `sequence` (tie-breaker),
`notes`. **Never compute or store derived values** — no consumption between readings, no period
totals, no average flow.

| `type`            | Fields                                                                                                                                                                                                                                   |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `meter_reading`   | `datetime` (instant, required), `meter_id` (a `meters[].id`, required), `reading` (register value in **m³**, required — meters reading in liters are converted `÷ 1000`), `source` (`manual`, `telemetry`).                              |
| `declared_volume` | `period_start`, `period_end` (instants, required; end later than start), `volume` (m³, required), `method` (`reported` = as declared to a regulator, never added to totals; `estimated` = flow × time or similar; absent = `estimated`). |

Applications derive volumes from consecutive readings of the same meter (with rollover via
`max_reading`); metered time wins over `estimated` volumes.

---

## `operating_regime[]` (v2.3, optional — omit entirely if the report doesn't state how the well runs)

Each entry is the declared regime in force from `effective_from`; a change of regime is a new entry.

| Field                  | Type    | Required | Notes                                                      |
| ---------------------- | ------- | -------- | ---------------------------------------------------------- |
| `id`                   | string  | yes      | Unique within `operating_regime`.                          |
| `effective_from`       | string  | yes      | RFC 3339 instant with UTC offset. Unique within the block. |
| `flow_rate`            | number  | no       | m³/h.                                                      |
| `daily_operating_time` | number  | no       | Hours, 0–24.                                               |
| `days_per_week`        | integer | no       | 1–7.                                                       |
| `notes`, `updated_at`  |         | no       |                                                            |

An absent field means unknown — never write `0`. A stopped well is a `history_logs` `status_change`,
not a regime with `flow_rate: 0`. Granted (permit) values belong in `permits`, not here.

---

## `water_samples[]` (v2.3, optional — omit entirely if the report has no water quality results)

Ledger of water samples: one entry per collection, each with its field and laboratory results.
Never edit a sample — a corrected laudo is a new sample with `corrects` = the original's `id`.

| Field                                                       | Type   | Required    | Notes                                                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------------------------- | ------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`                                                        | string | yes         | Unique within `water_samples`.                                                                                                                                                                                                                                                                                                                   |
| `datetime`                                                  | string | yes         | RFC 3339 instant of **collection**, with offset.                                                                                                                                                                                                                                                                                                 |
| `sample_type`                                               | string | yes         | `routine`, `field_duplicate`, `split_sample`, `field_blank`, `trip_blank`, `equipment_blank` (`x-` for others).                                                                                                                                                                                                                                  |
| `parent_sample_id`                                          | string | conditional | Original sample's `id` — for `field_duplicate` and `split_sample`.                                                                                                                                                                                                                                                                               |
| `sequence`, `campaign`                                      |        | no          | Tie-breaker (integer) and free campaign id.                                                                                                                                                                                                                                                                                                      |
| `sampling_method`                                           | string | no          | Purge: `low_flow`, `volumetric_purge`, `no_purge`, `pump_discharge`.                                                                                                                                                                                                                                                                             |
| `sampling_point`                                            | object | no          | `type` (required: `pump_discharge`, `wellhead_tap`, `in_well`), `depth` + `depth_precision` **or** `from`/`to` (m from ground level, never both), `device` (`bailer`, `discrete_depth_sampler`, `passive_diffusion_bag`, `grab_sleeve`, `low_flow_pump`, `packer_pump`), `pump_installation_id` (sample at the production pump — no depth then). |
| `purge`                                                     | object | no          | `duration` (min), `volume` (m³), `flow_rate` (m³/h), `stabilized`, `readings[]` (`elapsed` min, `parameter`, `value`).                                                                                                                                                                                                                           |
| `static_level_event_id`                                     | string | no          | `hydrodynamic_events[].id` of the level measured at collection.                                                                                                                                                                                                                                                                                  |
| `collected_by`, `preservation`, `chain_of_custody`, `notes` | string | no          |                                                                                                                                                                                                                                                                                                                                                  |
| `laboratory`                                                | object | no          | `name` (required), `accreditation`, `report_number` (verbatim), `batch_id`, `sample_id` (lab's id), `received_at` (instant), `received_at_resolution` (`"day"`), `received_temperature` (°C).                                                                                                                                                    |
| `corrects`                                                  | string | no          | `water_samples[].id` this sample retracts.                                                                                                                                                                                                                                                                                                       |
| `attachments`                                               | array  | no          | The laudo with `document_type: "lab_report"`.                                                                                                                                                                                                                                                                                                    |
| `results`                                                   | array  | yes         | At least one. See below.                                                                                                                                                                                                                                                                                                                         |

Result (`results[]`):

| Field                                     | Notes                                                                                                            |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `parameter`                               | `{ code, vocabulary }` — `vocabulary` is `welldot`, `cas` or `x-…`. Required.                                    |
| `value` \| `presence` \| `text`           | **Exactly one.** None only with `qualifier: "not_detected"`.                                                     |
| `qualifier`                               | `<`, `>`, `estimated` (with `value`), `not_detected` (no value form; give `detection_limit`).                    |
| `unit`                                    | UCUM, **only** for `x-` codes (required there); forbidden for `welldot`/`cas`.                                   |
| `detection_limit`, `quantification_limit` | LD / LQ, in the parameter's unit.                                                                                |
| `value_precision`                         | One sigma — expanded uncertainty ÷ k (usually 2).                                                                |
| `fraction`                                | `total`, `dissolved`, `suspended`. `dissolved` should come with `filtration`.                                    |
| `filtration`                              | `{ pore_size (µm), location: "field" \| "lab" }`.                                                                |
| `measured_in`                             | `field` or `lab`.                                                                                                |
| `method`                                  | Verbatim, e.g. `SMEWW 4500-NO3 B`, `US EPA 200.8`.                                                               |
| `analyzed_at`, `analyzed_at_resolution`   | Instant; `"day"` when only the date is known (write `T00:00:00` local offset).                                   |
| `lab_flags`                               | Lab flag strings verbatim (`J`, `B`, `H`…).                                                                      |
| `validation`                              | `{ status: unvalidated\|validated\|qualified\|rejected, qualifier?, guideline?, validated_by?, validated_at? }`. |
| `notes`                                   |                                                                                                                  |

### Import rules (laudos)

Only when the document contains water quality results (laudo de análise, boletim analítico, field
sheet with pH/conductivity readings). `water_samples` is a **ledger**: never merge or edit samples.

- **One sample per collection.** Each sampling event (date/time + point) is one entry: `id`,
  `datetime` (instant of **collection**, not of the report), `sample_type` (`routine`,
  `field_duplicate`, `split_sample`, `field_blank`, `trip_blank`, `equipment_blank`; `x-` for others),
  `parent_sample_id` (the original sample's `id`, for a duplicate or split), `campaign`, `sequence`,
  `sampling_method` (`low_flow`, `volumetric_purge`, `no_purge`, `pump_discharge`), `collected_by`,
  `preservation`, `chain_of_custody`, `notes`. Several samples in one report → several entries.
- **Sampling point.** `sampling_point.type` (`pump_discharge` + `pump_installation_id` when taken at
  the production pump — don't repeat the depth; `wellhead_tap`; `in_well`), `device` (`bailer`,
  `discrete_depth_sampler`, `passive_diffusion_bag`, `grab_sleeve`, `low_flow_pump`, `packer_pump`),
  and **either** `depth` **or** `from`/`to` (never both — malformed). Depths are meters **from ground
  level**: convert readings from the top of casing the same way as water levels. A level measured at
  collection is a `spot_measurement` event referenced by `static_level_event_id`.
- **Purge.** `purge.duration` (min), `volume` (m³ — convert liters ÷ 1000), `flow_rate` (m³/h —
  L/min × 0.06), `stabilized`, and `readings[]` (`elapsed` min, `parameter`, `value`) for the
  stabilization series. The final field values at collection go in `results` with
  `measured_in: "field"`.
- **Laboratory.** `laboratory.name` (required), `accreditation`, `report_number` (verbatim),
  `batch_id`, `sample_id` (the lab's own id), `received_at`, `received_temperature` (°C).
- **Results.** `results[]` (at least one). Each: `parameter` `{ code, vocabulary }` and **exactly
  one** of `value` (number), `presence` (boolean, for `total_coliforms`, `e_coli`,
  `thermotolerant_coliforms`), `text` (odor, taste); plus `qualifier`, `detection_limit`,
  `quantification_limit`, `value_precision`, `fraction` (`total`/`dissolved`/`suspended`),
  `filtration` (`pore_size` µm, `location` `field`/`lab`), `measured_in` (`field`/`lab`), `method`
  (verbatim, e.g. `SMEWW 4500-NO3 B`), `analyzed_at`, `lab_flags`, `validation`, `notes`.
- **Parameter codes.** Prefer the `welldot` code (table below).
  If no `welldot` code exists, use the CAS number (`{ "code": "71-43-2", "vocabulary": "cas" }`,
  value in mg/L). Only when neither fits, use an `x-` vocabulary with `unit` in UCUM
  (`{ "code": "...", "vocabulary": "x-lab" }, "unit": "ug/L"`). **Never write `unit` for `welldot` or
  `cas` codes** (malformed) — the unit comes from the code.
- **Basis of expression is in the code.** Nitrate "como N" → `nitrate_as_n`; "como NO₃⁻" →
  `nitrate_as_no3` (same for nitrite, ammonia `_as_n`/`_as_nh3`, alkalinity/hardness `_as_caco3`,
  cyanide `_as_cn`). Never convert between bases; pick the code that matches what the lab reported.
  If the basis isn't stated, flag it to the user rather than guessing.
- **Unit normalization.** Substances → **mg/L** (µg/L ÷ 1000, ng/L ÷ 1 000 000, g/L × 1000).
  Conductivity → **µS/cm** (mS/m × 10, mS/cm × 1000). Turbidity by unit: NTU → `turbidity_ntu`, FNU →
  `turbidity_fnu`, FAU → `turbidity_fau`, uT / FTU → generic `turbidity`. Color: mg Pt-Co/L, PCU,
  TCU, Hazen → uH (same number). Microbiology counts: NMP/MPN → `_mpn` codes, UFC/CFU → `_cfu` codes;
  "ausente/presente" → the presence code with `presence: false/true`. Radioactivity in Bq/L.
- **Censored values.** `< 0,001` → `"qualifier": "<", "value": 0.001` — keep the reported number,
  never write 0 or drop it. `> 2419,6` → `"qualifier": ">"`. "N.D." / "não detectado" with no number
  → `"qualifier": "not_detected"` with **no** value and `detection_limit` (the LD stated by the lab;
  if absent, flag it). Values between LD and LQ the lab marks as estimated → `"qualifier": "estimated"`.
- **Uncertainty.** Reports give expanded uncertainty U (usually k = 2): `value_precision = U / k`.
  If k isn't stated, assume 2 and say so in the summary.
- **Date-only instants.** When the report gives only the date of receipt or analysis, write
  `T00:00:00` with the site's local offset and set `received_at_resolution` / `analyzed_at_resolution`
  to `"day"`. Never invent a time; never put `_resolution` on `datetime` (the collection time).
- **Lab flags verbatim.** Copy the lab's qualifier letters (`J`, `B`, `H`, `U`…) into `lab_flags`
  exactly as printed — don't interpret them. `validation` only when the document records a reviewer's
  data validation (`status`: `unvalidated`/`validated`/`qualified`/`rejected`).
- **Dissolved needs filtration.** `fraction: "dissolved"` only when the report says dissolved/filtered;
  record `filtration` (pore size, field vs lab) when stated — otherwise flag it (warning).
- **Attachments.** The laudo itself, if it has a retrievable HTTPS URL, goes on the sample with
  `document_type: "lab_report"`.
- **Never write limits.** VMP / limite / padrão columns, "conforme / não conforme", "acima do
  permitido" and the legislation cited (Portaria 888, CONAMA 396…) are **not** stored — limits and
  exceedances are derived by applications. Mention them in the summary if relevant.
- **Corrected reports.** A retificação / revised laudo is a **new sample** with `corrects` pointing to
  the original sample's `id` (only when both are in the documents); never overwrite the original.

### Import checklist

- Every sample has ≥ 1 result; each result has exactly one of `value` / `presence` / `text` (none only
  with `qualifier: "not_detected"`, which carries `detection_limit`); `<`, `>`, `estimated` only with `value`.
- No `unit` on `welldot`/`cas` codes; a UCUM `unit` on every `x-` code; substances in mg/L, conductivity in µS/cm.
- `sampling_point` has `depth` or `from`/`to`, never both; depths from ground level.
- `*_resolution` is only `"day"`; `datetime`, `laboratory.received_at`, `results[].analyzed_at` are instants with offset.
- `field_duplicate` / `split_sample` have `parent_sample_id`; every `parent_sample_id`, `corrects`,
  `static_level_event_id`, `sampling_point.pump_installation_id` and `history_logs[].sample_id` resolves.
- No limits, VMPs, exceedances or conformity verdicts were written.

### Parameter vocabulary

`welldot` codes (unit mg/L and form `value` unless noted):

| Group            | Codes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Physical / field | `temperature` (°C), `ph`, `specific_conductance` (µS/cm), `conductivity_uncompensated` (µS/cm), `dissolved_oxygen`, `orp` (mV), `eh` (mV), `turbidity` (FTU), `turbidity_ntu` (NTU), `turbidity_fnu` (FNU), `turbidity_fau` (FAU), `apparent_color` (uH), `true_color` (uH), `odor` (text), `taste` (text), `total_dissolved_solids`, `total_suspended_solids`, `total_solids`, `free_co2`                                                                                                                                                                                                                                                                            |
| Aggregate        | `alkalinity_total_as_caco3`, `alkalinity_bicarbonate_as_caco3`, `alkalinity_carbonate_as_caco3`, `alkalinity_hydroxide_as_caco3`, `acidity_total_as_caco3`, `hardness_total_as_caco3`, `hardness_calcium_as_caco3`                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Major ion        | `calcium` (CAS 7440-70-2), `magnesium` (CAS 7439-95-4), `sodium` (CAS 7440-23-5), `potassium` (CAS 7440-09-7), `bicarbonate` (CAS 71-52-3), `carbonate` (CAS 3812-32-6), `chloride` (CAS 16887-00-6), `sulfate` (CAS 14808-79-8), `fluoride` (CAS 16984-48-8), `silica_as_sio2` (CAS 7631-86-9)                                                                                                                                                                                                                                                                                                                                                                       |
| Nutrient         | `nitrate_as_n`, `nitrate_as_no3` (CAS 14797-55-8), `nitrite_as_n`, `nitrite_as_no2` (CAS 14797-65-0), `ammonia_as_n`, `ammonia_as_nh3` (CAS 7664-41-7), `kjeldahl_nitrogen_as_n`, `phosphorus_total_as_p`, `orthophosphate_as_po4`                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Organic          | `total_organic_carbon`, `cod`, `bod5`, `total_petroleum_hydrocarbons`, `oil_and_grease`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Disinfection     | `free_chlorine`, `total_chlorine`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Mining and redox | `ferrous_iron`, `chromium_hexavalent` (CAS 18540-29-9), `cyanide_total_as_cn`, `cyanide_wad_as_cn`, `cyanide_free_as_cn`, `thiocyanate` (CAS 302-04-5), `sulfide_total_as_s`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Metal / trace    | `iron` (CAS 7439-89-6), `manganese` (CAS 7439-96-5), `aluminum` (CAS 7429-90-5), `antimony` (CAS 7440-36-0), `arsenic` (CAS 7440-38-2), `barium` (CAS 7440-39-3), `beryllium` (CAS 7440-41-7), `boron` (CAS 7440-42-8), `cadmium` (CAS 7440-43-9), `chromium` (CAS 7440-47-3), `cobalt` (CAS 7440-48-4), `copper` (CAS 7440-50-8), `lead` (CAS 7439-92-1), `lithium` (CAS 7439-93-2), `mercury` (CAS 7439-97-6), `molybdenum` (CAS 7439-98-7), `nickel` (CAS 7440-02-0), `selenium` (CAS 7782-49-2), `silver` (CAS 7440-22-4), `strontium` (CAS 7440-24-6), `thallium` (CAS 7440-28-0), `uranium` (CAS 7440-61-1), `vanadium` (CAS 7440-62-2), `zinc` (CAS 7440-66-6) |
| Microbiology     | `total_coliforms` (presence), `total_coliforms_mpn` (MPN/100 mL), `total_coliforms_cfu` (CFU/100 mL), `e_coli` (presence), `e_coli_mpn` (MPN/100 mL), `e_coli_cfu` (CFU/100 mL), `thermotolerant_coliforms` (presence), `thermotolerant_coliforms_mpn` (MPN/100 mL), `thermotolerant_coliforms_cfu` (CFU/100 mL), `heterotrophic_plate_count` (CFU/mL)                                                                                                                                                                                                                                                                                                                |
| Radioactivity    | `gross_alpha` (Bq/L), `gross_beta` (Bq/L), `radium_226` (Bq/L, CAS 13982-63-3), `radium_228` (Bq/L, CAS 15262-20-1), `radon_222` (Bq/L, CAS 14859-67-7)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

A CAS code listed above is equivalent to its `welldot` code (prefer the `welldot` code). Radionuclides
are in Bq/L.

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
