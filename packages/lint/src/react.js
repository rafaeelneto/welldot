import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import typescript from './src/typescript.js';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...typescript,
  react.configs.flat.recommended,
  react.configs.flat['jsx-runtime'],
  jsxA11y.flatConfigs.recommended,
  {
    plugins: { 'react-hooks': reactHooks },
    settings: { react: { version: 'detect' } },
    rules: {
      // hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // components
      'react/prefer-stateless-function': ['error'],
      'react/prop-types': 'off',
      'react/require-default-props': 'off',
      'react/no-array-index-key': ['error'],
      'react/jsx-props-no-spreading': ['warn'],
      'react/jsx-filename-extension': [
        'warn',
        { extensions: ['.jsx', '.tsx'] },
      ],

      // a11y
      'jsx-a11y/no-static-element-interactions': ['error'],
      'jsx-a11y/click-events-have-key-events': ['error'],
    },
  },
];
