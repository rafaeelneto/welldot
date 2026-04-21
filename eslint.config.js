import typescript from '@well/lint/typescript'

export default [
  ...typescript,
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.turbo/**'],
  },
]