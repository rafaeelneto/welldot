import { describe, expect, it } from 'vitest';
import { baseWell, lastSegmentLabels, makeTestContext } from '../test-utils';
import { buildSectionTables } from './sectionTables';

const ctx = makeTestContext({}, lastSegmentLabels);

describe('buildSectionTables', () => {
  it('returns no sections for an entirely empty well', () => {
    expect(buildSectionTables(baseWell(), ctx)).toEqual([]);
  });

  it('omits cement pad when thickness or width is missing', () => {
    const well = baseWell({
      cement_pad: { type: 'concrete', width: 0, thickness: 0, length: 1 },
    });
    expect(buildSectionTables(well, ctx)).toEqual([]);
  });

  it('includes cement pad when thickness and width are set', () => {
    const well = baseWell({
      cement_pad: { type: 'concrete', width: 1, thickness: 0.2, length: 1 },
    });
    expect(buildSectionTables(well, ctx)).toHaveLength(1);
  });

  it('includes only the sections with populated arrays', () => {
    const well = baseWell({
      bore_hole: [{ from: 0, to: 50, diameter: 150 }],
      well_case: [{ from: 0, to: 10, diameter: 150, type: 'PVC' }],
    });
    const sections = buildSectionTables(well, ctx);
    expect(sections).toHaveLength(2);
  });

  it('includes a centralizer table with "—" for unknown spacing/diameter', () => {
    const well = baseWell({
      centralizers: [
        { from: 6, to: 30, spacing: 6, type: 'spring_bow', diameter: 240 },
        { from: 40, to: 40, type: 'rigid' },
      ],
    });
    const sections = buildSectionTables(well, ctx);
    expect(sections).toHaveLength(1);
    const serialized = JSON.stringify(sections[0]);
    expect(serialized).toContain('Spring bow');
    expect(serialized).toContain('Rigid');
    expect(serialized).toContain('—');
  });

  it('inserts a volume subtotal row when the hole-fill type changes', () => {
    const well = baseWell({
      hole_fill: [
        {
          from: 0,
          to: 5,
          diameter: 200,
          type: 'gravel_pack',
          description: 'Gravel',
        },
        { from: 5, to: 10, diameter: 200, type: 'seal', description: 'Seal' },
      ],
      bore_hole: [{ from: 0, to: 10, diameter: 250 }],
    });
    const sections = buildSectionTables(well, ctx);
    const holeFillSection = sections.find(s =>
      JSON.stringify(s).includes('Gravel'),
    );
    expect(holeFillSection).toBeDefined();
    const table = (holeFillSection as { table: { body: unknown[][] } }).table;
    // title + header row + 2 items + 2 subtotal rows (type changes every row here)
    expect(table.body).toHaveLength(6);
  });

  it('groups well_case subtotal rows by type + diameter', () => {
    const well = baseWell({
      well_case: [
        { from: 0, to: 5, diameter: 150, type: 'PVC' },
        { from: 5, to: 10, diameter: 150, type: 'PVC' },
        { from: 10, to: 15, diameter: 100, type: 'Steel' },
      ],
    });
    const sections = buildSectionTables(well, ctx);
    const table = (sections[0] as { table: { body: unknown[][] } }).table;
    // title + header + 3 rows + 2 subtotal rows (group changes twice)
    expect(table.body).toHaveLength(7);
  });

  it('formats diameters and lengths using the given units', () => {
    const well = baseWell({ bore_hole: [{ from: 0, to: 50, diameter: 150 }] });
    const sections = buildSectionTables(
      well,
      makeTestContext(
        { units: { length: 'ft', diameter: 'inches' } },
        lastSegmentLabels,
      ),
    );
    const serialized = JSON.stringify(sections);
    expect(serialized).toContain('ft');
    expect(serialized).toContain('in.');
  });

  it('draws the cement pad rules with the theme tableRule color', () => {
    const well = baseWell({
      cement_pad: { type: 'concrete', width: 1, thickness: 0.2, length: 1 },
    });
    const [section] = buildSectionTables(
      well,
      makeTestContext(
        { theme: { colors: { tableRule: '#123456' } } },
        lastSegmentLabels,
      ),
    );
    const layout = (
      section as { layout: { hLineColor: (..._args: unknown[]) => string } }
    ).layout;
    expect(layout.hLineColor()).toBe('#123456');
  });

  it('resolves headers from the package label pack by default', () => {
    const well = baseWell({ bore_hole: [{ from: 0, to: 50, diameter: 150 }] });
    const serialized = JSON.stringify(
      buildSectionTables(well, makeTestContext({ locale: 'pt' })),
    );
    expect(serialized).toContain('Poço (Sondagem)');
    expect(serialized).toContain('De (m)');
  });
});
