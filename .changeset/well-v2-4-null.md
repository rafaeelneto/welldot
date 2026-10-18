---
'@welldot/core': minor
---

`null` in optional fields is malformed in v2.4. `storativity` no longer accepts `null`; v2.3 files (`version: 2`) with `storativity: null` still parse, with the value dropped. `serializeWell` omits null members outside `x-` fields.
