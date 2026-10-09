# Welldot (fka Well Profiler)

Most software for documenting and visualizing water well profiles is proprietary, expensive, and not interoperable. Well Profiler exists to change that.

This repository started as **Well Profiler**, a tool focused on drawing well diagrams. It has since grown into **welldot**, a broader open-source ecosystem for geological well log visualization and profiling, designed for hydrogeologists, engineers, and researchers — spanning not just drawing, but also structured data recording and research. It consists of a web application and a set of reusable TypeScript libraries built around the **`.well` open file format**.

The core tools — the Well Profiler app, the `.well` format, and the libraries — are free and open source under the Apache 2.0 license.

You can try the app at [welldot.org](https://welldot.org). The source lives at [github.com/rafaeelneto/welldot](https://github.com/rafaeelneto/welldot).

---

## The `.well` File Format

The core of this project is an open, versioned file format for water well data — not just the app.

The `.well` format is designed to serve three purposes:

- **Visualization** — enough constructive and geological detail to produce accurate well profile drawings at true depth scale
- **Registration** — a complete static record suitable for regulatory submissions and national well registries
- **Research** — structured data aligned with FGDC and hydrogeological standards, enabling cross-well analysis and aquifer characterization

The format is human-readable JSON with full, descriptive key names. It is easy to inspect, diff, and version-control without tooling.

**Example `.well` file (v2):**

```json
{
  "version": 2,
  "well_type": "tubular",
  "name": "Poço PP-01",
  "well_driller": "Perfuradora XYZ",
  "construction_date": "2024-03-15",
  "location": { "lat": -1.4558, "lng": -48.5039, "elevation": 12.5 },
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
      "description": "Areia fina",
      "color": "#f5deb3",
      "texture": { "code": 607, "vocabulary": "fgdc" },
      "geologic_unit": "Quaternário",
      "aquifer_unit": "freático"
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

The format captures:

| Section             | Field                                                                                      | Description                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Identity            | `version`, `well_type`, `well_purpose`, `name`, `well_driller`, `construction_date`, `obs` | Version, construction method, intended use(s), name, driller, date, and free-text observations        |
| Location            | `location`                                                                                 | Lat/lng/elevation with explicit CRS and datum; default WGS84 (`EPSG:4326`)                            |
| Registry IDs        | `well_id[]`                                                                                | Authority-scoped identifiers (e.g. SIAGAS, ANA, NGWD)                                                 |
| Borehole            | `bore_hole[]`                                                                              | Depth intervals and drilling method                                                                   |
| Well depth          | `well_depth`                                                                               | Current usable depth; may be less than drilled depth after siltation                                  |
| Well casing         | `well_case[]`                                                                              | Casing material, diameter, and depth                                                                  |
| Reductions          | `reduction[]`                                                                              | Diameter transitions between casing sections                                                          |
| Well screen         | `well_screen[]`                                                                            | Screen type, slot size (`screen_slot`, mm), and depth                                                 |
| Surface casing      | `surface_case[]`                                                                           | Outer protective casing                                                                               |
| Hole fill           | `hole_fill[]`                                                                              | Gravel pack and cement seal intervals                                                                 |
| Centralizers        | `centralizers[]`                                                                           | Casing/screen centralizers as interval + spacing (v2.1)                                               |
| Cement pad          | `cement_pad`                                                                               | Surface pad dimensions                                                                                |
| Lithology           | `lithology[]`                                                                              | Geologic layers with FGDC texture codes, colors, and aquifer units                                    |
| Fractures           | `fractures[]`                                                                              | Depth, azimuth, dip, water intake                                                                     |
| Caves               | `caves[]`                                                                                  | Depth intervals and water intake                                                                      |
| Hydrodynamic events | `hydrodynamic_events[]`                                                                    | Pumping tests, static readings, airlift, and recovery phases with time-series                         |
| Aquifer analysis    | `aquifer_analysis[]`                                                                       | Interpreted transmissivity, specific capacity, storativity, Jacob coefficients                        |
| Operational history | `history_logs[]`                                                                           | Timestamped log of maintenance, inspections, incidents and status changes                             |
| Pump installations  | `pump_installations[]`                                                                     | Pump history with nameplate, intake depth, riser and electrical data (v2.3)                           |
| Permits             | `permits[]`                                                                                | Outorgas with validity, granted flow and volumes, and conditions with derived deadlines (v2.3)        |
| Meters              | `meters[]`                                                                                 | Totalizer (hidrômetro) installation history: type, serial, nominal diameter, register capacity (v2.3) |
| Production          | `production[]`                                                                             | Append-only ledger of meter readings and declared volumes; volumes are derived, never stored (v2.3)   |
| Operating regime    | `operating_regime[]`                                                                       | Declared flow rate, daily operating time and days per week, in force from a given instant (v2.3)      |
| General attachments | `attachments[]`                                                                            | Root-level files about the well as a whole, e.g. the drilling report (v2.3)                           |
| Water quality       | `water_samples[]`                                                                          | Ledger of water samples with field and lab results, sampling point, purge, lab and QA/QC data (v2.3)  |

All depths are in **meters**, all diameters in **millimeters**, measured from ground level. The full specification is in [`packages/core/docs/spec/v2/`](packages/core/docs/spec/v2/).

The format is open. You are welcome to implement parsers, exporters, converters, or viewers in any language. Contributions to the specification are welcome via issues and pull requests.

---

## Packages

This monorepo publishes three standalone npm packages:

### [`@welldot/core`](./packages/core)

Types, Zod validators, and serialization utilities for the `.well` format. The foundation for all other packages.

```bash
npm install @welldot/core
```

### [`@welldot/render`](./packages/render)

D3-based SVG renderer for `.well` profiles. This is the visualization engine used by Well Profiler — available as a standalone library so you can embed well profile diagrams in any web application.

```bash
npm install @welldot/render
```

### [`@welldot/utils`](./packages/utils)

Profile analysis utilities: depth calculations, cylindrical volumes, gravel pack volume estimates, and construction data summaries.

```bash
npm install @welldot/utils
```

---

## App Features

The editor at [welldot.org](https://welldot.org) covers the full `.well` v2 schema:

- **Live profile canvas** — borehole geometry, surface casing, casing and screen strings, reducers, annular space, wellhead, lithological column, fractures, and caves, rendered as you type, with pan and zoom
- **Construction data** — borehole, surface casing, casing, screen, reduction, hole fill, and wellhead sections in editable data grids
- **Geology** — lithology by geologic unit, plus fractures and caves, with FGDC texture pickers
- **Hydrodynamic events** — constant-rate, step-drawdown, airlift, and recovery pumping tests with time-series readings and derived aquifer statistics
- **History log** — timestamped maintenance, inspection, and incident records with attachments
- **Well identity and location** — multi-registry `well_id` entries and a map-based location picker with elevation
- **Summary and volumes** — depth, layer, and screen KPIs plus per-section tables with grout and pre-filter volumes for cost estimation
- **Open and save** — native file handles where the File System Access API is available, with `Cmd/Ctrl+S` and unsaved-change guards
- **Shareable links** — publish a profile with per-section visibility control
- **Printable PDF reports** — configurable sections and info items
- **Preferences** — length (m / ft) and diameter (mm / in) units, coordinate format, light/dark theme, and EN / PT interface

---

## Getting Started

To run the Well Profiler app locally:

```bash
pnpm install
pnpm dev
```

`pnpm dev` starts every workspace at once: the active Nuxt app on
[localhost:3000](http://localhost:3000), the deprecated Next.js app on
[localhost:5000](http://localhost:5000), and `tsup --watch` for the three libraries. To run just the
active app, use `pnpm turbo dev --filter=profiler`.

To use the libraries in your own project, install them individually — see the README in each package for usage details.

---

## Tech Stack

- [Nuxt 4](https://nuxt.com/) + [Vue 3](https://vuejs.org/) + [TypeScript](https://www.typescriptlang.org/) — active web app (`apps/profiler`, deployed at welldot.org)
- [PrimeVue 4](https://primevue.org/) + [Tailwind CSS 4](https://tailwindcss.com/) — UI components and styling
- [`@welldot/render`](./packages/render) — SVG profile rendering (built on [D3.js](https://d3js.org/))
- [pdfmake](http://pdfmake.org/) — PDF export
- [Pinia](https://pinia.vuejs.org/) — state management

---

## Geologic Symbolization

Well Profiler uses the [FGDC Digital Cartographic Standard for Geologic Map Symbolization](https://ngmdb.usgs.gov/fgdc_gds/geolsymstd/download.php), specifically the [FGDC Pattern Chart](https://ngmdb.usgs.gov/fgdc_gds/geolsymstd/fgdc-geolsym-patternchart.pdf) to represent lithological textures, the same standard used in scientific literature.

---

## Roadmap

### `.well` format — v2 shipped

The following were delivered in `.well` v2.0 (shipped in `@welldot/core` v0.2.0):

- **Pumping tests** — constant-rate, step-drawdown, airlift, and recovery-only event types with full time-series readings
- **Aquifer analysis** — transmissivity, specific capacity, storativity, hydraulic conductivity, and Jacob loss coefficients with method and analyst attribution
- **Operational history log** — timestamped records of maintenance, inspections, and incidents with HTTPS attachment references
- **Structured location** — `location` object with explicit CRS, elevation datum, and one-sigma precision fields
- **Registry identifiers** — `well_id[]` array linking a well to multiple national and institutional registries

The v2.3 revision (shipped in `@welldot/core` v0.4.0) adds the operational blocks and water quality:

- **Pump installations** — installation history with nameplate, intake depth, riser and electrical data; the current pump is drawn on the profile
- **Permits** — outorgas with validity, granted flow, daily operating time and volumes, and conditions (condicionantes) whose deadlines are derived from ISO 8601 date durations and whose fulfillments are recorded on the condition; an administrative status (requested, suspended, revoked…) and an administrative history (filing, notifications, fees)
- **Meters and production** — totalizer installation history plus an append-only production ledger of meter readings and declared volumes; volumes are derived with rollover handling and are never stored as totals
- **Operating regime** — declared flow rate, daily operating time and days per week, each entry in force from `effective_from`
- **Structured history logs** — `maintenance` entries reference the pump, meter or event they concern (`maintenance_type`, `pump_installation_id`, `meter_id`, `event_id`); the new `status_change` category records the well's operating status
- **Attachments** — a root-level `attachments` array for general files about the well (e.g. the drilling report), plus `document_type` and per-record attachments on pumps, hydrodynamic events and aquifer analyses. The root array does not collect the per-record attachments
- **Water quality** — a `water_samples` ledger: each sample carries its field and laboratory results, sampling point and depth, purge and stabilization readings, laboratory and chain of custody, field QA/QC (duplicates, splits, blanks), filtration, lab flags and data validation. Parameters use a versioned vocabulary of 98 `welldot` codes plus CAS numbers, with units fixed by code. Limits stay out of the file: WHO, EU and Brazilian limit sets ship as data in `@welldot/core`
- **Ledger corrections** — `hydrodynamic_events[].corrects`, `production[].corrects` and `water_samples[].corrects` retract an erroneous entry without editing it

### `.well` format — future versions

- **Interpreted water quality assessment** — stored judgments such as water class or hydrochemical facies (today they are derived on demand)
- **Geophysical logs** — downhole resistivity, gamma ray, and caliper surveys (reserved for v3)
- **Multi-well linking** — observation well references for storativity determination (reserved for v3)

### Ecosystem

- **`.LAS` file import** — support for the industry-standard Log ASCII Standard format used in oil, gas, and water-well logging
- **SIAGAS import** — pull well records from the Brazilian Geological Survey's groundwater database
- **Locale-aware dates** — dates still render ISO-style; numbers and units are already localized and switchable

---

## Claude Code Skill — `welldot-converter`

The `welldot-converter` skill for [Claude Code](https://claude.ai/code) converts any water well report (PDF, DOCX, image, or plain text) into a valid `.well` JSON file. It works with reports in any language (Portuguese, English, Spanish, etc.) and uses the official welldot spec as its source of truth.

**What it does:**

- Extracts all well data from a report — construction, lithology, fractures, caves, and more
- Validates output against the `.well` format spec
- Preserves the source document's language in all free-text fields
- Flags fields that were absent in the report rather than guessing values

**Install:**

The skill lives at `.agents/skills/welldot-converter/`, the vendor-neutral path that every
skills-capable client discovers. `.claude/skills/welldot-converter` is a symlink to it, kept for
back-compat. If you cloned the repo, the skill is already available project-locally.

To make it available globally across all your projects, copy the real directory — not the symlink —
into your personal skills directory:

```bash
cp -R .agents/skills/welldot-converter ~/.claude/skills/
```

**Use:**

Open Claude Code in any project and run:

```
/welldot-converter
```

Then attach or describe the well report you want to convert. Claude will extract the data, validate it, and produce a `.well` file ready for upload to [welldot.org](https://welldot.org) or use with `@welldot/core`.

---

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup, the
repository layout, and the process for proposing a change to the `.well` format.

If you are building a tool that reads or writes `.well` files, you don't need permission and you
don't need to use these libraries — the format is open and the spec is complete enough to implement
from scratch. Please open an issue to tell us about it; we want to keep a list of compatible
implementations.

---

## Licensing

This project is licensed under the [Apache 2.0](./LICENCE.md) license.
