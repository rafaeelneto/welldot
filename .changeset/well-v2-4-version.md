---
'@welldot/core': minor
'@welldot/utils': minor
'@welldot/render': patch
---

**Breaking for readers:** `.well` v2.4 files write `"version": "2.4"`. Parsers in `@welldot/core` ≤ 0.4.0 reject them; upgrade readers before writing v2.4 files. Adds `WELL_FORMAT_VERSION`, `parseFormatVersion` and `compareFormatVersions`.
