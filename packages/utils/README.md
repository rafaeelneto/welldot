# @welldot/utils

Profile analysis utilities for the [`.well` open format](https://github.com/rafaeelneto/welldot) — depth and diameter summaries, cylindrical and annular volumes, gravel pack estimates, and aquifer hydraulics. Part of the [welldot](https://github.com/rafaeelneto/welldot) open-source ecosystem.

These are pure functions over a parsed `Well` object. No DOM, no network, no side effects.

## Install

```bash
npm install @welldot/utils
```

`@welldot/core` is a dependency and provides the `Well` type these functions operate on.

## Quick start

```ts
import { parseWell } from '@welldot/core';
import {
  calculateHoleFillVolume,
  formatNumber,
  getProfileLastItemsDepths,
} from '@welldot/utils';

// parseWell takes the raw JSON string, not a parsed object
const well = parseWell(fileContents);

// How much gravel pack does this well need?
const gravel = calculateHoleFillVolume('gravel_pack', well);
console.log(formatNumber(gravel, { fractionDigits: 2, suffix: 'm³' }));
// → "0.63 m³"

// Deepest recorded point of every component array
const depths = getProfileLastItemsDepths(well);
console.log(Math.max(...depths)); // → 80
```

## Units

The whole library follows the `.well` convention: **depths in meters**, **diameters in millimeters**, measured from ground level. Volume helpers convert diameters to meters internally and return **cubic meters (m³)**. Flow rates are in m³/h, so specific capacity is m²/h and unit drawdown is h/m².

## API

### Geometry and volumes

| Function                                                    | Returns                                                                                                                                                                             |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `calculateCylindricVolume(diameter, height)`                | Volume (m³) of a cylinder. `diameter` in mm, `height` in m.                                                                                                                         |
| `calculateHoleFillSegmentVolume(holeFill, well)`            | Net annular volume (m³) of one hole-fill segment, subtracting any casing and screen that overlaps the interval.                                                                     |
| `calculateHoleFillVolume(type, well)`                       | Total net volume (m³) of every fill segment of the given type — `'gravel_pack'` or `'seal'`.                                                                                        |
| `getProfileLastItemsDepths(well)`                           | Deepest recorded depth of each component array, in order: lithology, fractures, caves, bore_hole, hole_fill, reduction, surface_case, well_case, well_screen. `0` for empty arrays. |
| `getProfileDiamValues(constructive)`                        | Every diameter (mm) present in the constructive section, including both ends of each reducer. Useful for scaling a cross-section.                                                   |
| `getConstructivePropertySummary<T>(constructive, property)` | Flat array of one named property pulled from every constructive component.                                                                                                          |

### Aquifer hydraulics

Derived from pumping-test data. The three marked functions throw `RangeError` rather than returning `Infinity` on a zero denominator.

| Function                                                           | Returns                                                     |
| ------------------------------------------------------------------ | ----------------------------------------------------------- |
| `calculateDrawdown(readingDepth, staticLevel)`                     | Drawdown `s` (m).                                           |
| `calculateSpecificCapacity(flowRate, drawdown)`                    | Specific capacity `Q/s` (m²/h). Throws on zero drawdown.    |
| `calculateUnitDrawdown(drawdown, flowRate)`                        | Unit drawdown `s/Q` (h/m²). Throws on zero flow rate.       |
| `calculateHydraulicConductivity(transmissivity, aquiferThickness)` | Hydraulic conductivity `K` (m/h). Throws on zero thickness. |
| `calculateFormationLoss(jacobB, flowRate)`                         | Formation head loss `B·Q` (m).                              |
| `calculateWellLoss(jacobC, flowRate)`                              | Well head loss `C·Q²` (m).                                  |

### Queries and formatting

| Function                                     | Returns                                                                                                                                                  |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getLatestStaticLevel(well)`                 | Static water level (m) from the most recent non-retracted hydrodynamic event carrying one, compared by UTC datetime. `undefined` if none.                |
| `getRetractedEventIds(well)`                 | Ids of hydrodynamic events retracted by another event's `corrects` (v2.3 ledger corrections).                                                            |
| `getEffectiveHydrodynamicEvents(well)`       | Hydrodynamic events that count for derivations — every event not retracted by `corrects`.                                                                |
| `getCurrentPump(well)`                       | The `pump_installations` entry without `removed_at` (latest installed if several). `undefined` if none.                                                  |
| `getLatestPumpingDynamicLevel(well)`         | Most recent water level (m) measured during pumping, falling back to a newer `aquifer_analysis[].dynamic_level`. Airlift and retracted events ignored.   |
| `calculateSubmergence(well)`                 | `intake_depth − dynamic_level` (m) of the current pump. Negative when the intake is above the water level.                                               |
| `getPumpServiceTime(well, serial, now?)`     | Total time in service (min) of installations sharing a `serial`; open installations count up to `now`.                                                   |
| `getPumpInstallationWarnings(well)`          | v2.3 pump warnings: intake below the well bottom or inside a screen, several open installations, `removed_at` not after `installed_at`.                  |
| `isFlowingArtesian(well)`                    | Whether the most recent static level is above ground (negative). The v2.1 way to detect a flowing artesian well.                                         |
| `getCentralizerDepths(centralizer)`          | Individual centralizer depths (m) from `from`, `to`, and `spacing`. Only the endpoints when spacing is unknown.                                          |
| `getLatestAquiferAnalysisField(well, field)` | Value of `field` from the most recent `aquifer_analysis` entry that defines it. `undefined` if none.                                                     |
| `checkIfProfileIsEmpty(well)`                | Whether the well has any data worth rendering. Re-exported from `@welldot/core`.                                                                         |
| `formatNumber(value, options?)`              | Locale-aware display string with bounded fraction digits, so floating-point noise never reaches the UI. Returns `'—'` for `null`, `undefined`, or `NaN`. |

`formatNumber` options: `fractionDigits`, `minimumFractionDigits`, `maximumFractionDigits`, `suffix`, `locale` (BCP 47, defaults `'en-US'`), and `fallback`.

```ts
formatNumber(39.99998784, { fractionDigits: 2, suffix: 'm' }); // "40.00 m"
formatNumber(1234.5, { locale: 'pt-BR', maximumFractionDigits: 1 }); // "1.234,5"
formatNumber(null); // "—"
```

## Contributing

Issues and pull requests are welcome — see [CONTRIBUTING.md](https://github.com/rafaeelneto/welldot/blob/main/CONTRIBUTING.md). The source lives in `packages/utils` within the [welldot monorepo](https://github.com/rafaeelneto/welldot).

## License

[Apache 2.0](./LICENSE)
