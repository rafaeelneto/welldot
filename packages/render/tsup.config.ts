import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['d3', 'd3-tip', 'textures', '@welldot/core'],
  esbuildOptions(options) {
    options.alias = { '~': './src' };
  },
});
