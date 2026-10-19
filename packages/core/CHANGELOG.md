# @welldot/core

## 0.4.0

### Minor Changes

- Implement `.well` spec v2.3: pump installations and attachments, permits (history and condition fulfillments), meters, production and operating regime, and the water quality block.
- Link multiple events and samples to any history log entry, and drop the `change_of_use` history category in favor of `event`.
- Add `installed_by` and `removed_by` to pump installations and meters, and manufacturer, model and attachments to meters.
- Rename the permit condition category values to broader groups.
- Add `well_screen[].type` slot types.
- Centralize the open vocabularies with en/pt labels, and move shared helpers into the library.
- Add example wells.
- Allow hiding individual fields when sharing.
- Keep `x-` fields and blocks through parse and serialize.
- Breaking: replace the production `declared_volume` with `estimated_volume`.
- Breaking: remove the `purpose` field from meters and `declared_volume`.

## 0.3.0

### Minor Changes

- Add `.well` spec v2.1: `well_purpose` and centralizers.

## 0.2.3

### Patch Changes

- Polish open-source docs, licensing and schema tooling.

## 0.2.2

### Patch Changes

- Version bump released together with `@welldot/utils` and `@welldot/render`.

## 0.2.1

### Patch Changes

- Add the optional `well_depth` field for the current or usable well depth.
- Add section visibility types and the `redactWell` utility.

## 0.2.0

### Minor Changes

- Implement the `.well` v2 schema with hydrodynamic events, units utilities and a v1 to v2 migration. Spec v2.0 is ratified and ships with this release.
- Add a pending flag to textures, FGDC texture pattern types and options.
- Add max flow rate and more steps to airlift tests.

## 0.1.1-5

### Patch Changes

- Add the pending flag to textures and filter unavailable options.
- Add FGDC texture pattern types and options.
- Fix the package exports.

## 0.1.1-4

### Patch Changes

- Pre-release of the 0.1.1 version bump.

## 0.1.1-3

### Patch Changes

- Pre-release of the 0.1.1 version bump.

## 0.1.1-2

### Patch Changes

- Pre-release of the 0.1.1 version bump.

## 0.1.1

### Patch Changes

- Bump the package version.

## 0.1.0

### Minor Changes

- Initial release.
