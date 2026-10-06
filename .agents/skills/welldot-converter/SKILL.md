---
name: welldot-converter
metadata:
  version: '2.1.0'
description: >
  Converts water well reports (PDF, DOCX, image, text) into a valid `.well` JSON file
  for welldot.org and @welldot/core. Works with reports in any language (PT, EN, ES, etc.).

  TRIGGER WHEN: (1) user explicitly asks to convert/generate/import a .well file;
  (2) user mentions "welldot", "welldot.org" or "@welldot/core" with a document;
  (3) conversation involves well profile analysis or comparison and standardized .well
  format would be useful (e.g. comparing lithological profiles across multiple wells).

  DO NOT trigger just because a well file was uploaded — wait for explicit request or
  clear context that .well output is needed.

  Examples: "convert this report to .well", "generate .well from this log", "import to
  welldot", "compare these well profiles", "structure these reports for analysis".
---

# welldot-converter

Extracts data from a water well report (any format) and produces a valid `.well` JSON file
per the **welldot** spec (https://github.com/rafaeelneto/welldot) for upload to **welldot.org**
or use with `@welldot/core`.

**You are the extractor.** Read the document yourself and write the JSON yourself — do not
delegate extraction to another model or API.

---

## Platform notes

This procedure is vendor-neutral. Only the file I/O differs:

- **Claude Code / Claude.ai** — uploaded files land in `/mnt/user-data/uploads/`. Use the
  `pdf-reading` skill (`/mnt/skills/public/pdf-reading/SKILL.md`) for PDFs and `file-reading`
  (`/mnt/skills/public/file-reading/SKILL.md`) for DOCX. Write the result to
  `/mnt/user-data/outputs/`.
- **Codex, Gemini CLI, Cursor, Copilot and other CLI/IDE agents** — read the document with your
  own file and vision tooling, and write `<well_name>.well` into the working directory unless
  the user says otherwise.
- **ChatGPT web / Gemini Gems** — use your own file-attachment and vision handling. If browsing
  is unavailable, rely on `well-spec.md` from your knowledge files. Return the JSON in the chat
  inside a fenced block, and offer the file as a download if you can produce one.
- **Anything else** — read the document with whatever capability you have; write the file if you
  can, otherwise print the JSON.

See `README.md` next to this file for per-client setup.

---

## ⚠️ Source of truth: official docs

**Always consult the latest spec before extracting or validating data.** The `.well` format may
evolve; anything in this SKILL.md is secondary to the live spec.

This skill targets **spec version 2** — welldot.org / `@welldot/core` do not accept `version: 1`
files for new conversions.

| Doc              | URL                                                                                             |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| Overview         | https://github.com/rafaeelneto/welldot/blob/main/packages/core/docs/spec/v2/overview.md         |
| Format reference | https://github.com/rafaeelneto/welldot/blob/main/packages/core/docs/spec/v2/format-reference.md |
| Object schemas   | https://github.com/rafaeelneto/welldot/blob/main/packages/core/docs/spec/v2/object-schemas.md   |
| Water quality    | https://github.com/rafaeelneto/welldot/blob/main/packages/core/docs/spec/v2/water-quality.md    |
| Interoperability | https://github.com/rafaeelneto/welldot/blob/main/packages/core/docs/spec/v2/interoperability.md |
| FGDC textures    | https://github.com/rafaeelneto/welldot/blob/main/packages/core/docs/reference/fgdc-textures.md  |

Fetch these if you can browse. **If you cannot browse**, `references/well-spec.md` — bundled
alongside this file, and uploaded with it into a ChatGPT Project or Gemini Gem — is a full
offline copy of the v2 spec. Use it, and say in your summary that you worked from the offline
copy rather than the live spec.

If this SKILL.md conflicts with the published spec, **the published spec wins**.

### Doc caching across files

When processing multiple files in one session (batch conversion, cross-well comparison), reuse
the already-fetched docs from context — **1 fetch per session is enough**. Still do a quick
sanity check before each extraction: confirm required fields and vocabulary match what you read.
Re-fetch if the session is long or you suspect spec changes.

---

## Language and free-text preservation

**Preserve the source document's language** in all free-text fields (`description`, `obs`, `notes`,
`geologic_unit`, `aquifer_unit`, names, `history_logs[].description`, and the freetext "type" fields
below, etc.). Portuguese report → Portuguese output. English report → English output. Only translate if
the user explicitly asks.

**Stay near-verbatim.** Light trimming of filler words is fine. Summarizing or paraphrasing a free-text
field is only acceptable when it drops **zero** detail or data — no lost measurements, materials,
brand/equipment names, or qualifiers. When in doubt, transcribe closer to the original rather than
condense it. This applies with extra weight to `hole_fill[].description`, and to `well_case.type`,
`well_screen.type`, `reduction.type`, and `cement_pad.type` — see § Vocabulary tiers below for why those
four are treated as description-like text rather than enums.

---

## Metric fidelity — critical rule

**Transcribe only values explicitly stated in the document.** For every numeric field:

- Value present → transcribe precisely, converting units if needed
- Value absent → **omit the field entirely** — never estimate, infer, or approximate

Applies to: `location.lat`, `location.lng`, `location.elevation`, `from`, `to`, `diameter`,
`screen_slot`, `dip`, `azimuth`, all `hydrodynamic_events`/`aquifer_analysis` numerics, and all other
numeric fields. If a pump-test report only gives a final drawdown value and not a time series, record a
single `LevelReading` — never fabricate intermediate readings to fill out a curve.

Accepted conversions (only when original unit is explicit in the document):

- ft → m: `× 0.3048` | in → mm: `× 25.4` | cm → mm: `× 10`
- L → m³: `÷ 1000` (meter readings and volumes) | L/s → m³/h: `× 3.6` | cv → kW: `× 0.7355`
- DMS → decimal degrees: convert precisely
- SIRGAS 2000 UTM → WGS84 decimal: convert precisely or ask the user
- Water quality (v2.3): µg/L → mg/L `÷ 1000` | mS/m → µS/cm `× 10` | mS/cm → µS/cm `× 1000` |
  expanded uncertainty → `value_precision` `÷ k` — see § `water_samples`

Use empty arrays (`[]`) for array fields the document has nothing for. **Omit** `cement_pad`,
`location`, `well_id`, `well_purpose`, `centralizers`, `hydrodynamic_events`, `aquifer_analysis`,
`history_logs`, `attachments`, `pump_installations`, `permits`, `meters`, `production`,
`operating_regime` and `water_samples` entirely rather than emitting empty placeholders.

---

## Step 1 — Get the spec

Read the five docs above (browse, or fall back to `references/well-spec.md`). Pay attention to:

- Required fields per object type
- Which "type"-like fields are recommended-but-free-text vs. pure free text vs. a real closed enum —
  see § Vocabulary tiers below; this distinction changed since this SKILL.md's v1 days and is easy to
  get wrong by assuming everything is an enum.
- `hydrodynamic_events` / `aquifer_analysis` / `history_logs` — v2-only, absent from v1 reports' target
  format but still the correct place for pump-test and maintenance data found in a report.
- Any new fields or types added since this SKILL.md was written
- Available FGDC codes (Series 600 and 700 cover most well lithologies)

---

## Step 2 — Read the report

Read the document with whatever file and vision capability you have.

| Format               | How to read                                                                   |
| -------------------- | ----------------------------------------------------------------------------- |
| PDF                  | Extract the text layer; **rasterize pages and read them visually** if scanned |
| DOCX                 | Extract document text, including tables                                       |
| Image (JPG/PNG/TIFF) | Read visually                                                                 |
| Plain text / CSV     | Read directly                                                                 |

Well logs are heavily tabular and often hand-annotated — when the text layer looks garbled,
misaligned, or suspiciously sparse, look at the page image instead of trusting the extraction.
Depth columns in particular are easy to shear across rows.

Multiple files → process each, then merge results.

---

## Step 3 — Extract the well data

Produce a single JSON object conforming to the v2 spec you read in Step 1, applying
§ Language and free-text preservation and § Metric fidelity above, plus the rules below.

### Vocabulary tiers — these fields are NOT uniformly enums

**Tier 1 — recommended example values, not enforced.** Use the example term ONLY when the report's
own wording maps to it losslessly (no dropped nuance/brand/equipment/shape detail); otherwise
transcribe the report's own phrase verbatim, in its own language:

- `bore_hole[].drilling_method`: rotary, percussion, cable_tool, auger, air_hammer
- `cement_pad.type`: material and/or shape, e.g. "concrete", "circular" (may combine both)
- `well_type`: tubular, hand_dug, horizontal, infiltration_gallery (use `x-` prefix if none fit). This is
  the **construction method only** — never emit `artesian` (deprecated in v2.1); "artesiano/jorrante" is a
  hydraulic condition, recorded as a negative `static_level` in a `spot_measurement` when the report gives one
- `well_purpose` (array): production, monitoring, piezometer, water_level_indicator (INA), observation,
  exploration, injection, dewatering — only when the report states the use
- `centralizers[].type`: spring_bow, rigid, semi_rigid, polymer

**Tier 2 — pure free text, NO recommended vocabulary exists for these at all.** Never invent or
apply an enum. Always transcribe the report's own wording verbatim, in its own language:

- `well_case[].type` (casing material — do NOT use steel/pvc/hdpe/fiberglass as an enum)
- `reduction[].type`
- `well_screen[].type` (do NOT use wire_wound/bridge_slot/louvered/pvc_slotted as an enum)

**Tier 3 — real closed enum, must classify into exactly one value:**

- `hole_fill[].type`: `gravel_pack` or `seal` only. (`hole_fill[].description` carries the
  near-verbatim material detail instead.)
- `history_logs[].status` (category `status_change`): `active`, `maintenance`, `inactive`,
  `decommissioned` or `abandoned` only — no `x-` values; any other value is rejected.

### Texture — `lithology[].texture`

An object, not a bare string or code:

```json
{ "code": 607, "vocabulary": "fgdc" }
```

- `vocabulary` defaults to `"fgdc"` (integer codes). Only use a different vocabulary (`cgi`,
  `custom`, or an HTTPS URI) when the source document itself explicitly cites that standard.
- `texture` is **REQUIRED** on every lithology entry — never omit it.
- Match the description to the best FGDC code. Prefer Series 600 (sedimentary) and 700
  (metamorphic/igneous) — the only series with rendered patterns today. Between two comparably
  good candidates, prefer the non-pending one; but geological accuracy comes first — never
  force-fit a poorly-matching Series 600/700 code just to avoid a pending Series 100–500 code.
- Common mappings (verify against the full `fgdc-textures.md` list):
  Sand/Areia=607, Gravel/Cascalho=601, Clay/Argila=620, Silt/Silte=616,
  Limestone/Calcário=627, Granite/Granito=718, Gneiss=708, Schist/Xisto=705,
  Quartzite/Quartzito=702, Basaltic flows/Basalto=717, Sandstone/Arenito=607-608,
  Shale/Folhelho=619-620, Chalk=626, Coal/Carvão=658, Gypsum/Gesso=667
- Codes 120, 123, 132 are non-pending but have meaningless placeholder labels — never use them.

### Lithology color

Geologically plausible CSS hex. Examples: clay=`#8B7355`, sand=`#F5DEB3`, granite=`#A9A9A9`,
basalt=`#696969`, limestone=`#FFFACD`, gneiss=`#B8860B`, schist=`#9E8B6E`.

### Fractures and caves

- `fracture` required: `depth`, `water_intake` (bool), `description`, `swarm` (bool), `azimuth`, `dip`
- `cave` required: `from`, `to`, `water_intake` (bool), `description`

### `hydrodynamic_events` — pumping tests, static/dynamic level measurements

Array. Common fields per entry: `id` (uuid), `type`, `datetime` (RFC 3339 **with UTC offset** —
never a naked timestamp), `sequence`, `operator`, `equipment`, `notes`.

`type` is one of:

- `spot_measurement` — `static_level` (required), `static_level_precision`, `measurement_method`
  (electric_probe/pressure_transducer/air_line/tape), `steps` (0 or 1), `recovery` (optional)
- `constant_rate` — `static_level` (optional), `steps` (exactly 1), `recovery` (optional)
- `step_drawdown` — `static_level` (optional), `steps` (≥2, ascending rate order), `recovery` (optional)
- `airlift` — `steps` (≥1) required, `recovery` optional. NEVER let an airlift event's `id` appear in
  any `aquifer_analysis[].source_event_ids` — refuse and flag to the user if the report implies otherwise.
- `recovery_only` — `pumping_rate` (optional), `pumping_duration` (optional), `recovery` REQUIRED

Nested shapes:

- `PumpingStep`: `{ rate (m3/h, required), rate_precision, duration (min), readings: LevelReading[] }`
- `LevelReading`: `{ elapsed (min, required), depth (m, required), depth_precision, pressure (kPa) }`
- `RecoveryPhase`: `{ readings: LevelReading[] (required) }`

### `aquifer_analysis`

Only populate when the report states an actual **interpreted result** (transmissivity, specific
capacity, etc.) — never compute these yourself from raw readings.

Fields: `id`, `datetime` (RFC 3339 with offset), `analyst`, `source_event_ids` (required,
references `hydrodynamic_events` ids, never `airlift`), `method`
(cooper_jacob/theis/neuman/hantush/birsoy_summers/eden_hazel/visual_inspection), `static_level`
(+`_precision`, `_source_id`), `dynamic_level` (+`_precision`), `flow_rate` (+`_precision`),
`max_flow_rate` (+`_precision`, `_basis`), `specific_capacity`, `transmissivity`, `storativity`,
`hydraulic_conductivity`, `aquifer_thickness`, `jacob_b`, `jacob_c`, `well_efficiency_pct`, `notes`.

### `history_logs`

Interventions/inspections/incidents distinct from `hydrodynamic_events`. Each entry: `id`,
`datetime` (RFC 3339 with offset, when it happened), `updated_at` (RFC 3339 with offset, when the
record was made/edited — **NEVER synthesize this** if the report doesn't distinguish it from
`datetime`; omit instead), `category` (maintenance/inspection/incident/event/change_of_use/
status_change, open vocab), `description` (near-verbatim), `author`, `severity`
(low/medium/high/critical), `attachments` (only if the report references an actual retrievable URL —
`Attachment`: `id`, `uri` (https, required), `media_type` (required), `document_type`, `filename`,
`description`, `sha256`).

Category-specific fields (v2.3) go **only** on entries of their category:

- `maintenance` — `maintenance_type` (inspection/cleaning/redevelopment/disinfection/pump_service/
  meter_calibration/video_inspection/level_measurement/pump_test/water_sampling), and optional
  references `pump_installation_id`, `meter_id`, `event_id` (the `hydrodynamic_events` entry holding
  the data the task produced) and `sample_id` (the `water_samples` entry a `water_sampling` task
  collected). The log records that the task was done — **never copy measured values into it**; a
  level measured during maintenance is a `spot_measurement` event referenced by `event_id`, and a
  water sample is a `water_samples` entry referenced by `sample_id`.
- `status_change` — `status`, a **closed** enum: exactly one of `active`, `maintenance`, `inactive`,
  `decommissioned`, `abandoned` (any other value, `x-` included, makes the file invalid; if the
  report's wording maps to none of them, use a plain `event` entry instead) — only when the
  report states the well was put into operation, stopped, sealed or abandoned, with a date. Never
  infer a status from silence: without a `status_change`, the status is unknown.
- Permit condition fulfillment is **not** a log category — it goes on the condition (§ `permits`).

### `pump_installations` (v2.3)

Only when the report describes the installed pump. Each entry: `id`, `installed_at` (RFC 3339 with
offset, required), `removed_at`, `type` (submersible/vertical_turbine/jet/progressive_cavity/hand_pump/
compressor_airlift — solar is a `power_source`, never a `type`), `power_source` (grid/solar/diesel/
hybrid), `manufacturer`, `model`, `serial`, `intake_depth` (m), `rated_flow_rate` (m³/h), `rated_head`
(m), `rated_power` (**kW** — convert cv/hp), `stages`, `riser_diameter` (mm), `riser_material`,
`check_valve`, `electrical` (`voltage` V, `phases` 1|3, `cable_section` mm², `cable_length` m). A pump
mentioned only as test equipment belongs in the event's `equipment` field, not here.

### `permits` (v2.3)

Only when the report transcribes a legal instrument (outorga, outorga prévia, dispensa, cadastro
CNARH, autorização de perfuração). Each entry: `id`, `type` (abstraction_permit/preliminary_permit/exemption/registration/
dewatering_permit/drilling_permit — a renewal is **not** a type: it is a new permit whose `supersedes` is the previous
permit's `id`), `authority` (issuing body, e.g. `ANA`, `SEMAS-PA`), `identifier` (portaria/license code of the
granted instrument, verbatim, any format) and/or `request_identifier` (protocol/process number of
the request, verbatim) — at least one; a permit only requested has no `identifier`. `status`
(**closed** enum: `requested`, `granted`, `suspended`, `revoked`, `denied`, `withdrawn`; omit when
granted, set it only when the report states it), `history[]` (administrative steps the report
records: `{ id, date (YYYY-MM-DD), type? (filing/process/notification/fee/inspection/decision/
renewal), description, done?, due_date? }`), `issued_at`, `valid_from`, `valid_until`, `renewal_requested_at` (all **calendar dates**
`YYYY-MM-DD`, never instants), `water_use[]` (human_supply/industrial/mining/irrigation/livestock/
commercial), `flow_rate` (m³/h), `daily_operating_time` (hours, 0–24), `volume_limits[]`
(`{ period: daily|monthly|annual, volume }` in m³ — only volumes **stated** in the document, never
flow × time), `monthly_schedule[]` (`{ month 1–12, flow_rate?, daily_operating_time?, days? }`;
months absent from it have no abstraction granted), `conditions[]`. Each condition: `id`,
`description` (verbatim), `category` (monitoring_report/water_level_monitoring/production_report/
water_quality_analysis/meter_installation/sanitary_protection/renewal_request), and its deadline as
either `first_due` (date) **or** `due_after` (ISO 8601 date duration from the start date, e.g.
`P90D`), plus `recurrence` (`P6M`, `P1Y`), `last_due`, `occurrences`, `responsible` (who must meet
it, if stated). Never compute or store the deadline dates or the validity status — they are
derived. Fulfillments go in the condition's `fulfillments[]`: `{ id, datetime (RFC 3339 with
offset), due_date (the deadline met; omit for undated conditions), description?, author?,
event_id?, sample_id? }` (`sample_id` when a `water_quality_analysis` condition was met by a
sample) — only if the report records them.

### `meters` (v2.3)

Only when the report describes an installed totalizer (hidrômetro). Each entry: `id`, `installed_at`
(RFC 3339 with offset, required), `removed_at`, `type` (mechanical/electromagnetic/ultrasonic),
`serial`, `nominal_diameter` (mm, DN), `max_reading` (register capacity in **m³**, > 0 — only if
stated). Device facts only — **never put a
reading on the meter**; the installation and removal register values are `production` readings with
`datetime` equal to `installed_at` / `removed_at`.

### `production` (v2.3)

Append-only ledger, discriminated by `type`. Common: `id`, `type`, `corrects` (id of an entry this
one retracts — only if the source itself records a correction), `sequence`, `notes`.

- `meter_reading` — `datetime` (RFC 3339 with offset), `meter_id` (a `meters[].id`, required —
  create the meter entry too), `reading` (register value in **m³**; a meter reading in liters is
  converted `÷ 1000`), `source` (manual/telemetry).
- `declared_volume` — `period_start`, `period_end` (instants, end later than start), `volume` (m³),
  `method` (`reported` when the report transcribes a volume declared to a regulator; `estimated`
  when the report itself gives an estimate such as flow × time).

**Never compute or store derived values**: no consumption between readings, no monthly/annual totals,
no average flow — transcribe register values and declared volumes only. Never fabricate a reading
of `0` at installation unless the report states it.

### `operating_regime` (v2.3)

Only when the report states how the well is operated (e.g. "opera 20 h/dia a 15 m³/h"). Each entry:
`id`, `effective_from` (RFC 3339 with offset, required; unique), `flow_rate` (m³/h),
`daily_operating_time` (hours, 0–24), `days_per_week` (integer 1–7). Omit unknown fields — never
write `0`. A stopped well is a `status_change`, not a regime with `flow_rate: 0`. The granted values of
a permit go in `permits`, not here.

### `water_samples` (v2.3) — laboratory reports (laudos)

Only when the document has water quality results. A **ledger**: one entry per collection (`id`,
`datetime` of collection, `sample_type`, `sampling_point`, `purge`, `laboratory`, `results[]` ≥ 1);
a corrected laudo is a new sample with `corrects`. **Read references/well-spec.md § `water_samples[]`
— Import rules (laudos) before extracting.** Non-negotiable: each result has exactly one of `value` /
`presence` / `text`; prefer `welldot` codes, then CAS, then `x-` with a UCUM `unit` (never `unit` on
`welldot`/`cas`); the basis is in the code (nitrate as N ≠ as NO₃⁻); substances in mg/L (µg/L ÷ 1000),
conductivity in µS/cm (mS/m × 10); `< 0,001` keeps the value with `qualifier: "<"`; N.D. without a
number is `not_detected` + `detection_limit`; expanded uncertainty ÷ k → `value_precision`; date-only
receipt/analysis → `T00:00:00` local + `_resolution: "day"`; lab flags verbatim; sampling depths from
ground level; the laudo as `document_type: "lab_report"`; **never write limits, VMPs or conformity**.

### `attachments` (v2.3)

Root-level documents about the whole well (drilling report, as-built drawing, registry record) —
only when the report references actual retrievable HTTPS URLs. Same `Attachment` shape, with
`document_type`.

### Top-level v2 structure

- `version`: `2` (integer)
- `well_id[]`: `{ authority, id, primary? }`
- `location`: `{ lat, lng, elevation?, properties? }` — replaces v1's flat `lat`/`lng`/`elevation`
- `profiles[]`: only if the report explicitly declares conformance to a named profile schema —
  usually omit

### `well_depth`

Number, meters, optional: the well's **CURRENT/USABLE** depth, distinct from the as-drilled depth
(which goes in `bore_hole[].to`).

Most reports state only ONE depth figure — the drilled/total depth — which belongs in `bore_hole`,
NOT `well_depth`. Only populate `well_depth` when the report explicitly distinguishes a
current/usable/measured depth from the original drilled depth (e.g. a re-survey noting siltation,
debris, or partial backfill reduced the depth; SIAGAS-style records with a separate "profundidade
útil"). **Never copy the same total-depth figure into both `bore_hole[].to` and `well_depth`.**

---

## Step 4 — Validate

1. `"version": 2` present
2. All required fields present per object type (per spec from Step 1)
3. Depth consistency: `from < to` for all interval objects
4. Diameter sanity: boreholes 100–600 mm typical; casings smaller than borehole
5. `lithology[].texture` is an object `{code, vocabulary}` — never a bare string or the old
   `fgdc_texture` field name; `code` is numeric when `vocabulary` is `fgdc`
6. `hole_fill[].type` is exactly `gravel_pack` or `seal` — but `well_case.type`, `reduction.type`,
   `well_screen.type`, `cement_pad.type`, and `drilling_method` are **not** checked against any enum;
   flag it as a bug in the extraction (not a data problem) if one of those was force-fit to a value the
   report didn't actually say
7. `well_screen[].screen_slot` used, not the v1 `screen_slot_mm`
   7b. `well_type` is not `artesian`; `well_purpose`, if present, is an array; `centralizers[].spacing`, if
   present, is > 0 and came from the report (never derived from a count); water levels above ground are
   negative
8. Every `hydrodynamic_events[]`, `aquifer_analysis[]`, `history_logs[]` `datetime` (and `updated_at`),
   every `pump_installations[]` / `meters[]` `installed_at` / `removed_at`, every `production[]`
   `datetime` / `period_start` / `period_end`, every `operating_regime[].effective_from`, and every
   `water_samples[]` `datetime`, `laboratory.received_at` and `results[].analyzed_at`, is
   RFC 3339 **with a UTC offset** — reject and fix any naked `YYYY-MM-DDTHH:MM:SS` or bare date used
   where an instant is required (only `construction_date`, the `permits[]` dates, condition
   `first_due`/`last_due` and `history_logs[].due_date` are bare calendar dates)
   8b. `permits[].conditions[]` `due_after`/`recurrence` are date-only durations (`P90D`, `P6M`, never
   `PT…`); a condition never has both `first_due` and `due_after`
   8c. Every `production[].meter_id` resolves to a `meters[].id`; readings and volumes are in m³; no
   derived totals were written; `operating_regime` has no zero placeholders, `daily_operating_time` is
   0–24 and `days_per_week` an integer 1–7; `history_logs` category-specific fields appear only on
   their own category; every `status` is one of the five closed values
   8d. `water_samples`: the checks in references/well-spec.md § `water_samples[]` — Import checklist
   pass (one value form per result, no `unit` on `welldot`/`cas`, `depth` xor `from`/`to`, all ids resolve)
9. `hydrodynamic_events[].steps` cardinality matches its `type`: `spot_measurement` 0–1,
   `constant_rate` exactly 1, `step_drawdown` ≥2 ascending, `airlift` ≥1, `recovery_only` none
   (recovery required instead)
10. No `aquifer_analysis[].source_event_ids` entry points to an `airlift`-type event
11. No numeric field was estimated — if in doubt, remove and flag to user

---

## Step 5 — Deliver and summarize

Write the file as `<sanitized_well_name>.well` if you can write files (see § Platform notes for
where). If you cannot, return the complete JSON in a fenced block instead.

Present it with a brief summary:

- Sections found: constructive (bore_hole, casing, screen, etc.) / geologic (lithology, fractures) /
  hydrodynamic (pumping tests, aquifer analysis) / history (maintenance, inspections, incidents,
  status changes) / operation (pumps, permits, meters, production, operating regime) / water quality
  (samples, number of results, any parameter mapped to CAS or `x-` codes, unit conversions applied,
  assumed coverage factor k)
- Total depth (from `bore_hole`), and `well_depth` separately if the report gave a distinct current/
  usable depth
- Any freetext "type" field (drilling_method, well_case/reduction/well_screen.type, cement_pad.type)
  that was kept as the report's original wording rather than mapped to a recommended value
- Fields absent in the report (intentionally omitted) that may need manual completion
- Whether you worked from the live spec or the bundled offline copy

---

## Step 6 — Handle ambiguities

Ask targeted questions for missing critical data. Common gaps:

- **Borehole diameter** not stated (do not infer — ask)
- **Total depth** sometimes only in feet — confirm conversion
- **Two different depth figures** (e.g. original drilled depth vs. a more recent measured/usable depth,
  often from a re-survey) — confirm which is `bore_hole[].to` (as-drilled) and which is `well_depth`
  (current/usable); do not guess
- **Screen slot** (`screen_slot`) often missing in older reports
- **Coordinates** sometimes in UTM — ask for decimal degrees or convert
- **Driller name** often in header/stamp missed by text extraction
- **Pump-test data** often gives only a final drawdown reading, not a full time series — ask before
  fabricating intermediate `LevelReading`s to fill a curve
- **Static vs. dynamic level dates** sometimes ambiguous between a single test event and a routine
  monitoring visit — ask whether to record as `constant_rate`/`step_drawdown` (a formal test) or
  `spot_measurement` (a routine check)
- **History-log dates** — maintenance or incidents mentioned in narrative prose without a clear date;
  ask rather than guessing a `datetime`, and never synthesize `updated_at` if the report doesn't
  distinguish it from when the event happened
- **Water quality** — nitrate without a stated basis (as N vs NO₃⁻), turbidity without a unit, "N.D."
  without a detection limit, dissolved metals without filtration details — ask rather than guess
- **`aquifer_analysis` results without visible source data** — if the report states a transmissivity or
  specific-capacity figure but no underlying test readings, ask whether to still record the analysis
  (with `source_event_ids` pointing at whatever event context exists) or omit it

---

## Common report term lookup

| Section       | PT terms                                                            | EN terms                                                         |
| ------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Metadata      | Nome do poço, empresa perfuradora, data de conclusão, cota          | Well name, driller, completion date, elevation                   |
| Borehole      | Perfuração, diâmetro de perfuração, profundidade total              | Drilling, borehole diameter, total depth                         |
| Usable depth  | Profundidade útil, profundidade atual, profundidade medida          | Usable depth, current depth, measured depth                      |
| Casing        | Revestimento, tubo de aço/PVC                                       | Casing, steel/PVC pipe                                           |
| Reduction     | Redutor, adaptador                                                  | Reducer, adapter                                                 |
| Screen        | Filtro, seção filtrante, ranhura, wire-wound                        | Screen, slotted section, slot opening                            |
| Gravel pack   | Pré-filtro, enrocamento, seixo                                      | Gravel pack, filter gravel                                       |
| Seal          | Cimentação anular, bentonita, vedação                               | Annular seal, bentonite, cement                                  |
| Cement pad    | Laje de proteção, laje de concreto                                  | Wellhead pad, concrete pad                                       |
| Lithology     | Perfil litológico, coluna geológica, camadas                        | Lithological profile, geologic column, layers                    |
| Fractures     | Fraturas, zonas fraturadas                                          | Fractures, fracture zones                                        |
| Caves         | Cavernas, zonas cavernosas                                          | Caves, voids, cavities                                           |
| Pumping test  | Teste de vazão, teste de bombeamento, teste de aquífero             | Pumping test, aquifer test                                       |
| Levels        | Nível estático, nível dinâmico, rebaixamento                        | Static level, dynamic level, drawdown                            |
| Recovery      | Recuperação, teste de recuperação                                   | Recovery, recovery test                                          |
| Air-lift      | Air-lift, teste de produção por ar comprimido                       | Air-lift, air-lift test                                          |
| Maintenance   | Manutenção, troca de bomba, limpeza, recondicionamento              | Maintenance, pump replacement, cleaning, redevelopment           |
| Inspection    | Inspeção, vistoria, filmagem                                        | Inspection, survey, camera log                                   |
| Incident      | Incidente, colapso, contaminação, vandalismo                        | Incident, collapse, contamination, vandalism                     |
| Meter         | Hidrômetro, macromedidor, leitura, totalizador                      | Water meter, flow totalizer, meter reading                       |
| Production    | Volume captado, volume extraído, declaração de uso                  | Abstracted volume, production, declared volume                   |
| Regime        | Regime de operação/bombeamento, horas por dia, dias/semana          | Operating regime, hours per day, days per week                   |
| Status        | Em operação, paralisado, desativado, tamponado, abandonado          | Active, inactive, decommissioned, sealed, abandoned              |
| Water quality | Laudo, coleta, amostra, LD/LQ, duplicata, branco, VMP (don't store) | Lab report, sample, LOD/LOQ, duplicate, blank, MCL (don't store) |

---

## Output filename

`<sanitized_well_name>.well`

Examples: "Poço PP-01" → `poco-pp-01.well` | "Well BH-3" → `well-bh-3.well` | unknown → `well.well`
