import type { Well } from '@welldot/core';
import { describe, expect, it } from 'vitest';
import { buildSectionTables } from './sectionTables';
import type { PdfExportOptions } from './types';

function baseWell(overrides: Partial<Well> = {}): Well {
  return {
    version: 2,
    bore_hole: [],
    well_case: [],
    reduction: [],
    well_screen: [],
    surface_case: [],
    hole_fill: [],
    lithology: [],
    fractures: [],
    caves: [],
    ...overrides,
  };
}

const baseOptions: PdfExportOptions = {
  header: 'Header',
  breakPages: false,
  scale: 500,
  metadataPosition: 'before',
  headingInfo: [],
  endInfo: [],
  lengthUnit: 'm',
  diameterUnit: 'mm',
  coordinateFormat: 'DD',
  locale: 'en',
  baseUrl: 'https://example.test',
};

const t = (key: string) => key.split('.').pop()!;

describe('buildSectionTables', () => {
  it('returns no sections for an entirely empty well', () => {
    expect(buildSectionTables(baseWell(), baseOptions, t)).toEqual([]);
  });

  it('omits cement pad when thickness or width is missing', () => {
    const well = baseWell({
      cement_pad: { type: 'concrete', width: 0, thickness: 0, length: 1 },
    });
    expect(buildSectionTables(well, baseOptions, t)).toEqual([]);
  });

  it('includes cement pad when thickness and width are set', () => {
    const well = baseWell({
      cement_pad: { type: 'concrete', width: 1, thickness: 0.2, length: 1 },
    });
    expect(buildSectionTables(well, baseOptions, t)).toHaveLength(1);
  });

  it('includes only the sections with populated arrays', () => {
    const well = baseWell({
      bore_hole: [{ from: 0, to: 50, diameter: 150 }],
      well_case: [{ from: 0, to: 10, diameter: 150, type: 'PVC' }],
    });
    const sections = buildSectionTables(well, baseOptions, t);
    expect(sections).toHaveLength(2);
  });

  it('includes a centralizer table with "—" for unknown spacing/diameter', () => {
    const well = baseWell({
      centralizers: [
        { from: 6, to: 30, spacing: 6, type: 'spring_bow', diameter: 240 },
        { from: 40, to: 40, type: 'rigid' },
      ],
    });
    const sections = buildSectionTables(well, baseOptions, t);
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
    const sections = buildSectionTables(well, baseOptions, t);
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
    const sections = buildSectionTables(well, baseOptions, t);
    const table = (sections[0] as { table: { body: unknown[][] } }).table;
    // title + header + 3 rows + 2 subtotal rows (group changes twice)
    expect(table.body).toHaveLength(7);
  });

  it('formats diameters and lengths using the given units', () => {
    const well = baseWell({ bore_hole: [{ from: 0, to: 50, diameter: 150 }] });
    const sections = buildSectionTables(
      well,
      { ...baseOptions, lengthUnit: 'ft', diameterUnit: 'inches' },
      t,
    );
    const serialized = JSON.stringify(sections);
    expect(serialized).toContain('ft');
    expect(serialized).toContain('in.');
  });
});
