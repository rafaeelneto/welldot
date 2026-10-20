---
'@welldot/core': minor
---

The `.well` specification moved from `packages/core/docs/` to `spec/` at the repository root, and the spec prose no longer ships in the npm package. The JSON Schema's `$id` is now `https://welldot.org/schema/v2/well.schema.json` (served by welldot.org); the old `raw.githubusercontent.com/.../packages/core/docs/schema/v2/well.schema.json` URL no longer resolves. The schema ships in the package as `@welldot/core/well.schema.json`.
