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

| Function                                                               | Returns                                                                                                                                                                                                                                                       |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getLatestStaticLevel(well)`                                           | Static water level (m) from the most recent non-retracted hydrodynamic event carrying one, compared by UTC datetime. `undefined` if none.                                                                                                                     |
| `getRetractedEventIds(well)`                                           | Ids of hydrodynamic events retracted by another event's `corrects` (v2.3 ledger corrections).                                                                                                                                                                 |
| `getEffectiveHydrodynamicEvents(well)`                                 | Hydrodynamic events that count for derivations — every event not retracted by `corrects`.                                                                                                                                                                     |
| `getCurrentPump(well)`                                                 | The `pump_installations` entry without `removed_at` (latest installed if several). `undefined` if none.                                                                                                                                                       |
| `getPumpInstalledAt(well, instant)`                                    | The `pump_installations` entry in place at `instant` (`installed_at` ≤ instant < `removed_at`; latest installed if several). `undefined` if none.                                                                                                             |
| `getLatestPumpingDynamicLevel(well)`                                   | Most recent water level (m) measured during pumping, falling back to a newer `aquifer_analysis[].dynamic_level`. Airlift and retracted events ignored.                                                                                                        |
| `calculateSubmergence(well)`                                           | `intake_depth − dynamic_level` (m) of the current pump. Negative when the intake is above the water level.                                                                                                                                                    |
| `getPumpServiceTime(well, serial, now?)`                               | Total time in service (min) of installations sharing a `serial`; open installations count up to `now`.                                                                                                                                                        |
| `getPumpInstallationWarnings(well)`                                    | v2.3 pump warnings: intake below the well bottom or inside a screen, several open installations, `removed_at` not after `installed_at`.                                                                                                                       |
| `getPermitStatus(well, permit, today?)`                                | v2.3 permit status: a stored administrative `status` other than `granted` (`requested`, `suspended`, `revoked`, `denied`, `withdrawn`), else derived `superseded`, `not_yet_valid`, `active`, `active_pending_renewal` or `expired`, on a local calendar date |
| `getPermitEffectiveEnd(well, permit, today?)`                          | Day before the successor's start date, else `valid_until`; `undefined` while a renewal is pending or with no fixed expiry.                                                                                                                                    |
| `getConditionDeadlines(well, permit, condition, opts?)`                | A condition's deadlines (`YYYY-MM-DD`), computed from the anchor with month-end clamping; stops at `occurrences`, `last_due`, the effective end or a horizon; none for a never-granted permit, none after today for a suspended/revoked one.                  |
| `getConditionFulfillments(condition)`                                  | A condition's `fulfillments`, oldest first.                                                                                                                                                                                                                   |
| `isPermitGranted(permit)` / `getPermitIdentifier(permit)`              | Administrative status absent or `granted` / `identifier`, else `request_identifier`.                                                                                                                                                                          |
| `getPermitHistory(permit)` / `getOverduePermitHistory(permit, today?)` | Administrative `history` sorted by date / steps past `due_date` and not `done`.                                                                                                                                                                               |
| `getPermitTimeline(permit)`                                            | `history` steps and condition fulfillments merged, newest first, by local date.                                                                                                                                                                               |
| `getConditionDeadlineStates(well, permit, condition, opts?)`           | Each deadline with `fulfilled`, `fulfilled_late`, `upcoming` or `overdue`, matched against the condition's `fulfillments` by `due_date`                                                                                                                       |
| `getPermitWarnings(well, today?)`                                      | v2.3 permit warnings: validity order, `supersedes` chain, overlaps, 0–24 h range, monthly maxima, duplicates, missing identifiers, unmatched or dangling condition fulfillments.                                                                              |
| `parseDateDuration` / `addDateDuration` / `todayCalendarDate`          | ISO 8601 date-duration parsing and calendar-date arithmetic used by the permit helpers.                                                                                                                                                                       |
| `getRetractedProductionIds(well)` / `getEffectiveProduction(well)`     | v2.3 production ledger: ids retracted by `corrects` / the entries that count (order preserved).                                                                                                                                                               |
| `getCurrentMeters(well)`                                               | Meters without `removed_at`, newest `installed_at` first.                                                                                                                                                                                                     |
| `getMeterIntervals(well)`                                              | Volume (m³) between consecutive readings of each meter, with the rollover rule; `volume: null` when unknown. Never spans two meters.                                                                                                                          |
| `getProductionTotal(well)`                                             | `{ metered, estimated, total, reported, unknown_intervals }` (m³). Meters win over estimated volumes; reported volumes never enter `total`.                                                                                                                   |
| `getProductionByPeriod(well, 'day' \| 'month' \| 'year')`              | The same totals bucketed by local date (`YYYY`, `YYYY-MM`, `YYYY-MM-DD`), ascending. Intervals go whole to the date of their end.                                                                                                                             |
| `getCurrentRegime(well, at?)`                                          | The `operating_regime` entry in force at `at` (default now). `undefined` before the first one.                                                                                                                                                                |
| `getCurrentWellStatus(well)` / `getCurrentWellStatusEntry(well)`       | `status` of the latest `status_change` history log (`undefined` = unknown) / that log entry.                                                                                                                                                                  |
| `getOperationWarnings(well, today?)`                                   | v2.3 warnings for meters, production, operating regime, structured history logs and analyses citing retracted events.                                                                                                                                         |
| `getRetractedSampleIds` / `getEffectiveWaterSamples(well)`             | v2.3 `water_samples` ledger: ids retracted by `corrects` / the samples that count, sorted by `datetime`, `sequence`, file order.                                                                                                                              |
| `isResultUsable(result)`                                               | `false` for `validation.status: "rejected"`; such results are excluded from every water quality derivation.                                                                                                                                                   |
| `getLatestResult(well, code)`                                          | Most recent usable result of a parameter (`parameterKey`, CAS resolved) outside blanks, with its sample.                                                                                                                                                      |
| `getSampleDepth` / `isFormationWater(well, sample)`                    | Sample depth (point, interval, or pump `intake_depth`) / whether it lies inside a `well_screen` and below the static level of `static_level_event_id`.                                                                                                        |
| `getIonBalance(sample)`                                                | Cation and anion sums (meq/L) and charge-balance error (%).                                                                                                                                                                                                   |
| `getStiffValues` / `getPiperCoordinates(sample)`                       | Major-ion meq/L / Piper triangle meq % and diamond point.                                                                                                                                                                                                     |
| `getHydrochemicalFacies(sample)`                                       | Dominant cation and anion (> 50 meq %), else `mixed`.                                                                                                                                                                                                         |
| `getAcidDrainageIndicators(sample)`                                    | Net alkalinity (alkalinity − acidity, as CaCO₃) and sulfate/chloride ratio.                                                                                                                                                                                   |
| `getRelativePercentDifferences(well, sampleId)`                        | RPD per parameter between a duplicate/split and its `parent_sample_id`.                                                                                                                                                                                       |
| `getBlankContamination(well)`                                          | Substances detected in field, trip and equipment blanks (with `campaign`).                                                                                                                                                                                    |
| `getHoldingTimes` / `getReceivedTemperatureCompliance(s, maxC?)`       | Collection → analysis hours per result (day resolution honored) / receipt temperature ≤ `maxC` (6 °C).                                                                                                                                                        |
| `getPurgeStabilization(purge, criteria?, window?)`                     | Stabilization of `purge.readings` over the last `window` readings; `DEFAULT_PURGE_STABILIZATION_CRITERIA` from low-flow guidance.                                                                                                                             |
| `getExceedances(sample, limits)`                                       | Results outside a `LimitSet` / `Limit[]` from `@welldot/core` (turbidity comparability, censored values, presence limits).                                                                                                                                    |
| `getWaterSampleWarnings(well)`                                         | v2.3 `water_samples` validation warnings (codes + ids + `result_index`).                                                                                                                                                                                      |
| `getRetractedIds(entries)` / `instantLocalDate(instant)`               | Generic ledger helpers: ids retracted by `corrects` in any array / local calendar date of an RFC 3339 instant as written.                                                                                                                                     |
| `isFlowingArtesian(well)`                                              | Whether the most recent static level is above ground (negative). The v2.1 way to detect a flowing artesian well.                                                                                                                                              |
| `getCentralizerDepths(centralizer)`                                    | Individual centralizer depths (m) from `from`, `to`, and `spacing`. Only the endpoints when spacing is unknown.                                                                                                                                               |
| `getLatestAquiferAnalysisField(well, field)`                           | Value of `field` from the most recent `aquifer_analysis` entry that defines it. `undefined` if none.                                                                                                                                                          |
| `checkIfProfileIsEmpty(well)`                                          | Whether the well has any data worth rendering. Re-exported from `@welldot/core`.                                                                                                                                                                              |
| `formatNumber(value, options?)`                                        | Locale-aware display string with bounded fraction digits, so floating-point noise never reaches the UI. Returns `'—'` for `null`, `undefined`, or `NaN`.                                                                                                      |

`formatNumber` options: `fractionDigits`, `minimumFractionDigits`, `maximumFractionDigits`, `suffix`, `locale` (BCP 47, defaults `'en-US'`), and `fallback`.

```ts
formatNumber(39.99998784, { fractionDigits: 2, suffix: 'm' }); // "40.00 m"
formatNumber(1234.5, { locale: 'pt-BR', maximumFractionDigits: 1 }); // "1.234,5"
formatNumber(null); // "—"
```

### Operations (.well v2.3)

Production volumes follow the spec's normative derivation: readings of each meter are ordered by instant (then `sequence`), consecutive readings give `r₂ − r₁`, a decrease uses `max_reading` for rollover or is reported as unknown — never negative. A meter swap leaves the gap between the removal and installation readings unmetered. `estimated` (or method-less) declared volumes count only for the fraction of their period no meter interval covers; `reported` volumes are kept for comparison.

```ts
import { getProductionTotal, getCurrentWellStatus } from '@welldot/utils';

getProductionTotal(well); // → { metered: 133550, estimated: 0, total: 133550, reported: 0, unknown_intervals: 0 }
getCurrentWellStatus(well); // → 'active' (undefined when no status_change exists)
```

### Water quality (.well v2.3)

`water_samples` is a ledger: corrected reports are new samples with `corrects`, and results with `validation.status: "rejected"` are left out of every derivation. Limits are never stored in the file — pick a limit set from `@welldot/core` at display time.

```ts
import { WHO_GDWQ_2022 } from '@welldot/core';
import {
  getEffectiveWaterSamples,
  getExceedances,
  getHoldingTimes,
  getRelativePercentDifferences,
  isFormationWater,
} from '@welldot/utils';

const [sample] = getEffectiveWaterSamples(well);
getExceedances(sample, WHO_GDWQ_2022); // → [{ result_index, parameter, limit, kind: 'above_max' }, …]
getHoldingTimes(sample); // → [{ key: 'e_coli', hours: 9.67, resolution: 'instant', … }]
getRelativePercentDifferences(well, 'ws-2026-09-b'); // → [{ key: 'sulfate', rpd_pct: 3.46, … }]
isFormationWater(well, sample); // → true (inside a screen, below the static level)
```

## Contributing

Issues and pull requests are welcome — see [CONTRIBUTING.md](https://github.com/rafaeelneto/welldot/blob/main/CONTRIBUTING.md). The source lives in `packages/utils` within the [welldot monorepo](https://github.com/rafaeelneto/welldot).

## License

[Apache 2.0](./LICENSE)
