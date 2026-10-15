import { readFileSync } from 'fs';
import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

// Pure builders run in node; DOM-dependent tests (`svg/`, `createWellPdf`)
// opt in with a `// @vitest-environment jsdom` file comment.
export default defineConfig({
  plugins: [
    {
      // Mirror tsup's `text` loader: `.svg` imports resolve to raw markup.
      name: 'svg-as-text',
      enforce: 'pre',
      load(id) {
        if (!id.endsWith('.svg')) return null;
        return `export default ${JSON.stringify(readFileSync(id, 'utf8'))};`;
      },
    },
  ],
  resolve: {
    alias: {
      '~': resolve(__dirname, './src'),
      '@welldot/pdf/fonts': resolve(__dirname, './src/fonts.ts'),
    },
  },
});
