import typescript from '@welldot/lint/typescript'

export default [
  ...typescript,
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.turbo/**'],
  },
]