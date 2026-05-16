# `.well` File Format Specification — Version 2.0: Format Reference

**See also:** [overview.md](./overview.md) · [object-schemas.md](./object-schemas.md) · [interoperability.md](./interoperability.md)

---

## Top-level Structure

```json
{
  "version": 2,
  "@context": "https://welldot.org/context/v2.jsonld",

  "well_id": [ ... ],
  "location": { ... },

  "name": "...",
  "well_type": "...",
  "well_driller": "...",
  "construction_date": "YYYY-MM-DD",
  "obs": "...",

  "profiles": [ ... ],

  "bore_hole": [ ... ],
  "well_case": [ ... ],
  "reduction": [ ... ],
  "well_screen": [ ... ],
  "surface_case": [ ... ],
  "hole_fill": [ ... ],
  "cement_pad": { ... },

  "lithology": [ ... ],
  "fractures": [ ... ],
  "caves": [ ... ],

  "hydrodynamic_events": [ ... ],
  "aquifer_analysis": [ ... ],
  "history_logs": [ ... ]
}
```

---

## Versioning

| Version | Description                                                                                                                                                                                                                                                           |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `1`     | Initial release — constructive and geologic data only                                                                                                                                                                                                                 |
| `2`     | Adds location, well_id (array), profiles, texture object, hydrodynamic_events, aquifer_analysis, history_logs, optional @context, \*\_precision fields, and extensibility conventions. Tightens unit semantics: all values are canonical SI, no per-file declaration. |

### Parser version handling

The `version` field is an integer and must always be present.

- A v2 parser encountering `version: 1` MUST apply the v1-to-v2 normalizations listed in the changes section and treat the document as v2-equivalent for all subsequent processing.
- A v1 parser encountering `version: 2` MUST reject the file with a clear error indicating an unsupported format version. v1 parsers MUST NOT attempt partial reads of v2 documents.
- Either parser encountering an unrecognized integer version MUST reject the file with a clear error.
- A file without a `version` field SHOULD be rejected. Parsers MAY emit a warning and attempt to read the file as v1 if all required v1 fields are present and no v2-specific blocks are detected, but this fallback behavior is implementation-specific and not guaranteed by the spec.

Files with `version: 1` MUST NOT contain any v2-only blocks (`hydrodynamic_events`, `aquifer_analysis`, `history_logs`, `profiles`, `well_id` as array, `location` object, `@context`). A v1 file containing such fields is malformed.

---

## Deprecation Policy

The `.well` format evolves in two version dimensions:

- **Major versions** (`1`, `2`, `3`, …): may remove deprecated fields and introduce breaking changes. Each major version has its own canonical JSON Schema URL.
- **Minor revisions** within a major version (`2.0`, `2.1`, …): additive only. Minor revisions may introduce new fields, new vocabulary values, and **deprecation markers** for existing fields. Minor revisions MUST NOT remove fields, change field semantics, or break round-trip compatibility for files conforming to earlier minor revisions of the same major version.

### Field lifecycle

A field moves through three states:

1. **Active** — defined and recommended by the current minor revision.
2. **Deprecated** — still defined and still valid, but flagged for removal in the next major version. Deprecation is announced in a minor revision (e.g. introduced in v2.0, deprecated in v2.1).
3. **Removed** — no longer defined. May only occur in a new major version (e.g. removed in v3.0).

Each deprecation announcement MUST include, in the spec text for the relevant field:

- The minor revision in which the field was deprecated (e.g. _"Deprecated in v2.1"_).
- The major version in which the field will be removed (e.g. _"Will be removed in v3.0"_).
- The replacement field or pattern, when applicable.
- A v2-to-vNext normalization rule that parsers for the next major version MUST implement to read files using the deprecated field.

### Parser behavior

Parsers conformant to the version that introduced a deprecation:

- MUST accept the deprecated field as valid input.
- MUST preserve the deprecated field on round-trip unless explicitly migrating the document to a newer version.
- SHOULD emit a warning when encountering a deprecated field, naming the replacement.
- MAY offer a migration mode that rewrites the field to its replacement in place. Migration mode MUST be opt-in (e.g. an explicit flag passed to the parser), not the default behavior of read operations.

Parsers for the major version after removal:

- MUST apply the documented normalization when reading older files (e.g. a v3 parser reading a v2 file that used a v2-deprecated field).
- MUST NOT accept the removed field name in files declaring the new major version (e.g. a file with `version: 3` containing a v2-deprecated field is malformed).

### Vocabulary value promotion

When a vocabulary value previously available only with the `x-` prefix is promoted to canonical (e.g. `x-slug_test` becomes `slug_test`):

- The minor revision that performs the promotion MUST document both forms as equivalent.
- Parsers from that revision onward MUST treat both forms as equivalent for the remainder of the major version.
- The `x-` prefixed form is implicitly deprecated upon promotion and will be removed in the next major version, following the standard field lifecycle.

### Canonical deprecation registry

Each minor revision of this spec MUST include a "Deprecations" subsection in its changelog listing all fields and vocabulary values deprecated in that revision, with their replacement and removal timeline. The v2.0 release contains no deprecations.

---

## Top-level Fields

### Core identity

| Field               | Type    | Required | Description                                                                                                                                                                                                                                     |
| ------------------- | ------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `version`           | integer | yes      | Format version. Must be `2` for this spec.                                                                                                                                                                                                      |
| `well_type`         | string  | yes      | Classification of the well. See vocabulary below.                                                                                                                                                                                               |
| `name`              | string  | no       | Well name or local identifier.                                                                                                                                                                                                                  |
| `well_driller`      | string  | no       | Name of the drilling company or individual.                                                                                                                                                                                                     |
| `construction_date` | string  | no       | ISO 8601 calendar date of well completion (`YYYY-MM-DD`). Date-only by design — time of day for construction completion is not meaningful at the precision the well registry cares about. Interpreted as the local civil date at the well site. |
| `obs`               | string  | no       | Free-text observations about the well.                                                                                                                                                                                                          |

### v2 additions

| Field      | Type                      | Required | Description                                                                  |
| ---------- | ------------------------- | -------- | ---------------------------------------------------------------------------- |
| `@context` | string \| array \| object | no       | JSON-LD context. Reserved field; see § JSON-LD Context.                      |
| `well_id`  | `WellId[]`                | no       | Array of authority-scoped identifiers. See § well_id.                        |
| `location` | `Location`                | no       | Geographic position and elevation. See § location.                           |
| `profiles` | string[]                  | no       | Array of JSON Schema URLs declaring conformance to profiles. See § profiles. |

---

## Datetime Conventions

The `.well` format distinguishes two kinds of temporal values:

**Calendar dates** — `YYYY-MM-DD`, no time, no offset. Used for `construction_date` only. Interpreted as the local civil date at the well site. The well site's timezone is not stored separately; calendar dates are sortable lexicographically and applications MUST NOT attempt to derive an instant from them.

**Instants** — RFC 3339 datetime strings with a mandatory UTC offset (e.g. `2006-03-14T08:00:00-03:00` or `2006-03-14T11:00:00Z`). Used for all event, analysis, and log timestamps:

- `hydrodynamic_events[].datetime`
- `aquifer_analysis[].datetime`
- `history_logs[].datetime`
- `history_logs[].updated_at`

A datetime without an offset (naked `YYYY-MM-DDTHH:MM:SS`) is malformed and parsers MUST reject it. Time zone abbreviations (`EST`, `BRT`) are not RFC 3339 and MUST NOT be used.

### Ordering and ties

Instants are ordered by absolute UTC instant, not by the lexical form of the string. The strings `2006-03-14T08:00:00-03:00` and `2006-03-14T11:00:00Z` represent the same instant and tie for ordering purposes.

When two events share the same instant, the optional `sequence` integer breaks the tie (lower values sort first). When two events share the same instant and no `sequence` is provided, ordering is implementation-defined; producers SHOULD provide `sequence` when authoring events with identical instants.

---

## `well_type` — Recommended values

The `well_type` field accepts any string. The values below are the recommended vocabulary for interoperability. Tools should treat unrecognized values gracefully.

| Value                  | Portuguese (BR)         | Description                                    |
| ---------------------- | ----------------------- | ---------------------------------------------- |
| `tubular`              | Tubular                 | Conventional rotary or percussion drilled well |
| `artesian`             | Artesiano               | Free-flowing artesian well                     |
| `hand_dug`             | Cacimba / poço escavado | Manually excavated well or cistern             |
| `horizontal`           | Horizontal              | Horizontal or sub-horizontal well              |
| `infiltration_gallery` | Galeria de infiltração  | Horizontal subsurface infiltration gallery     |

Non-canonical values SHOULD use the `x-` prefix (e.g. `x-radial_collector`).

---

## `well_id`

Array of authority-scoped identifiers linking the well to external registries. A well may be registered in multiple national, regional, or institutional registries simultaneously.

| Field       | Type    | Required | Description                                                                       |
| ----------- | ------- | -------- | --------------------------------------------------------------------------------- |
| `authority` | string  | yes      | Name of the issuing registry or institution (e.g. `"SIAGAS"`, `"ANA"`, `"NGWD"`). |
| `id`        | string  | yes      | The identifier as issued by the authority.                                        |
| `primary`   | boolean | no       | Marks the canonical identifier. At most one entry may have `primary: true`.       |

When `primary` is omitted on all entries, the first entry is canonical. Parsers MUST warn when multiple entries have `primary: true`.

### Numeric ID conversion

All `id` values are strings. When the source identifier from an external system is an integer, the string representation MUST be the canonical base-10 representation with no leading zeros, no thousands separator, and no locale-specific formatting. The integer `42` becomes `"42"`, not `"042"` or `"42,"`.

When the source identifier is a fixed-width string with significant leading zeros (e.g. `"00042819"` from a registry where width carries meaning), the original string MUST be preserved verbatim. Composite identifiers containing significant leading zeros in their numeric portion (e.g. SIAGAS `"SP-0042819"`) MUST be preserved as-is.

### Uniqueness

The combination `(authority, id)` MUST be unique within the `well_id` array. See § Cross-reference and uniqueness rules for the duplicate-handling policy.

```json
"well_id": [
  { "authority": "SIAGAS", "id": "SP-0042819", "primary": true },
  { "authority": "ANA",    "id": "02000.001234/2006-78" },
  { "authority": "utility-internal", "id": "PP-01" }
]
```

---

## `location`

Geographic position and elevation of the wellhead. Supersedes the v1 top-level `lat`, `lng`, and `elevation` fields.

The three primary measurements — `lat`, `lng`, `elevation` — are top-level fields on the location object for ergonomics. All ancillary metadata (datum, CRS, precision, source CRS) lives under a nested `properties` object.

| Field        | Type                 | Required | Description                                                                                                            |
| ------------ | -------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| `lat`        | number               | yes      | Latitude in decimal degrees.                                                                                           |
| `lng`        | number               | yes      | Longitude in decimal degrees.                                                                                          |
| `elevation`  | number               | no       | Wellhead elevation in meters above the WGS84 reference ellipsoid (or the datum named in `properties.elevation_datum`). |
| `properties` | `LocationProperties` | no       | Ancillary metadata. When absent, all defaults apply.                                                                   |

### `LocationProperties`

| Field                 | Type   | Required | Description                                                                                                                                                       |
| --------------------- | ------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `elevation_datum`     | string | no       | Reference datum for `elevation`. See vocabulary below. Default: `wgs84_ellipsoid`.                                                                                |
| `crs`                 | string | no       | EPSG code of the coordinate reference system. Must be a geographic (not projected) CRS. Default: `"EPSG:4326"` (WGS84).                                           |
| `lat_precision`       | number | no       | One-sigma precision of `lat` in decimal degrees.                                                                                                                  |
| `lng_precision`       | number | no       | One-sigma precision of `lng` in decimal degrees.                                                                                                                  |
| `elevation_precision` | number | no       | One-sigma precision of `elevation` in meters.                                                                                                                     |
| `original_crs`        | string | no       | EPSG code of the source CRS, preserved for traceability when source data was in a projected CRS that the converter transformed to geographic. Informational only. |

### `elevation_datum` — Recommended values

| Value             | Description                                                                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `wgs84_ellipsoid` | WGS84 reference ellipsoidal height. Default.                                                                                                 |
| `egm2008`         | Earth Gravitational Model 2008 geoid                                                                                                         |
| `egm96`           | Earth Gravitational Model 1996 geoid                                                                                                         |
| `local_msl`       | Local mean sea level (imprecise; specific datum SHOULD be named via `x-` prefix, e.g. `x-imbituba` for Brazil's national vertical reference) |

When `elevation_datum` is omitted, parsers MUST assume `wgs84_ellipsoid`.

### CRS scope

Only geographic coordinate reference systems are permitted in `properties.crs`. Projected CRS values (e.g. UTM zones) are not valid. If source data uses a projected CRS, the converting application MUST transform to geographic coordinates before writing the file. The `original_crs` field MAY be populated with the source CRS for traceability.

```json
"location": {
  "lat": -1.4558,
  "lng": -48.5039,
  "elevation": 12.5,
  "properties": {
    "elevation_datum": "wgs84_ellipsoid",
    "crs": "EPSG:4326",
    "lat_precision": 0.0001,
    "lng_precision": 0.0001,
    "elevation_precision": 0.5,
    "original_crs": "EPSG:31983"
  }
}
```

---

## Units

All numeric values in a `.well` file are in **SI**. The format does not encode unit declarations; the units below are the single, canonical interpretation for every field of the corresponding kind. No file may override these.

### Canonical units

| Quantity                 | Unit                     | UCUM   | Stored as                                |
| ------------------------ | ------------------------ | ------ | ---------------------------------------- |
| Depth, length, elevation | meter                    | `m`    | number                                   |
| Diameter                 | millimeter               | `mm`   | number                                   |
| Volumetric flow rate     | cubic meter per hour     | `m3/h` | number                                   |
| Elapsed time, duration   | minute                   | `min`  | number                                   |
| Transmissivity           | square meter per second  | `m2/s` | number                                   |
| Hydraulic conductivity   | meter per second         | `m/s`  | number                                   |
| Pressure                 | kilopascal               | `kPa`  | number                                   |
| Angle (azimuth, dip)     | degree                   | `deg`  | number (0–360 for azimuth, 0–90 for dip) |
| Geographic coordinates   | decimal degree (WGS84)   | `deg`  | number                                   |
| Calendar date            | ISO 8601                 | —      | string `YYYY-MM-DD`                      |
| Instant                  | RFC 3339 with UTC offset | —      | string                                   |

UCUM is the **Unified Code for Units of Measure**, the international machine-parseable unit standard used by OGC SWE and the scientific community. The UCUM column above documents the canonical encoding of each unit for use in JSON-LD contexts, profile schemas, and downstream interoperability — it is not encoded in `.well` files themselves.

### Field-to-unit binding (normative)

**Meter (`m`)** — all depths, lengths, and elevations:

- `bore_hole[].from`, `bore_hole[].to`
- `well_case[].from`, `well_case[].to`
- `reduction[].from`, `reduction[].to`
- `well_screen[].from`, `well_screen[].to`
- `surface_case[].from`, `surface_case[].to`
- `hole_fill[].from`, `hole_fill[].to`
- `cement_pad.width`, `cement_pad.length`, `cement_pad.thickness`
- `lithology[].from`, `lithology[].to`
- `fractures[].depth`, `fractures[].depth_precision`
- `caves[].from`, `caves[].to`
- `hydrodynamic_events[].static_level`, `static_level_precision`
- `PumpingStep.readings[].depth`, `depth_precision`
- `RecoveryPhase.readings[].depth`, `depth_precision`
- `aquifer_analysis[].static_level`, `static_level_precision`
- `aquifer_analysis[].dynamic_level`, `dynamic_level_precision`
- `aquifer_analysis[].aquifer_thickness`
- `location.elevation`, `location.properties.elevation_precision`

**Millimeter (`mm`)** — all diameters and slot openings:

- `bore_hole[].diameter`
- `well_case[].diameter`
- `reduction[].diam_from`, `reduction[].diam_to`
- `well_screen[].diameter`, `well_screen[].screen_slot`
- `surface_case[].diameter`
- `hole_fill[].diameter`

**Cubic meter per hour (`m3/h`)** — all volumetric flow rates:

- `PumpingStep.rate`, `rate_precision`
- `aquifer_analysis[].flow_rate`, `flow_rate_precision`
- `recovery_only.pumping_rate`

**Minute (`min`)** — all elapsed times and durations:

- `PumpingStep.duration`
- `LevelReading.elapsed`
- `recovery_only.pumping_duration`

**Square meter per second (`m2/s`)** — transmissivity:

- `aquifer_analysis[].transmissivity`

**Meter per second (`m/s`)** — hydraulic conductivity:

- `aquifer_analysis[].hydraulic_conductivity`

**Kilopascal (`kPa`)** — pressure:

- `LevelReading.pressure`

**Degree (`deg`)** — angles and geographic coordinates:

- `fractures[].azimuth`, `fractures[].dip`
- `location.lat`, `location.lng`, `location.properties.lat_precision`, `location.properties.lng_precision`

**Unitless** — dimensionless or domain-specific values:

- `aquifer_analysis[].storativity` (dimensionless)
- `aquifer_analysis[].jacob_b`, `jacob_c` (composite units; treated as the units required to make the standard Jacob equation balance with stored `flow_rate` and `length`)
- `aquifer_analysis[].well_efficiency_pct` (percentage, 0–100)
- `aquifer_analysis[].specific_capacity` (derived ratio in m³/h per m, i.e. `m2/h`)
- Lithology `color` (CSS hex string)

### Diameter and the as-built convention

Diameters in casing, screens, surface case, and hole fill are stored as the **as-built outer diameter in millimeters**, not as nominal manufacturer designations. A casing sold as "6 inch" with a real outer diameter of 168.3 mm is recorded as `168.3`, not `152.4` (the literal conversion of 6 inches to mm). Nominal-to-actual mapping for common pipe and screen sizes is a market convention handled by applications — typically by the converter or input form — not by the file format.

### Screen slot

`well_screen[].screen_slot` is in millimeters like every other diameter field. US-market slot-number designations (e.g. "20 slot" = 0.020 inch = 0.508 mm) are an input convenience handled by applications, not encoded in the file. The v1 field name `screen_slot_mm` was a legacy artifact and is renamed to `screen_slot` in v2; the value is in millimeters before and after.

### Rationale

An interchange format with configurable units multiplies the number of valid encodings of the same well, complicates equality and comparison, and introduces a class of bugs where the declared units do not match the stored values. The `.well` format is designed to be a canonical machine representation: one well, one encoding. Display units, input units, and locale-specific notation are concerns of the applications that read and write `.well` files, not of the format itself. This separation matches the design of GeoJSON (WGS84 only), RFC 3339 (UTC offsets always present), and most modern interchange formats.

Producers receiving non-SI source data (imperial drilling reports, US gpm flow measurements, inch casing designations, slot-number screens) MUST convert to SI before writing. Consumers presenting the data to users in non-SI units MUST convert on read.

Conversion utilities for the common transformations are provided in `@welldot/core` under the `units` module — m ↔ ft, mm ↔ in, m³/h ↔ L/s, m³/h ↔ US gpm, m²/s ↔ m²/d, DD ↔ DMS, slot-number ↔ mm, and similar.

---

## `profiles`

An optional array of HTTPS URLs declaring formal extensions to the spec that the file conforms to. Each URL MUST resolve to a JSON Schema document.

```json
"profiles": [
  "https://welldot.org/profiles/brazil-ana/v1/schema.json",
  "https://inspire.ec.europa.eu/schemas/gwhyd/4.0/profile.json"
]
```

### Profile schema requirements

- Each URL MUST be an HTTPS URL resolving to a JSON Schema document (`Content-Type: application/schema+json` or `application/json`).
- The schema SHOULD extend the canonical `.well` v2 schema via `allOf` + `$ref`, but this is not required.
- The schema MAY link to human documentation via its `description` field or a custom `x-documentation` field pointing to a Markdown or PDF URL.
- Profiles MAY impose additional required fields, constrain vocabulary values, or mandate the use of specific `x-` extensions for a regulatory context.

### Profile validation

- If a profile URL is unreachable, returns a non-JSON document, or fails to parse as JSON Schema, the profile is silently ignored. Parsers MUST NOT reject files whose profile URLs are unavailable.
- A profile-aware parser SHOULD validate the file against each reachable profile schema and surface failures as **warnings**, not errors. Conformance is asserted by the author, not enforced by the spec.
- Profile URLs SHOULD be versioned via path segments or schema-internal `$id` to ensure stability.

---

## Extensibility

### Custom fields — `x-` prefix

Any implementer may add custom fields to any object by prefixing the field name with `x-`. This convention is established by OpenAPI 3.x and JSON Schema. Parsers MUST preserve and ignore `x-` fields they do not recognize. Sub-properties within an `x-` object do not need to be prefixed.

```json
{
  "id": "b2c3d4e5-...",
  "type": "constant_rate",
  "datetime": "2006-03-14T08:00:00-03:00",
  "x-siagas": {
    "registro": "SP-0042819",
    "processo_ana": "02000.001234/2006-78"
  }
}
```

Fields without the `x-` prefix that are not defined in this spec are technically non-conformant. Parsers MUST NOT reject such files but SHOULD emit a warning.

### Custom top-level blocks — `x-` prefix required

Top-level blocks not defined in this spec MUST use the `x-` prefix. Parsers MUST preserve and ignore unrecognized top-level keys.

```json
{
  "version": 2,
  "x-water_quality": [ ... ],
  "x-geophysical_logs": [ ... ]
}
```

### Custom vocabulary values — `x-` prefix

Open vocabulary fields in this spec (`type` in `hydrodynamic_events`, `category` in `history_logs`, `vocabulary` in `texture`, `method` in `aquifer_analysis`, `well_type`, and any other field documented as accepting any string) SHOULD use the `x-` prefix when the value is non-canonical — i.e. not listed in the recommended vocabulary of this spec.

Parsers MUST treat `x-` prefixed vocabulary values as valid. Promotion from `x-` form to canonical form follows the Deprecation Policy (see § Deprecation Policy — Vocabulary value promotion).

```json
{ "type": "x-slug_test" }
{ "category": "x-decommission" }
{ "method": "x-theis_recovery" }
```

---

## Cross-reference and Uniqueness Rules

The `.well` format uses string IDs to link records across arrays. This section is the single normative source for ID semantics.

### Uniqueness scope

Each ID-bearing array maintains its **own uniqueness scope**. The ID namespaces are independent:

- `hydrodynamic_events[].id` — unique within `hydrodynamic_events`
- `aquifer_analysis[].id` — unique within `aquifer_analysis`
- `history_logs[].id` — unique within `history_logs`
- `history_logs[].attachments[].id` — unique within the attachments array of the same log entry
- `well_id[]` — uniqueness is on the composite key `(authority, id)`, not on `id` alone

An ID value MAY repeat across different arrays without conflict (e.g. an event and an analysis MAY both use the ID `"001"`), though distinct values are recommended for clarity.

### Cross-array references

The following fields hold references to IDs in other arrays:

| Reference field                             | Points to                  | Resolution scope |
| ------------------------------------------- | -------------------------- | ---------------- |
| `aquifer_analysis[].source_event_ids[]`     | `hydrodynamic_events[].id` | Same file only   |
| `aquifer_analysis[].static_level_source_id` | `hydrodynamic_events[].id` | Same file only   |

Cross-file references are not supported in v2.

### Dangling references

A **dangling reference** is a reference field whose value does not match any ID in the target array.

- Dangling references MUST emit a warning naming the referring field, the referring object's ID, and the missing target ID.
- Dangling references MUST NOT cause file rejection. Events may be legitimately deleted from history (regulatory retention rules, GDPR-style erasure) leaving analyses that reference them stranded.
- Applications SHOULD surface dangling references to the user as a data-integrity concern and offer to either (a) update the analysis to remove the reference, or (b) restore the missing event.

### Duplicate IDs within a scope

A **duplicate ID** occurs when two records in the same uniqueness scope share the same ID (or, for `well_id`, the same `(authority, id)` pair).

Duplicate IDs are **malformed but recoverable**:

- Parsers MUST NOT silently accept duplicate IDs. The file is considered malformed.
- Parsers MUST NOT silently rewrite duplicate IDs. Automatic renaming would change the object graph in a way that downstream references cannot detect.
- Interactive applications MUST surface the duplication to the user with sufficient context to decide:
  - The IDs in conflict
  - A summary of each conflicting record (datetime, type, key fields)
  - The choices: **merge** (keep one, discard the other), **rename** (assign a new ID to one of them, updating any references in the same file), or **abort load**.
- Non-interactive parsers (batch importers, server-side validators) MUST reject the file with a clear error rather than guess.
- Any user-confirmed resolution MUST be logged as a `history_logs` entry with `category: "event"` describing what was changed.

The objective is deterministic load behavior: a `.well` file MUST produce the same object graph across all conformant parsers under default settings. User-mediated repair is the only path that can deviate from this, and it must be explicit.

### `id` field convention

All `id` fields are `string` type. UUID v4 is recommended for new records. Sequential strings (e.g. `"evt-001"`) are valid for manually authored files. Numeric IDs from external systems are converted per the rule documented in § well_id (Numeric ID conversion).

---

## Precision and Uncertainty

Optional one-sigma precision qualifiers are defined for the most consequential measurement fields. Parsers that do not recognize them ignore them per the foreign-members rule.

The precision field name is the measurement field name suffixed with `_precision`. The unit of the precision value is the unit of the measurement it qualifies.

### Supported precision fields

| Measurement     | Precision field           | Defined on                 |
| --------------- | ------------------------- | -------------------------- |
| `lat`           | `lat_precision`           | `LocationProperties`       |
| `lng`           | `lng_precision`           | `LocationProperties`       |
| `elevation`     | `elevation_precision`     | `LocationProperties`       |
| `static_level`  | `static_level_precision`  | events, `AquiferAnalysis`  |
| `dynamic_level` | `dynamic_level_precision` | `AquiferAnalysis`          |
| `depth`         | `depth_precision`         | `LevelReading`, `Fracture` |
| `rate`          | `rate_precision`          | `PumpingStep`              |
| `flow_rate`     | `flow_rate_precision`     | `AquiferAnalysis`          |

All precision fields are optional. When omitted, the measurement value carries no documented precision. Precision is the one-sigma standard deviation in the same unit as the measurement.

```json
{ "depth": 44.8, "depth_precision": 0.01 }
```

---

_Draft — `.well` Format Specification v2.0_
