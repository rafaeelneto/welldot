# packages/utils — @welldot/utils

Profile analysis utilities. Depends on `@welldot/core`. No UI or rendering dependencies.

## Purpose

Provides computational helpers for analyzing `.well` profiles: depth calculations, diameter extraction, gravel pack estimates, and other derived data. Used by `@welldot/render` and by apps.

## Source layout

```
src/
  index.ts              ← re-exports everything from profile, permit, operation, waterQuality, shared and number utils
  profile.utils.ts      ← profile analysis functions
  profile.utils.test.ts ← Vitest tests (comprehensive coverage)
  permit.utils.ts       ← v2.3 permits: calendar-date math, status, condition deadlines/fulfillments, history timeline, warnings
  permit.utils.test.ts  ← Vitest tests (spec examples included)
  operation.utils.ts    ← v2.3 meters, production ledger volumes, operating regime, well status, operation warnings
  operation.utils.test.ts ← Vitest tests (spec complete example golden test included)
  waterQuality.utils.ts ← v2.3 water_samples: ledger, sample depth, ion balance, Piper/Stiff, QA/QC, exceedances, warnings
  waterQuality.utils.test.ts ← Vitest tests (spec complete example golden test included)
  shared.utils.ts       ← getRetractedIds + instantLocalDate, shared by the modules above (avoids import cycles)
  number.utils.ts       ← formatNumber (locale-aware number display formatting)
  number.utils.test.ts  ← Vitest tests (comprehensive coverage)
```

## Key exports

| Function                                                               | Purpose                                                                                                   |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `getProfileLastItemsDepths(well)`                                      | Max depth per component array (lithology, fractures, bore_hole, etc.)                                     |
| `getProfileDiamValues(constructive)`                                   | All diameter values in a constructive section                                                             |
| `getConstructivePropertySummary(data, prop)`                           | Extract a named property from all constructive component arrays                                           |
| `calculateCylindricVolume(diameter, height)`                           | Cylinder volume (m³) from diameter (mm) and height (m)                                                    |
| `calculateHoleFillSegmentVolume(fill, well)`                           | Net annular volume (m³) of a single hole_fill segment                                                     |
| `calculateHoleFillVolume(type, well)`                                  | Total net volume (m³) of all hole_fill segments of a given type                                           |
| `calculateDrawdown(readingDepth, staticLevel)`                         | Drawdown s at a level reading (m)                                                                         |
| `calculateSpecificCapacity(flowRate, drawdown)`                        | Specific capacity Q/s (m²/h)                                                                              |
| `calculateUnitDrawdown(drawdown, flowRate)`                            | Unit drawdown s/Q (h/m²)                                                                                  |
| `calculateFormationLoss(jacobB, flowRate)`                             | Formation head loss via Jacob (m)                                                                         |
| `calculateWellLoss(jacobC, flowRate)`                                  | Well head loss via Jacob (m)                                                                              |
| `calculateHydraulicConductivity(transmissivity, aquiferThickness)`     | Hydraulic conductivity K (m/h)                                                                            |
| `getLatestStaticLevel(well)`                                           | Most recent static water level from non-retracted hydrodynamic events                                     |
| `getRetractedEventIds(well)` / `getEffectiveHydrodynamicEvents(well)`  | v2.3 ledger corrections: events retracted via `corrects` / the rest                                       |
| `getCurrentPump(well)`                                                 | Open `pump_installations` entry (v2.3)                                                                    |
| `getLatestPumpingDynamicLevel(well)`                                   | Latest dynamic level during pumping (events, then aquifer_analysis)                                       |
| `calculateSubmergence(well)`                                           | Current pump `intake_depth − dynamic_level` (m)                                                           |
| `getPumpServiceTime(well, serial, now?)`                               | Minutes in service across installations with the same serial                                              |
| `getPumpInstallationWarnings(well)`                                    | v2.3 pump_installations validation warnings (codes + ids)                                                 |
| `getPermitStatus(well, permit, today?)`                                | Stored admin status (`requested`, `suspended`…) else derived (`superseded`, `not_yet_valid`, `active`, …) |
| `getPermitEffectiveEnd(well, permit, today?)`                          | Day before successor start, else `valid_until`; none while renewing                                       |
| `getConditionDeadlines(well, permit, condition, opts?)`                | Normative condition deadline generation (anchored, month-end clamp)                                       |
| `getConditionDeadlineStates(well, permit, condition, opts?)`           | Deadlines + fulfilled/late/upcoming/overdue via condition `fulfillments`                                  |
| `getConditionFulfillments(condition)`                                  | A condition's `fulfillments`, oldest first                                                                |
| `isPermitGranted(permit)` / `getPermitIdentifier(permit)`              | Admin status absent/`granted` / `identifier` else `request_identifier`                                    |
| `getPermitHistory(permit)` / `getOverduePermitHistory(permit, today?)` | Admin `history` by date / steps past `due_date` and not `done`                                            |
| `getPermitTimeline(permit)`                                            | History steps + condition fulfillments, newest first                                                      |
| `getPermitWarnings(well, today?)`                                      | v2.3 permits, history and condition fulfillment validation warnings                                       |
| `parseDateDuration` / `addDateDuration` / `todayCalendarDate`          | ISO 8601 date-duration parsing and calendar-date arithmetic                                               |
| `getRetractedIds(entries)` / `instantLocalDate(instant)`               | Generic ledger retraction set / local date of an instant as written                                       |
| `getRetractedProductionIds(well)` / `getEffectiveProduction(well)`     | v2.3 production ledger: retracted ids / non-retracted entries                                             |
| `getCurrentMeters(well)`                                               | Open `meters` entries, newest installation first                                                          |
| `getMeterIntervals(well)`                                              | Normative per-meter interval volumes (rollover, unknown = `null`)                                         |
| `getProductionTotal(well)` / `getProductionByPeriod(well, period)`     | Metered + uncovered estimated volumes; reported kept apart (m³)                                           |
| `getCurrentRegime(well, at?)`                                          | `operating_regime` entry in force at an instant                                                           |
| `getCurrentWellStatus(well)` / `getCurrentWellStatusEntry(well)`       | Latest `status_change` status (undefined = unknown) / its log entry                                       |
| `getOperationWarnings(well, today?)`                                   | v2.3 meters/production/regime/history_logs/analysis warnings                                              |
| `getEffectiveWaterSamples(well)` / `getRetractedSampleIds(well)`       | v2.3 water_samples ledger (sorted) / ids retracted via `corrects`                                         |
| `getLatestResult(well, code)` / `isResultUsable(result)`               | Latest usable result by `parameterKey` / rejected-result filter                                           |
| `getSampleDepth(well, sample)` / `isFormationWater(well, sample)`      | Sample depth (pump intake aware) / inside screen + below static                                           |
| `getIonBalance` / `getStiffValues` / `getPiperCoordinates`             | Hydrochemistry from mg/L → meq/L (vocabulary molar mass)                                                  |
| `getHydrochemicalFacies(sample)`                                       | Dominant cation / anion (> 50 meq %), else `mixed`                                                        |
| `getRelativePercentDifferences(well, sampleId)`                        | RPD per parameter between duplicate/split and its parent                                                  |
| `getBlankContamination(well)`                                          | Substances detected in field/trip/equipment blanks                                                        |
| `getHoldingTimes(sample)` / `getReceivedTemperatureCompliance`         | Collection → analysis hours (day resolution) / receipt ≤ 6 °C                                             |
| `getPurgeStabilization(purge, criteria?, window?)`                     | Purge readings stabilized over the last `window` readings                                                 |
| `getAcidDrainageIndicators(sample)`                                    | Net alkalinity and sulfate/chloride ratio                                                                 |
| `getExceedances(sample, limits)`                                       | Results vs a core `LimitSet` (turbidity rule, censoring, presence)                                        |
| `getWaterSampleWarnings(well)`                                         | v2.3 water_samples validation warnings                                                                    |
| `isFlowingArtesian(well)`                                              | Latest static level is above ground (v2.1 artesian detection)                                             |
| `getCentralizerDepths(centralizer)`                                    | Individual centralizer depths from interval + spacing                                                     |
| `getLatestAquiferAnalysisField(well, field)`                           | Most recent value of a named field from aquifer_analysis                                                  |
| `formatNumber(value, options)`                                         | Locale-aware number display formatting (rounding, separators, suffix)                                     |

All profile-analysis functions operate on `Well` / `Constructive` types from `@welldot/core`. `formatNumber` is a pure display-formatting helper (no `.well` types involved) shared by `@welldot/render` and the apps so depth/diameter values are never shown as raw, unrounded floats. No side effects, no state.

## Commands

```bash
pnpm test       # vitest run
pnpm build      # tsup → dist/
pnpm dev        # tsup --watch
```

## Documentation requirements

`packages/utils/README.md` is the published package documentation; together with the JSDoc comments in `src/*.utils.ts` it is the public API reference — keep both accurate and in sync.

Update JSDoc when:

- A function's parameter types or return type changes (update `@param` / `@returns`)
- A function's behavior changes in a way that would surprise a caller
- A new exported function is added — it must have a JSDoc block before merging

Update `README.md` whenever a function is added to or removed from `src/index.ts`.

## Constraints

- Pure functions only — no state, no side effects.
- Do not add rendering, DOM, or framework dependencies.
- Every exported function must have a corresponding Vitest test.
