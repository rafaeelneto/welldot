import {
  addComponent,
  addImports,
  addPlugin,
  addTemplate,
  createResolver,
  defineNuxtModule,
  hasNuxtModule,
  resolvePath,
} from '@nuxt/kit';
import type { ModuleDependencies, Nuxt } from '@nuxt/schema';

/** Options of `@welldot/vue/nuxt`, under the `welldot` key of `nuxt.config`. */
export interface WelldotModuleOptions {
  /** Register `WellDataGrid` (`@welldot/vue/grid`). Default `true`. */
  grid?: boolean;
  /** Register the location components (`@welldot/vue/location`). Default `true`. */
  location?: boolean;
  /**
   * Default `primevue.importTheme` / `importPT` to the Welldot preset and pass
   * through, each only when the app hasn't set it. Default `true`.
   *
   * Pass an object to customize them: `preset` / `pt` are paths (aliases
   * allowed) to files whose default export is merged onto `WelldotPreset` /
   * `welldotPt` with `defineWelldotTheme` / `defineWelldotPt`.
   */
  theme?: boolean | WelldotThemeFiles;
  /**
   * Wire `createWelldot({ locale })` to `@nuxtjs/i18n`. Default: on when the
   * `@nuxtjs/i18n` module is installed.
   */
  i18n?: boolean;
}

/** Override files for the `theme` option. */
export interface WelldotThemeFiles {
  /** File default-exporting `WelldotThemeOverrides` (e.g. `'~/theme/preset'`). */
  preset?: string;
  /** File default-exporting PrimeVue PT overrides (e.g. `'~/theme/pt'`). */
  pt?: string;
}

declare module '@nuxt/schema' {
  interface NuxtConfig {
    welldot?: WelldotModuleOptions;
  }
  interface NuxtOptions {
    welldot?: WelldotModuleOptions;
  }
}

const MODULE_NAME = '@welldot/vue';
const PRIMEVUE_MODULE = '@primevue/nuxt-module';
const I18N_MODULE = '@nuxtjs/i18n';

/** Component names per entry point. Names are registered as-is (no prefix). */
export const WELLDOT_COMPONENTS = {
  '@welldot/vue': [
    'WellLabeledField',
    'WellChip',
    'WellTagSelect',
    'WellInfoPopover',
    'WellInputNumber',
    'WellUnitInput',
    'WellTextureThumbnail',
    'WellTextureSelect',
  ],
  '@welldot/vue/grid': ['WellDataGrid'],
  '@welldot/vue/location': [
    'WellCoordinateInput',
    'WellLocationMap',
    'WellLocationPicker',
  ],
} as const;

/** Auto-imported from `@welldot/vue`. */
export const WELLDOT_IMPORTS = [
  'createWelldot',
  'useWelldotConfig',
  'useWellText',
  'useWellUnits',
  'useWellNumberFormat',
] as const;

/** `primevue.importTheme` / `importPT` values set by the `theme` option. */
interface PrimeVueImport {
  from: string;
  as?: string;
}

interface PrimeVueThemeOptions {
  importTheme?: PrimeVueImport;
  importPT?: PrimeVueImport;
}

/**
 * The PrimeVue module emits `import <as> from '<from>'` (a default import),
 * while `@welldot/vue/theme` only has named exports. These generated files
 * re-export them as defaults, merged with the app's override file if any.
 */
const THEME_TEMPLATES = {
  importTheme: {
    filename: 'welldot/primevue-theme.mjs',
    as: 'WelldotPreset',
    named: 'WelldotPreset',
    define: 'defineWelldotTheme',
    file: 'preset',
  },
  importPT: {
    filename: 'welldot/primevue-pt.mjs',
    as: 'welldotPt',
    named: 'welldotPt',
    define: 'defineWelldotPt',
    file: 'pt',
  },
} as const;

/** Contents of a theme shim; `overrides` is the resolved override file. */
export function themeTemplateContents(key: ThemeKey, overrides?: string) {
  const { named, define } = THEME_TEMPLATES[key];
  if (!overrides)
    return `export { ${named} as default } from '@welldot/vue/theme';\n`;
  return [
    `import { ${define} } from '@welldot/vue/theme';`,
    `import overrides from ${JSON.stringify(overrides)};`,
    `export default ${define}(overrides);`,
    '',
  ].join('\n');
}

type ThemeKey = keyof typeof THEME_TEMPLATES;
const THEME_KEYS = Object.keys(THEME_TEMPLATES) as ThemeKey[];

function themeImport(nuxt: Nuxt, key: ThemeKey): PrimeVueImport {
  const { filename, as } = THEME_TEMPLATES[key];
  return { from: `${nuxt.options.buildDir}/${filename}`, as };
}

function primevueOptions(nuxt: Nuxt): PrimeVueThemeOptions | undefined {
  const options = nuxt.options as unknown as Record<string, unknown>;
  const value = options.primevue;
  return value && typeof value === 'object'
    ? (value as PrimeVueThemeOptions)
    : undefined;
}

/**
 * The `theme` option, read before `setup` runs (for `moduleDependencies`):
 * from `welldot` in `nuxt.config`, or from inline options in `modules`.
 */
function themeEnabled(nuxt: Nuxt): boolean {
  for (const entry of nuxt.options.modules) {
    if (
      Array.isArray(entry) &&
      typeof entry[0] === 'string' &&
      entry[0].startsWith(`${MODULE_NAME}/nuxt`)
    ) {
      const inline = entry[1] as WelldotModuleOptions | undefined;
      if (inline?.theme !== undefined) return inline.theme !== false;
    }
  }
  return nuxt.options.welldot?.theme !== false;
}

/**
 * Matches the package's built files under `distDir`, except the Nuxt runtime
 * (`nuxt/runtime/`), for `imports.transform.exclude`.
 */
export function distExcludePattern(distDir: string): RegExp {
  const dir = distDir.replace(/\\/g, '/').replace(/\/+$/, '');
  const escaped = dir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped}/(?!nuxt/runtime/)`);
}

export default defineNuxtModule<WelldotModuleOptions>({
  meta: {
    name: MODULE_NAME,
    configKey: 'welldot',
    compatibility: { nuxt: '>=3.15.0' },
  },
  defaults: {
    grid: true,
    location: true,
    theme: true,
  },
  // Nuxt ≥ 3.19 / 4.1 applies these defaults to `primevue` before any module
  // runs, whatever the order of `modules`. `defu` keeps the app's own values.
  moduleDependencies(nuxt): ModuleDependencies {
    if (!themeEnabled(nuxt)) return {};
    return {
      [PRIMEVUE_MODULE]: {
        optional: true,
        defaults: {
          importTheme: themeImport(nuxt, 'importTheme'),
          importPT: themeImport(nuxt, 'importPT'),
        },
      },
    };
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url);

    // ── Components ──────────────────────────────────────────────────────────
    const entries: Array<keyof typeof WELLDOT_COMPONENTS> = ['@welldot/vue'];
    if (options.grid !== false) entries.push('@welldot/vue/grid');
    if (options.location !== false) entries.push('@welldot/vue/location');
    for (const filePath of entries) {
      for (const name of WELLDOT_COMPONENTS[filePath]) {
        addComponent({ name, export: name, filePath });
      }
    }

    // ── Composables ─────────────────────────────────────────────────────────
    addImports(WELLDOT_IMPORTS.map(name => ({ name, from: MODULE_NAME })));

    // ── Build ───────────────────────────────────────────────────────────────
    nuxt.options.build.transpile.push(MODULE_NAME);

    // Linked installs (pnpm workspaces, `npm link`) resolve the package outside
    // `node_modules`, where Nuxt's auto-import transform treats the built,
    // minified files as app code and injects imports (`h`, `ref`…) that
    // collide with their local identifiers. Keep it off the package's files,
    // except the runtime plugin, which imports from `#imports`.
    // `imports` always exists in Nuxt (schema default); `??=` guards bare mocks.
    const imports = (nuxt.options.imports ??= {} as Nuxt['options']['imports']);
    const transform = (imports.transform ??= {});
    (transform.exclude ??= []).push(distExcludePattern(resolver.resolve('..')));

    // ── PrimeVue theme ──────────────────────────────────────────────────────
    if (options.theme !== false && hasNuxtModule(PRIMEVUE_MODULE, nuxt)) {
      const files = typeof options.theme === 'object' ? options.theme : {};
      const primevue = (primevueOptions(nuxt) ??
        ((nuxt.options as unknown as Record<string, unknown>).primevue =
          {})) as PrimeVueThemeOptions;
      for (const key of THEME_KEYS) {
        const ours = themeImport(nuxt, key);
        // Older Nuxt (no `moduleDependencies`) with `@primevue/nuxt-module`
        // listed after this module: set the default here.
        if (!primevue[key]) primevue[key] = ours;
        if (primevue[key]?.from === ours.from) {
          const file = files[THEME_TEMPLATES[key].file];
          addTemplate({
            filename: THEME_TEMPLATES[key].filename,
            getContents: async () =>
              themeTemplateContents(
                key,
                file
                  ? await resolvePath(file, { cwd: nuxt.options.rootDir })
                  : undefined,
              ),
            write: true,
          });
        }
      }
    }

    // ── Runtime plugin (locale from @nuxtjs/i18n) ───────────────────────────
    const i18n = options.i18n ?? hasNuxtModule(I18N_MODULE, nuxt);
    if (i18n) addPlugin(resolver.resolve('./runtime/plugin'));
  },
});
