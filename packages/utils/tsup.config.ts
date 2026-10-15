import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts', 'siagas/index': 'src/siagas/index.ts' },
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  external: ['@welldot/core', 'date-fns'],
  esbuildOptions(options) {
    options.alias = { '~': './src' };
  },
});
