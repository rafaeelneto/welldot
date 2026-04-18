# `.well` File Format Specification

**Version:** 1.0
**Extension:** `.well`
**Encoding:** UTF-8
**Base format:** Minified JSON

---

## Purpose

The `.well` format is an open standard for representing water well data. It is designed to serve three distinct but complementary use cases:

**Visualization.** The format contains sufficient constructive and geological detail to produce accurate technical well profile drawings — including borehole geometry, casing strings, screens, gravel packs, lithological columns, fractures, and caves — at true depth scale.

**Registration.** The format captures the administrative and physical identity of a well, providing a complete static record suitable for submission to regulatory bodies, inclusion in national well registries, and long-term archival.

**Research.** The structured geological and constructive data enables cross-well analysis, aquifer characterization, and hydrogeological research. Field vocabulary choices (FGDC texture codes, geologic units, aquifer units) are aligned with standards used in scientific literature. Dynamic hydrological measurements — static level, dynamic level, pump tests, water quality — are outside the scope of v1 and are reserved for a future `hydro` extension block.

---

## Design Principles

- **Compact keys** — all property names are abbreviated to 2–3 characters for efficient storage and transmission
- **Versioned** — includes a `v` field for forward compatibility; parsers must reject unrecognized versions
- **Self-contained** — a single file encodes the complete static record of one well
- **Lossless** — no information is lost relative to the full TypeScript `Profile` type
- **SI units** — all depths are in meters, all diameters in millimeters; applications are responsible for unit conversion on display
- **Geographic north** — all azimuth values are referenced to geographic north
- **Ground level as zero** — all depth values are measured from ground level (0); elevation above sea level is stored separately in the `el` field

---

## Formats

The `.well` standard is defined in two forms that carry identical information.

### `.well` — Compact form

The primary interchange format. A single-line minified JSON object with abbreviated keys. Intended for file storage, transmission, and use by tools and libraries.

```
application/vnd.well+json
```

Example:

```
{"v":1,"wt":"tubular","n":"Poço PP-01","dr":"Perfuradora XYZ","cd":"2024-03-15","lt":-1.4558,"lg":-48.5039,"el":12.5,"ob":"Sem anomalias","bh":[{"f":0,"t":80,"d":250,"dm":"rotary"}],"wc":[{"f":0,"t":60,"ty":"steel","d":200}],"rd":[{"f":58,"t":60,"df":200,"d2":150,"ty":"conical"}],"ws":[{"f":60,"t":80,"ty":"pvc","d":150,"sl":0.5}],"sc":[{"f":0,"t":3,"d":300}],"hf":[{"f":60,"t":80,"ty":"gravel_pack","d":250,"ds":"Seixo 2-4mm"}],"cp":{"ty":"square","w":1.0,"th":0.15,"l":1.0},"li":[{"f":0,"t":20,"ds":"Areia fina","cl":"#f5deb3","tx":"sand","gu":"Quaternário","au":"freático"},{"f":20,"t":80,"ds":"Granito fraturado","cl":"#a9a9a9","tx":"granite","gu":"Embasamento","au":"fraturado"}],"fr":[{"dp":45.2,"wi":true,"ds":"Fratura aberta","sw":false,"az":120,"di":35},{"dp":62.0,"wi":false,"ds":"Fratura swarm","sw":true,"az":90,"di":70}],"cv":[{"f":50,"t":52,"wi":false,"ds":"Caverna seca"}]}
```

### `.well.json` — Expanded form

A pretty-printed JSON file with the same abbreviated keys. Intended for human inspection, version control, and debugging. Parsers that accept `.well` must also accept `.well.json`; the two forms are semantically identical.

```
application/vnd.well+json
```

Example:

```json
{
  "v": 1,
  "wt": "tubular",
  "n": "Poço PP-01",
  "dr": "Perfuradora XYZ",
  "cd": "2024-03-15",
  "lt": -1.4558,
  "lg": -48.5039,
  "el": 12.5,
  "ob": "Sem anomalias",
  "bh": [{ "f": 0, "t": 80, "d": 250, "dm": "rotary" }],
  "wc": [{ "f": 0, "t": 60, "ty": "steel", "d": 200 }],
  "rd": [{ "f": 58, "t": 60, "df": 200, "d2": 150, "ty": "conical" }],
  "ws": [{ "f": 60, "t": 80, "ty": "pvc", "d": 150, "sl": 0.5 }],
  "sc": [{ "f": 0, "t": 3, "d": 300 }],
  "hf": [{ "f": 60, "t": 80, "ty": "gravel_pack", "d": 250, "ds": "Seixo 2-4mm" }],
  "cp": { "ty": "square", "w": 1.0, "th": 0.15, "l": 1.0 },
  "li": [
    { "f": 0,  "t": 20, "ds": "Areia fina",       "cl": "#f5deb3", "tx": "sand",    "gu": "Quaternário", "au": "freático"  },
    { "f": 20, "t": 80, "ds": "Granito fraturado", "cl": "#a9a9a9", "tx": "granite", "gu": "Embasamento", "au": "fraturado" }
  ],
  "fr": [
    { "dp": 45.2, "wi": true,  "ds": "Fratura aberta", "sw": false, "az": 120, "di": 35 },
    { "dp": 62.0, "wi": false, "ds": "Fratura swarm",  "sw": true,  "az": 90,  "di": 70 }
  ],
  "cv": [{ "f": 50, "t": 52, "wi": false, "ds": "Caverna seca" }]
}
```

---

## File Structure

A `.well` file is a single JSON object with the following top-level sections:

```
{
  "v":  <version>,          // format version (integer)

  // Well identity
  "wt": <well_type>,
  "n":  <name>,
  "dr": <driller>,
  "cd": <construction_date>,
  "lt": <latitude>,
  "lg": <longitude>,
  "el": <elevation>,
  "ob": <observations>,

  // Constructive elements
  "bh": [ <BoreHole>, ... ],
  "wc": [ <WellCase>, ... ],
  "rd": [ <Reduction>, ... ],
  "ws": [ <WellScreen>, ... ],
  "sc": [ <SurfaceCase>, ... ],
  "hf": [ <HoleFill>, ... ],
  "cp": <CementPad>,

  // Geological elements
  "li": [ <Lithology>, ... ],
  "fr": [ <Fracture>, ... ],
  "cv": [ <Cave>, ... ]
}
```

---

## Key Reference Table

### Top-level / Metadata

| Full field          | Compact key | Type    | Required |
|---------------------|-------------|---------|----------|
| `version`           | `v`         | integer | yes      |
| `well_type`         | `wt`        | string  | yes      |
| `name`              | `n`         | string  | no       |
| `well_driller`      | `dr`        | string  | no       |
| `construction_date` | `cd`        | string  | no       |
| `lat`               | `lt`        | number  | no       |
| `lng`               | `lg`        | number  | no       |
| `elevation`         | `el`        | number  | no       |
| `obs`               | `ob`        | string  | no       |

`construction_date` uses key `cd` (not `dt`) to avoid collision with `diam_to` which uses `d2`.

### `well_type` — Recommended values

| Value                  | Description                                        |
|------------------------|----------------------------------------------------|
| `tubular`              | Conventional rotary or percussion drilled well     |
| `artesian`             | Free-flowing artesian well                         |
| `hand_dug`             | Manually excavated well or cistern                 |
| `horizontal`           | Horizontal or sub-horizontal well                  |
| `infiltration_gallery` | Horizontal subsurface infiltration gallery         |

The `well_type` field accepts any string. The values above are the recommended vocabulary for interoperability. Tools should treat unrecognized values gracefully.

### Shared field abbreviations

| Full field    | Compact key | Notes                        |
|---------------|-------------|------------------------------|
| `from`        | `f`         | Depth in meters              |
| `to`          | `t`         | Depth in meters              |
| `diameter`    | `d`         | Diameter in millimeters      |
| `type`        | `ty`        | String identifier            |
| `description` | `ds`        | Free text                    |

---

## Object Schemas

### `BoreHole` — `bh[]`

| Full field        | Key  | Type   | Required |
|-------------------|------|--------|----------|
| `from`            | `f`  | number | yes      |
| `to`              | `t`  | number | yes      |
| `diameter`        | `d`  | number | yes      |
| `drilling_method` | `dm` | string | no       |

```json
{ "f": 0, "t": 80, "d": 250, "dm": "rotary" }
```

---

### `WellCase` — `wc[]`

| Full field | Key  | Type   | Required |
|------------|------|--------|----------|
| `from`     | `f`  | number | yes      |
| `to`       | `t`  | number | yes      |
| `type`     | `ty` | string | yes      |
| `diameter` | `d`  | number | yes      |

Recommended values for `ty`: `steel`, `pvc`, `hdpe`, `fiberglass`.

```json
{ "f": 0, "t": 60, "ty": "steel", "d": 200 }
```

---

### `Reduction` — `rd[]`

| Full field  | Key  | Type   | Required |
|-------------|------|--------|----------|
| `from`      | `f`  | number | yes      |
| `to`        | `t`  | number | yes      |
| `diam_from` | `df` | number | yes      |
| `diam_to`   | `d2` | number | yes      |
| `type`      | `ty` | string | yes      |

```json
{ "f": 58, "t": 60, "df": 200, "d2": 150, "ty": "conical" }
```

---

### `WellScreen` — `ws[]`

| Full field       | Key  | Type   | Required |
|------------------|------|--------|----------|
| `from`           | `f`  | number | yes      |
| `to`             | `t`  | number | yes      |
| `type`           | `ty` | string | yes      |
| `diameter`       | `d`  | number | yes      |
| `screen_slot_mm` | `sl` | number | yes      |

Recommended values for `ty`: `wire_wound`, `bridge_slot`, `louvered`, `pvc_slotted`.

```json
{ "f": 60, "t": 80, "ty": "wire_wound", "d": 150, "sl": 0.5 }
```

---

### `SurfaceCase` — `sc[]`

| Full field | Key | Type   | Required |
|------------|-----|--------|----------|
| `from`     | `f` | number | yes      |
| `to`       | `t` | number | yes      |
| `diameter` | `d` | number | yes      |

```json
{ "f": 0, "t": 3, "d": 300 }
```

---

### `HoleFill` — `hf[]`

| Full field    | Key  | Type                        | Required |
|---------------|------|-----------------------------|----------|
| `from`        | `f`  | number                      | yes      |
| `to`          | `t`  | number                      | yes      |
| `type`        | `ty` | `"gravel_pack"` or `"seal"` | yes      |
| `diameter`    | `d`  | number                      | yes      |
| `description` | `ds` | string                      | yes      |

```json
{ "f": 60, "t": 80, "ty": "gravel_pack", "d": 250, "ds": "Seixo 2-4mm" }
```

---

### `CementPad` — `cp`

The cement pad is always positioned at ground level (depth 0). Its dimensions are expressed in meters.

| Full field  | Key  | Type   | Required |
|-------------|------|--------|----------|
| `type`      | `ty` | string | yes      |
| `width`     | `w`  | number | yes      |
| `thickness` | `th` | number | yes      |
| `length`    | `l`  | number | yes      |

```json
{ "ty": "square", "w": 1.0, "th": 0.15, "l": 1.0 }
```

---

### `Lithology` — `li[]`

| Full field      | Key  | Type         | Required |
|-----------------|------|--------------|----------|
| `from`          | `f`  | number       | yes      |
| `to`            | `t`  | number       | yes      |
| `description`   | `ds` | string       | yes      |
| `color`         | `cl` | string (hex) | yes      |
| `fgdc_texture`  | `tx` | string       | yes      |
| `geologic_unit` | `gu` | string       | yes      |
| `aquifer_unit`  | `au` | string       | yes      |

`fgdc_texture` should follow the FGDC Digital Cartographic Standard for Geologic Map Symbolization texture vocabulary.

```json
{ "f": 0, "t": 20, "ds": "Areia fina", "cl": "#f5deb3", "tx": "sand", "gu": "Quaternário", "au": "freático" }
```

---

### `Fracture` — `fr[]`

| Full field     | Key  | Type    | Required |
|----------------|------|---------|----------|
| `depth`        | `dp` | number  | yes      |
| `water_intake` | `wi` | boolean | yes      |
| `description`  | `ds` | string  | yes      |
| `swarm`        | `sw` | boolean | yes      |
| `azimuth`      | `az` | number  | yes      |
| `dip`          | `di` | number  | yes      |

`azimuth` is measured in degrees from geographic north (0–360). `dip` is measured in degrees from horizontal (0–90).

```json
{ "dp": 45.2, "wi": true, "ds": "Fratura aberta", "sw": false, "az": 120, "di": 35 }
```

---

### `Cave` — `cv[]`

| Full field     | Key  | Type    | Required |
|----------------|------|---------|----------|
| `from`         | `f`  | number  | yes      |
| `to`           | `t`  | number  | yes      |
| `water_intake` | `wi` | boolean | yes      |
| `description`  | `ds` | string  | yes      |

```json
{ "f": 50, "t": 52, "wi": false, "ds": "Caverna seca" }
```

---

## Versioning

The `v` field must always be present and is an integer starting at `1`. Parsers must reject files with an unrecognized `v` value and should warn when `v` is absent.

| Version | Description                   |
|---------|-------------------------------|
| `1`     | Initial release of the format |

A `hydro` block for dynamic hydrological data (static level, dynamic level, pump tests, water quality) is reserved for v2 and must not appear in v1 files.

---

## Key Collision Reference

| Concern                            | Resolution                             |
|------------------------------------|----------------------------------------|
| `construction_date` vs `diam_to`   | `cd` for date, `d2` for `diam_to`     |
| `depth` (fracture) vs `diameter`   | `dp` for depth, `d` for diameter      |
| `dip` vs `diameter`                | `di` for dip, `d` for diameter        |
| `description` vs `drilling_method` | `ds` for description, `dm` for method |

---

*Specification v1.0 — `.well` format*