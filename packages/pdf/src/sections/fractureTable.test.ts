import { describe, expect, it } from 'vitest';
import { baseWell, makeTestContext } from '../test-utils';
import type { ContentTable } from '../types/pdfmake.types';
import { buildFractureSection } from './fractureTable';

const well = baseWell({
  fractures: [
    { depth: 300, water_intake: false, description: '', swarm: false },
    { depth: 188, water_intake: true, description: 'Disjunção', swarm: false },
  ],
  caves: [{ from: 200, to: 204, water_intake: false, description: 'Seca' }],
} as never);

describe('buildFractureSection', () => {
  it('is empty in the detailed format', () => {
    expect(buildFractureSection(well, makeTestContext())).toEqual([]);
  });

  it('lists fractures by depth, numbered as in the profile, without caves', () => {
    const [table] = buildFractureSection(
      well,
      makeTestContext({ format: 'compact', locale: 'pt' }),
    ) as ContentTable[];
    const rows = table!.table.body.slice(2).map(r => JSON.stringify(r));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain('188 m');
    expect(rows[0]).toContain('F2 · fratura aberta');
    expect(rows[0]).toContain('Disjunção');
    expect(rows[1]).toContain('F1 · fratura');
    expect(rows.join()).not.toContain('caverna');
  });

  it('uses the same rules as the other section tables', () => {
    const [table] = buildFractureSection(
      well,
      makeTestContext({ format: 'compact' }),
    ) as ContentTable[];
    expect(table!.layout).toBe('lightHorizontalLines');
  });
});
