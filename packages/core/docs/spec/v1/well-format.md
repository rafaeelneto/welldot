# `.well` File Format Specification

**Version:** 1.0
**Extension:** `.well`
**Encoding:** UTF-8
**Base format:** JSON

---

## Purpose

The `.well` format is an open standard for representing water well data. It is designed to serve three distinct but complementary use cases:

**Visualization.** The format contains sufficient constructive and geological detail to produce accurate technical well profile drawings — including borehole geometry, casing strings, screens, gravel packs, lithological columns, fractures, and caves — at true depth scale.

**Registration.** The format captures the administrative and physical identity of a well, providing a complete static record suitable for submission to regulatory bodies, inclusion in national well registries, and long-term archival.

**Research.** The structured geological and constructive data enables cross-well analysis, aquifer characterization, and hydrogeological research. Field vocabulary choices (FGDC texture codes, geologic units, aquifer units) are aligned with standards used in scientific literature. Dynamic hydrological measurements — static level, dynamic level, pump tests, water quality — are outside the scope of v1 and are reserved for a future `hydro` extension block.

---

## Design Principles

- **Self-describing** — full field names are used throughout; a `.well` file can be read and understood without consulting the spec
- **Versioned** — includes a `version` field for forward compatibility; parsers must reject unrecognized versions
- **Self-contained** — a single file encodes the complete static record of one well
- **SI units** — all depths are in meters, all diameters in millimeters; applications are responsible for unit conversion on display
- **Geographic north** — all azimuth values are referenced to geographic north
- **Ground level as zero** — all depth values are measured from ground level (0); elevation above sea level is stored separately in the `elevation` field

---

## File Structure

A `.well` file is a JSON object with the following top-level structure:

```json
{
  "version": 1,

  "well_type": "tubular",
  "name": "Poço PP-01",
  "well_driller": "Perfuradora XYZ",
  "construction_date": "2024-03-15",
  "lat": -1.4558,
  "lng": -48.5039,
  "elevation": 12.5,
  "obs": "Observações livres",

  "bore_hole": [ ... ],
  "well_case": [ ... ],
  "reduction": [ ... ],
  "well_screen": [ ... ],
  "surface_case": [ ... ],
  "hole_fill": [ ... ],
  "cement_pad": { ... },

  "lithology": [ ... ],
  "fractures": [ ... ],
  "caves": [ ... ]
}
```

---

## Top-level Fields

| Field               | Type    | Required | Description                                      |
|---------------------|---------|----------|--------------------------------------------------|
| `version`           | integer | yes      | Format version. Must be `1` for this spec.       |
| `well_type`         | string  | yes      | Classification of the well. See vocabulary below.|
| `name`              | string  | no       | Well name or local identifier.                   |
| `well_driller`      | string  | no       | Name of the drilling company or individual.      |
| `construction_date` | string  | no       | ISO 8601 date of well completion (YYYY-MM-DD).   |
| `lat`               | number  | no       | Latitude in decimal degrees (WGS84).             |
| `lng`               | number  | no       | Longitude in decimal degrees (WGS84).            |
| `elevation`         | number  | no       | Ground elevation above sea level in meters.      |
| `obs`               | string  | no       | Free-text observations about the well.           |

### `well_type` — Recommended values

| Value                  | Description                                    |
|------------------------|------------------------------------------------|
| `tubular`              | Conventional rotary or percussion drilled well |
| `artesian`             | Free-flowing artesian well                     |
| `hand_dug`             | Manually excavated well or cistern             |
| `horizontal`           | Horizontal or sub-horizontal well              |
| `infiltration_gallery` | Horizontal subsurface infiltration gallery     |

The `well_type` field accepts any string. The values above are the recommended vocabulary for interoperability. Tools should treat unrecognized values gracefully.

---

## Object Schemas

### `BoreHole` — `bore_hole[]`

Represents a drilled interval of the borehole. Multiple entries describe a telescoping borehole with different diameters at different depth ranges.

| Field             | Type   | Required | Description                        |
|-------------------|--------|----------|------------------------------------|
| `from`            | number | yes      | Start depth in meters.             |
| `to`              | number | yes      | End depth in meters.               |
| `diameter`        | number | yes      | Borehole diameter in millimeters.  |
| `drilling_method` | string | no       | Method used (e.g. `rotary`, `percussion`, `cable_tool`). |

```json
{ "from": 0, "to": 80, "diameter": 250, "drilling_method": "rotary" }
```

---

### `WellCase` — `well_case[]`

Steel or plastic casing installed inside the borehole.

| Field      | Type   | Required | Description                         |
|------------|--------|----------|-------------------------------------|
| `from`     | number | yes      | Start depth in meters.              |
| `to`       | number | yes      | End depth in meters.                |
| `type`     | string | yes      | Casing material. Recommended: `steel`, `pvc`, `hdpe`, `fiberglass`. |
| `diameter` | number | yes      | Casing outer diameter in millimeters.|

```json
{ "from": 0, "to": 60, "type": "steel", "diameter": 200 }
```

---

### `Reduction` — `reduction[]`

A transition piece connecting two casing or screen sections of different diameters.

| Field       | Type   | Required | Description                              |
|-------------|--------|----------|------------------------------------------|
| `from`      | number | yes      | Start depth in meters.                   |
| `to`        | number | yes      | End depth in meters.                     |
| `diam_from` | number | yes      | Diameter at the top of the reducer in mm.|
| `diam_to`   | number | yes      | Diameter at the bottom of the reducer in mm.|
| `type`      | string | yes      | Reducer type (e.g. `conical`, `stepped`).|

```json
{ "from": 58, "to": 60, "diam_from": 200, "diam_to": 150, "type": "conical" }
```

---

### `WellScreen` — `well_screen[]`

Slotted or wire-wound screen section that allows water to enter the well.

| Field            | Type   | Required | Description                              |
|------------------|--------|----------|------------------------------------------|
| `from`           | number | yes      | Start depth in meters.                   |
| `to`             | number | yes      | End depth in meters.                     |
| `type`           | string | yes      | Screen type. Recommended: `wire_wound`, `bridge_slot`, `louvered`, `pvc_slotted`. |
| `diameter`       | number | yes      | Screen outer diameter in millimeters.    |
| `screen_slot_mm` | number | yes      | Slot opening size in millimeters.        |

```json
{ "from": 60, "to": 80, "type": "wire_wound", "diameter": 150, "screen_slot_mm": 0.5 }
```

---

### `SurfaceCase` — `surface_case[]`

Outer protective casing installed near the surface, typically to prevent surface contamination.

| Field      | Type   | Required | Description                               |
|------------|--------|----------|-------------------------------------------|
| `from`     | number | yes      | Start depth in meters.                    |
| `to`       | number | yes      | End depth in meters.                      |
| `diameter` | number | yes      | Casing outer diameter in millimeters.     |

```json
{ "from": 0, "to": 3, "diameter": 300 }
```

---

### `HoleFill` — `hole_fill[]`

Material placed in the annular space between the casing and the borehole wall.

| Field         | Type   | Required | Description                                      |
|---------------|--------|----------|--------------------------------------------------|
| `from`        | number | yes      | Start depth in meters.                           |
| `to`          | number | yes      | End depth in meters.                             |
| `type`        | string | yes      | Either `gravel_pack` or `seal`.                  |
| `diameter`    | number | yes      | Outer diameter of the filled annulus in mm.      |
| `description` | string | yes      | Material description (e.g. grain size, material).|

```json
{ "from": 60, "to": 80, "type": "gravel_pack", "diameter": 250, "description": "Seixo 2-4mm" }
```

---

### `CementPad` — `cement_pad`

The concrete pad installed at ground level (depth 0) around the wellhead. Dimensions are in meters.

| Field       | Type   | Required | Description                              |
|-------------|--------|----------|------------------------------------------|
| `type`      | string | yes      | Pad shape (e.g. `square`, `rectangular`, `circular`). |
| `width`     | number | yes      | Width in meters.                         |
| `thickness` | number | yes      | Thickness in meters.                     |
| `length`    | number | yes      | Length in meters.                        |

```json
{ "type": "square", "width": 1.0, "thickness": 0.15, "length": 1.0 }
```

---

### `Lithology` — `lithology[]`

Geological description of a depth interval.

| Field           | Type   | Required | Description                                       |
|-----------------|--------|----------|---------------------------------------------------|
| `from`          | number | yes      | Start depth in meters.                            |
| `to`            | number | yes      | End depth in meters.                              |
| `description`   | string | yes      | Free-text geological description.                 |
| `color`         | string | yes      | Representative color as a CSS hex value.          |
| `fgdc_texture`  | string | yes      | Texture code per the FGDC Digital Cartographic Standard for Geologic Map Symbolization. |
| `geologic_unit` | string | yes      | Name of the stratigraphic or geologic unit.       |
| `aquifer_unit`  | string | yes      | Aquifer classification (e.g. `freático`, `confinado`, `fraturado`). |

```json
{
  "from": 0,
  "to": 20,
  "description": "Areia fina amarelada",
  "color": "#f5deb3",
  "fgdc_texture": "sand",
  "geologic_unit": "Quaternário",
  "aquifer_unit": "freático"
}
```

---

### `Fracture` — `fractures[]`

A discrete fracture or fracture zone intersected by the borehole.

| Field          | Type    | Required | Description                                                   |
|----------------|---------|----------|---------------------------------------------------------------|
| `depth`        | number  | yes      | Depth of the fracture in meters.                              |
| `water_intake` | boolean | yes      | Whether the fracture produces water.                          |
| `description`  | string  | yes      | Free-text description.                                        |
| `swarm`        | boolean | yes      | Whether this fracture belongs to a swarm (closely spaced set).|
| `azimuth`      | number  | yes      | Azimuth in degrees from geographic north (0–360).             |
| `dip`          | number  | yes      | Dip angle in degrees from horizontal (0–90).                  |

```json
{ "depth": 45.2, "water_intake": true, "description": "Fratura aberta", "swarm": false, "azimuth": 120, "dip": 35 }
```

---

### `Cave` — `caves[]`

A cavity or void zone intersected by the borehole.

| Field          | Type    | Required | Description                          |
|----------------|---------|----------|--------------------------------------|
| `from`         | number  | yes      | Start depth in meters.               |
| `to`           | number  | yes      | End depth in meters.                 |
| `water_intake` | boolean | yes      | Whether the cave produces water.     |
| `description`  | string  | yes      | Free-text description.               |

```json
{ "from": 50, "to": 52, "water_intake": false, "description": "Caverna seca" }
```

---

## Complete Example

```json
{
  "version": 1,
  "well_type": "tubular",
  "name": "Poço PP-01",
  "well_driller": "Perfuradora XYZ",
  "construction_date": "2024-03-15",
  "lat": -1.4558,
  "lng": -48.5039,
  "elevation": 12.5,
  "obs": "Sem anomalias observadas durante a perfuração.",

  "bore_hole": [
    { "from": 0, "to": 80, "diameter": 250, "drilling_method": "rotary" }
  ],

  "well_case": [
    { "from": 0, "to": 60, "type": "steel", "diameter": 200 }
  ],

  "reduction": [
    { "from": 58, "to": 60, "diam_from": 200, "diam_to": 150, "type": "conical" }
  ],

  "well_screen": [
    { "from": 60, "to": 80, "type": "wire_wound", "diameter": 150, "screen_slot_mm": 0.5 }
  ],

  "surface_case": [
    { "from": 0, "to": 3, "diameter": 300 }
  ],

  "hole_fill": [
    { "from": 60, "to": 80, "type": "gravel_pack", "diameter": 250, "description": "Seixo 2-4mm" },
    { "from": 3,  "to": 60, "type": "seal",         "diameter": 250, "description": "Cimento" }
  ],

  "cement_pad": { "type": "square", "width": 1.0, "thickness": 0.15, "length": 1.0 },

  "lithology": [
    {
      "from": 0, "to": 20,
      "description": "Areia fina amarelada",
      "color": "#f5deb3",
      "fgdc_texture": "sand",
      "geologic_unit": "Quaternário",
      "aquifer_unit": "freático"
    },
    {
      "from": 20, "to": 80,
      "description": "Granito fraturado cinza",
      "color": "#a9a9a9",
      "fgdc_texture": "granite",
      "geologic_unit": "Embasamento Cristalino",
      "aquifer_unit": "fraturado"
    }
  ],

  "fractures": [
    { "depth": 45.2, "water_intake": true,  "description": "Fratura aberta",       "swarm": false, "azimuth": 120, "dip": 35 },
    { "depth": 62.0, "water_intake": false, "description": "Fratura de cisalhamento", "swarm": true,  "azimuth": 90,  "dip": 70 }
  ],

  "caves": [
    { "from": 50, "to": 52, "water_intake": false, "description": "Caverna seca" }
  ]
}
```

---

## Versioning

The `version` field must always be present and is an integer starting at `1`. Parsers must reject files with an unrecognized `version` value and should warn when `version` is absent.

| Version | Description                   |
|---------|-------------------------------|
| `1`     | Initial release of the format |

A `hydro` block for dynamic hydrological data (static level, dynamic level, pump tests, water quality) is reserved for v2 and must not appear in v1 files.

---

## MIME Type

```
application/vnd.well+json
```

---

*Specification v1.0 — `.well` format*