---
'@welldot/core': minor
'@welldot/utils': minor
---

Add `location.properties.timezone` (an IANA time zone name, v2.4) and `isIanaTimeZone`. An invalid value is rejected. In `@welldot/utils`, `instantLocalDate(instant, timeZone?)` converts an instant to the well's zone, and fulfillment lateness, `getPermitTimeline(permit, timeZone?)` and the regime-in-force check use it through the new `getWellTimeZone(well)`. `getPermitWarnings` adds `missing_timezone` for files whose permits have condition fulfillments but no `timezone`.
