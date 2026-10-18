# @welldot/render

## 0.4.0

### Minor Changes

- Render the `.well` v2.3 pump installations and attachments.
- Draw pipes open and close them only where they end.
- Draw the cement pad at a fixed size.
- Support the `well_screen` slot types.
- Clear the drawing when the well becomes empty.
- Guard against missing fracture dip and azimuth.
- Add compact and detailed profile formats for PDF export.

## 0.3.0

### Minor Changes

- Draw centralizer bow marks for `.well` v2.1.

## 0.2.3

### Patch Changes

- Polish open-source docs, licensing and schema tooling.

## 0.2.2

### Patch Changes

- Version bump released together with `@welldot/core` and `@welldot/utils`.

## 0.2.1

### Patch Changes

- Add en/pt locale resolution for all renderer-drawn text.
- Wire the locale into number formatting.

## 0.2.0

### Minor Changes

- Align with the `.well` v2 schema (texture, screen slot, version guard) and support v2 only.
- Add `RenderableWell` with optional stable ids and enter/exit transitions.
- Add stable D3 key functions for data-join renderers.
- Add reduction construction element rendering.
- Move the construction labels group after the other construction layers.
- Rename `WithId`/`id` to `WithKey`/`key`.

## 0.1.0

### Minor Changes

- Initial release.
