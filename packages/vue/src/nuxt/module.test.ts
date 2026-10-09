import { beforeEach, describe, expect, it, vi } from 'vitest';

const kit = vi.hoisted(() => ({
  addComponent: vi.fn(),
  addImports: vi.fn(),
  addPlugin: vi.fn(),
  addTemplate: vi.fn(),
  resolvePath: vi.fn(
    async (path: string) => `${path.replace(/^~\//, '/app/app/')}.ts`,
  ),
  installed: new Set<string>(),
}));

vi.mock('@nuxt/kit', async importOriginal => ({
  ...(await importOriginal<typeof import('@nuxt/kit')>()),
  addComponent: kit.addComponent,
  addImports: kit.addImports,
  addPlugin: kit.addPlugin,
  addTemplate: kit.addTemplate,
  resolvePath: kit.resolvePath,
  hasNuxtModule: (name: string) => kit.installed.has(name),
}));

const { default: welldotModule, distExcludePattern } = await import('./module');

type FakeNuxt = Parameters<typeof welldotModule>[1];

function fakeNuxt(options: Record<string, unknown> = {}) {
  return {
    options: {
      buildDir: '/app/.nuxt',
      modules: [],
      build: { transpile: [] as string[] },
      ...options,
    },
    _version: '4.4.4',
    callHook: vi.fn(async () => {}),
    hooks: { addHooks: vi.fn() },
  } as unknown as FakeNuxt & {
    options: {
      build: { transpile: string[] };
      primevue?: Record<string, { from: string; as?: string }>;
    };
  };
}

const templateContents = async () =>
  Object.fromEntries(
    await Promise.all(
      kit.addTemplate.mock.calls.map(async ([t]) => [
        t.filename,
        await t.getContents(),
      ]),
    ),
  );

const registeredComponents = () =>
  kit.addComponent.mock.calls.map(([c]) => `${c.filePath}#${c.name}`);

beforeEach(() => {
  vi.clearAllMocks();
  kit.installed.clear();
});

describe('@welldot/vue/nuxt', () => {
  it('registers every component, composable and the transpile entry', async () => {
    const nuxt = fakeNuxt();
    await welldotModule({}, nuxt);

    expect(registeredComponents()).toEqual([
      '@welldot/vue#WellLabeledField',
      '@welldot/vue#WellChip',
      '@welldot/vue#WellTagSelect',
      '@welldot/vue#WellInfoPopover',
      '@welldot/vue#WellInputNumber',
      '@welldot/vue#WellUnitInput',
      '@welldot/vue#WellTextureThumbnail',
      '@welldot/vue#WellTextureSelect',
      '@welldot/vue/grid#WellDataGrid',
      '@welldot/vue/location#WellCoordinateInput',
      '@welldot/vue/location#WellLocationMap',
      '@welldot/vue/location#WellLocationPicker',
    ]);
    for (const [c] of kit.addComponent.mock.calls)
      expect(c.export).toBe(c.name);

    expect(kit.addImports).toHaveBeenCalledWith(
      [
        'createWelldot',
        'useWelldotConfig',
        'useWellText',
        'useWellUnits',
        'useWellNumberFormat',
      ].map(name => ({ name, from: '@welldot/vue' })),
    );
    expect(nuxt.options.build.transpile).toContain('@welldot/vue');
  });

  it('keeps the auto-import transform off its own built files', async () => {
    const nuxt = fakeNuxt() as ReturnType<typeof fakeNuxt> & {
      options: { imports?: { transform?: { exclude?: RegExp[] } } };
    };
    await welldotModule({}, nuxt);
    expect(nuxt.options.imports?.transform?.exclude).toHaveLength(1);

    const pattern = distExcludePattern('/repo/packages/vue/dist/');
    expect(pattern.test('/repo/packages/vue/dist/components/WellChip.js')).toBe(
      true,
    );
    expect(pattern.test('/repo/packages/vue/dist/nuxt/runtime/plugin.js')).toBe(
      false,
    );
    expect(pattern.test('/repo/packages/vue/distX/index.js')).toBe(false);
    expect(distExcludePattern('C:\\pkg\\dist').test('C:/pkg/dist/a.js')).toBe(
      true,
    );
  });

  it('skips grid and location components when disabled', async () => {
    await welldotModule({ grid: false, location: false }, fakeNuxt());
    expect(registeredComponents()).toHaveLength(8);
    expect(
      registeredComponents().every(c => c.startsWith('@welldot/vue#')),
    ).toBe(true);
  });

  it('adds the i18n locale plugin only with @nuxtjs/i18n (auto)', async () => {
    await welldotModule({}, fakeNuxt());
    expect(kit.addPlugin).not.toHaveBeenCalled();

    kit.installed.add('@nuxtjs/i18n');
    await welldotModule({}, fakeNuxt());
    expect(kit.addPlugin).toHaveBeenCalledTimes(1);
    expect(kit.addPlugin.mock.calls[0][0]).toMatch(/runtime\/plugin$/);
  });

  it('honours an explicit i18n option', async () => {
    kit.installed.add('@nuxtjs/i18n');
    await welldotModule({ i18n: false }, fakeNuxt());
    expect(kit.addPlugin).not.toHaveBeenCalled();

    kit.installed.clear();
    await welldotModule({ i18n: true }, fakeNuxt());
    expect(kit.addPlugin).toHaveBeenCalledTimes(1);
  });

  it('leaves primevue alone when the PrimeVue module is absent', async () => {
    const nuxt = fakeNuxt();
    await welldotModule({}, nuxt);
    expect(nuxt.options.primevue).toBeUndefined();
    expect(kit.addTemplate).not.toHaveBeenCalled();
  });

  it('defaults importTheme / importPT to default-export shims', async () => {
    kit.installed.add('@primevue/nuxt-module');
    const nuxt = fakeNuxt();
    await welldotModule({}, nuxt);

    expect(nuxt.options.primevue).toEqual({
      importTheme: {
        from: '/app/.nuxt/welldot/primevue-theme.mjs',
        as: 'WelldotPreset',
      },
      importPT: { from: '/app/.nuxt/welldot/primevue-pt.mjs', as: 'welldotPt' },
    });
    expect(await templateContents()).toEqual({
      'welldot/primevue-theme.mjs': `export { WelldotPreset as default } from '@welldot/vue/theme';\n`,
      'welldot/primevue-pt.mjs': `export { welldotPt as default } from '@welldot/vue/theme';\n`,
    });
  });

  it("keeps the app's own importTheme / importPT", async () => {
    kit.installed.add('@primevue/nuxt-module');
    const own = { from: '@/theme/custom.ts', as: 'custom' };
    const nuxt = fakeNuxt({ primevue: { importTheme: own } });
    await welldotModule({}, nuxt);

    expect(nuxt.options.primevue?.importTheme).toBe(own);
    expect(nuxt.options.primevue?.importPT?.as).toBe('welldotPt');
    expect(kit.addTemplate).toHaveBeenCalledTimes(1);
  });

  it('merges override files onto the Welldot theme', async () => {
    kit.installed.add('@primevue/nuxt-module');
    const nuxt = fakeNuxt();
    await welldotModule(
      { theme: { preset: '~/theme/preset', pt: '~/theme/pt' } },
      nuxt,
    );

    expect(nuxt.options.primevue?.importTheme?.as).toBe('WelldotPreset');
    const templates = await templateContents();
    expect(kit.resolvePath).toHaveBeenCalledWith('~/theme/preset', {
      cwd: undefined,
    });
    expect(templates).toEqual({
      'welldot/primevue-theme.mjs': [
        `import { defineWelldotTheme } from '@welldot/vue/theme';`,
        `import overrides from "/app/app/theme/preset.ts";`,
        `export default defineWelldotTheme(overrides);`,
        '',
      ].join('\n'),
      'welldot/primevue-pt.mjs': [
        `import { defineWelldotPt } from '@welldot/vue/theme';`,
        `import overrides from "/app/app/theme/pt.ts";`,
        `export default defineWelldotPt(overrides);`,
        '',
      ].join('\n'),
    });
  });

  it('keeps the plain default for a key without an override file', async () => {
    kit.installed.add('@primevue/nuxt-module');
    await welldotModule({ theme: { pt: '~/theme/pt' } }, fakeNuxt());
    const templates = await templateContents();
    expect(templates['welldot/primevue-theme.mjs']).toBe(
      `export { WelldotPreset as default } from '@welldot/vue/theme';\n`,
    );
    expect(templates['welldot/primevue-pt.mjs']).toContain('defineWelldotPt');
  });

  it('does not touch primevue with theme: false', async () => {
    kit.installed.add('@primevue/nuxt-module');
    const nuxt = fakeNuxt();
    await welldotModule({ theme: false }, nuxt);
    expect(nuxt.options.primevue).toBeUndefined();
  });

  it('declares the theme defaults as a PrimeVue module dependency', async () => {
    const deps = await welldotModule.getModuleDependencies?.(fakeNuxt());
    expect(deps).toEqual({
      '@primevue/nuxt-module': {
        optional: true,
        defaults: {
          importTheme: {
            from: '/app/.nuxt/welldot/primevue-theme.mjs',
            as: 'WelldotPreset',
          },
          importPT: {
            from: '/app/.nuxt/welldot/primevue-pt.mjs',
            as: 'welldotPt',
          },
        },
      },
    });

    const files = fakeNuxt({
      modules: [['@welldot/vue/nuxt', { theme: { pt: '~/theme/pt' } }]],
    });
    expect(await welldotModule.getModuleDependencies?.(files)).toEqual(deps);

    const off = fakeNuxt({
      modules: [['@welldot/vue/nuxt', { theme: false }]],
    });
    expect(await welldotModule.getModuleDependencies?.(off)).toEqual({});
    expect(
      await welldotModule.getModuleDependencies?.(
        fakeNuxt({ welldot: { theme: false } }),
      ),
    ).toEqual({});
  });
});
