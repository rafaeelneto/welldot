import { copyFile } from 'node:fs/promises';
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  esbuildOptions(options) {
    options.alias = { '~': './src' };
  },
  // Ship the JSON Schema (generated into the repo-root spec/) with the package,
  // exported as `@welldot/core/well.schema.json`.
  async onSuccess() {
    await copyFile(
      '../../spec/schema/v2/well.schema.json',
      'dist/well.schema.json',
    );
  },
});
