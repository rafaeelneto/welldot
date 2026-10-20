# `.well` specification

This folder holds the normative specification of the `.well` format, an open JSON format for water well data. It is the standard itself and doesn't depend on any implementation: `@welldot/core`, the welldot.org editor and any third-party tool follow it.

## Contents

| Folder       | What it holds                                                                                                     |
| ------------ | ----------------------------------------------------------------------------------------------------------------- |
| `v2/`        | The current specification (revision 2.4): [overview](v2/overview.md), [format reference](v2/format-reference.md), [object schemas](v2/object-schemas.md), [water quality](v2/water-quality.md), [interoperability](v2/interoperability.md) |
| `v1/`        | Version 1, stable and kept for reference: [well-format.md](v1/well-format.md)                                    |
| `reference/` | Supporting references, such as the [FGDC texture codes](reference/fgdc-textures.md)                              |
| `schema/`    | The JSON Schema, published at `https://welldot.org/schema/v2/well.schema.json`                                    |
| `profiles/`  | Reserved for regional or regulatory profiles                                                                      |

Each document's header states the revision it describes. The "Changes in v2.x" sections of [`v2/overview.md`](v2/overview.md) are the format's changelog.

## Rules for this folder

- **Plain Markdown only.** Files here must read correctly on GitHub, with no site-specific components or syntax. Documentation sites render these files; they don't own them.
- **`schema/` is generated.** `pnpm --filter=@welldot/core generate:schema` writes it from the Zod validators in `packages/core`. Never hand-edit it. CI fails when it is stale.
- **When to update each file** is described in [`packages/core/CLAUDE.md`](../packages/core/CLAUDE.md). Format changes start with an issue, see [CONTRIBUTING.md](../CONTRIBUTING.md).
