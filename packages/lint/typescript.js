import tseslint from 'typescript-eslint'
import base from './base.js'

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...base,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-use-before-define': ['error'],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      'no-unused-vars': 'off', // use TS version instead
    },
  },
]