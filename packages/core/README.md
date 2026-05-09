# @welldot/core

[![npm version](https://img.shields.io/npm/v/@welldot/core.svg)](https://www.npmjs.com/package/@welldot/core)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178c6.svg)](https://www.typescriptlang.org/)

TypeScript types, Zod validators, and serialization utilities for the `.well` open format — a JSON-based standard for representing water well data.

## What is `.well`?

`.well` is an open file format for encoding the complete static record of a water well as a single, self-describing JSON document. A `.well` file contains:

- **Constructive data** — borehole geometry, casing strings, screens, reducers, gravel packs, and cement pads
- **Geologic data** — lithological column, discrete fractures, and cave zones
- **Administrative metadata** — name, driller, construction date, geographic coordinates, and elevation

The format is designed for three use cases: visualization of technical well profiles, registration with regulatory bodies, and hydrogeological research.

See the [full format specification](./well-specifications.md) for the complete schema reference and design rationale.

## Installation

```bash
# npm
npm install @welldot/core

# pnpm
pnpm add @welldot/core

# yarn
yarn add @welldot/core
```

**Requirements:** Node.js >= 18. [`zod`](https://zod.dev) is bundled as a dependency.

## Quick Start

```typescript
import type { Well, BoreHole, Lithology } from '@welldot/core';
import {
  WellSchema,
  parseWell,
  serializeWell,
  deserializeWell,
  isWellEmpty,
} from '@welldot/core';

// Parse and validate a .well JSON string — throws ZodError on invalid input
const well = parseWell(rawJsonString);

// Validate an existing object with the Zod schema directly
const result = WellSchema.safeParse(unknownData);

// Serialize a Well object to a versioned JSON string
const jsonString = serializeWell(well);

// Deserialize — handles versioned format and legacy formats
const restored = deserializeWell(jsonString);

// Check if a well contains any data
const empty = isWellEmpty(well);
```

## API Reference

### Types

All types are exported as TypeScript type-only exports (zero runtime cost).

| Type | Description |
|------|-------------|
| `Well` | Complete static record of a water well |
| `BoreHole` | A drilled interval with diameter and optional drilling method |
| `WellCase` | Steel or plastic casing installed in the borehole |
| `Reduction` | Transition piece between different casing diameters |
| `WellScreen` | Slotted screen section for water intake |
| `SurfaceCase` | Protective casing near the surface |
| `HoleFill` | Annular fill material (`gravel_pack` or `seal`) |
| `CementPad` | Concrete wellhead pad dimensions |
| `Lithology` | Geological description of a depth interval |
| `Fracture` | A discrete fracture or fracture zone |
| `Cave` | A cavity or void zone |
| `Constructive` | Grouped type: borehole + casings + screens + fills |
| `Geologic` | Grouped type: lithology + fractures + caves |
| `Units` | `{ length: 'm' \| 'ft'; diameter: 'mm' \| 'inches' }` |
| `LengthUnits` | `'m' \| 'ft'` |
| `DiameterUnits` | `'mm' \| 'inches'` |
| `UnitsTypes` | `'metric' \| 'imperial'` |
| `Texture` | `{ code: TextureCode; label: string }` — a single FGDC texture entry |
| `TextureCode` | `number \| string` — numeric FGDC code or custom string code |

### Validators

Each schema validates its corresponding type at runtime. All schemas are Zod objects and compose with standard Zod methods (`.parse`, `.safeParse`, `.extend`, etc.).

| Export | Validates |
|--------|-----------|
| `WellSchema` | `Well` (the complete document) |
| `BoreHoleSchema` | `BoreHole` |
| `WellCaseSchema` | `WellCase` |
| `ReductionSchema` | `Reduction` |
| `WellScreenSchema` | `WellScreen` |
| `SurfaceCaseSchema` | `SurfaceCase` |
| `HoleFillSchema` | `HoleFill` |
| `CementPadSchema` | `CementPad` |
| `LithologySchema` | `Lithology` |
| `FractureSchema` | `Fracture` |
| `CaveSchema` | `Cave` |

### Functions

#### `parseWell(json: string): Well`

Parses a raw JSON string and validates it against `WellSchema`. Throws a `ZodError` on validation failure. Does not handle legacy formats — use `deserializeWell` for that.

#### `serializeWell(well: Well): string`

Serializes a `Well` object to a versioned `.well` JSON string (`"version": 1`). Omits `undefined` optional fields.

#### `deserializeWell(jsonString: string): Well | null`

Parses and normalizes a JSON string into a `Well`. Handles multiple formats:

- Current versioned format (`"version": 1`)
- Legacy formats with `constructive` / `geologic` sub-objects
- Legacy `diam_pol` inch diameters → `diameter` mm conversion (`× 25.4`)
- Typo `bole_hole` → `bore_hole` compatibility

Returns `null` if the parsed data is empty.

#### `isWellEmpty(well: Well | null | undefined): boolean`

Returns `true` when all constructive and geologic arrays are empty. Accepts `null` and `undefined` (both treated as empty).

## FGDC Texture Patterns

`FGDC_TEXTURES_OPTIONS` is a typed array of 284 texture pattern entries drawn from the **FGDC Digital Cartographic Standard for Geologic Map Symbolization (FGDC-STD-013-2006)**. Assign a `code` to the `texture` field of a `Lithology` record to attach a standardized fill pattern to a depth interval.

```typescript
import { FGDC_TEXTURES_OPTIONS } from '@welldot/core';
import type { Texture, TextureCode } from '@welldot/core';

// Lookup by code
const sandstone = FGDC_TEXTURES_OPTIONS.find(t => t.code === 607);
// { code: 607, label: 'Massive sand or sandstone' }

// Build a select list for a UI
const options = FGDC_TEXTURES_OPTIONS.map(t => ({ value: t.code, label: t.label }));
```

Codes are grouped by series:

| Series | Category |
|--------|----------|
| 100 | Surficial deposits |
| 200 | Sedimentary patterns |
| 300 | Igneous patterns |
| 400 | Miscellaneous / Metamorphic patterns |
| 500 | Glacial / Periglacial patterns |
| 600 | Sedimentary lithology *(most useful for well logging)* |
| 700 | Metamorphic and igneous lithology |

See [fgdc-textures.md](./fgdc-textures.md) for the complete annotated list of all 284 codes.

## `.well` Format Overview

All depths are in **meters** from ground level (0 = surface). All diameters are in **millimeters**. Geographic coordinates use WGS84 decimal degrees. The MIME type is `application/vnd.well+json`.

A minimal `.well` document:

```json
{
  "version": 1,
  "well_type": "tubular",
  "name": "PP-01",
  "lat": -1.4558,
  "lng": -48.5039,
  "elevation": 12.5,
  "bore_hole": [{ "from": 0, "to": 80, "diameter": 250, "drilling_method": "rotary" }],
  "well_case": [{ "from": 0, "to": 60, "type": "steel", "diameter": 200 }],
  "reduction": [],
  "well_screen": [{ "from": 60, "to": 80, "type": "wire_wound", "diameter": 150, "screen_slot_mm": 0.5 }],
  "surface_case": [{ "from": 0, "to": 3, "diameter": 300 }],
  "hole_fill": [{ "from": 60, "to": 80, "type": "gravel_pack", "diameter": 250, "description": "2-4mm gravel" }],
  "cement_pad": { "type": "square", "width": 1.0, "thickness": 0.15, "length": 1.0 },
  "lithology": [],
  "fractures": [],
  "caves": []
}
```

For the complete schema reference, field vocabulary, design rationale, and versioning policy see the [`.well` format specification](./well-specifications.md).

## Contributing

Issues and pull requests are welcome. The source lives in `packages/core` within the [well-profiler monorepo](https://github.com/rafaeelneto/welldot).

```bash
git clone https://github.com/rafaeelneto/welldot.git
cd well-profiler
pnpm install
cd packages/core
pnpm build
pnpm test
```

## License

[Apache 2.0](./LICENSE) — see `LICENSE` for the full text.
