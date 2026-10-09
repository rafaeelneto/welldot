import pluginVue from 'eslint-plugin-vue';
import typescript from './typescript.js';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...typescript,
  ...pluginVue.configs['flat/recommended'],
  {
    rules: {
      'vue/multi-word-component-names': 'error',
      // Vue 3 removed filters entirely, so this rule can only fire on false
      // positives — `vue-eslint-parser` reads the `|` in a TS union cast
      // (`value as string | number`) inside a template as filter syntax.
      'vue/no-deprecated-filter': 'off',
      'vue/component-api-style': ['error', ['script-setup', 'composition']],
      'vue/define-macros-order': [
        'error',
        {
          order: ['defineProps', 'defineEmits', 'defineSlots'],
        },
      ],
      'vue/no-unused-vars': 'warn',
      'vue/no-v-html': 'warn',
      'vue/block-order': [
        'error',
        {
          order: ['script', 'template', 'style'],
        },
      ],
    },
  },
];
