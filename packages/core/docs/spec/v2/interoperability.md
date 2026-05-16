# `.well` File Format Specification — Version 2.0: Interoperability

**See also:** [overview.md](./overview.md) · [format-reference.md](./format-reference.md) · [object-schemas.md](./object-schemas.md)

---

## JSON-LD Context (Reserved)

The `@context` top-level field is reserved for JSON-LD interoperability with semantic web tooling and external standards such as GWML2. See § Relationship to GWML2.

### v2.0 parser requirements

- The `@context` field is **optional**.
- v2.0 parsers MUST preserve the `@context` field on round-trip, per the foreign-members rule.
- v2.0 parsers MUST NOT reject files that include or omit the field.
- v2.0 parsers are NOT required to interpret the field as JSON-LD. No semantic processing is mandated by this version of the spec.

### Recommended usage

A `.well` file MAY include `"@context": "https://welldot.org/context/v2.jsonld"` to assert that the file's field names map to the canonical `.well` v2 JSON-LD context. Tools that understand JSON-LD can then transform the document into RDF for use with SPARQL, triple stores, or GWML2-conformant pipelines.

### Context publication plan

The canonical context is staged across four phases. Each phase publishes a real, fetchable document at the canonical URL — at no phase is the URL a placeholder.

**Phase 0 — Reservation (v2.0 ratification)**

A minimal valid JSON-LD 1.1 document is published at `https://welldot.org/context/v2.jsonld` containing only the format-identity terms:

```json
{
  "@context": {
    "@version": 1.1,
    "well": "https://welldot.org/vocab/v2#",
    "version": "well:version",
    "name": "well:name",
    "well_type": "well:well_type"
  }
}
```

The document advertises itself as a draft via an `x-welldot-status: reserved` HTTP header and an in-band `@version` marker. This phase reserves the URL and proves it resolves; it does not yet enable meaningful RDF processing.

**Phase 1 — Identity & location (v2.0 + 1 month)**

Adds mappings for `well_id`, `well_id.authority`, `well_id.id`, `well_id.primary`, `location`, `location.lat`, `location.lng`, `location.elevation`, and `construction_date`. Aliases `location.lat`/`lng` to `geo:lat`/`geo:long` from the W3C Geo vocabulary; aliases `construction_date` to `schema:dateCreated` from Schema.org.

After Phase 1, a `.well` document round-trips to a minimal valid RDF graph representing the well's identity and position.

**Phase 2 — Constructive blocks (v2.0 + 3 months)**

Adds mappings for `bore_hole`, `well_case`, `well_screen`, `reduction`, `surface_case`, `hole_fill`, `cement_pad` and their fields. Where direct GWML2 alignment is verified against the published XSDs, terms alias to the GWML2-WellConstruction namespace; otherwise terms live under the `welldot:vocab/v2#` namespace with explanatory `rdfs:comment` annotations.

**Phase 3 — Geological & hydrogeological (v2.0 + 6 months)**

Adds mappings for `lithology`, `fractures`, `caves`, `texture`, `texture.code`, `texture.vocabulary`. Aliases `lithology` to `gwml:GW_GeologyLogCoverage` once the corresponding GWML2 class name is verified against the OGC schema documents.

**Phase 4 — Hydrodynamic & analysis (v2.1)**

Adds mappings for `hydrodynamic_events`, `aquifer_analysis`, `history_logs`, and supporting types (`PumpingStep`, `LevelReading`, `RecoveryPhase`, `Attachment`). Maps event readings to O&M's `OM_Observation` pattern and time-series to TimeseriesML where alignment is verified. This phase ships alongside the v2.1 spec revision.

### Versioning and stability

- The Phase-0 document is replaced in-place as phases ship, but term URIs under `welldot:vocab/v2#` are append-only and never re-purposed within v2.
- If a term needs to change meaning, it gets a new URI in `welldot:vocab/v3#`. v2 consumers continue to resolve the old term.
- Each phase increments an internal `version` marker on the context document; client tools can detect which phase they're consuming.
- A `CHANGELOG.md` is published alongside the context at `https://welldot.org/context/v2.changelog.md` documenting every term added.

### Optional fallback

If publishing infrastructure fails, files may inline the context object directly under `@context` instead of referencing the URL. This is supported by JSON-LD 1.1 and parsers MUST accept both forms.

---

## Relationship to GWML2

**GroundWaterML 2** (GWML2) is the OGC international standard for groundwater data exchange. It was developed and ratified by an international consortium that includes the Geological Survey of Canada (GSC), U.S. Geological Survey (USGS), CSIRO and the Bureau of Meteorology (Australia), BRGM (France), Federation University Australia, and Salzburg University, with contributing input from the British Geological Survey, the EU INSPIRE Joint Research Centre, the Polish and German geological surveys, and UNESCO's International Groundwater Resources Assessment Centre.

Two versions of the standard are currently in use:

- **OGC 16-032r2** — _WaterML 2: Part 4 — GroundWaterML 2 (GWML2)_, version 2.2, ratified in 2016 and published in 2017
- **OGC 19-013** — GWML2 version 2.2.1, ratified in 2019 and published in 2021, which updates 16-032r2 by aligning with GeoSciML 4.1 and Observations & Measurements 2.0

GWML2 defines its model in three stages — a conceptual UML schema, a logical UML schema specialized for OGC standards, and an XML/GML encoding — and explicitly anticipates future JSON or RDF encodings. The standard is organized into six modular packages: GWML2-Main, GWML2-Constituent, GWML2-Flow, GWML2-Well, GWML2-WellConstruction, and GWML2-AquiferTest.

`.well` is a JSON-native format that scopes down to the static record plus operational history of a single well. It is not a competing conceptual model — it is an opinionated encoding for a subset of the GWML2 domain, designed for tooling and developer adoption. The optional JSON-LD `@context` (see § JSON-LD Context) is the technical bridge that allows a `.well` document to also be interpreted as a GWML2-aligned RDF graph.

### Authoritative references

| Reference                           | Location                                              |
| ----------------------------------- | ----------------------------------------------------- |
| GWML2 v2.2 specification (16-032r2) | `https://docs.ogc.org/is/16-032r2/16-032r2.html`      |
| GWML2 v2.2.1 specification (19-013) | `https://docs.ogc.org/is/19-013/19-013.html`          |
| GWML2 XML schemas (XSD)             | `http://schemas.opengis.net/gwml/2.2/`                |
| OGC Hydrology DWG GWML2 wiki        | `https://external.ogc.org/twiki_public/HydrologyDWG/` |

### Scope correspondence

| GWML2 Module           | Namespace                                          | `.well` coverage                                                                                         |
| ---------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| GWML2-Main             | `http://www.opengis.net/gwml-main/2.2`             | Out of scope (aquifers, fluid bodies, hydrogeological units as standalone features)                      |
| GWML2-Constituent      | `http://www.opengis.net/gwml-constituent/2.2`      | Out of scope; reserved for v3 (water quality)                                                            |
| GWML2-Flow             | `http://www.opengis.net/gwml-flow/2.2`             | Out of scope (recharge, discharge, inter-flow)                                                           |
| GWML2-Well             | `http://www.opengis.net/gwml-well/2.2`             | Covered: top-level well identity, `location`, `well_id`, well-as-sampling-feature semantics              |
| GWML2-WellConstruction | `http://www.opengis.net/gwml-wellconstruction/2.2` | Covered: `bore_hole`, `well_case`, `well_screen`, `reduction`, `surface_case`, `hole_fill`, `cement_pad` |
| GWML2-AquiferTest      | `http://www.opengis.net/gwml-aquifertest/2.2`      | Covered: `hydrodynamic_events`, `aquifer_analysis`                                                       |

### Conceptual alignment

A `.well` document corresponds conceptually to a GWML2 **`GW_Well`** feature, which itself specializes O&M's `SF_SamplingCurve` — wells in GWML2 are modeled as sampling features along whose length observations are made. Boreholes (`Borehole` from GWML2-WellConstruction) are physical engineering artifacts distinct from wells in GWML2; in `.well` v2, both are collapsed into the constructive blocks of a single record since the format describes one composite well.

A `.well` `Lithology` array corresponds to a GWML2 **`GW_GeologyLogCoverage`**, which is a realization of `CV_DiscreteCoverage` over depth intervals. Each lithology interval references a `GW_HydrogeologicalUnit` — GWML2's specialization of GeoSciML's `GeologicUnit` — via the `geologic_unit` field; `.well` does not model the hydrogeological unit itself as a standalone feature.

### Class mapping (informative)

The mapping below is **informative, not normative**. Class names in italics are verified against published GWML2 documentation (the OGC 16-032r2 specification, the _Hydrogeology Journal_ and _Open Geospatial Data, Software and Standards_ papers, and the OGC Hydrology DWG wiki). Class names marked with `?` are **approximate** — they describe the GWML2 module a `.well` construct belongs to but the exact class name was not verified at the time of writing this draft. Implementers building converters should verify these against the authoritative XSDs at `http://schemas.opengis.net/gwml/2.2/` before relying on them.

| `.well` construct           | GWML2 module           | Class / property                                                   |
| --------------------------- | ---------------------- | ------------------------------------------------------------------ |
| Well (top-level)            | GWML2-Well             | _`GW_Well`_ (specializes `O&M:SF_SamplingCurve`)                   |
| `well_id[]`                 | GWML2-Well             | `GW_Well` identifier property (?)                                  |
| `location`                  | GWML2-Well             | `GW_Well` shape / position property (?)                            |
| `bore_hole[]`               | GWML2-WellConstruction | `Borehole` (?)                                                     |
| `well_case[]`               | GWML2-WellConstruction | `Casing` (?)                                                       |
| `surface_case[]`            | GWML2-WellConstruction | `Casing` with surface depth range (?)                              |
| `well_screen[]`             | GWML2-WellConstruction | `Screen` (?)                                                       |
| `reduction[]`               | GWML2-WellConstruction | No direct equivalent — casing transition                           |
| `hole_fill[]`               | GWML2-WellConstruction | Annular fill / gravel pack / seal (?)                              |
| `cement_pad`                | GWML2-WellConstruction | No direct equivalent — wellhead furniture                          |
| `lithology[]`               | GWML2-Well             | _`GW_GeologyLogCoverage`_ (realizes `CV_DiscreteCoverage`)         |
| `lithology[].geologic_unit` | GWML2-Main             | _`GW_HydrogeologicalUnit`_ (specializes GeoSciML `GeologicUnit`)   |
| `fractures[]`               | GWML2-Well             | Fracture log interval (?)                                          |
| `caves[]`                   | GWML2-Well             | Void / cavity log interval (?)                                     |
| `hydrodynamic_events[]`     | GWML2-AquiferTest      | `GW_AquiferTest` (?) plus `OM_Observation` series via TimeseriesML |
| `aquifer_analysis[]`        | GWML2-AquiferTest      | Aquifer test result properties (?)                                 |
| `history_logs[]`            | n/a                    | No direct equivalent — operational record outside GWML2 scope      |

A complete, normative mapping will be published as a separate document once the GWML2 XSDs have been read directly and each verified class name and property path has been confirmed. Until then, this table is a structural guide and not a conversion specification.

### Notes on the mapping

- **Wells vs. boreholes in GWML2.** GWML2 distinguishes a `GW_Well` (the construction with hydrogeological purpose) from a `Borehole` (the physical hole). A single `.well` document conflates both since it describes one composite installation. A `.well → GWML2` converter must emit both features and link them; a `GWML2 → .well` converter must merge them.
- **Aquifer tests in GWML2.** GWML2-AquiferTest uses TimeseriesML (OGC 15-042r2) for time-series readings and O&M's `OM_Observation` pattern for individual measurements. The `.well` event types (`spot_measurement`, `constant_rate`, `step_drawdown`, `airlift`, `recovery_only`) are pragmatic field-record categories with no direct GWML2 counterpart; a converter must decompose each into one or more `GW_AquiferTest` features with appropriate `OM_Observation` results.
- **Hydrogeological units.** `.well` stores `lithology[].geologic_unit` and `aquifer_unit` as free-text strings. In GWML2 these resolve to references to `GW_HydrogeologicalUnit` features, which in real GWML2 deployments are typically catalogued in national registries (e.g. French BDLISA, Canadian GIN). A `.well → GWML2` converter SHOULD resolve these strings to authoritative unit URIs when a national vocabulary is available; absent that, it emits inline `GW_HydrogeologicalUnit` features with `gml:name` set to the string value.
- **History logs are outside GWML2 scope.** GWML2 models the well as a static feature and its observations as a time-series. Maintenance interventions, incidents, and operational events are not represented. A converter SHOULD preserve `.well` `history_logs` in a GeoSciML observation event sequence or as an `x-` extension on the GWML2 side, but full lossless round-trip is not guaranteed.

### Profiles for regulatory adoption

National regulators with existing data models (Brazil SIAGAS, French BSS / BDLISA, EU INSPIRE hydrogeology) can publish `.well` profiles that constrain the format to their required fields and vocabularies. Profile schemas may extend the canonical `.well` v2 schema with regulator-specific requirements (e.g. mandatory `well_id` entries for the relevant national authority, restricted enums for casing materials, required precision fields) without breaking interoperability with the core spec.

---

## Schema Validation

The canonical JSON Schema for `.well` v2 is published at:

```
https://welldot.org/schema/v2/well.schema.json
```

The schema conforms to **JSON Schema 2020-12** (`https://json-schema.org/draft/2020-12/schema`). Implementers SHOULD use a JSON Schema validator that supports this draft (Ajv 8+, python-jsonschema 4+, NetworkNT json-schema-validator). Earlier-draft validators may work for most fields but are not officially supported.

Files MAY include a `$schema` field referencing this URL:

```json
{
  "$schema": "https://welldot.org/schema/v2/well.schema.json",
  "version": 2,
  ...
}
```

The schema is generated from the Zod validators in `@welldot/core` to prevent drift between runtime validation and published schema. The generated file lives at [`docs/schema/v2/well.schema.json`](../../schema/v2/well.schema.json) in this package. Profile schemas SHOULD extend this canonical schema via `allOf` + `$ref`.

---

_Draft — `.well` Format Specification v2.0_
