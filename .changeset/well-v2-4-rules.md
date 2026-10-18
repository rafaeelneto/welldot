---
'@welldot/core': minor
'@welldot/utils': minor
---

`.well` v2.4 ledger editing, repeated records, references and range rules.

- Ledger entries (`hydrodynamic_events`, `production`, `water_samples`) MAY be edited in place; editing is NOT RECOMMENDED after export. `corrects` stays the recommended way to correct measurements, and `Result.validation` is revalidated in place.
- `operating_regime[].daily_operating_time` above 24 is now accepted by the schema and stored as written. Derivations read it as 24 through the new `normalizeDailyOperatingTime`. A negative value is still a schema error.
- `operating_regime[].effective_from` is no longer unique; duplicates stay a warning (`regime_duplicate_effective_from`).
- Unresolved references are preserved on re-export, and repeated records (collective permits, campaign blanks) are documented.

**Breaking for consumers that switch on warning codes:**

- `PermitWarningCode` `daily_operating_time_out_of_range` is renamed to `daily_operating_time_normalized`. It now fires only for values above 24 (a negative value is a schema error).
- `PermitWarningCode` `fulfillment_reference_unresolved` is removed. A fulfillment `event_id` or `sample_id` may legitimately resolve only in another well's file.
- `OperationWarningCode` gains `daily_operating_time_normalized` (ids: the regime).
