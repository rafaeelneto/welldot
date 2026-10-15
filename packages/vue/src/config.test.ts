import { describe, expect, it } from 'vitest';
import {
  defineComponent,
  h,
  isReactive,
  reactive,
  ref,
  toRaw,
  type Component,
} from 'vue';
import {
  createWelldot,
  DEFAULT_WELLDOT_UNITS,
  resolvePart,
  resolveWelldotConfig,
  useWelldotConfig,
} from './config';
import { withSetup } from './test/withSetup';

const PartA = defineComponent({ render: () => h('i', 'a') });
const PartB = defineComponent({ render: () => h('i', 'b') });
const Fallback = defineComponent({ render: () => h('i', 'fallback') });

describe('useWelldotConfig', () => {
  it('falls back to en / SI / DD without the plugin', () => {
    const { result } = withSetup(() => useWelldotConfig());
    expect(result.locale).toBe('en');
    expect(result.units).toEqual(DEFAULT_WELLDOT_UNITS);
    expect(result.coordinateFormat).toBe('DD');
    expect(result.components).toEqual({});
  });

  it('falls back to defaults outside an injection context', () => {
    expect(useWelldotConfig().locale).toBe('en');
  });

  it('reads the provided config, filling missing units with SI', () => {
    const { result } = withSetup(useWelldotConfig, [
      createWelldot({
        locale: 'pt',
        units: { length: 'ft' },
        coordinateFormat: 'DMS',
      }),
    ]);
    expect(result.locale).toBe('pt');
    expect(result.units).toEqual({ ...DEFAULT_WELLDOT_UNITS, length: 'ft' });
    expect(result.coordinateFormat).toBe('DMS');
  });

  it('stays reactive through getters and refs', () => {
    const locale = ref('en');
    const length = ref<'m' | 'ft'>('m');
    const { result } = withSetup(useWelldotConfig, [
      createWelldot({ locale, units: () => ({ length: length.value }) }),
    ]);
    expect(result.locale).toBe('en');
    expect(result.units.length).toBe('m');
    locale.value = 'pt-BR';
    length.value = 'ft';
    expect(result.locale).toBe('pt-BR');
    expect(result.units.length).toBe('ft');
  });

  it('marks the global components map raw', () => {
    const config = resolveWelldotConfig({ components: { trigger: PartA } });
    expect((config.components as Record<string, unknown>).__v_skip).toBe(true);
    expect(config.components.trigger).toBe(PartA);
  });
});

describe('resolvePart', () => {
  const config = resolveWelldotConfig({ components: { trigger: PartA } });

  it('prefers the prop override', () => {
    expect(resolvePart('trigger', PartB, Fallback, config)).toBe(PartB);
  });

  it('then the createWelldot map', () => {
    expect(resolvePart('trigger', undefined, Fallback, config)).toBe(PartA);
  });

  it('then the built-in default', () => {
    expect(resolvePart('deleteButton', null, Fallback, config)).toBe(Fallback);
  });

  it('unwraps and marks a reactive prop override raw', () => {
    const state = reactive({ part: { ...PartB } as Component });
    expect(isReactive(state.part)).toBe(true);
    const part = resolvePart('trigger', state.part, Fallback, config);
    expect(isReactive(part)).toBe(false);
    expect(part).toBe(toRaw(state.part));
    expect((part as Record<string, unknown>).__v_skip).toBe(true);
  });

  it('reads the injected config when none is passed', () => {
    const { result } = withSetup(
      () => resolvePart('trigger', undefined, Fallback),
      [createWelldot({ components: { trigger: PartB } })],
    );
    expect(result).toBe(PartB);
  });
});

describe('createWelldot layering', () => {
  it('stacks a second install on top of the first', () => {
    const { result } = withSetup(useWelldotConfig, [
      createWelldot({ locale: 'pt', units: { length: 'ft' } }),
      createWelldot({ units: { diameter: 'inches' }, coordinateFormat: 'DMS' }),
    ]);
    expect(result.locale).toBe('pt');
    expect(result.units).toEqual({
      ...DEFAULT_WELLDOT_UNITS,
      length: 'ft',
      diameter: 'inches',
    });
    expect(result.coordinateFormat).toBe('DMS');
  });

  it('lets the later layer win per field and per unit', () => {
    const { result } = withSetup(useWelldotConfig, [
      createWelldot({
        locale: 'pt',
        units: { length: 'ft', diameter: 'inches' },
      }),
      createWelldot({ locale: 'en-GB', units: { length: 'm' } }),
    ]);
    expect(result.locale).toBe('en-GB');
    expect(result.units.length).toBe('m');
    expect(result.units.diameter).toBe('inches');
  });

  it('ignores undefined values from a later layer', () => {
    const { result } = withSetup(useWelldotConfig, [
      createWelldot({ locale: 'pt', units: { length: 'ft' } }),
      createWelldot({ locale: () => '', units: () => ({ length: undefined }) }),
    ]);
    expect(result.locale).toBe('pt');
    expect(result.units.length).toBe('ft');
  });

  it('merges components per part, keeping the map raw', () => {
    const { result } = withSetup(useWelldotConfig, [
      createWelldot({ components: { trigger: PartA, icon: Fallback } }),
      createWelldot({ components: { trigger: PartB } }),
    ]);
    expect(result.components.trigger).toBe(PartB);
    expect(result.components.icon).toBe(Fallback);
    expect((result.components as Record<string, unknown>).__v_skip).toBe(true);
  });

  it('stays reactive across layers', () => {
    const locale = ref('en');
    const length = ref<'m' | 'ft'>('m');
    const { result } = withSetup(useWelldotConfig, [
      createWelldot({ locale }),
      createWelldot({ units: () => ({ length: length.value }) }),
    ]);
    locale.value = 'pt';
    length.value = 'ft';
    expect(result.locale).toBe('pt');
    expect(result.units.length).toBe('ft');
  });

  it('keeps layers per app when one plugin is installed twice', () => {
    const base = createWelldot({ locale: 'pt' });
    const first = withSetup(useWelldotConfig, [
      base,
      createWelldot({ units: { length: 'ft' } }),
    ]);
    const second = withSetup(useWelldotConfig, [base]);
    expect(first.result.units.length).toBe('ft');
    expect(second.result.locale).toBe('pt');
    expect(second.result.units.length).toBe('m');
  });
});
