# Changesets

Every pull request that changes a published package (`@welldot/core`, `utils`, `render`, `pdf`, `vue`) adds a changeset:

```bash
pnpm changeset
```

Pick the affected packages, the bump (patch, minor or major) and write a short, user-facing summary. Commit the generated `.changeset/*.md` file with the PR. Apps are private and never get changesets.

Versioning, CHANGELOGs, tags and GitHub Releases are described in [CONTRIBUTING.md § Releasing](../CONTRIBUTING.md#releasing).
