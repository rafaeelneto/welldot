import { describe, expect, it } from 'vitest';
import {
  applyRenderLocale,
  INTERACTIVE_RENDER_CONFIG,
  RENDER_LABELS,
} from './render.configs';

describe('applyRenderLocale', () => {
  it('round-trips to the original pt defaults', () => {
    const result = applyRenderLocale(INTERACTIVE_RENDER_CONFIG, 'pt');
    expect(result.constructionLabels.labels).toEqual(
      INTERACTIVE_RENDER_CONFIG.constructionLabels.labels,
    );
    expect(result.legend.labels).toEqual(
      INTERACTIVE_RENDER_CONFIG.legend.labels,
    );
    expect(result.legend.title).toBe(INTERACTIVE_RENDER_CONFIG.legend.title);
    expect(result.tooltipLabels).toEqual(
      INTERACTIVE_RENDER_CONFIG.tooltipLabels,
    );
    expect(result.labels.typeLabels).toEqual(
      INTERACTIVE_RENDER_CONFIG.labels.typeLabels,
    );
  });

  it('resolves every label-bearing field to English, leaving everything else unchanged', () => {
    const result = applyRenderLocale(INTERACTIVE_RENDER_CONFIG, 'en');

    expect(result.constructionLabels.labels.wellCasePrefix).toBe('Casing');
    expect(result.legend.labels.wellCase).toBe('Casing');
    expect(result.legend.title).toBe('LEGEND');
    expect(result.tooltipLabels.wellCase.title).toBe('CASING');
    expect(result.tooltipLabels.common.diameter).toBe('Diameter:');
    expect(result.labels.typeLabels?.fractureWater).toBe('open fracture');
    expect(result.labels.typeLabels?.caveWater).toBe('wet cave');

    // Unrelated fields untouched.
    expect(result.zoom).toBe(INTERACTIVE_RENDER_CONFIG.zoom);
    expect(result.geologic).toEqual(INTERACTIVE_RENDER_CONFIG.geologic);
    expect(result.constructionLabels.xOffset).toBe(
      INTERACTIVE_RENDER_CONFIG.constructionLabels.xOffset,
    );
  });

  it('does not mutate the base config', () => {
    applyRenderLocale(INTERACTIVE_RENDER_CONFIG, 'en');
    expect(
      INTERACTIVE_RENDER_CONFIG.constructionLabels.labels.wellCasePrefix,
    ).toBe('Revest.');
  });
});

describe('RENDER_LABELS', () => {
  it('every leaf has a non-empty pt fallback', () => {
    const walk = (node: unknown): void => {
      if (node && typeof node === 'object') {
        if ('pt' in node) {
          expect(typeof (node as { pt: unknown }).pt).toBe('string');
          expect((node as { pt: string }).pt.length).toBeGreaterThan(0);
        } else {
          Object.values(node).forEach(walk);
        }
      }
    };
    walk(RENDER_LABELS);
  });
});
