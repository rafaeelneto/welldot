import { describe, expect, it } from 'vitest';
import { DEFAULT_WELL_THEME } from '~/configs/render.configs';
import { buildSvgStyleBlock } from './render.styles';

describe('buildSvgStyleBlock', () => {
  it('returns a non-empty string', () => {
    expect(buildSvgStyleBlock(DEFAULT_WELL_THEME).length).toBeGreaterThan(0);
  });

  it('includes all four class selectors', () => {
    const css = buildSvgStyleBlock(DEFAULT_WELL_THEME);
    expect(css).toContain('.wp-lithology-depth-tip');
    expect(css).toContain('.wp-annotation-label');
    expect(css).toContain('.wp-annotation-header');
    expect(css).toContain('.wp-annotation-body');
  });

  it('embeds theme.lithology.stroke in the depth-tip border', () => {
    const theme = {
      ...DEFAULT_WELL_THEME,
      lithology: { ...DEFAULT_WELL_THEME.lithology, stroke: '#abcdef' },
    };
    expect(buildSvgStyleBlock(theme)).toContain('border:0.5px solid #abcdef');
  });

  it('embeds theme.labels.fontSize in font-size rules', () => {
    const theme = {
      ...DEFAULT_WELL_THEME,
      labels: { ...DEFAULT_WELL_THEME.labels, fontSize: 11 },
    };
    const css = buildSvgStyleBlock(theme);
    expect(css).toContain('font-size:11px');
  });

  it('embeds theme.labels.color in color rules', () => {
    const theme = {
      ...DEFAULT_WELL_THEME,
      labels: { ...DEFAULT_WELL_THEME.labels, color: '#ff0000' },
    };
    const css = buildSvgStyleBlock(theme);
    expect(css).toContain('color:#ff0000');
  });

  it('embeds theme.labels.headerFont in annotation-header font-family', () => {
    const theme = {
      ...DEFAULT_WELL_THEME,
      labels: { ...DEFAULT_WELL_THEME.labels, headerFont: 'courier' },
    };
    expect(buildSvgStyleBlock(theme)).toContain('font-family:courier');
  });

  it('embeds theme.labels.bodyColor in annotation-body color', () => {
    const theme = {
      ...DEFAULT_WELL_THEME,
      labels: { ...DEFAULT_WELL_THEME.labels, bodyColor: '#123456' },
    };
    expect(buildSvgStyleBlock(theme)).toContain('color:#123456');
  });

  it('produces identical output for the same theme (pure function)', () => {
    expect(buildSvgStyleBlock(DEFAULT_WELL_THEME)).toBe(
      buildSvgStyleBlock(DEFAULT_WELL_THEME),
    );
  });
});
