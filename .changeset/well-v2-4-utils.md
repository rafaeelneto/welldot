---
'@welldot/utils': minor
---

Supports the `.well` v2.4 format revision.

- **Time zone.** `instantLocalDate(instant, timeZone?)` converts an instant to the well's zone. Fulfillment lateness, `getPermitTimeline(permit, timeZone?)` and the regime-in-force check use it through the new `getWellTimeZone(well)`. `getPermitWarnings` adds `missing_timezone` for files whose permits have condition fulfillments but no `timezone`.
- **`logger_series`.** `getOperationWarnings` adds `analysis_uses_logger_series` (an analysis references a `logger_series` in `source_event_ids` or `static_level_source_id`) and `logger_reading_below_sensor` (a reading deeper than `sensor_depth`). Both apply to effective (non-retracted) events only.
- **Logger import helpers.** Adds `parseDelimitedText`, `buildLoggerReadings` (column mapping, water column to depth), `localDateTimeToInstant` (local time to instant by IANA zone), `mergeLoggerReadings`, `inferLoggerInterval` and `downsampleLoggerReadings`.
- **Daily operating time.** Derivations read `daily_operating_time` above 24 as 24 through the new `normalizeDailyOperatingTime`.
- The SIAGAS importer writes `"version": "2.4"`.

**Breaking for consumers that switch on warning codes:**

- `PermitWarningCode` `daily_operating_time_out_of_range` is renamed to `daily_operating_time_normalized`. It now fires only for values above 24 (a negative value is a schema error).
- `PermitWarningCode` `fulfillment_reference_unresolved` is removed. A fulfillment `event_id` or `sample_id` may legitimately resolve only in another well's file.
- `OperationWarningCode` gains `daily_operating_time_normalized` (ids: the regime).
