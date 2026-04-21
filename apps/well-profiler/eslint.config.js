import react from '@welldot/eslint-config/react'

export default [
  ...react,
  { ignores: ['dist/**', '.next/**', '.turbo/**', 'node_modules/**', 'build/**'] },
]