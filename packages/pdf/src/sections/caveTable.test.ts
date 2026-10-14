import { describe, expect, it } from 'vitest';
import { baseWell, makeTestContext } from '../test-utils';
import type { ContentTable } from '../types/pdfmake.types';
import { buildCaveSection } from './caveTable';

const well = baseWell({
  caves: [
    { from: 210, to: 212, water_intake: true, description: 'Conduto' },
    { from: 200, to: 204, water_intake: false, description: '' },
  ],
} as never);

describe('buildCaveSection', () => {
  it('is empty in the detailed format or without caves', () => {
    expect(buildCaveSection(well, makeTestContext())).toEqual([]);
    expect(
      buildCaveSection(baseWell(), makeTestContext({ format: 'compact' })),
    ).toEqual([]);
  });

  it('lists caves by depth with their kind and description', () => {
    const [table] = buildCaveSection(
      well,
      makeTestContext({ format: 'compact', locale: 'pt' }),
    ) as ContentTable[];
    expect(table!.layout).toBe('lightHorizontalLines');
    const rows = table!.table.body.slice(2).map(r => JSON.stringify(r));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain('200–204 m');
    expect(rows[0]).toContain('caverna seca');
    expect(rows[1]).toContain('caverna com água');
    expect(rows[1]).toContain('Conduto');
  });
});
