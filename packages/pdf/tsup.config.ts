import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/fonts.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  // `.svg` imports become their raw markup, inlined in the bundle.
  loader: { '.svg': 'text' },
  external: [
    '@welldot/core',
    '@welldot/utils',
    '@welldot/render',
    'date-fns',
    'pdfmake',
    'pdfmake/build/pdfmake',
    'uqr',
    // Self-reference: keeps the 1.7 MB font data in its own entry.
    '@welldot/pdf/fonts',
  ],
  esbuildOptions(options) {
    options.alias = { '~': './src' };
  },
});
