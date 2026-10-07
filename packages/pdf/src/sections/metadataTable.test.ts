import { describe, expect, it } from 'vitest';
import { baseWell, keyT, makeTestContext } from '../test-utils';
import { buildMetadataTable } from './metadataTable';

const ctx = makeTestContext({ locale: 'pt' }, keyT);

describe('buildMetadataTable', () => {
  it('returns null when no metadata field is populated', () => {
    expect(buildMetadataTable(baseWell(), ctx)).toBeNull();
  });

  it('includes only populated fields', () => {
    const well = baseWell({ name: 'Well A', well_driller: 'Acme Drilling' });
    const table = buildMetadataTable(well, ctx);
    expect(table).not.toBeNull();
    const serialized = JSON.stringify(table);
    expect(serialized).toContain('Well A');
    expect(serialized).toContain('Acme Drilling');
    expect(serialized).not.toContain('general.wellType');
  });

  it('includes well_purpose as a joined list of translated labels', () => {
    const well = baseWell({ well_purpose: ['production', 'x-custom'] });
    const serialized = JSON.stringify(buildMetadataTable(well, ctx));
    expect(serialized).toContain('general.wellPurpose');
    expect(serialized).toContain('Produção / captação, x-custom');
  });

  it('omits well_purpose when empty', () => {
    const well = baseWell({ name: 'A', well_purpose: [] });
    const serialized = JSON.stringify(buildMetadataTable(well, ctx));
    expect(serialized).not.toContain('general.wellPurpose');
  });

  it('formats coordinates via coordinateFormat and elevation via lengthUnit', () => {
    const well = baseWell({
      location: { lat: -23.5, lng: -46.6, elevation: 760 },
    });
    const table = buildMetadataTable(
      well,
      makeTestContext({ locale: 'pt', units: { length: 'ft' } }, keyT),
    );
    const serialized = JSON.stringify(table);
    expect(serialized).toContain('ft');
  });

  it('includes well_depth formatted via lengthUnit when set', () => {
    const well = baseWell({ well_depth: 187.3 });
    const serialized = JSON.stringify(buildMetadataTable(well, ctx));
    expect(serialized).toContain('187.3');
  });

  it('omits well_depth when unset and no constructive/geologic data exists', () => {
    const well = baseWell({ name: 'Well A' });
    const serialized = JSON.stringify(buildMetadataTable(well, ctx));
    expect(serialized).not.toContain('general.wellDepth');
  });

  it('falls back to the calculated depth when well_depth is unset but bore_hole has data', () => {
    const well = baseWell({ bore_hole: [{ from: 0, to: 150, diameter: 200 }] });
    const serialized = JSON.stringify(buildMetadataTable(well, ctx));
    expect(serialized).toContain('general.wellDepth');
    expect(serialized).toContain('150');
  });

  it('formats construction_date as dd/MM/yyyy', () => {
    const well = baseWell({ construction_date: '2024-03-05' });
    const table = buildMetadataTable(well, ctx);
    expect(JSON.stringify(table)).toContain('05/03/2024');
  });

  it('includes well identifiers, marking the primary one', () => {
    const well = baseWell({
      well_id: [
        { authority: 'SIAGAS', id: 'SP-0042819', primary: true },
        { authority: 'ANA', id: '12345' },
        { authority: '', id: 'no-authority' },
      ],
    });
    const serialized = JSON.stringify(buildMetadataTable(well, ctx));
    expect(serialized).toContain('SIAGAS (general.wellIds.primary)');
    expect(serialized).toContain('SP-0042819');
    expect(serialized).toContain('ANA');
    expect(serialized).toContain('12345');
    expect(serialized).toContain('general.wellIds.id');
    expect(serialized).toContain('no-authority');
  });

  it('skips well_id entries with no id', () => {
    const well = baseWell({ well_id: [{ authority: 'SIAGAS', id: '' }] });
    expect(buildMetadataTable(well, ctx)).toBeNull();
  });

  it('formats construction_date with a custom dateFormats.date', () => {
    const well = baseWell({ construction_date: '2024-03-05' });
    const table = buildMetadataTable(
      well,
      makeTestContext(
        { locale: 'pt', dateFormats: { date: 'yyyy-MM-dd' } },
        keyT,
      ),
    );
    const serialized = JSON.stringify(table);
    expect(serialized).toContain('2024-03-05');
    expect(serialized).not.toContain('05/03/2024');
  });

  it('formats coordinates as DMS when coordinateFormat is DMS', () => {
    const well = baseWell({ location: { lat: -23.5, lng: -46.6 } });
    const serialized = JSON.stringify(
      buildMetadataTable(
        well,
        makeTestContext({ locale: 'pt', coordinateFormat: 'DMS' }, keyT),
      ),
    );
    expect(serialized).toContain('23°30');
    expect(serialized).toContain('S');
  });
});
