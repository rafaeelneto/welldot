# Contributing to welldot

Thanks for your interest. This project has two distinct kinds of contribution, and they work differently:

- **The `.well` format** — an open specification other people implement. Changes here affect every tool that reads or writes `.well` files, so they go through discussion first.
- **The code** — the three libraries and the web app. Ordinary pull requests.

Both are welcome. Bug reports and questions are too — open an issue.

---

## Getting set up

Requirements: **Node ≥ 18** and **pnpm 10.22.0** (the version is pinned in `packageManager`; `corepack enable` will pick it up automatically).

```bash
git clone https://github.com/rafaeelneto/welldot.git
cd welldot
pnpm install
pnpm dev
```

`pnpm dev` starts every workspace at once:

| Workspace            | What runs                       | Where                 |
| -------------------- | ------------------------------- | --------------------- |
| `apps/profiler`      | `nuxt dev` — the active app     | http://localhost:3000 |
| `apps/well-profiler` | `next dev` — deprecated, frozen | http://localhost:5000 |
| `packages/*`         | `tsup --watch`                  | —                     |

To run only the active app: `pnpm turbo dev --filter=profiler`.

Before opening a pull request:

```bash
pnpm test     # must pass
pnpm lint     # must be error-free (warnings are tolerated)
pnpm build    # must succeed
```

If `pnpm build` runs out of memory, use `NODE_OPTIONS=--max-old-space-size=8192 pnpm build`.

---

## Repository layout

```
@welldot/core          types, Zod validators, serialization — the .well schema
    ↓
@welldot/utils         profile analysis: depths, volumes, aquifer hydraulics
    ↓
@welldot/render        D3 SVG renderer for .well profiles
    ↓
apps/profiler          Nuxt 4 app, deployed to welldot.org  ← active
apps/well-profiler     Next.js app  ← deprecated, do not build on it
```

Dependencies only ever point downward. `@welldot/core` has no internal dependencies and must stay dependency-light — everything else builds on it.

`apps/well-profiler` is frozen. It is kept for reference only, is not deployed, and is not linted. Please don't send changes to it.

Each workspace has its own `CLAUDE.md` with deeper context on conventions and gotchas.

---

## Proposing a change to the `.well` format

The format is a published standard with independent implementations, so **open an issue before writing code**. Describe the data you need to represent, the real-world source it comes from (a driller's report, a regulator's form, a logging tool), and why an existing field can't carry it. Format changes are cheap to propose and expensive to undo.

Once the change is agreed, it touches four places and all four must land together:

1. **`packages/core/src/validators/well.validators.ts`** — the Zod schema. This is the single source of truth; everything else derives from it.
2. **`pnpm --filter=@welldot/core generate:schema`** — regenerates `packages/core/docs/schema/v2/well.schema.json`. Commit the result. CI fails if this file drifts from the validators.
3. **`packages/core/docs/spec/v2/`** — the prose spec. `format-reference.md` for a top-level field, `object-schemas.md` for a nested object, plus `overview.md` if the change is conceptual.
4. **Tests** in `packages/core/src/utils/well.utils.test.ts`, covering round-trip serialization and the absent/empty cases.

### Compatibility rules

Within a major version (`"version": 2`), changes must be **additive and optional**. A file written by an older tool must still parse, and a file using a new field must still parse in an older reader that ignores it.

- ✅ Adding an optional field
- ✅ Adding a new enum member to an open vocabulary
- ✅ Loosening a constraint
- ❌ Renaming or removing a field
- ❌ Making an optional field required
- ❌ Changing a field's type or unit

Anything in the ❌ list requires a new format version, which is a deliberate, coordinated release — raise it in an issue.

### Conventions

- Field names are `snake_case`, matching the on-the-wire format. (`camelcase` is disabled repo-wide for this reason.)
- **Depths in meters, diameters in millimeters**, measured from ground level. Never introduce a field in other units; convert at the UI layer instead.
- Prefer descriptive full words over abbreviations — `construction_date`, not `constr_dt`.
- Timestamps are ISO 8601. Coordinates default to WGS84 (`EPSG:4326`) with an explicit CRS field.

---

## Code contributions

Work on a branch off `main` and open a pull request.

**Commits** follow [Conventional Commits](https://www.conventionalcommits.org/) with a scope matching the workspace:

```
feat(profiler): add language switcher to landing drawer
fix(render): correct depth scale for negative elevations
docs(core): document well_depth in the v2 reference
chore(lint): turn off no-plusplus
```

**Tests.** New logic needs a test. Vitest runs everywhere; test files sit next to the code as `*.test.ts`. `@welldot/render`'s D3 drawing code is the one thinly-covered area — utility functions there are tested, the renderers are not, so be careful and verify visually.

**Styling in `apps/profiler`.** The app uses semantic `surface-*` / `content-*` tokens that invert automatically between light and dark mode. Do not use Tailwind grays, `bg-white`, hardcoded hex, or `dark:` variants for neutrals. Prefer a PrimeVue component over a hand-rolled one. [apps/profiler/README.md](apps/profiler/README.md) explains the whole system — please read it before touching UI.

---

## Building a tool that reads or writes `.well`

You don't need permission, and you don't need to use our libraries — the format is open and the spec is complete enough to implement from scratch. Start with [`packages/core/docs/spec/v2/overview.md`](packages/core/docs/spec/v2/overview.md) and the [JSON Schema](packages/core/docs/schema/v2/well.schema.json).

If you build something, please open an issue to tell us. We want to keep a list of compatible implementations, and we'd rather learn about interoperability problems from you than from your users.

---

## License

By contributing, you agree that your contributions are licensed under the [Apache License 2.0](LICENCE.md).
