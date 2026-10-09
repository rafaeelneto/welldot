import vue from '@vitejs/plugin-vue';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Icons from 'unplugin-icons/vite';
import { defineConfig, type Plugin } from 'vite';
import dts from 'vite-plugin-dts';

const root = dirname(fileURLToPath(import.meta.url));

/**
 * Every runtime dependency stays external — peers (and their subpaths) are
 * resolved by the consuming app, never bundled into `dist/`.
 */
const EXTERNAL: RegExp[] = [
  /^vue($|\/)/,
  /^@vue\//,
  /^primevue($|\/)/,
  /^@primevue\//,
  /^@primeuix\//,
  /^@welldot\//,
  /^@revolist\//,
  /^vue-color($|\/)/,
  /^defu$/,
  /^leaflet($|\/)/,
  /^@nuxt\//,
  /^nuxt($|\/)/,
  /^#app($|\/)/,
  /^#imports$/,
  /^#build($|\/)/,
  /^node:/,
];

/**
 * Global stylesheets copied verbatim into `dist/` next to each other, so the
 * relative `@import`s inside `tailwind.css` resolve after publishing:
 *
 *   dist/tailwind.css  ← src/theme/tailwind.css  (exported as `./tailwind.css`)
 *   dist/grid.css      ← src/grid/grid.css
 *   dist/style.css     ← SFC `<style>` blocks, extracted by Vite (`cssFileName`)
 */
const CSS_FILES: Array<[from: string, to: string]> = [
  ['src/theme/tailwind.css', 'tailwind.css'],
  ['src/grid/grid.css', 'grid.css'],
];

function copyGlobalCss(): Plugin {
  return {
    name: 'welldot:copy-global-css',
    apply: 'build',
    writeBundle(options) {
      const outDir = options.dir ?? resolve(root, 'dist');
      for (const [from, to] of CSS_FILES) {
        const src = resolve(root, from);
        if (!existsSync(src)) {
          throw new Error(`[welldot] missing stylesheet: ${from}`);
        }
        const dest = resolve(outDir, to);
        mkdirSync(dirname(dest), { recursive: true });
        copyFileSync(src, dest);
      }
    },
  };
}

export default defineConfig({
  plugins: [
    vue(),
    Icons({ compiler: 'vue3' }),
    dts({
      tsconfigPath: resolve(root, 'tsconfig.json'),
      entryRoot: resolve(root, 'src'),
      exclude: ['**/*.test.ts', 'src/test/**', 'node_modules/**', 'dist/**'],
      cleanVueFileName: true,
      // Type errors fail the build. (`vue-tsc` is deliberately not installed:
      // in this workspace it becomes the optional peer of the root
      // `prettier-plugin-organize-imports`, which then injects macro imports
      // into every `.vue` file.)
      afterDiagnostic(diagnostics) {
        if (diagnostics.length > 0) {
          throw new Error(
            `[welldot] ${diagnostics.length} type error(s), see above`,
          );
        }
      },
    }),
    copyGlobalCss(),
  ],
  build: {
    target: 'es2020',
    sourcemap: true,
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: {
        index: resolve(root, 'src/index.ts'),
        'grid/index': resolve(root, 'src/grid/index.ts'),
        'location/index': resolve(root, 'src/location/index.ts'),
        'theme/index': resolve(root, 'src/theme/index.ts'),
        'nuxt/module': resolve(root, 'src/nuxt/module.ts'),
        'nuxt/runtime/plugin': resolve(root, 'src/nuxt/runtime/plugin.ts'),
      },
      formats: ['es'],
      cssFileName: 'style',
    },
    rolldownOptions: {
      external: id => EXTERNAL.some(re => re.test(id)),
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
        // The default sanitizer (rollup's), plus: `unplugin-icons` modules are
        // virtual (`~icons/ph/x`), so drop the `~` to emit `_virtual/icons/…`.
        sanitizeFileName: name =>
          name
            .replace('~icons/', 'icons/')
            // eslint-disable-next-line no-control-regex
            .replace(/[\0-\x1F"#$%&*+,:;<=>?[\]^`{|}\x7F]/g, '_'),
      },
    },
  },
});
