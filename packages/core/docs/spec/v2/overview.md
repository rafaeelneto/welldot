# `.well` File Format Specification — Version 2.3: Overview

**Version:** 2.3 **Extension:** `.well` **Encoding:** UTF-8 **Base format:** JSON **MIME type:** `application/vnd.well+json` **JSON Schema:** `https://welldot.org/schema/v2/well.schema.json` **JSON Schema draft:** 2020-12 **JSON-LD Context (optional):** `https://welldot.org/context/v2.jsonld` **Status:** v2.0 ratified — shipped in `@welldot/core` v0.2.0 · v2.1 shipped in `@welldot/core` v0.3.0 · v2.3 shipped in `@welldot/core` v0.4.0

**See also:** [format-reference.md](./format-reference.md) · [object-schemas.md](./object-schemas.md) · [interoperability.md](./interoperability.md) · [water-quality.md](./water-quality.md)

---

## Changes in v2.3

v2.3 is an additive minor revision. Every valid v2.1 document is a valid v2.3 document, and documents keep declaring `"version": 2`. It adds the operational blocks (equipment, documents, permits, metering, production and operating regime) and the water quality block (`water_samples`).

```
v2.3 additions:
- attachments (optional Attachment[]): root-level documents about the
  well as a whole (drilling report, as-built drawing, registry record…)
- Attachment becomes a common type and gains document_type
  (drilling_report, as_built_drawing, registry_record, photo,
  permit_document, condition_evidence, pump_curve, field_sheet,
  test_report, lab_report, invoice)
- pump_installations (optional PumpInstallation[]): pump installation
  history, with nameplate, intake depth, riser and electrical data
- permits (optional Permit[]): legal instruments governing abstraction
  (outorga, dispensa, cadastro) with validity, granted flow, daily
  operating time, volume limits, monthly schedule and conditions
  (condicionantes) whose deadlines are derived from ISO 8601 date
  durations; renewals are linked with supersedes. Each permit carries
  its identifier and/or request_identifier (verbatim, any format), a
  closed administrative status (requested, granted, suspended,
  revoked, denied, withdrawn), an administrative history (filing,
  process, notifications, fees, with done/due_date) and, on each
  condition, a responsible and the fulfillments of its deadlines
  (datetime, due_date, author, event_id, sample_id)
- meters (optional Meter[]): totalizer (hidrômetro) installation
  history; device facts only (type, serial, nominal diameter,
  max_reading for rollover)
- production (optional ProductionEntry[]): append-only ledger of
  meter_reading entries (register values in m³) and declared_volume
  entries (estimated or reported volumes for a period); volumes are
  derived from consecutive readings, never stored as totals
- operating_regime (optional OperatingRegime[]): declared flow rate,
  daily operating time and days per week, each entry in force from
  effective_from
- history_logs category status_change, with status (active,
  maintenance, inactive, decommissioned, abandoned): the well's
  operating status; current status is unknown without one
- history_logs category maintenance gains maintenance_type,
  pump_installation_id, meter_id and event_id: references to the data
  a task produced, never copies of measured values
- hydrodynamic_events[].corrects: retracts an earlier event (ledger
  correction)
- hydrodynamic_events[].attachments, aquifer_analysis[].attachments
- Canonical units kW (power), V (voltage), mm² (cable cross-section),
  m³ (volume), h (daily operating time only)
- water_samples (optional WaterSample[]): ledger of water samples,
  each with its field and laboratory results in one list
  (distinguished by measured_in), sampling point (point depth or
  isolated interval, or the production pump), purge and stabilization
  readings, laboratory and chain of custody, field QA/QC
  (field_duplicate, split_sample via parent_sample_id; blanks),
  per-result filtration, lab flags and data validation; corrected
  reports and revalidations are new samples with corrects
- Parameter identity { code, vocabulary } with vocabularies welldot,
  cas and x-…; the welldot parameter vocabulary (98 codes) is
  published as versioned data in @welldot/core, with CAS
  equivalences; the unit of a welldot or cas parameter comes from its
  code (substances always mg/L), and unit (UCUM) exists only for x-
  codes
- Canonical units mg/L, µS/cm at 25 °C, °C, mV, NTU / FNU / FAU / FTU
  (by code), Hazen (uH), MPN/100 mL, CFU/100 mL, CFU/mL, Bq/L and µm
- _resolution convention: analyzed_at_resolution and
  laboratory.received_at_resolution set to "day" mark an instant
  known only by its date; consumers MUST ignore the time of day
- history_logs gains sample_id (maintenance with maintenance_type
  water_sampling); permit condition fulfillments gain sample_id (e.g.
  a water-quality monitoring condition)
- Recommended vocabularies for drilling_method, construction materials
  (well_case / well_screen / reduction type, riser_material),
  centralizer steels, cement_pad.type, history_logs severity,
  measurement_method and aquifer_analysis method; every recommended
  vocabulary is published by @welldot/core with en/pt labels

v2.3 clarifications:
- Block kinds: every top-level array is a ledger, a mutable record or
  an installation; the kind decides how records are corrected
- Open vocabulary values are stored as their key, never as a
  translated label
- Datetime families: legal documents use calendar dates (YYYY-MM-DD),
  everything else uses RFC 3339 instants
- Naming rules: no units in field names; nameplate values use the
  rated_ prefix; time intervals use period_start / period_end
- supersedes (legal succession between permits) is distinct from
  corrects (ledger retraction)
- Permit status and condition deadlines are derived on the local civil
  date at the well site, never stored
- Volume derivation is normative: rollover via max_reading, never
  across two meters, unknown (never zero or negative) where readings
  do not cover; metered volume takes precedence over estimated
  declared volumes, and reported volumes are never added to totals
- Jurisdiction neutrality: water quality limits, exceedances and
  national rules are never written to the file; limit sets (WHO, EU,
  Brazil…) are data in @welldot/core and local requirements enter
  through profiles
```

v2.3 contains no deprecations.

---

## Changes in v2.1

v2.1 is an additive minor revision. Every valid v2.0 document is a valid v2.1 document, and documents keep declaring `"version": 2`.

```
v2.1 additions:
- well_purpose (optional string[]): intended use(s) of the well —
  production, monitoring, piezometer, water_level_indicator (INA),
  observation, exploration, injection, dewatering
- centralizers (optional Centralizer[]): casing/screen centralizers
  as depth interval + spacing
- history_logs category `change_of_use`

v2.1 clarifications:
- well_type describes the construction method only
- Level sign convention: water levels above ground are negative
  (made explicit; already implied by "ground level as zero")
```

### Deprecations

| Deprecated              | Replacement                                                                                               | Removal |
| ----------------------- | --------------------------------------------------------------------------------------------------------- | ------- |
| `well_type: "artesian"` | Construction method in `well_type` (usually `tubular`) + negative `static_level` in `hydrodynamic_events` | v3      |

---

## Changes from v1

```
v2.0 additions:
- location object (supersedes top-level lat/lng/elevation)
- well_id (array of authority-scoped identifiers)
- profiles (JSON Schema URLs for regulatory and domain-specific constraints)
- texture object (multi-vocabulary, replaces v1 fgdc_texture string)
- hydrodynamic_events (append-only ledger of water-level observations)
- aquifer_analysis (interpreted aquifer parameter sets)
- history_logs (operational log of interventions and incidents,
  with updated_at edit timestamp)
- optional @context (reserved for JSON-LD interoperability)
- optional *_precision fields on key measurements
- WellScreen.screen_slot renamed from screen_slot_mm

v2.0 tightenings:
- All numeric values are SI by spec. The format does not encode a
  units declaration; see § Units for the canonical mapping. v1 was
  de facto SI in practice and no v1 file in existence declared
  non-SI units, so this is a clarification rather than a breaking
  change. Display and input units are application concerns.

v2.0 preserves all v1 fields. Parsers must accept v1 documents
unchanged and must accept the following v1-to-v2 normalizations:
- Top-level lat/lng/elevation → location.lat/lng/elevation
- fgdc_texture: "<code>" → texture: { code, vocabulary: "fgdc" }
- screen_slot_mm → screen_slot (value preserved; both versions are
  in millimeters)
- bole_hole → bore_hole (v1 typo compatibility)
- diam_pol (inches) → diameter (mm), multiplied by 25.4
```

---

## Purpose

The `.well` format is an open standard for representing water well data. It is designed to serve three distinct but complementary use cases:

**Visualization.** The format contains sufficient constructive and geological detail to produce accurate technical well profile drawings — including borehole geometry, casing strings, screens, gravel packs, lithological columns, fractures, and caves — at true depth scale.

**Registration.** The format captures the administrative and physical identity of a well, providing a complete static record suitable for submission to regulatory bodies, inclusion in national well registries, and long-term archival.

**Research.** The structured geological and constructive data, combined with the hydrodynamic event ledger and interpreted aquifer parameters, enables cross-well analysis, aquifer characterization, and hydrogeological research. Field vocabulary choices are aligned with international standards.

---

## Design Principles

- **Self-describing** — full field names are used throughout; a `.well` file can be read and understood without consulting the spec.
- **Versioned** — includes a `version` field for forward compatibility; parsers must reject unrecognized versions.
- **Self-contained** — a single file encodes the complete record of one well.
- **Units are SI, declared by spec** — all numeric values in a `.well` file are stored in SI units. The format does not encode a per-file units declaration. See § Units for the canonical unit of each quantity. Conversion to and from a user's preferred display or input units is an application concern.
- **CRS is declared, not assumed** — geographic coordinates are accompanied by an explicit coordinate reference system declaration. The default is WGS84 (`EPSG:4326`).
- **Ground level as zero** — all depth values are measured from ground level (0); elevation above the WGS84 ellipsoid (or declared datum) is stored separately in `location.elevation`. Water levels above ground are negative.
- **Geographic north** — all azimuth values are referenced to geographic north.
- **Three block kinds** — every top-level array is one of three kinds, and the kind decides how records are corrected:
  - **Ledger** (`hydrodynamic_events`, `production`, `water_samples`) — append-only. An error is corrected by appending a new entry whose `corrects` points to the retracted entry; existing entries are never edited in place. A retracted entry stays in the file but is excluded from every derivation. This is enforced by authoring tools in the welldot stack, not by the file format itself. The format provides `id`, `datetime`, `sequence` and `corrects` to support this discipline.
  - **Mutable record** (`history_logs`, `permits`, `operating_regime`) — edited in place; `updated_at` records the last edit.
  - **Installation** (`pump_installations`, `meters`) — equipment present in the well for a period (`installed_at` / `removed_at`); edited in place with `updated_at`.
- **Derived values are never stored raw** — `s/Q`, `Q/s`, drawdown `s`, and any other value computable from stored fields must not appear as stored fields. Applications compute them on demand.
- **Jurisdiction neutrality** — the file records what was measured, never what it means under a given rule. Water quality limits, exceedances and national requirements are not stored and no field names a national standard; limit sets (WHO, EU, Brazil, …) are versioned data in `@welldot/core`, chosen by the consumer at display time, and local obligations (required parameters, sampling frequencies) enter through profiles.
- **Interpreted results are versioned** — `aquifer_analysis` records which method was used, who performed the analysis, and which events were used as input. Multiple analyses may coexist.
- **Graceful incompleteness** — a record with only a flow rate and a dynamic level is valid. A record with only a static level measurement is valid. Validators must not reject incomplete events.
- **Mutable operational log with edit traceability** — `history_logs` entries are editable to allow correction of field errors. Each entry carries a separate `updated_at` timestamp that records when the entry itself was last modified, distinct from the `datetime` field that records when the logged event occurred.
- **Preserve unknown members** — parsers must preserve and pass through any unrecognized fields or top-level blocks without modification, following the GeoJSON foreign members convention. This ensures forward compatibility.

---

## Known Limitations of v2

The following are recognized limitations of this version, reserved for future versions:

- **No internationalization of text fields.** All free-text fields (`description`, `notes`, `author`, etc.) are opaque strings with no language tag. A file produced in Brazil will have Portuguese content; one from Norway will have Norwegian. v3 will consider BCP 47 language objects for text fields, with backward-compatible string fallback.
- **No interpreted water quality assessment.** `water_samples` records samples and measured results only. Interpreted assessments (water class, hydrochemical facies as a stored judgment, fitness for use) have no block yet; facies, ion balance and exceedances are derived on demand.
- **Collective permits are repeated per well.** A grant covering several wells is repeated in each well's file until cross-file references arrive in v3.
- **No geophysical logs block.** Downhole geophysical surveys (resistivity, gamma ray, caliper) are out of scope for v2 and reserved for v3.
- **No multi-well linking.** Storativity determination requires observation well data. The top-level `references` field name is reserved for v3 to link wells across files.

---

_`.well` Format Specification v2.3_
