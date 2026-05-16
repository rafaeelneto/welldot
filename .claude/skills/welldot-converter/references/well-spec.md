# `.well` Format Specification — Quick Reference (v1)

**Extension:** `.well` | **Encoding:** UTF-8 | **Base format:** JSON  
**MIME type:** `application/vnd.well+json`

---

## Units

| Measure       | Unit                           |
| ------------- | ------------------------------ |
| All depths    | meters (from ground level = 0) |
| All diameters | millimeters                    |
| Coordinates   | WGS84 decimal degrees          |
| Elevation     | meters above sea level         |
| Dates         | ISO 8601 (YYYY-MM-DD)          |

---

## Top-level structure

```json
{
  "version": 1,
  "well_type": "tubular",
  "name": "...",
  "well_driller": "...",
  "construction_date": "YYYY-MM-DD",
  "lat": -1.4558,
  "lng": -48.5039,
  "elevation": 12.5,
  "obs": "...",
  "bore_hole": [...],
  "well_case": [...],
  "reduction": [...],
  "well_screen": [...],
  "surface_case": [...],
  "hole_fill": [...],
  "cement_pad": {...},
  "lithology": [...],
  "fractures": [...],
  "caves": [...]
}
```

### `well_type` values

`tubular` | `artesian` | `hand_dug` | `horizontal` | `infiltration_gallery`

---

## Object schemas

### `bore_hole[]`

| Field             | Type        | Required                                                                    |
| ----------------- | ----------- | --------------------------------------------------------------------------- |
| `from`            | number (m)  | yes                                                                         |
| `to`              | number (m)  | yes                                                                         |
| `diameter`        | number (mm) | yes                                                                         |
| `drilling_method` | string      | no — `rotary`, `percussion`, `cable_tool`, `auger`, `diamond`, `air_rotary` |

### `well_case[]`

| Field      | Type        | Required                                   |
| ---------- | ----------- | ------------------------------------------ |
| `from`     | number (m)  | yes                                        |
| `to`       | number (m)  | yes                                        |
| `type`     | string      | yes — `steel`, `pvc`, `hdpe`, `fiberglass` |
| `diameter` | number (mm) | yes                                        |

### `reduction[]`

| Field       | Type        | Required                   |
| ----------- | ----------- | -------------------------- |
| `from`      | number (m)  | yes                        |
| `to`        | number (m)  | yes                        |
| `diam_from` | number (mm) | yes                        |
| `diam_to`   | number (mm) | yes                        |
| `type`      | string      | yes — `conical`, `stepped` |

### `well_screen[]`

| Field            | Type        | Required                                                     |
| ---------------- | ----------- | ------------------------------------------------------------ |
| `from`           | number (m)  | yes                                                          |
| `to`             | number (m)  | yes                                                          |
| `type`           | string      | yes — `wire_wound`, `bridge_slot`, `louvered`, `pvc_slotted` |
| `diameter`       | number (mm) | yes                                                          |
| `screen_slot_mm` | number      | yes                                                          |

### `surface_case[]`

| Field      | Type        | Required |
| ---------- | ----------- | -------- |
| `from`     | number (m)  | yes      |
| `to`       | number (m)  | yes      |
| `diameter` | number (mm) | yes      |

### `hole_fill[]`

| Field         | Type        | Required                      |
| ------------- | ----------- | ----------------------------- |
| `from`        | number (m)  | yes                           |
| `to`          | number (m)  | yes                           |
| `type`        | string      | yes — `gravel_pack` or `seal` |
| `diameter`    | number (mm) | yes                           |
| `description` | string      | yes                           |

### `cement_pad` (single object, optional)

| Field       | Type       | Required                                  |
| ----------- | ---------- | ----------------------------------------- |
| `type`      | string     | yes — `square`, `rectangular`, `circular` |
| `width`     | number (m) | yes                                       |
| `thickness` | number (m) | yes                                       |
| `length`    | number (m) | yes                                       |

### `lithology[]`

| Field           | Type       | Required                     |
| --------------- | ---------- | ---------------------------- |
| `from`          | number (m) | yes                          |
| `to`            | number (m) | yes                          |
| `description`   | string     | yes                          |
| `color`         | string     | yes — CSS hex e.g. `#f5deb3` |
| `fgdc_texture`  | string     | yes — FGDC texture code      |
| `geologic_unit` | string     | yes                          |
| `aquifer_unit`  | string     | yes                          |

**Common fgdc_texture values:**
`sand`, `fine_sand`, `coarse_sand`, `gravel`, `clay`, `silt`, `loam`, `rock`, `granite`,
`basalt`, `limestone`, `sandstone`, `shale`, `gneiss`, `schist`, `quartzite`, `fill`, `unknown`

**Common aquifer_unit values (PT-BR):**
`freático`, `confinado`, `semiconfinado`, `fraturado`, `cárstico`, `poroso`

### `fractures[]`

| Field          | Type            | Required |
| -------------- | --------------- | -------- |
| `depth`        | number (m)      | yes      |
| `water_intake` | boolean         | yes      |
| `description`  | string          | yes      |
| `swarm`        | boolean         | yes      |
| `azimuth`      | number (0–360°) | yes      |
| `dip`          | number (0–90°)  | yes      |

### `caves[]`

| Field          | Type       | Required |
| -------------- | ---------- | -------- |
| `from`         | number (m) | yes      |
| `to`           | number (m) | yes      |
| `water_intake` | boolean    | yes      |
| `description`  | string     | yes      |

---

## Complete example

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
  "well_case": [{ "from": 0, "to": 60, "type": "steel", "diameter": 200 }],
  "reduction": [
    {
      "from": 58,
      "to": 60,
      "diam_from": 200,
      "diam_to": 150,
      "type": "conical"
    }
  ],
  "well_screen": [
    {
      "from": 60,
      "to": 80,
      "type": "wire_wound",
      "diameter": 150,
      "screen_slot_mm": 0.5
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
    "type": "square",
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
      "fgdc_texture": "sand",
      "geologic_unit": "Quaternário",
      "aquifer_unit": "freático"
    },
    {
      "from": 20,
      "to": 80,
      "description": "Granito fraturado cinza",
      "color": "#a9a9a9",
      "fgdc_texture": "granite",
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
    },
    {
      "depth": 62.0,
      "water_intake": false,
      "description": "Fratura de cisalhamento",
      "swarm": true,
      "azimuth": 90,
      "dip": 70
    }
  ],
  "caves": [
    {
      "from": 50,
      "to": 52,
      "water_intake": false,
      "description": "Caverna seca"
    }
  ]
}
```
