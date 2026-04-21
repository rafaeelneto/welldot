import pluginVue from 'eslint-plugin-vue';
import typescript from './typescript.js';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...typescript,
  ...pluginVue.configs['flat/recommended'],
  {
    rules: {
      'vue/multi-word-component-names': 'error',
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
