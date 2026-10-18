# @welldot/utils

## Overview

Profile analysis utilities for the [`.well` open format](https://github.com/rafaeelneto/welldot) — depth and diameter summaries, cylindrical and annular volumes, gravel pack estimates, and aquifer hydraulics. Part of the [welldot](https://github.com/rafaeelneto/welldot) open-source ecosystem.

These are pure functions over a parsed `Well` object. No DOM, no network, no side effects.

This README covers installation, units, and the API grouped by area: geometry and volumes, aquifer hydraulics, queries and formatting, display helpers, operations, water quality and the SIAGAS importer.

## Table of contents

- [Install](#install)
- [Quick start](#quick-start)
- [Units](#units)
- [API](#api)
  - [Geometry and volumes](#geometry-and-volumes)
  - [Aquifer hydraulics](#aquifer-hydraulics)
  - [Queries and formatting](#queries-and-formatting)
  - [Display helpers](#display-helpers)
  - [Operations (.well v2.3)](#operations-well-v23)
  - [Water quality (.well v2.3)](#water-quality-well-v23)
  - [Logger series import (.well v2.4)](#logger-series-import-well-v24)
  - [SIAGAS import (`@welldot/utils/siagas`)](#siagas-import-welldotutilssiagas)
- [Contributing](#contributing)
- [License](#license)

## Install

```bash
npm install @welldot/utils
```

`@welldot/core` is a dependency and provides the `Well` type these functions operate on. `date-fns` is a dependency of the date display helpers.

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

| Function                                                                                                                 | Returns                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `getLatestStaticLevel(well)`                                                                                             | Static water level (m) from the most recent non-retracted hydrodynamic event carrying one, compared by UTC datetime. `undefined` if none.                                                                                                                                                                                                                                |
| `getRetractedEventIds(well)`                                                                                             | Ids of hydrodynamic events retracted by another event's `corrects` (v2.3 ledger corrections).                                                                                                                                                                                                                                                                            |
| `getEffectiveHydrodynamicEvents(well)`                                                                                   | Hydrodynamic events that count for derivations — every event not retracted by `corrects`.                                                                                                                                                                                                                                                                                |
| `getCurrentPump(well)`                                                                                                   | The `pump_installations` entry without `removed_at` (latest installed if several). `undefined` if none.                                                                                                                                                                                                                                                                  |
| `getPumpInstalledAt(well, instant)`                                                                                      | The `pump_installations` entry in place at `instant` (`installed_at` ≤ instant < `removed_at`; latest installed if several). `undefined` if none.                                                                                                                                                                                                                        |
| `getLatestPumpingDynamicLevel(well)`                                                                                     | Most recent water level (m) measured during pumping, falling back to a newer `aquifer_analysis[].dynamic_level`. Airlift and retracted events ignored.                                                                                                                                                                                                                   |
| `calculateSubmergence(well)`                                                                                             | `intake_depth − dynamic_level` (m) of the current pump. Negative when the intake is above the water level.                                                                                                                                                                                                                                                               |
| `getPumpServiceTime(well, serial, now?)`                                                                                 | Total time in service (min) of installations sharing a `serial`; open installations count up to `now`.                                                                                                                                                                                                                                                                   |
| `getPumpInstallationWarnings(well)`                                                                                      | v2.3 pump warnings: intake below the well bottom or inside a screen, several open installations, `removed_at` not after `installed_at`.                                                                                                                                                                                                                                  |
| `getPermitStatus(well, permit, today?)`                                                                                  | v2.3 permit status: a stored administrative `status` other than `granted` (`requested`, `suspended`, `revoked`, `denied`, `withdrawn`), else derived `superseded`, `not_yet_valid`, `active`, `active_pending_renewal` or `expired`, on a local calendar date                                                                                                            |
| `getPermitEffectiveEnd(well, permit, today?)`                                                                            | Day before the successor's start date, else `valid_until`; `undefined` while a renewal is pending or with no fixed expiry.                                                                                                                                                                                                                                               |
| `getConditionDeadlines(well, permit, condition, opts?)`                                                                  | A condition's deadlines (`YYYY-MM-DD`), computed from the anchor with month-end clamping; stops at `occurrences`, `last_due`, the effective end or a horizon; none for a never-granted permit, none after today for a suspended/revoked one.                                                                                                                             |
| `getConditionFulfillments(condition)`                                                                                    | A condition's `fulfillments`, oldest first.                                                                                                                                                                                                                                                                                                                              |
| `isPermitGranted(permit)` / `getPermitIdentifier(permit)`                                                                | Administrative status absent or `granted` / `identifier`, else `request_identifier`.                                                                                                                                                                                                                                                                                     |
| `getPermitHistory(permit)` / `getOverduePermitHistory(permit, today?)`                                                   | Administrative `history` sorted by date / steps past `due_date` and not `done`.                                                                                                                                                                                                                                                                                          |
| `getPermitTimeline(permit, timeZone?)`                                                                                   | `history` steps and condition fulfillments merged, newest first, by local date.                                                                                                                                                                                                                                                                                          |
| `getConditionDeadlineStates(well, permit, condition, opts?)`                                                             | Each deadline with `fulfilled`, `fulfilled_late`, `upcoming` or `overdue`, matched against the condition's `fulfillments` by `due_date`                                                                                                                                                                                                                                  |
| `getPermitWarnings(well, today?)`                                                                                        | v2.3 permit warnings: validity order, `supersedes` chain, overlaps, `daily_operating_time` above 24 h (normalized to 24), monthly maxima, duplicates, missing identifiers, unmatched condition fulfillments, and (v2.4) `missing_timezone` when permits have condition fulfillments and `location.properties.timezone` is absent, and `daily_operating_time_normalized`. |
| `parseDateDuration` / `addDateDuration` / `todayCalendarDate`                                                            | ISO 8601 date-duration parsing and calendar-date arithmetic used by the permit helpers.                                                                                                                                                                                                                                                                                  |
| `getRetractedProductionIds(well)` / `getEffectiveProduction(well)`                                                       | v2.3 production ledger: ids retracted by `corrects` / the entries that count (order preserved).                                                                                                                                                                                                                                                                          |
| `getCurrentMeters(well)`                                                                                                 | Meters without `removed_at`, newest `installed_at` first.                                                                                                                                                                                                                                                                                                                |
| `getMeterIntervals(well)`                                                                                                | Volume (m³) between consecutive readings of each meter, with the rollover rule; `volume: null` when unknown. Never spans two meters.                                                                                                                                                                                                                                     |
| `getProductionTotal(well)`                                                                                               | `{ metered, estimated, total, unknown_intervals }` (m³). Meters win over estimated volumes.                                                                                                                                                                                                                                                                              |
| `getProductionByPeriod(well, 'day' \| 'month' \| 'year')`                                                                | The same totals bucketed by local date (`YYYY`, `YYYY-MM`, `YYYY-MM-DD`), ascending. Volumes are prorated by time across period boundaries; the buckets add up to the total.                                                                                                                                                                                             |
| `getCurrentRegime(well, at?)`                                                                                            | The `operating_regime` entry in force at `at` (default now). `undefined` before the first one.                                                                                                                                                                                                                                                                           |
| `getCurrentWellStatus(well)` / `getCurrentWellStatusEntry(well)`                                                         | `status` of the latest `status_change` history log (`undefined` = unknown) / that log entry.                                                                                                                                                                                                                                                                             |
| `getOperationWarnings(well, today?)`                                                                                     | v2.3 warnings for meters, production, operating regime, structured history logs and analyses citing retracted events; v2.4 `analysis_uses_logger_series` (analyses citing a `logger_series`) and `logger_reading_below_sensor` (readings deeper than `sensor_depth`).                                                                                                    |
| `getRetractedSampleIds` / `getEffectiveWaterSamples(well)`                                                               | v2.3 `water_samples` ledger: ids retracted by `corrects` / the samples that count, sorted by `datetime`, `sequence`, file order.                                                                                                                                                                                                                                         |
| `isResultUsable(result)`                                                                                                 | `false` for `validation.status: "rejected"`; such results are excluded from every water quality derivation.                                                                                                                                                                                                                                                              |
| `getLatestResult(well, code)`                                                                                            | Most recent usable result of a parameter (`parameterKey`, CAS resolved) outside blanks, with its sample.                                                                                                                                                                                                                                                                 |
| `getSampleDepth` / `isFormationWater(well, sample)`                                                                      | Sample depth (point, interval, or pump `intake_depth`) / whether it lies inside a `well_screen` and below the static level of `static_level_event_id`.                                                                                                                                                                                                                   |
| `getIonBalance(sample)`                                                                                                  | Cation and anion sums (meq/L) and charge-balance error (%).                                                                                                                                                                                                                                                                                                              |
| `getStiffValues` / `getPiperCoordinates(sample)`                                                                         | Major-ion meq/L / Piper triangle meq % and diamond point.                                                                                                                                                                                                                                                                                                                |
| `getHydrochemicalFacies(sample)`                                                                                         | Dominant cation and anion (> 50 meq %), else `mixed`.                                                                                                                                                                                                                                                                                                                    |
| `getAcidDrainageIndicators(sample)`                                                                                      | Net alkalinity (alkalinity − acidity, as CaCO₃) and sulfate/chloride ratio.                                                                                                                                                                                                                                                                                              |
| `getRelativePercentDifferences(well, sampleId)`                                                                          | RPD per parameter between a duplicate/split and its `parent_sample_id`.                                                                                                                                                                                                                                                                                                  |
| `getBlankContamination(well)`                                                                                            | Substances detected in field, trip and equipment blanks (with `campaign`).                                                                                                                                                                                                                                                                                               |
| `getHoldingTimes` / `getReceivedTemperatureCompliance(s, maxC?)`                                                         | Collection → analysis hours per result (day resolution honored) / receipt temperature ≤ `maxC` (6 °C).                                                                                                                                                                                                                                                                   |
| `getPurgeStabilization(purge, criteria?, window?)`                                                                       | Stabilization of `purge.readings` over the last `window` readings; `DEFAULT_PURGE_STABILIZATION_CRITERIA` from low-flow guidance.                                                                                                                                                                                                                                        |
| `getExceedances(sample, limits)`                                                                                         | Results outside a `LimitSet` / `Limit[]` from `@welldot/core` (turbidity comparability, censored values, presence limits).                                                                                                                                                                                                                                               |
| `getWaterSampleWarnings(well)`                                                                                           | v2.3 `water_samples` validation warnings (codes + ids + `result_index`).                                                                                                                                                                                                                                                                                                 |
| `getRetractedIds(entries)` / `instantLocalDate(instant, timeZone?)` / `getWellTimeZone(well)` / `instantOffset(instant)` | Generic ledger helpers: ids retracted by `corrects` in any array / local calendar date (converted to `timeZone` when given, v2.4) / well time zone / UTC offset of an RFC 3339 instant. `normalizeDailyOperatingTime(hours)` reads a `daily_operating_time` for a derivation (above 24 counts as 24, v2.4); the stored value is never rewritten.                         |
| `isFlowingArtesian(well)`                                                                                                | Whether the most recent static level is above ground (negative). The v2.1 way to detect a flowing artesian well.                                                                                                                                                                                                                                                         |
| `getCentralizerDepths(centralizer)`                                                                                      | Individual centralizer depths (m) from `from`, `to`, and `spacing`. Only the endpoints when spacing is unknown.                                                                                                                                                                                                                                                          |
| `getLatestAquiferAnalysisField(well, field)`                                                                             | Value of `field` from the most recent `aquifer_analysis` entry that defines it. `undefined` if none.                                                                                                                                                                                                                                                                     |
| `checkIfProfileIsEmpty(well)`                                                                                            | Whether the well has any data worth rendering. Re-exported from `@welldot/core`.                                                                                                                                                                                                                                                                                         |
| `formatNumber(value, options?)`                                                                                          | Locale-aware display string with bounded fraction digits, so floating-point noise never reaches the UI. Returns `'—'` for `null`, `undefined`, or `NaN`.                                                                                                                                                                                                                 |

`formatNumber` options: `fractionDigits`, `minimumFractionDigits`, `maximumFractionDigits`, `suffix`, `locale` (BCP 47, defaults `'en-US'`), and `fallback`.

```ts
formatNumber(39.99998784, { fractionDigits: 2, suffix: 'm' }); // "40.00 m"
formatNumber(1234.5, { locale: 'pt-BR', maximumFractionDigits: 1 }); // "1.234,5"
formatNumber(null); // "—"
```

### Display helpers

Framework-free formatting shared by the profiler app and `@welldot/pdf`. Anything that needs translated words takes them as plain strings, so callers keep their own message catalogs.

| Function                                                                | Returns                                                                                                                                                                      |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `formatDate(date, format?)`                                             | `Date` or date string with a date-fns pattern (default `dd/MM/yyyy HH:mm`); `''` when missing or invalid.                                                                    |
| `toCalendarDate(date)` / `fromCalendarDate(value)`                      | Local `Date` ↔ .well calendar date (`YYYY-MM-DD`), never through UTC; `null` for malformed input.                                                                            |
| `formatCalendarDate(value, format?)`                                    | A .well calendar date displayed with a pattern (default `dd/MM/yyyy`), no time-zone shift.                                                                                   |
| `formatCoord(dd, 'DD' \| 'DMS', isLat)` / `ddToDms(dd, isLat)`          | 6-decimal degrees or `DD°MM'SS.ss"H`.                                                                                                                                        |
| `parseToDd(input)` / `clampLat(lat)` / `clampLng(lng)`                  | Decimal degrees from DD or DMS text (`NaN` if invalid) / range clamping.                                                                                                     |
| `resolveDiameterUnitLabel(unit, locale)`                                | `mm`, or `"` (Portuguese) / `in.` for inches.                                                                                                                                |
| `resolveFlowUnitLabel(unit)` / `resolveVolumeUnitLabel(unit)`           | Display symbols of storage tokens (`m3/h` → `m³/h`, `ft3` → `ft³`).                                                                                                          |
| `lastReading(event)` / `allStepReadings(event)` / `stepRate(event, i?)` | Last step reading, every step reading, or a step's rate of a hydrodynamic event.                                                                                             |
| `recoveryReadingsCount(event)`                                          | Number of recovery readings (`0` without a recovery block).                                                                                                                  |
| `stepHasReadings(readings)` / `derivedStepDuration(readings)`           | Whether a step has complete readings / its duration from the largest complete `elapsed`.                                                                                     |
| `pumpingTimeline(event)`                                                | Every step and recovery reading on one test clock (step N+1 starts at step N's `duration`, else its last reading; recovery at pump stop), with drawdown from `static_level`. |
| `semilogDrawdownSeries` / `theisRecoverySeries` / `stepTestSeries`      | Series of the drawdown vs log time, Theis recovery (t/t′) and step-test (s/Q vs Q) plots.                                                                                    |
| `availablePumpingCharts(event)`                                         | Which of `hydrograph`, `semilog`, `recovery`, `stepTest` the event has enough data for.                                                                                      |
| `permitLabel(permit, fallback?)` / `getActivePermit(well, today?)`      | `authority identifier` / the active permit with the latest start (production compliance).                                                                                    |
| `formatMeterLabel(meter, { locale, untypedLabel, dateFormat? })`        | `Electromagnetic · S/N 123 · 01/02/2024`.                                                                                                                                    |
| `parameterUnitSymbol(result)`                                           | Vocabulary unit, `mg/L` for unmapped CAS numbers, else the result's `unit`.                                                                                                  |
| `formatWaterQualityResult(result, labels, formatNumber?)`               | `< 0.001`, `0.004 (est.)`, the not-detected/present/absent label, or the text.                                                                                               |
| `PERMIT_STATUSES` / `CONDITION_DEADLINE_STATUSES`                       | en/pt-labeled vocabularies of the statuses `getPermitStatus` / `getConditionDeadlineStates` return.                                                                          |

### Operations (.well v2.3)

Production volumes follow the spec's normative derivation: readings of each meter are ordered by instant (then `sequence`), consecutive readings give `r₂ − r₁`, a decrease uses `max_reading` for rollover or is reported as unknown — never negative. A meter swap leaves the gap between the removal and installation readings unmetered. `estimated_volume` entries count only for the fraction of their period no meter interval covers; their `method` is descriptive and plays no part.

```ts
import { getProductionTotal, getCurrentWellStatus } from '@welldot/utils';

getProductionTotal(well); // → { metered: 133550, estimated: 0, total: 133550, unknown_intervals: 0 }
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

### Logger series import (.well v2.4)

Helpers to turn a datalogger export (CSV, semicolon or tab separated) into `logger_series` readings. There are no vendor-specific parsers: the caller maps columns.

```ts
import {
  parseDelimitedText,
  buildLoggerReadings,
  mergeLoggerReadings,
} from '@welldot/utils';

const { rows } = parseDelimitedText(text);
const { readings, skipped } = buildLoggerReadings(rows, {
  headerRows: 1,
  dateColumn: 0,
  timeColumn: 1,
  valueColumn: 2,
  valueKind: 'water_column', // or 'depth'
  sensorDepth: 42, // depth = sensorDepth - value
  dateFormat: 'dmy',
  timeZone: 'America/Belem', // else `offset: '-03:00'`
});
const { readings: merged } = mergeLoggerReadings(
  event.readings,
  readings,
  'append',
);
```

| Function                                        | Description                                                                                                                             |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `parseDelimitedText(text)`                      | Detects `,` `;` or tab and parses RFC 4180 quoting; drops empty lines.                                                                  |
| `buildLoggerReadings(rows, mapping)`            | Rows to `LoggerReading[]` plus `skipped` rows (`invalid_date`, `invalid_value`, `missing_sensor_depth`, `missing_offset`) by row index. |
| `localDateTimeToInstant(local, timeZone)`       | `YYYY-MM-DDTHH:mm[:ss]` in an IANA zone to an RFC 3339 instant with the offset in force then; `undefined` for an invalid zone.          |
| `mergeLoggerReadings(existing, incoming, mode)` | Merges by instant (incoming wins), sorted; `replaced` counts overwritten (append) or dropped (replace) readings.                        |
| `inferLoggerInterval(readings)`                 | Median spacing in minutes, rounded to 0.1; `undefined` under two readings.                                                              |
| `downsampleLoggerReadings(readings, maxPoints)` | At most `maxPoints` readings keeping first, last and per-bucket min and max depth, for plotting.                                        |

### SIAGAS import (`@welldot/utils/siagas`)

Imports a well from [SIAGAS](https://siagasweb.sgb.gov.br), the groundwater registry of the Geological Survey of Brazil (SGB), and, for monitoring wells, the level series and photos of its network RIMAS. Unlike the rest of the package, `importSiagasWell` does network I/O (the global `fetch`, or one you pass). The SGB pages send no CORS headers, so call it from a server.

```ts
import { importSiagasWell, SiagasError } from '@welldot/utils/siagas';

const { json, well, warnings } = await importSiagasWell('3100020782', {
  rimas: 'monthly', // 'none' | 'monthly' (last reading of each month) | 'all'
  media: true, // RIMAS photos and documents as root attachments
});
warnings.map(w => w.message.pt); // what could not be carried over, or needed a decision
```

The conversion is faithful: nothing is invented, exact duplicate rows are dropped and everything else (overlaps, mismatches) stays as recorded and becomes a warning. The page as read is kept in `x-siagas.record`. SIAGAS writes `0` for "no data", so zeros are interpreted per field (a layer starting at 0 m is real, a ground elevation of 0 is not); negative concentrations become `qualifier: "<"`, and "Surgência: S" turns the static level negative. The steps are also exported on their own: `parseSiagasPage(html)`, `parseRimasPage(html)` and `siagasToWell(record, options)`. `importSiagasWell` throws a `SiagasError` whose `kind` is `invalid_code`, `not_found`, `upstream`, `parse` or `conversion`.

## Contributing

Issues and pull requests are welcome — see [CONTRIBUTING.md](https://github.com/rafaeelneto/welldot/blob/main/CONTRIBUTING.md). The source lives in `packages/utils` within the [welldot monorepo](https://github.com/rafaeelneto/welldot).

## License

[Apache 2.0](./LICENSE)
