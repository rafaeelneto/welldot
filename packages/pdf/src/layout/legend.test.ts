import { describe, expect, it } from 'vitest';
import { makeTestContext } from '../test-utils';
import {
  buildLegendStrip,
  computeLegendStripHeight,
  LEGEND_ROW_HEIGHT,
  packLegendRows,
} from './legend';

const ctx = makeTestContext({ locale: 'pt' });
const item = (label: string) => ({
  label,
  symbol: { markup: `<svg id="${label}"></svg>`, width: 28, height: 16 },
});

describe('packLegendRows', () => {
  it("keeps the prototype's six entries on one row", () => {
    const labels = [
      'Revestimento',
      'Filtro',
      'Pré-filtro',
      'Cimentação',
      'Perfuração',
      'Fratura',
    ];
    expect(packLegendRows(labels, ctx)).toEqual([[0, 1, 2, 3, 4, 5]]);
  });

  it('wraps long lists into more rows, in order', () => {
    const labels = Array.from({ length: 14 }, (_, i) => `Entrada ${i} longa`);
    const rows = packLegendRows(labels, ctx);
    expect(rows.length).toBeGreaterThan(1);
    expect(rows.flat()).toEqual(labels.map((_, i) => i));
  });

  it('is empty without labels', () => {
    expect(packLegendRows([], ctx)).toEqual([]);
  });
});

describe('computeLegendStripHeight', () => {
  it('grows by one row height per row and is 0 without labels', () => {
    const one = computeLegendStripHeight(['Filtro'], ctx);
    const many = Array.from({ length: 14 }, (_, i) => `Entrada ${i} longa`);
    const rows = packLegendRows(many, ctx).length;
    expect(computeLegendStripHeight(many, ctx) - one).toBeCloseTo(
      (rows - 1) * LEGEND_ROW_HEIGHT,
    );
    expect(computeLegendStripHeight([], ctx)).toBe(0);
  });
});

describe('buildLegendStrip', () => {
  it('opens with the uppercase title and draws each symbol and label', () => {
    const strip = buildLegendStrip([item('Revestimento'), item('Filtro')], ctx);
    const text = JSON.stringify(strip);
    expect(text).toContain(ctx.labels.document.legendTitle.toUpperCase());
    expect(text).toContain('id=\\"Revestimento\\"');
    // Scaled down: a viewBox keeps the drawing whole.
    expect(text).toContain('viewBox=\\"0 0 28 16\\"');
    expect(text).toContain('"text":"Filtro"');
  });

  it('is null without entries', () => {
    expect(buildLegendStrip([], ctx)).toBeNull();
  });
});
