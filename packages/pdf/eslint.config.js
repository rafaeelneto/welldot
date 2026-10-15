import typescript from '@welldot/lint/typescript';

export default [
  ...typescript,
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '.turbo/**',
      'tsup.config.ts',
      'vitest.config.ts',
      'eslint.config.js',
    ],
  },
];
