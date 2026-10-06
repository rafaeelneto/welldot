# packages/utils — @welldot/utils

Profile analysis utilities. Depends on `@welldot/core`. No UI or rendering dependencies.

## Purpose

Provides computational helpers for analyzing `.well` profiles: depth calculations, diameter extraction, gravel pack estimates, and other derived data. Used by `@welldot/render` and by apps.

## Source layout

```
src/
  index.ts              ← re-exports everything from profile.utils.ts, permit.utils.ts and number.utils.ts
  profile.utils.ts      ← profile analysis functions
  profile.utils.test.ts ← Vitest tests (comprehensive coverage)
  permit.utils.ts       ← v2.3 permits: calendar-date math, status, condition deadlines, warnings
  permit.utils.test.ts  ← Vitest tests (spec examples included)
  number.utils.ts       ← formatNumber (locale-aware number display formatting)
  number.utils.test.ts  ← Vitest tests (comprehensive coverage)
```

## Key exports

| Function                                                              | Purpose                                                               |
| --------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `getProfileLastItemsDepths(well)`                                     | Max depth per component array (lithology, fractures, bore_hole, etc.) |
| `getProfileDiamValues(constructive)`                                  | All diameter values in a constructive section                         |
| `getConstructivePropertySummary(data, prop)`                          | Extract a named property from all constructive component arrays       |
| `calculateCylindricVolume(diameter, height)`                          | Cylinder volume (m³) from diameter (mm) and height (m)                |
| `calculateHoleFillSegmentVolume(fill, well)`                          | Net annular volume (m³) of a single hole_fill segment                 |
| `calculateHoleFillVolume(type, well)`                                 | Total net volume (m³) of all hole_fill segments of a given type       |
| `calculateDrawdown(readingDepth, staticLevel)`                        | Drawdown s at a level reading (m)                                     |
| `calculateSpecificCapacity(flowRate, drawdown)`                       | Specific capacity Q/s (m²/h)                                          |
| `calculateUnitDrawdown(drawdown, flowRate)`                           | Unit drawdown s/Q (h/m²)                                              |
| `calculateFormationLoss(jacobB, flowRate)`                            | Formation head loss via Jacob (m)                                     |
| `calculateWellLoss(jacobC, flowRate)`                                 | Well head loss via Jacob (m)                                          |
| `calculateHydraulicConductivity(transmissivity, aquiferThickness)`    | Hydraulic conductivity K (m/h)                                        |
| `getLatestStaticLevel(well)`                                          | Most recent static water level from non-retracted hydrodynamic events |
| `getRetractedEventIds(well)` / `getEffectiveHydrodynamicEvents(well)` | v2.3 ledger corrections: events retracted via `corrects` / the rest   |
| `getCurrentPump(well)`                                                | Open `pump_installations` entry (v2.3)                                |
| `getLatestPumpingDynamicLevel(well)`                                  | Latest dynamic level during pumping (events, then aquifer_analysis)   |
| `calculateSubmergence(well)`                                          | Current pump `intake_depth − dynamic_level` (m)                       |
| `getPumpServiceTime(well, serial, now?)`                              | Minutes in service across installations with the same serial          |
| `getPumpInstallationWarnings(well)`                                   | v2.3 pump_installations validation warnings (codes + ids)             |
| `getPermitStatus(well, permit, today?)`                               | v2.3 derived permit status (`superseded`, `pending`, `active`, …)     |
| `getPermitEffectiveEnd(well, permit, today?)`                         | Day before successor start, else `valid_until`; none while renewing   |
| `getConditionDeadlines(well, permit, condition, opts?)`               | Normative condition deadline generation (anchored, month-end clamp)   |
| `getConditionDeadlineStates(well, permit, condition, opts?)`          | Deadlines + fulfilled/late/upcoming/overdue via `permit_condition`    |
| `getPermitWarnings(well, today?)`                                     | v2.3 permits + `permit_condition` log validation warnings             |
| `parseDateDuration` / `addDateDuration` / `todayCalendarDate`         | ISO 8601 date-duration parsing and calendar-date arithmetic           |
| `isFlowingArtesian(well)`                                             | Latest static level is above ground (v2.1 artesian detection)         |
| `getCentralizerDepths(centralizer)`                                   | Individual centralizer depths from interval + spacing                 |
| `getLatestAquiferAnalysisField(well, field)`                          | Most recent value of a named field from aquifer_analysis              |
| `formatNumber(value, options)`                                        | Locale-aware number display formatting (rounding, separators, suffix) |

All profile-analysis functions operate on `Well` / `Constructive` types from `@welldot/core`. `formatNumber` is a pure display-formatting helper (no `.well` types involved) shared by `@welldot/render` and the apps so depth/diameter values are never shown as raw, unrounded floats. No side effects, no state.

## Commands

```bash
pnpm test       # vitest run
pnpm build      # tsup → dist/
pnpm dev        # tsup --watch
```

## Documentation requirements

`packages/utils` has no README today. If one is added, it must be kept in sync. Until then, the `src/profile.utils.ts` and `src/permit.utils.ts` JSDoc comments **are** the public documentation — keep them accurate.

Update JSDoc when:

- A function's parameter types or return type changes (update `@param` / `@returns`)
- A function's behavior changes in a way that would surprise a caller
- A new exported function is added — it must have a JSDoc block before merging

If a `README.md` is added to this package, update it whenever a function is added to or removed from `src/index.ts`.

## Constraints

- Pure functions only — no state, no side effects.
- Do not add rendering, DOM, or framework dependencies.
- Every exported function must have a corresponding Vitest test.
