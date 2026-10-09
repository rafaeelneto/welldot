import typescript from '@welldot/lint/typescript';

/**
 * Root-level config only. Each workspace in `apps/` and `packages/` owns its
 * own `eslint.config.*` and is linted by `turbo lint`, so they are ignored
 * here — otherwise `eslint .` at the root would lint the whole monorepo a
 * second time with the wrong (non-Vue, non-Nuxt) preset.
 */
export default [
  ...typescript,
  {
    // ESLint 9 flat config has no `.eslintignore`; these live here instead.
    ignores: [
      'apps/**',
      'packages/**',
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.turbo/**',
      '**/.env*',
      '**/debug.log',
    ],
  },
];
