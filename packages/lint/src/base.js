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
      // The `.well` schema is snake_case on the wire, so code across the repo
      // reads and writes fields like `media_type` and `static_level` verbatim.
      camelcase: 'off',
      'prefer-template': ['error'],
      // Off, not relaxed: the codebase uses `++`/`--` idiomatically outside
      // for-loop afterthoughts too (`while` cursors, undo/redo stack indices in
      // `useImmer`). This is an airbnb stylistic relic, not a safety rule.
      'no-plusplus': 'off',
      radix: ['error', 'as-needed'],
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],

      // safety
      'no-use-before-define': 'off', // handled by TS version
      'no-undef': 'off', // TypeScript handles this
      // Vue event handlers and menu-item callbacks across the apps are written
      // as `() => (someRef.value = true)`. The parenthesised form is explicit
      // enough, so only flag a bare `return x = y`.
      'no-return-assign': ['error', 'except-parens'],
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
