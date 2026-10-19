---
'@welldot/core': minor
---

Implements the `.well` v2.4 format revision.

**Breaking for readers:** `.well` v2.4 files write `"version": "2.4"`. Parsers in `@welldot/core` ≤ 0.4.0 reject them; upgrade readers before writing v2.4 files.

- **Version as a string.** `serializeWell` writes `"version": "2.4"`. `parseWell` and `deserializeWell` accept `1`, `2` and any `"2.m"`, and reject malformed values (`2.4` as a number, `"2.4.1"`, `"v2.4"`) and unsupported majors with errors that name the value. Adds `WELL_FORMAT_VERSION`, `parseFormatVersion` and `compareFormatVersions` (versions compare as two integers, so `"2.10"` is greater than `"2.9"`).
- **`null` in optional fields is malformed.** `storativity` no longer accepts `null`; v2.3 files (`version: 2`) with `storativity: null` still parse, with the value dropped. `serializeWell` omits null members outside `x-` fields.
- **Time zone.** Adds `location.properties.timezone` (an IANA time zone name) and `isIanaTimeZone`. An invalid value is rejected.
- **`logger_series`.** Adds the hydrodynamic event type for continuous level series recorded by an installed sensor. It carries `readings` (each with a required `datetime` and no `elapsed`), plus optional `measurement_method`, `sensor_depth`, `interval`, `barometric_compensation` (`barologger`, `vented`, `none`) and `aggregation` (`none`, `hourly`, `daily`). Aggregated readings must carry `depth_min` and `depth_max`. A `logger_series` has no `steps` or `recovery`. New exports: `LoggerSeriesEvent`, `LoggerReading`, `BarometricCompensation`, `ReadingAggregation`, `LoggerSeriesEventSchema`, `LoggerReadingSchema`, and the closed vocabularies `BAROMETRIC_COMPENSATIONS` and `READING_AGGREGATIONS` with their `*_VALUES` lists. `HYDRODYNAMIC_EVENT_TYPES` gains `logger_series`. `LevelReading` gains an optional `datetime`.
- **Event validation.** Known hydrodynamic event types are now validated against their own schema instead of falling back to the `x-` passthrough. A malformed `constant_rate`, `spot_measurement` or other known type is rejected, while `x-` types still pass through. The step count is no longer enforced: `steps` must be an array of valid `PumpingStep`, but a `constant_rate` or `spot_measurement` with two steps is valid. As a result, the `ConstantRateEvent.steps` type changes from `[PumpingStep]` to `PumpingStep[]`.
- **Ledgers and range rules.** Ledger entries (`hydrodynamic_events`, `production`, `water_samples`) MAY be edited in place; editing is NOT RECOMMENDED after export, and `corrects` stays the recommended way to correct measurements. `operating_regime[].daily_operating_time` above 24 is now accepted and stored as written (a negative value is still a schema error). `operating_regime[].effective_from` is no longer unique. Unresolved references are preserved on re-export, and repeated records (collective permits, campaign blanks) are documented.
- The spec docs, the JSON Schema and the example wells move to v2.4.
