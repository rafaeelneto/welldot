import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';
import vueParser from 'vue-eslint-parser';
import base from './base.js';

// `eslint-plugin-vue` itself is NOT registered here — `withNuxt()` (from
// `@nuxt/eslint`'s generated `.nuxt/eslint.config.mjs`) already registers it.
// Declaring a second `vue` plugin instance in this array causes ESLint's flat
// config loader to throw "Different instances of plugin 'vue' found".
/** @type {import('eslint').Linter.Config[]} */
export const nuxtConfig = [
  ...base,
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  {
    files: ['*.vue', '**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        // `vue-eslint-parser` handles the SFC, but delegates `<script lang="ts">`
        // to this sub-parser. Without it the blocks are parsed as plain JS and
        // any TS syntax (`import type`, annotations, `as`) is a parse error.
        parser: tseslint.parser,
        ecmaVersion: 'latest',
        sourceType: 'module',
        extraFileExtensions: ['.vue'],
      },
    },
  },
  {
    rules: {
      // Nuxt's `#`-prefixed aliases (`#components`, `#imports`, `#app`,
      // `#build`, ...) are virtual modules generated into `.nuxt` at dev/build
      // time, so there is nothing on disk for the resolver to find.
      'import-x/no-unresolved': ['error', { ignore: ['^#'] }],
      // Vue 3 removed filters entirely, so this rule can only fire on false
      // positives — `vue-eslint-parser` reads the `|` in a TS union cast
      // (`value as string | number`) inside a template as filter syntax.
      'vue/no-deprecated-filter': 'off',
      'vue/no-unused-vars': 'off',
      'vue/no-multiple-template-root': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    // ESLint's own flat-config entrypoint imports the Nuxt-generated config
    // (`./.nuxt/eslint.config.mjs`) by its real on-disk path. `import-x` wants
    // that rewritten to `.mts`, which would break the import.
    files: ['eslint.config.{js,mjs,ts,mts}'],
    rules: {
      'import-x/extensions': 'off',
      'import-x/no-named-as-default': 'off',
    },
  },
];
