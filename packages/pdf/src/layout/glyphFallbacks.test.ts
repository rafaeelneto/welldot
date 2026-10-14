import { describe, expect, it } from 'vitest';
import type { Content } from '../types/pdfmake.types';
import { applyGlyphFallbacks } from './glyphFallbacks';

describe('applyGlyphFallbacks', () => {
  it('replaces superscript signs in text, table cells and stacks', () => {
    const content: Content[] = [
      { text: 'HCO₃⁻' },
      {
        table: {
          body: [['SMEWW 4500-NO₃⁻ E', { text: [{ text: 'H⁺' }] }]],
        },
      },
      { stack: ['SO₄²⁻'] },
    ];
    expect(JSON.stringify(applyGlyphFallbacks(content))).toBe(
      JSON.stringify([
        { text: 'HCO₃−' },
        {
          table: {
            body: [['SMEWW 4500-NO₃− E', { text: [{ text: 'H+' }] }]],
          },
        },
        { stack: ['SO₄²−'] },
      ]),
    );
  });

  it('leaves SVG markup and functions untouched without mutating the input', () => {
    const hLineWidth = () => 1;
    const content: Content[] = [
      { svg: '<text>Cl⁻</text>', width: 10 },
      { layout: { hLineWidth }, table: { body: [['Cl⁻']] } },
    ];
    const out = applyGlyphFallbacks(content) as {
      svg?: string;
      layout?: { hLineWidth: unknown };
    }[];
    expect(out[0]!.svg).toBe('<text>Cl⁻</text>');
    expect(out[1]!.layout!.hLineWidth).toBe(hLineWidth);
    expect(JSON.stringify(content)).toContain('Cl⁻');
  });
});
