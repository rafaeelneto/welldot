import { parseWell, serializeWell, WellSchema } from '@welldot/core';
import { describe, expect, it } from 'vitest';

import { siagasToWell, type SiagasToWellOptions } from './convert';
import { parseSiagasPage } from './parse';
import { parseRimasPage } from './rimas';
import {
  emptyRecord,
  FLOWING_WELL,
  rimasPage,
  siagasPage,
  type PageSpec,
} from './test-utils';

const convert = (spec: PageSpec, options: SiagasToWellOptions = {}) =>
  siagasToWell(parseSiagasPage(siagasPage(spec)), options);

const codes = (warnings: { code: string }[]) => warnings.map(w => w.code);

describe('siagasToWell on a page', () => {
  it.each([
    ['a full record', FLOWING_WELL],
    ['a registry with empty tables', {}],
  ])('converts %s to a valid .well that round-trips', (_, spec) => {
    const { well } = convert(spec);
    expect(WellSchema.safeParse(well).success).toBe(true);
    const back = parseWell(serializeWell(well));
    expect(back.well_id).toEqual([
      { authority: 'SIAGAS', id: '1500000136', primary: true },
    ]);
    expect((back as Record<string, unknown>)['x-siagas']).toMatchObject({
      ponto: '1500000136',
    });
  });

  it('converts a flowing well', () => {
    const { well, warnings } = convert(FLOWING_WELL);
    expect(well.location).toMatchObject({ lat: -2.43861, lng: -54.73722 });
    expect(well.location?.elevation).toBeUndefined();
    expect(well.location?.properties?.original_crs).toBe('EPSG:31981');
    expect(well.well_depth).toBe(160);
    expect(well.construction_date).toBe('1977-11-04');
    expect(well.bore_hole[0]).toEqual({
      from: 0,
      to: 16,
      diameter: 558.8,
      drilling_method: 'rotary',
    });
    // Stick-up of 0.42 m on the longest casing from the surface.
    expect(well.well_case[0]).toMatchObject({
      from: -0.42,
      to: 88.01,
      type: 'galvanized_steel',
    });
    expect(well.well_screen[0]).toMatchObject({
      type: 'stainless_steel',
      slot_type: 'continuous_slot',
      screen_slot: 0.5,
    });
    expect(well.hole_fill).toHaveLength(2);
    expect(well.hole_fill[0]).toMatchObject({
      type: 'seal',
      diameter: 558.8,
      description: 'Cimentação',
    });
    expect(well.lithology[0]).toMatchObject({
      texture: { code: 612, vocabulary: 'fgdc' },
      geologic_unit: 'Aluviões',
    });
    expect(well.lithology[2].aquifer_unit).toBe('Poroso');
    expect(well.lithology[3].aquifer_unit).toBe('');

    expect(well.hydrodynamic_events?.[0]).toMatchObject({
      type: 'constant_rate',
      datetime: '1978-02-21T00:00:00-03:00',
      static_level: -3.98,
      steps: [
        {
          rate: 126.5,
          duration: 3120,
          readings: [{ elapsed: 3120, depth: 44.9 }],
        },
      ],
    });
    expect(well.aquifer_analysis?.[0]).toMatchObject({
      method: 'cooper_jacob',
      specific_capacity: 2.588,
      transmissivity: 0.003,
    });
    expect(well.history_logs?.[0]).toMatchObject({
      category: 'status_change',
      status: 'abandoned',
    });
    expect(codes(warnings)).toEqual(
      expect.arrayContaining([
        'elevation_zero',
        'duplicate_rows',
        'overlapping_intervals',
        'lithology_mismatch',
      ]),
    );
  });

  it('writes the analysis with censored values', () => {
    const { well, warnings } = convert(FLOWING_WELL);
    const sample = well.water_samples?.[0];
    expect(sample).toMatchObject({
      datetime: '2010-05-03T00:00:00-03:00',
      notes: expect.stringContaining('AA-403/95'),
    });
    const results = sample?.results ?? [];
    expect(results).toContainEqual({
      parameter: { code: 'nitrate_as_no3', vocabulary: 'welldot' },
      value: 0.2,
      qualifier: '<',
      measured_in: 'lab',
    });
    expect(results).toContainEqual({
      parameter: { code: 'apparent_color', vocabulary: 'welldot' },
      value: 5,
      qualifier: '<',
    });
    expect(results).toContainEqual({
      parameter: { code: 'turbidity_ntu', vocabulary: 'welldot' },
      value: 2,
    });
    expect(results).toContainEqual({
      parameter: { code: 'ph', vocabulary: 'welldot' },
      value: 7.36,
      measured_in: 'lab',
    });
    expect(codes(warnings)).toEqual(
      expect.arrayContaining(['zero_results', 'unmapped_parameters']),
    );
  });

  it('leaves out an analysis without a date', () => {
    const { well, warnings } = convert({
      ...FLOWING_WELL,
      analysis: { ph: 4.8 },
    });
    expect(well.water_samples).toBeUndefined();
    expect(codes(warnings)).toContain('analysis_without_date');
  });

  it('keeps a registry without construction data', () => {
    const { well, warnings } = convert({ wellhead: [['', 0.43, '', 0]] });
    expect(well.bore_hole).toEqual([]);
    expect(well.lithology).toEqual([]);
    expect(codes(warnings)).toEqual(
      expect.arrayContaining(['no_bore_hole', 'stick_up_not_applied']),
    );
  });

  it('adds the RIMAS series and photos', () => {
    const rimas = parseRimasPage(
      rimasPage(
        [
          ['2015-05-11', '11.162'],
          ['2015-05-12', '11.172'],
          ['2015-06-01', '11.3'],
        ],
        [
          ['1500000136_1.jpg', 'Foto 1'],
          ['1500000136_2.jpg', 'Foto 2'],
        ],
      ),
    );
    const spec = { nature: 'Poço de monitoramento', use: 'Sem uso' };
    const monthly = convert(spec, { rimas });
    const rimasEvents = (w: typeof monthly.well) =>
      (w.hydrodynamic_events ?? []).filter(e => e.id.startsWith('rimas-'));
    expect(rimasEvents(monthly.well)).toEqual([
      expect.objectContaining({
        id: 'rimas-20150512',
        type: 'spot_measurement',
        static_level: 11.172,
        measurement_method: 'pressure_transducer',
      }),
      expect.objectContaining({ id: 'rimas-20150601' }),
    ]);
    expect(codes(monthly.warnings)).toContain('rimas_monthly');
    expect(
      rimasEvents(convert(spec, { rimas, rimasMode: 'all' }).well),
    ).toHaveLength(3);
    expect(
      rimasEvents(convert(spec, { rimas, rimasMode: 'none' }).well),
    ).toEqual([]);

    expect(monthly.well.attachments?.map(a => a.document_type)).toEqual([
      'registry_record',
      'photo',
      'photo',
    ]);
    expect(monthly.well.attachments?.[1]).toMatchObject({
      uri: 'https://rimasweb.sgb.gov.br/documentos/1500000136_1.jpg',
      media_type: 'image/jpeg',
      description: 'Foto 1',
    });
    expect(
      convert(spec, { rimas, media: false }).well.attachments,
    ).toHaveLength(1);
    expect(monthly.well.well_type).toBe('tubular');
    expect(monthly.well.well_purpose).toEqual(['monitoring']);
  });
});

describe('zero and negative values by field', () => {
  it('keeps a layer that starts at 0 m', () => {
    const { well } = siagasToWell(
      emptyRecord({
        lithology: [
          { from: 0, to: 4, lithology: 'Argila', description: 'Argila cinza' },
        ],
      }),
    );
    expect(well.lithology[0]).toMatchObject({
      from: 0,
      to: 4,
      texture: { code: 620 },
    });
  });

  it('drops rows whose interval is empty', () => {
    const { well, warnings } = siagasToWell(
      emptyRecord({ lithology: [{ from: 0, to: 0, lithology: 'Argila' }] }),
    );
    expect(well.lithology).toEqual([]);
    expect(codes(warnings)).toContain('invalid_interval');
  });

  it('turns a positive static level negative when SIAGAS says "Surgência: S"', () => {
    const { well } = siagasToWell(
      emptyRecord({
        test: {
          date: '2000-01-01',
          flowing: 'S',
          static_level: 2,
          flow_rate: 10,
        },
      }),
    );
    expect(well.hydrodynamic_events?.[0]).toMatchObject({ static_level: -2 });
  });

  it('keeps a negative static level and warns when "Surgência: N"', () => {
    const { well, warnings } = siagasToWell(
      emptyRecord({
        test: {
          date: '2000-01-01',
          flowing: 'N',
          static_level: -1.5,
          flow_rate: 10,
        },
      }),
    );
    expect(well.hydrodynamic_events?.[0]).toMatchObject({ static_level: -1.5 });
    expect(codes(warnings)).toContain('flowing_without_flag');
  });

  it('keeps a static level of 0 when the test has other data', () => {
    const { well, warnings } = siagasToWell(
      emptyRecord({
        test: {
          date: '2000-01-01',
          static_level: 0,
          dynamic_level: 12,
          flow_rate: 5,
        },
      }),
    );
    expect(well.hydrodynamic_events?.[0]).toMatchObject({ static_level: 0 });
    expect(well.aquifer_analysis?.[0].specific_capacity).toBe(0.417);
    expect(codes(warnings)).toContain('static_level_zero');
  });

  it('treats a test with only zeros as absent', () => {
    const { well } = siagasToWell(
      emptyRecord({
        test: {
          static_level: 0,
          dynamic_level: 0,
          flow_rate: 0,
          transmissivity: 0,
        },
      }),
    );
    expect(well.hydrodynamic_events).toBeUndefined();
    expect(well.aquifer_analysis).toBeUndefined();
  });

  it('leaves out a zero elevation and keeps a real one', () => {
    const coords = {
      latitude: '194500',
      longitude: '435600',
      utm_north: 7_820_000,
    };
    const zero = siagasToWell(
      emptyRecord({ general: { ...coords, elevation: 0 } }),
    );
    expect(zero.well.location?.elevation).toBeUndefined();
    expect(codes(zero.warnings)).toContain('elevation_zero');
    const real = siagasToWell(
      emptyRecord({ general: { ...coords, elevation: 850 } }),
    );
    expect(real.well.location).toMatchObject({
      lat: -19.75,
      lng: -43.93333,
      elevation: 850,
    });
  });

  it('places a well north of the equator when the UTM northing says so', () => {
    const { well } = siagasToWell(
      emptyRecord({
        uf: 'RR',
        general: {
          latitude: '024900',
          longitude: '604000',
          utm_north: 313_000,
        },
      }),
    );
    expect(well.location).toMatchObject({ lat: 2.81667, lng: -60.66667 });
    expect(well.location?.properties?.original_crs).toBe('EPSG:31974');
  });

  it('skips zero concentrations and censors negative ones', () => {
    const { well, warnings } = siagasToWell(
      emptyRecord({
        analysis: {
          date: '2010-05-03',
          conductivity: 0,
          color: -5,
          results: [
            { parameter: 'Cloreto (Cl)', value: 0, unit: 'mg/L (ppm)' },
            { parameter: 'Ferro total (Fe)', value: -0.05, unit: 'mg/L (ppm)' },
            { parameter: 'Brometo', value: 0.02, unit: 'mg/L (ppm)' },
          ],
        },
      }),
    );
    expect(well.water_samples?.[0]).toMatchObject({
      datetime: '2010-05-03T00:00:00-03:00',
      results: [
        {
          parameter: { code: 'apparent_color', vocabulary: 'welldot' },
          value: 5,
          qualifier: '<',
        },
        {
          parameter: { code: 'iron', vocabulary: 'welldot' },
          value: 0.05,
          qualifier: '<',
        },
        {
          parameter: { code: 'brometo', vocabulary: 'x-siagas' },
          value: 0.02,
          unit: 'mg/L',
        },
      ],
    });
    expect(codes(warnings)).toEqual(
      expect.arrayContaining(['zero_results', 'unmapped_parameters']),
    );
  });

  it('uses the state UTC offset for dates', () => {
    const { well } = siagasToWell(
      emptyRecord({
        uf: 'AM',
        water_level: { date: '2015-03-01', level: 4.2 },
      }),
    );
    expect(well.hydrodynamic_events?.[0]).toMatchObject({
      type: 'spot_measurement',
      datetime: '2015-03-01T00:00:00-04:00',
      static_level: 4.2,
    });
  });
});
