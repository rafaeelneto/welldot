---
'@welldot/core': minor
'@welldot/utils': minor
---

Add the `logger_series` hydrodynamic event type (v2.4) for continuous level series recorded by an installed sensor. It carries `readings` (each with a required `datetime` and no `elapsed`), plus optional `measurement_method`, `sensor_depth`, `interval`, `barometric_compensation` (`barologger`, `vented`, `none`) and `aggregation` (`none`, `hourly`, `daily`). Aggregated readings must carry `depth_min` and `depth_max`. A `logger_series` has no `steps` or `recovery`. New exports: `LoggerSeriesEvent`, `LoggerReading`, `BarometricCompensation`, `ReadingAggregation`, `LoggerSeriesEventSchema`, `LoggerReadingSchema`, and the closed vocabularies `BAROMETRIC_COMPENSATIONS` and `READING_AGGREGATIONS` with their `*_VALUES` lists. `HYDRODYNAMIC_EVENT_TYPES` gains `logger_series`. `LevelReading` gains an optional `datetime`.

Known hydrodynamic event types are now validated against their own schema instead of falling back to the `x-` passthrough. A malformed `constant_rate`, `spot_measurement` or other known type is rejected, while `x-` types still pass through. The step count is no longer enforced: `steps` must be an array of valid `PumpingStep`, but a `constant_rate` or `spot_measurement` with two steps is valid. As a result, the `ConstantRateEvent.steps` type changes from `[PumpingStep]` to `PumpingStep[]`.

In `@welldot/utils`, `getOperationWarnings` adds `analysis_uses_logger_series` (an analysis references a `logger_series` in `source_event_ids` or `static_level_source_id`) and `logger_reading_below_sensor` (a reading deeper than `sensor_depth`). Both apply to effective (non-retracted) events only.
