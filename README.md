# Well Profiler

Most software for documenting and visualizing water well profiles is proprietary, expensive, and not interoperable. Well Profiler exists to change that.

Well Profiler is an open-source web application built with React that lets geologists and engineers create, visualize, and export water well profiles. More importantly, it is the **reference implementation** of the **`.well` open file format** — a compact, structured standard for representing water well data that any application can read and write.

You can try the app at [wellprofiler.com](https://wellprofiler.com). The source lives at [github.com/rafaeelneto/welldot](https://github.com/rafaeelneto/welldot).

---

## The `.well` File Format

The core of this project is an open, versioned file format for water well data — not just the app.

The `.well` format is designed to serve three purposes:

- **Visualization** — enough constructive and geological detail to produce accurate well profile drawings at true depth scale
- **Registration** — a complete static record suitable for regulatory submissions and national well registries
- **Research** — structured data aligned with FGDC and hydrogeological standards, enabling cross-well analysis and aquifer characterization

The format is human-readable JSON with full, descriptive key names. It is easy to inspect, diff, and version-control without tooling.

**Example `.well` file:**

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
  "bore_hole": [{ "from": 0, "to": 80, "diameter": 250, "drilling_method": "rotary" }],
  "well_case": [{ "from": 0, "to": 60, "type": "steel", "diameter": 200 }],
  "reduction": [{ "from": 58, "to": 60, "diam_from": 200, "diam_to": 150, "type": "conical" }],
  "well_screen": [{ "from": 60, "to": 80, "type": "wire_wound", "diameter": 150, "screen_slot_mm": 0.5 }],
  "surface_case": [{ "from": 0, "to": 3, "diameter": 300 }],
  "hole_fill": [{ "from": 60, "to": 80, "type": "gravel_pack", "diameter": 250, "description": "Seixo 2-4mm" }],
  "cement_pad": { "type": "square", "width": 1.0, "thickness": 0.15, "length": 1.0 },
  "lithology": [{ "from": 0, "to": 20, "description": "Areia fina", "color": "#f5deb3", "fgdc_texture": "sand", "geologic_unit": "Quaternário", "aquifer_unit": "freático" }],
  "fractures": [{ "depth": 45.2, "water_intake": true, "description": "Fratura aberta", "swarm": false, "azimuth": 120, "dip": 35 }],
  "caves": [{ "from": 50, "to": 52, "water_intake": false, "description": "Caverna seca" }]
}
```

The format captures:

| Section | Field | Description |
|---|---|---|
| Metadata | `version`, `well_type`, `name`, `well_driller`, `construction_date`, `lat`, `lng`, `elevation`, `obs` | Version, well classification, name, driller, date, coordinates, elevation, observations |
| Borehole | `bore_hole[]` | Depth intervals and drilling method |
| Well casing | `well_case[]` | Casing material, diameter, and depth |
| Reductions | `reduction[]` | Diameter transitions between casing sections |
| Well screen | `well_screen[]` | Screen type, slot size, and depth |
| Surface casing | `surface_case[]` | Outer protective casing |
| Hole fill | `hole_fill[]` | Gravel pack and cement seal intervals |
| Cement pad | `cement_pad` | Surface pad dimensions |
| Lithology | `lithology[]` | Geologic layers with FGDC texture codes, colors, and aquifer units |
| Fractures | `fractures[]` | Depth, azimuth, dip, water intake |
| Caves | `caves[]` | Depth intervals and water intake |

All depths are in **meters**, all diameters in **millimeters**, measured from ground level. The full specification is in [`docs/file-format-specification.md`](docs/file-format-specification.md).

The format is open. You are welcome to implement parsers, exporters, converters, or viewers in any language. Contributions to the specification are welcome via issues and pull requests.

---

## App Features

- Visual well profile rendering with borehole geometry, casing strings, lithological column, fractures, and caves
- Import and export `.well` files
- Export printable PDF reports
- Quantitative construction data useful for cost estimation

---

## Getting Started

```bash
npm install
npm run dev
```

---

## Tech Stack

- [Next.js](https://nextjs.org/) + [TypeScript](https://www.typescriptlang.org/)
- [React](https://react.dev/)
- [D3.js](https://d3js.org/) — profile rendering
- [pdfmake](http://pdfmake.org/) — PDF export
- [Mantine](https://mantine.dev/) — UI components

---

## Geologic Symbolization

Well Profiler uses the [FGDC Digital Cartographic Standard for Geologic Map Symbolization](https://ngmdb.usgs.gov/fgdc_gds/geolsymstd/download.php), specifically the [FGDC Pattern Chart](https://ngmdb.usgs.gov/fgdc_gds/geolsymstd/fgdc-geolsym-patternchart.pdf) to represent lithological textures, the same standard used in scientific literature.

---

## Roadmap

The following extensions are planned for future versions of the `.well` format and the app:

- **Pump tests** — step-drawdown and constant-rate test results, including static/dynamic water levels, specific capacity, and transmissivity estimates
- **Water quality** — physico-chemical and microbiological parameters tied to sampling date and depth interval
- **History log** — timestamped records of maintenance events, rehabilitations, and operational changes over the well's lifespan
- **Extended metadata** — owner, responsible hydrogeologist, licensing authority, permit number, and operational status
- **Production data** — installed pump capacity, operational depth, and average yield

---

## Known Issues

The codebase carries some technical debt from early development. There are areas with inconsistent patterns, legacy abstractions, and code that could be better organized. These will be addressed in upcoming work, which includes extracting the core rendering and file format logic into a standalone library and improving the overall code quality.

Contributions and bug reports are welcome in the meantime.

---

## Licensing

This project is licensed under the [Apache 2.0](./LICENSE) license.

---

Suggestions, issues, and contributions are welcome. If you are building a tool that reads or writes `.well` files, feel free to open an issue — we would like to know about compatible implementations.
