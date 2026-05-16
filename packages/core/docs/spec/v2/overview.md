# `.well` File Format Specification — Version 2.0: Overview

**Version:** 2.0 (proposed) **Extension:** `.well` **Encoding:** UTF-8 **Base format:** JSON **MIME type:** `application/vnd.well+json` **JSON Schema:** `https://welldot.org/schema/v2/well.schema.json` **JSON Schema draft:** 2020-12 **JSON-LD Context (optional):** `https://welldot.org/context/v2.jsonld` **Status:** Draft — not yet ratified

**See also:** [format-reference.md](./format-reference.md) · [object-schemas.md](./object-schemas.md) · [interoperability.md](./interoperability.md)

---

## Changes from v1

```
v2.0-draft additions:
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

v2.0-draft tightenings:
- All numeric values are SI by spec. The format does not encode a
  units declaration; see § Units for the canonical mapping. v1 was
  de facto SI in practice and no v1 file in existence declared
  non-SI units, so this is a clarification rather than a breaking
  change. Display and input units are application concerns.

v2.0-draft preserves all v1 fields. Parsers must accept v1 documents
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
- **Ground level as zero** — all depth values are measured from ground level (0); elevation above the WGS84 ellipsoid (or declared datum) is stored separately in `location.elevation`.
- **Geographic north** — all azimuth values are referenced to geographic north.
- **Append-only event history (by authoring convention)** — `hydrodynamic_events` is intended as a ledger. New measurements should be added as new entries; existing entries should not be modified. This is enforced by authoring tools in the welldot stack, not by the file format itself. The format provides `id`, `datetime`, and `sequence` to support this discipline.
- **Derived values are never stored raw** — `s/Q`, `Q/s`, drawdown `s`, and any other value computable from stored fields must not appear as stored fields. Applications compute them on demand.
- **Interpreted results are versioned** — `aquifer_analysis` records which method was used, who performed the analysis, and which events were used as input. Multiple analyses may coexist.
- **Graceful incompleteness** — a record with only a flow rate and a dynamic level is valid. A record with only a static level measurement is valid. Validators must not reject incomplete events.
- **Mutable operational log with edit traceability** — `history_logs` entries are editable to allow correction of field errors. Each entry carries a separate `updated_at` timestamp that records when the entry itself was last modified, distinct from the `datetime` field that records when the logged event occurred.
- **Preserve unknown members** — parsers must preserve and pass through any unrecognized fields or top-level blocks without modification, following the GeoJSON foreign members convention. This ensures forward compatibility.

---

## Known Limitations of v2

The following are recognized limitations of this version, reserved for future versions:

- **No internationalization of text fields.** All free-text fields (`description`, `notes`, `author`, etc.) are opaque strings with no language tag. A file produced in Brazil will have Portuguese content; one from Norway will have Norwegian. v3 will consider BCP 47 language objects for text fields, with backward-compatible string fallback.
- **No water quality block.** Chemical and physical water quality measurements are out of scope for v2 and reserved for v3.
- **No geophysical logs block.** Downhole geophysical surveys (resistivity, gamma ray, caliper) are out of scope for v2 and reserved for v3.
- **No multi-well linking.** Storativity determination requires observation well data. The top-level `references` field name is reserved for v3 to link wells across files.

---

_Draft — `.well` Format Specification v2.0_
