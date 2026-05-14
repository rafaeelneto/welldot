# packages/lint — @welldot/lint

Private shared ESLint configuration package. Not published to npm. Used by all other packages and apps via `workspace:*`.

## Purpose

Single source of truth for linting rules across the monorepo. Exports named flat-config presets so each workspace can compose only what it needs.

## Exports

| Export path | Use case |
|---|---|
| `@welldot/lint/base` | Any JS/TS project — base rules + import-x + prettier |
| `@welldot/lint/typescript` | TypeScript-specific rules on top of base |
| `@welldot/lint/react` | React + hooks rules |
| `@welldot/lint/vue` | Vue SFCs (vue-eslint-parser) |
| `@welldot/lint/nuxt` | Nuxt-specific additions on top of vue |

## Usage in consuming packages

```js
// eslint.config.mjs
import base from '@welldot/lint/base';
import ts from '@welldot/lint/typescript';
export default [...base, ...ts];
```

## Documentation requirements

This package has no README. Changes are documented inline in the config files via JSDoc comments. Keep them current.

Update the config file comment header when:
- A rule is added, removed, or its severity changes — add a one-line comment explaining why if the rule is non-obvious
- A new export preset is added — add a `@description` block to the new file

If a `README.md` is ever added, update it whenever an export path is added or removed from `package.json#exports`.

## Constraints

- No build step — exports point directly to `src/*.js`. Do not add tsup.
- All configs must be ESLint flat-config format (ESLint 9+).
- Do not add new peer dependencies without updating all consuming workspace `devDependencies`.
