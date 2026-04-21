import js from '@eslint/js';
import importX from 'eslint-plugin-import-x';
import prettier from 'eslint-plugin-prettier/recommended';

// eslint.config.js
// @ts-check

/** @type {import('eslint').Linter.Config[]} */
export default [
  js.configs.recommended,
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  prettier,
  {
    rules: {
      // style
      'linebreak-style': ['error', 'unix'],
      camelcase: ['error'],
      'prefer-template': ['error'],
      'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
      radix: ['error', 'as-needed'],

      // safety
      'no-use-before-define': 'off', // handled by TS version
      'no-undef': 'off', // TypeScript handles this
      'no-return-assign': ['error', 'always'],
      'prefer-promise-reject-errors': ['warn'],

      // imports
      'import-x/extensions': [
        'error',
        'ignorePackages',
        { js: 'never', ts: 'never', tsx: 'never' },
      ],

      // prettier
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
];
