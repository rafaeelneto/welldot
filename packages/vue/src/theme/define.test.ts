/* eslint-disable @typescript-eslint/no-explicit-any -- deep reads into untyped token maps */
import { describe, expect, it } from 'vitest';
import {
  WelldotPreset,
  defineWelldotPt,
  defineWelldotTheme,
  welldotPt,
} from './index';

const pt = welldotPt as Record<string, any>;
const preset = WelldotPreset.preset as Record<string, any>;

describe('defineWelldotTheme', () => {
  it('returns the Welldot theme without overrides', () => {
    expect(defineWelldotTheme()).toEqual(WelldotPreset);
  });

  it('deep-merges token and option overrides, keeping the rest', () => {
    const theme = defineWelldotTheme({
      preset: { semantic: { primary: { 500: '#ff0000' } } },
      options: { darkModeSelector: '.night' },
    }) as { preset: Record<string, any>; options: Record<string, any> };

    expect(theme.preset.semantic.primary[500]).toBe('#ff0000');
    expect(theme.preset.semantic.primary[600]).toBe(
      preset.semantic.primary[600],
    );
    expect(theme.preset.components).toEqual(preset.components);
    expect(theme.options).toEqual({
      ...WelldotPreset.options,
      darkModeSelector: '.night',
    });
  });

  it('never mutates the defaults', () => {
    const before = structuredClone(WelldotPreset.options);
    const primary500 = preset.semantic.primary[500];
    defineWelldotTheme({
      preset: { semantic: { primary: { 500: '#000' } } },
      options: { cssLayer: { name: 'x' } },
    });
    expect(WelldotPreset.options).toEqual(before);
    expect(preset.semantic.primary[500]).toBe(primary500);
  });
});

describe('defineWelldotPt', () => {
  it('returns the Welldot pass-through without overrides', () => {
    expect(defineWelldotPt()).toEqual(welldotPt);
  });

  it('replaces an overridden section and keeps its siblings', () => {
    const merged = defineWelldotPt({
      tabpanels: { root: 'p-0' },
      button: { root: 'my-button' },
    }) as Record<string, any>;

    expect(merged.tabpanels.root).toBe('p-0');
    // A function section is replaced by the override, not combined.
    expect(merged.button.root).toBe('my-button');
    expect(merged.selectbutton).toEqual(pt.selectbutton);
    expect(pt.tabpanels.root).not.toBe('p-0');
  });

  it('adds sections for components the defaults do not cover', () => {
    const merged = defineWelldotPt({
      card: { root: 'rounded-none' },
    }) as Record<string, any>;
    expect(merged.card.root).toBe('rounded-none');
    expect(merged.dialog).toEqual(pt.dialog);
  });
});
