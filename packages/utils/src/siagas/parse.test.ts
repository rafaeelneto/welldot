import { describe, expect, it } from 'vitest';

import { SiagasError } from './errors';
import { decodeEntities, labelKey, readRows } from './html';
import {
  parseDuration,
  parseInches,
  parseSiagasDate,
  parseSiagasNumber,
  parseSiagasPage,
} from './parse';
import {
  FLOWING_WELL,
  INVALID_CODE_PAGE,
  NOT_FOUND_PAGE,
  siagasPage,
} from './test-utils';

describe('html reader', () => {
  it('decodes Latin-1 entities and keeps unknown ones', () => {
    expect(
      decodeEntities('Po&ccedil;o &amp; Aqu&iacute;fero &#225; &bogus;'),
    ).toBe('Poço & Aquífero á &bogus;');
  });

  it('normalizes labels', () => {
    expect(labelKey('  Vazão Após Estabilização (m3/h): ')).toBe(
      'vazao apos estabilizacao (m3/h)',
    );
  });

  it('closes rows without <tr> and emits bold text as headings in order', () => {
    const rows = readRows(
      `<b>A:</b><table><tr><td>x</td><td>1</td></tr>
       <td>y</td><td>2</td></tr></table><b>B:</b>`,
    );
    expect(rows).toEqual([
      { cells: ['A:'], bold: true, table: -1 },
      { cells: ['x', '1'], bold: false, table: 0 },
      { cells: ['y', '2'], bold: false, table: 0 },
      { cells: ['B:'], bold: true, table: -1 },
    ]);
  });
});

describe('value parsers', () => {
  it('reads numbers with either decimal separator', () => {
    expect(parseSiagasNumber('2,0')).toBe(2);
    expect(parseSiagasNumber(' 203.2000 ')).toBe(203.2);
    expect(parseSiagasNumber('0')).toBe(0);
    expect(parseSiagasNumber('')).toBeUndefined();
    expect(parseSiagasNumber('abc')).toBeUndefined();
  });

  it('reads dd/mm/yyyy dates and rejects impossible ones', () => {
    expect(parseSiagasDate('04/11/1977')).toBe('1977-11-04');
    expect(parseSiagasDate('31/02/2000')).toBeUndefined();
    expect(parseSiagasDate('')).toBeUndefined();
  });

  it('reads fractional inches', () => {
    expect(parseInches('17 1/2')).toBe(17.5);
    expect(parseInches('9 5/8')).toBe(9.625);
    expect(parseInches('8')).toBe(8);
    expect(parseInches('')).toBeUndefined();
  });

  it('reads test durations as minutes', () => {
    expect(parseDuration('52:00')).toBe(3120);
    expect(parseDuration('08:30')).toBe(510);
    expect(parseDuration('24')).toBe(1440);
    expect(parseDuration('')).toBeUndefined();
  });
});

describe('parseSiagasPage', () => {
  it('reads every tab of a record', () => {
    const r = parseSiagasPage(siagasPage(FLOWING_WELL));
    expect(r).toMatchObject({
      code: '1500000136',
      uf: 'PA',
      municipality: 'Santarém',
      general: {
        name: '4ST-05-PA',
        installation_date: '1978-06-01',
        nature: 'Poço tubular',
        elevation: 0,
        latitude: '022619',
        longitude: '544414',
        utm_north: 9730246,
      },
      status: [{ date: '1996-02-19', status: 'Abandonado' }],
      drilling: [{ date: '1977-11-04', from: 0, to: 160, method: 'Rotativo' }],
      geomorphology: 'Pediplano',
      formations: [
        { from: 0, to: 27, name: 'Aluviões' },
        { from: 27, to: 160, name: 'Formação Alter do Chão' },
      ],
      aquifers: [{ type: 'Poroso', top: 10, base: 27, condition: 'Livre' }],
      test: {
        date: '1978-02-21',
        flowing: 'S',
        static_level: 3.98,
        duration: 3120,
        dynamic_level: 44.9,
        transmissivity: 0.003,
        flow_rate: 126.5,
        method: 'Jacob',
        equipment: 'Sarilho',
      },
    });
    expect(r.diameters[1]).toEqual({
      from: 16,
      to: 66,
      inches: '17 1/2',
      mm: 444.5,
    });
    expect(r.screens[0]).toMatchObject({ from: 88.01, to: 115.01, slot: 0.5 });
    // The repeated cementation row is kept here; the converter drops it.
    expect(r.annulus).toHaveLength(3);
    expect(r.wellhead).toEqual([
      { date: '1978-01-01', height: 0.42, inches: '12', mm: 304.8 },
    ]);
    expect(r.lithology[0]).toEqual({
      from: 0,
      to: 2,
      lithology: 'Areia Argilosa',
      description: 'AREIA ARGILOSA DE NATUREZA ORGÂNICA.',
    });
  });

  it('reads chemistry, keeping negative values and markup in names', () => {
    const r = parseSiagasPage(siagasPage(FLOWING_WELL));
    expect(r.analysis).toMatchObject({
      sample: 'AA-403/95',
      date: '2010-05-03',
      color: -5,
      turbidity: 2,
      ph: 4.8,
    });
    expect(r.analysis.results).toContainEqual({
      parameter: 'Nitratos (NO3)',
      value: -0.2,
      unit: 'mg/L (ppm)',
    });
    expect(r.analysis.results).toContainEqual({ parameter: 'pH', value: 7.36 });
  });

  it('reads repeated status rows and water entries', () => {
    const r = parseSiagasPage(
      siagasPage({
        status: [
          ['10/06/1991', 'Equipado'],
          ['12/03/2015', 'Parado'],
        ],
        waterEntries: [36.41, 85],
      }),
    );
    expect(r.status).toEqual([
      { date: '1991-06-10', status: 'Equipado' },
      { date: '2015-03-12', status: 'Parado' },
    ]);
    expect(r.water_entries).toEqual([36.41, 85]);
  });

  it('uses the last copy of a page that repeats its block', () => {
    const html =
      siagasPage({ elevation: 26.37 }) + siagasPage({ elevation: 25.41 });
    expect(parseSiagasPage(html).general.elevation).toBe(25.41);
  });

  it('reads a record with empty tables', () => {
    const r = parseSiagasPage(siagasPage());
    expect(r.casings).toEqual([]);
    expect(r.lithology).toEqual([]);
    expect(r.aquifers).toEqual([]);
    expect(r.analysis.results).toEqual([]);
  });

  it.each([NOT_FOUND_PAGE, INVALID_CODE_PAGE])(
    'reports a page without a well as not found',
    page => {
      expect(() => parseSiagasPage(page)).toThrow(SiagasError);
      try {
        parseSiagasPage(page);
      } catch (e) {
        expect((e as SiagasError).kind).toBe('not_found');
      }
    },
  );
});
