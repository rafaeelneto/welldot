import type { Lithology } from '@welldot/core';
import { describe, expect, it } from 'vitest';
import { baseWell, makeTestContext } from '../test-utils';
import type { ContentTable } from '../types/pdfmake.types';
import { buildLithologySection } from './lithologyTable';

const lithology = [
  {
    from: 0,
    to: 12,
    description: 'Solo e basalto alterado',
    color: '#7a3b2e',
    texture: { code: 607 },
    geologic_unit: 'Formação Serra Geral',
    aquifer_unit: 'Aquífero Serra Geral',
  },
  {
    from: 12,
    to: 455.5,
    description: '',
    color: '',
    texture: { code: 701 },
    geologic_unit: '',
    aquifer_unit: '',
  },
] as Lithology[];

describe('buildLithologySection', () => {
  it('is empty in the detailed format', () => {
    expect(
      buildLithologySection(baseWell({ lithology }), makeTestContext()),
    ).toEqual([]);
  });

  it('lists each layer with its range, units and description', () => {
    const [table] = buildLithologySection(
      baseWell({ lithology }),
      makeTestContext({ format: 'compact' }),
    ) as ContentTable[];
    const text = JSON.stringify(table!.table.body);
    // Title row, header row, one row per layer.
    expect(table!.table.body).toHaveLength(4);
    expect(text).toContain('0–12 m');
    expect(text).toContain('12–455.5 m');
    expect(text).toContain('Formação Serra Geral');
    expect(text).toContain('"italics":true');
    expect(text).toContain('Solo e basalto alterado');
  });

  it('uses the rendered swatch, else a rect of the layer color', () => {
    const [table] = buildLithologySection(
      baseWell({ lithology }),
      makeTestContext({ format: 'compact' }),
      {
        lithologySwatches: [
          { markup: '<svg id="a"></svg>', width: 9, height: 9 },
          null,
        ],
      },
    ) as ContentTable[];
    const text = JSON.stringify(table!.table.body);
    expect(text).toContain('<svg id=\\"a\\">');
    expect(text).toContain('"type":"rect"');
  });
});
