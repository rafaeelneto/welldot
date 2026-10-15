import { describe, expect, it } from 'vitest';

import type {
  HydrodynamicEvent,
  Limit,
  WaterQualityResult,
  WaterSample,
  Well,
} from '@welldot/core';

import {
  DEFAULT_PURGE_STABILIZATION_CRITERIA,
  getAcidDrainageIndicators,
  getBlankContamination,
  getEffectiveWaterSamples,
  getExceedances,
  getHoldingTimes,
  getHydrochemicalFacies,
  getIonBalance,
  getLatestResult,
  getPiperCoordinates,
  getPurgeStabilization,
  getReceivedTemperatureCompliance,
  getRelativePercentDifferences,
  getRetractedSampleIds,
  getSampleDepth,
  getStiffValues,
  getWaterSampleWarnings,
  isFormationWater,
  isResultUsable,
  type WaterSampleWarningCode,
} from './waterQuality.utils';

function makeWell(patch: Partial<Well> = {}): Well {
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
    ...patch,
  };
}

const w = (code: string) => ({ code, vocabulary: 'welldot' });

const res = (
  code: string,
  value: number,
  patch: Partial<WaterQualityResult> = {},
): WaterQualityResult => ({ parameter: w(code), value, ...patch });

const sample = (
  id: string,
  results: WaterQualityResult[],
  patch: Partial<WaterSample> = {},
): WaterSample => ({
  id,
  datetime: '2026-01-10T10:00:00-03:00',
  sample_type: 'routine',
  results,
  ...patch,
});

// ─── Spec "Exemplo completo" ─────────────────────────────────────────────────

const SPEC_SAMPLES = [
  {
    id: 'ws-2026-09-a',
    datetime: '2026-09-15T09:30:00-03:00',
    sample_type: 'routine',
    campaign: '2026-Q3',
    sampling_method: 'low_flow',
    sampling_point: {
      type: 'in_well',
      depth: 42.5,
      device: 'low_flow_pump',
    },
    purge: {
      duration: 35,
      volume: 0.0105,
      flow_rate: 0.018,
      stabilized: true,
      readings: [
        { elapsed: 25, parameter: w('ph'), value: 4.9 },
        { elapsed: 30, parameter: w('ph'), value: 4.8 },
        { elapsed: 35, parameter: w('ph'), value: 4.8 },
      ],
    },
    static_level_event_id: 'evt-2026-09-15',
    collected_by: 'Field team A',
    chain_of_custody: 'CC-0918',
    laboratory: {
      name: 'Lab X',
      accreditation: 'ISO/IEC 17025 #1234',
      report_number: 'LD-4471/26',
      batch_id: 'WO-88213',
      sample_id: '88213-01',
      received_at: '2026-09-15T18:20:00-03:00',
      received_temperature: 4.1,
    },
    attachments: [
      {
        id: 'a1',
        uri: 'https://files.example.org/pm01/LD-4471-26.pdf',
        media_type: 'application/pdf',
        document_type: 'lab_report',
      },
    ],
    results: [
      { parameter: w('ph'), value: 4.8, measured_in: 'field' },
      {
        parameter: w('specific_conductance'),
        value: 1240,
        measured_in: 'field',
      },
      { parameter: w('turbidity_fnu'), value: 3.1, measured_in: 'field' },
      {
        parameter: w('sulfate'),
        value: 412,
        method: 'US EPA 300.0',
        measured_in: 'lab',
        analyzed_at: '2026-09-17T00:00:00-03:00',
        analyzed_at_resolution: 'day',
        validation: { status: 'validated', validated_by: 'QA reviewer' },
      },
      {
        parameter: w('iron'),
        value: 18.6,
        fraction: 'dissolved',
        filtration: { pore_size: 0.45, location: 'field' },
        method: 'US EPA 200.8',
        measured_in: 'lab',
      },
      {
        parameter: w('cyanide_wad_as_cn'),
        qualifier: 'estimated',
        value: 0.004,
        detection_limit: 0.002,
        quantification_limit: 0.005,
        measured_in: 'lab',
        lab_flags: ['J'],
        validation: { status: 'qualified', qualifier: 'J' },
      },
      {
        parameter: { code: '71-43-2', vocabulary: 'cas' },
        qualifier: '<',
        value: 0.001,
        measured_in: 'lab',
      },
      {
        parameter: w('e_coli'),
        presence: false,
        measured_in: 'lab',
        analyzed_at: '2026-09-15T19:10:00-03:00',
      },
    ],
  },
  {
    id: 'ws-2026-09-b',
    datetime: '2026-09-15T09:35:00-03:00',
    sample_type: 'field_duplicate',
    parent_sample_id: 'ws-2026-09-a',
    campaign: '2026-Q3',
    sampling_point: { type: 'in_well', depth: 42.5, device: 'low_flow_pump' },
    results: [{ parameter: w('sulfate'), value: 398, measured_in: 'lab' }],
  },
] as WaterSample[];

const specWell = (samples: WaterSample[] = SPEC_SAMPLES): Well =>
  makeWell({
    well_depth: 60,
    bore_hole: [{ from: 0, to: 60, diameter: 200 }],
    well_screen: [
      {
        from: 36,
        to: 48,
        type: 'pvc_slotted',
        diameter: 100,
        screen_slot: 0.5,
      },
    ],
    hydrodynamic_events: [
      {
        id: 'evt-2026-09-15',
        type: 'spot_measurement',
        datetime: '2026-09-15T09:00:00-03:00',
        static_level: 18.2,
      },
    ] as HydrodynamicEvent[],
    water_samples: samples,
  });

describe('spec complete example (golden)', () => {
  const well = specWell();
  const [a, b] = SPEC_SAMPLES;

  it('raises no warnings', () => {
    expect(getWaterSampleWarnings(well)).toEqual([]);
  });

  it('derives a sulfate RPD of ≈ 3.5 %', () => {
    const rpd = getRelativePercentDifferences(well, b.id);
    expect(rpd).toHaveLength(1);
    expect(rpd[0]).toMatchObject({
      key: 'sulfate',
      original: 412,
      duplicate: 398,
    });
    expect(rpd[0].rpd_pct).toBeCloseTo((14 / 405) * 100, 6);
    expect(rpd[0].rpd_pct).toBeCloseTo(3.46, 2);
  });

  it('measures holding times (E. coli 9 h 40 min, sulfate 2 days)', () => {
    const times = getHoldingTimes(a);
    const eColi = times.find(t => t.key === 'e_coli')!;
    expect(eColi.resolution).toBe('instant');
    expect(eColi.hours).toBeCloseTo(9 + 40 / 60, 6);
    expect(eColi.result_index).toBe(7);
    const so4 = times.find(t => t.key === 'sulfate')!;
    expect(so4).toEqual({
      result_index: 3,
      key: 'sulfate',
      hours: 48,
      resolution: 'day',
    });
  });

  it('accepts the receipt temperature', () => {
    expect(getReceivedTemperatureCompliance(a)).toBe(true);
  });

  it('keeps the qualified WAD cyanide in derivations', () => {
    expect(isResultUsable(a.results[5])).toBe(true);
    expect(getLatestResult(well, 'cyanide_wad_as_cn')?.result.value).toBe(
      0.004,
    );
    const limits: Limit[] = [{ code: 'cyanide_wad_as_cn', max: 0.002 }];
    expect(getExceedances(a, limits)).toEqual([
      {
        result_index: 5,
        parameter: w('cyanide_wad_as_cn'),
        limit: limits[0],
        kind: 'above_max',
      },
    ]);
  });

  it('excludes a rejected result', () => {
    const rejected: WaterSample = {
      ...a,
      results: a.results.map((r, i) =>
        i === 5 ? { ...r, validation: { status: 'rejected' } } : r,
      ),
    };
    const w2 = specWell([rejected, b]);
    expect(getLatestResult(w2, 'cyanide_wad_as_cn')).toBeUndefined();
    expect(
      getExceedances(rejected, [{ code: 'cyanide_wad_as_cn', max: 0.002 }]),
    ).toEqual([]);
  });

  it('is formation water and the purge pH stabilized', () => {
    expect(getSampleDepth(well, a)).toEqual({ kind: 'point', depth: 42.5 });
    expect(isFormationWater(well, a)).toBe(true);
    expect(getPurgeStabilization(a.purge)).toEqual({
      stabilized: true,
      parameters: [{ key: 'ph', stabilized: true, readings: 3 }],
    });
  });

  it('compares the benzene CAS result as censored', () => {
    expect(getExceedances(a, [{ code: 'cas:71-43-2', max: 0.0005 }])).toEqual(
      [],
    );
  });
});

// ─── Ledger ──────────────────────────────────────────────────────────────────

describe('ledger', () => {
  it('getRetractedSampleIds collects corrected ids', () => {
    const well = makeWell({
      water_samples: [
        sample('a', [res('ph', 7)]),
        sample('b', [res('ph', 7.1)], { corrects: 'a' }),
      ],
    });
    expect([...getRetractedSampleIds(well)]).toEqual(['a']);
    expect(getRetractedSampleIds(makeWell()).size).toBe(0);
  });

  it('getEffectiveWaterSamples excludes retracted and sorts', () => {
    const well = makeWell({
      water_samples: [
        sample('late', [], { datetime: '2026-02-01T00:00:00Z' }),
        sample('t2', [], { datetime: '2026-01-01T00:00:00Z', sequence: 2 }),
        sample('t1', [], { datetime: '2026-01-01T00:00:00Z', sequence: 1 }),
        sample('t1b', [], { datetime: '2026-01-01T00:00:00Z', sequence: 1 }),
        sample('old', [], { datetime: '2025-01-01T00:00:00Z' }),
        sample('fix', [], {
          datetime: '2025-06-01T00:00:00Z',
          corrects: 'old',
        }),
      ],
    });
    expect(getEffectiveWaterSamples(well).map(s => s.id)).toEqual([
      'fix',
      't1',
      't1b',
      't2',
      'late',
    ]);
  });

  it('isResultUsable rejects only rejected results', () => {
    expect(isResultUsable(res('ph', 7))).toBe(true);
    expect(
      isResultUsable(res('ph', 7, { validation: { status: 'qualified' } })),
    ).toBe(true);
    expect(
      isResultUsable(res('ph', 7, { validation: { status: 'rejected' } })),
    ).toBe(false);
  });

  it('getLatestResult resolves CAS codes and skips blanks', () => {
    const well = makeWell({
      water_samples: [
        sample('a', [res('sulfate', 100)], {
          datetime: '2026-01-01T00:00:00Z',
        }),
        sample(
          'b',
          [
            {
              parameter: { code: '14808-79-8', vocabulary: 'cas' },
              value: 120,
            },
          ],
          { datetime: '2026-02-01T00:00:00Z' },
        ),
        sample('blank', [res('sulfate', 1)], {
          datetime: '2026-03-01T00:00:00Z',
          sample_type: 'field_blank',
        }),
      ],
    });
    const latest = getLatestResult(well, 'sulfate');
    expect(latest?.sample.id).toBe('b');
    expect(latest?.result.value).toBe(120);
    expect(getLatestResult(well, 'chloride')).toBeUndefined();
  });
});

// ─── Sampling point ──────────────────────────────────────────────────────────

describe('sampling point', () => {
  const base = makeWell({
    well_depth: 50,
    well_screen: [
      { from: 30, to: 40, type: 'x', diameter: 100, screen_slot: 0.5 },
    ],
    pump_installations: [
      {
        id: 'p1',
        installed_at: '2025-01-01T00:00:00Z',
        type: 'submersible',
        intake_depth: 35,
      },
    ],
    hydrodynamic_events: [
      {
        id: 'e1',
        type: 'spot_measurement',
        datetime: '2026-01-01T00:00:00Z',
        static_level: 32,
      },
    ] as HydrodynamicEvent[],
  });

  it('getSampleDepth handles point, interval, pump and unknown', () => {
    expect(
      getSampleDepth(
        base,
        sample('s', [], {
          sampling_point: {
            type: 'pump_discharge',
            pump_installation_id: 'p1',
          },
        }),
      ),
    ).toEqual({ kind: 'point', depth: 35 });
    expect(
      getSampleDepth(
        base,
        sample('s', [], {
          sampling_point: { type: 'in_well', from: 31, to: 39 },
        }),
      ),
    ).toEqual({ kind: 'interval', from: 31, to: 39 });
    expect(
      getSampleDepth(
        base,
        sample('s', [], { sampling_point: { type: 'wellhead_tap' } }),
      ),
    ).toBeUndefined();
    expect(getSampleDepth(base, sample('s', []))).toBeUndefined();
  });

  it('isFormationWater checks screen and static level', () => {
    const at = (depth: number, extra: Partial<WaterSample> = {}) =>
      sample('s', [], {
        sampling_point: { type: 'in_well', depth },
        static_level_event_id: 'e1',
        ...extra,
      });
    expect(isFormationWater(base, at(35))).toBe(true);
    expect(isFormationWater(base, at(45))).toBe(false);
    expect(isFormationWater(base, at(31))).toBe(false); // above level 32
    expect(
      isFormationWater(
        base,
        sample('s', [], {
          sampling_point: { type: 'in_well', from: 33, to: 42 },
        }),
      ),
    ).toBe(false);
    expect(isFormationWater(base, sample('s', []))).toBeUndefined();
    expect(
      isFormationWater(
        makeWell(),
        at(35, { static_level_event_id: undefined }),
      ),
    ).toBeUndefined();
  });
});

// ─── Derivations ─────────────────────────────────────────────────────────────

const ionic = sample('ion', [
  res('calcium', 40.078), // 2 meq
  res('magnesium', 12.1525), // 1 meq
  res('sodium', 22.99), // 1 meq
  res('bicarbonate', 122.034), // 2 meq
  res('chloride', 35.453), // 1 meq
  res('sulfate', 48.03), // 1 meq
  res('nitrate_as_no3', 62.004), // 1 meq
  res('nitrate_as_n', 14.007), // same nitrate, must not double count
]);

describe('ion balance and hydrochemistry', () => {
  it('getIonBalance converts to meq and avoids nitrate double counting', () => {
    const b = getIonBalance(ionic)!;
    expect(b.cations_meq).toBeCloseTo(4, 6);
    expect(b.anions_meq).toBeCloseTo(5, 6);
    expect(b.error_pct).toBeCloseTo(((4 - 5) / 9) * 100, 6);
  });

  it('getIonBalance falls back to total alkalinity and skips rejected', () => {
    const s = sample('s', [
      res('calcium', 40.078),
      res('alkalinity_total_as_caco3', 100.087),
      res('chloride', 1000, { validation: { status: 'rejected' } }),
    ]);
    const b = getIonBalance(s)!;
    expect(b.anions_meq).toBeCloseTo(2, 6);
    expect(b.error_pct).toBeCloseTo(0, 6);
    expect(getIonBalance(sample('s', [res('calcium', 10)]))).toBeUndefined();
  });

  it('getStiffValues returns meq/L per ion group', () => {
    const s = getStiffValues(ionic)!;
    expect(s.ca).toBeCloseTo(2, 6);
    expect(s.mg).toBeCloseTo(1, 6);
    expect(s.na_k).toBeCloseTo(1, 6);
    expect(s.hco3_co3).toBeCloseTo(2, 6);
    expect(s.cl).toBeCloseTo(1, 6);
    expect(s.so4).toBeCloseTo(1, 6);
    expect(getStiffValues(sample('s', [res('chloride', 1)]))).toBeUndefined();
  });

  it('getPiperCoordinates computes triangle percentages and diamond', () => {
    const p = getPiperCoordinates(ionic)!;
    expect(p.cations.ca).toBeCloseTo(50, 6);
    expect(p.cations.mg).toBeCloseTo(25, 6);
    expect(p.cations.na_k).toBeCloseTo(25, 6);
    expect(p.anions.hco3_co3).toBeCloseTo(50, 6);
    expect(p.anions.cl).toBeCloseTo(25, 6);
    expect(p.anions.so4).toBeCloseTo(25, 6);
    // a = 0.25, b = 0.5 → x = -0.125, y = h * 1.25
    expect(p.diamond.x).toBeCloseTo(-0.125, 6);
    expect(p.diamond.y).toBeCloseTo((Math.sqrt(3) / 2) * 1.25, 6);
    expect(getPiperCoordinates(sample('s', []))).toBeUndefined();
  });

  it('getHydrochemicalFacies picks the > 50 % ion or mixed', () => {
    expect(getHydrochemicalFacies(ionic)).toEqual({
      cation: 'mixed',
      anion: 'mixed',
    });
    const caHco3 = sample('s', [
      res('calcium', 80.156),
      res('sodium', 22.99),
      res('bicarbonate', 183.051),
      res('chloride', 35.453),
    ]);
    expect(getHydrochemicalFacies(caHco3)).toEqual({
      cation: 'calcium',
      anion: 'bicarbonate',
    });
    expect(getHydrochemicalFacies(sample('s', []))).toBeUndefined();
  });

  it('getAcidDrainageIndicators computes net alkalinity and SO4/Cl', () => {
    expect(
      getAcidDrainageIndicators(
        sample('s', [
          res('alkalinity_total_as_caco3', 10),
          res('acidity_total_as_caco3', 150),
          res('sulfate', 400),
          res('chloride', 20),
        ]),
      ),
    ).toEqual({ net_alkalinity: -140, sulfate_chloride_ratio: 20 });
    expect(getAcidDrainageIndicators(sample('s', [res('sulfate', 1)]))).toEqual(
      {},
    );
  });
});

describe('QA/QC', () => {
  it('getRelativePercentDifferences pairs by fraction and measured_in', () => {
    const well = makeWell({
      water_samples: [
        sample('p', [
          res('iron', 10, { fraction: 'total' }),
          res('iron', 4, { fraction: 'dissolved' }),
          res('ph', 7, { measured_in: 'field' }),
          res('lead', 0.01, { qualifier: '<' }),
        ]),
        sample(
          'd',
          [
            res('iron', 6, { fraction: 'dissolved' }),
            res('ph', 7.2, { measured_in: 'lab' }),
            res('lead', 0.01),
          ],
          { sample_type: 'split_sample', parent_sample_id: 'p' },
        ),
      ],
    });
    const rpd = getRelativePercentDifferences(well, 'd');
    expect(rpd).toHaveLength(1);
    expect(rpd[0]).toMatchObject({ key: 'iron', original: 4, duplicate: 6 });
    expect(rpd[0].rpd_pct).toBeCloseTo(40, 6);
    expect(getRelativePercentDifferences(well, 'p')).toEqual([]);
    expect(getRelativePercentDifferences(well, 'nope')).toEqual([]);
  });

  it('getBlankContamination lists detected substances in blanks', () => {
    const well = makeWell({
      water_samples: [
        sample('r', [res('lead', 0.02)], { campaign: 'c1' }),
        sample(
          'fb',
          [
            res('lead', 0.003),
            res('zinc', 0.01, { qualifier: '<' }),
            { parameter: w('arsenic'), qualifier: 'not_detected' },
            res('ph', 6.5),
            res('copper', 0.5, { validation: { status: 'rejected' } }),
          ],
          { sample_type: 'field_blank', campaign: 'c1' },
        ),
        sample('tb', [res('benzene_x', 0)], { sample_type: 'trip_blank' }),
      ],
    });
    expect(getBlankContamination(well)).toEqual([
      {
        blank_id: 'fb',
        campaign: 'c1',
        key: 'lead',
        parameter: w('lead'),
        value: 0.003,
      },
    ]);
  });

  it('getHoldingTimes skips rejected and results without analyzed_at', () => {
    const s = sample('s', [
      res('ph', 7),
      res('nitrate_as_n', 1, {
        analyzed_at: '2026-01-10T12:30:00-03:00',
      }),
      res('sulfate', 1, {
        analyzed_at: '2026-01-11T00:00:00-03:00',
        analyzed_at_resolution: 'day',
      }),
      res('chloride', 1, {
        analyzed_at: '2026-01-12T00:00:00-03:00',
        validation: { status: 'rejected' },
      }),
    ]);
    expect(getHoldingTimes(s)).toEqual([
      {
        result_index: 1,
        key: 'nitrate_as_n',
        hours: 2.5,
        resolution: 'instant',
      },
      { result_index: 2, key: 'sulfate', hours: 24, resolution: 'day' },
    ]);
  });

  it('getReceivedTemperatureCompliance compares with maxC', () => {
    const s = (t?: number) =>
      sample('s', [], {
        laboratory: { name: 'L', received_temperature: t },
      });
    expect(getReceivedTemperatureCompliance(s(6))).toBe(true);
    expect(getReceivedTemperatureCompliance(s(7))).toBe(false);
    expect(getReceivedTemperatureCompliance(s(7), 8)).toBe(true);
    expect(getReceivedTemperatureCompliance(s())).toBeUndefined();
    expect(getReceivedTemperatureCompliance(sample('s', []))).toBeUndefined();
  });

  it('getPurgeStabilization applies the window and criteria', () => {
    const r = (code: string, elapsed: number, value: number) => ({
      elapsed,
      parameter: w(code),
      value,
    });
    const result = getPurgeStabilization({
      readings: [
        r('specific_conductance', 5, 1000),
        r('specific_conductance', 10, 1100),
        r('specific_conductance', 15, 1120),
        r('specific_conductance', 20, 1130),
        r('dissolved_oxygen', 5, 3),
        r('dissolved_oxygen', 10, 2.85), // within 10 %
        r('dissolved_oxygen', 15, 2.7), // within abs 0.2
        r('temperature', 10, 20),
        r('temperature', 15, 20.1),
        r('x_unknown', 1, 1),
      ],
    })!;
    expect(result.parameters).toEqual([
      { key: 'specific_conductance', stabilized: true, readings: 4 },
      { key: 'dissolved_oxygen', stabilized: true, readings: 3 },
      { key: 'temperature', stabilized: false, readings: 2 },
    ]);
    expect(result.stabilized).toBe(false);
    expect(
      getPurgeStabilization(
        { readings: [r('temperature', 1, 20), r('temperature', 2, 20.1)] },
        DEFAULT_PURGE_STABILIZATION_CRITERIA,
        2,
      )?.stabilized,
    ).toBe(true);
    expect(
      getPurgeStabilization({
        readings: [r('orp', 1, 100), r('orp', 2, 150), r('orp', 3, 155)],
      })?.stabilized,
    ).toBe(false);
    expect(getPurgeStabilization(undefined)).toBeUndefined();
    expect(getPurgeStabilization({ readings: [] })).toBeUndefined();
  });
});

// ─── Exceedances ─────────────────────────────────────────────────────────────

describe('getExceedances', () => {
  it('handles max, min, presence, qualifiers and CAS resolution', () => {
    const s = sample('s', [
      res('arsenic', 0.02),
      { parameter: { code: '7440-38-2', vocabulary: 'cas' }, value: 0.05 },
      res('lead', 0.5, { qualifier: '<' }),
      res('copper', 3, { qualifier: '>' }),
      { parameter: w('mercury'), qualifier: 'not_detected' },
      res('ph', 5),
      { parameter: w('e_coli'), presence: true },
      { parameter: w('total_coliforms'), presence: false },
    ]);
    const limits: Limit[] = [
      { code: 'arsenic', max: 0.01 },
      { code: 'lead', max: 0.01 },
      { code: 'copper', max: 2 },
      { code: 'mercury', max: 0.001 },
      { code: 'ph', min: 6, max: 9.5 },
      { code: 'e_coli', presence_allowed: false },
      { code: 'total_coliforms', presence_allowed: false },
    ];
    expect(
      getExceedances(s, limits).map(e => [e.result_index, e.kind]),
    ).toEqual([
      [0, 'above_max'],
      [1, 'above_max'],
      [3, 'above_max'],
      [5, 'below_min'],
      [6, 'presence'],
    ]);
  });

  it('applies the turbidity comparability rule', () => {
    const s = sample('s', [
      res('turbidity', 6),
      res('turbidity_ntu', 6),
      res('turbidity_fnu', 6),
      res('turbidity_fau', 6),
    ]);
    const set = {
      id: 't',
      name: 't',
      jurisdiction: 'INT',
      source: 's',
      limits: [{ code: 'turbidity_ntu', max: 5 }],
    };
    expect(getExceedances(s, set).map(e => e.result_index)).toEqual([0, 1, 2]);
    expect(getExceedances(s, [{ code: 'turbidity_fau', max: 5 }])).toEqual([]);
  });

  it('filters by limit fraction', () => {
    const s = sample('s', [
      res('iron', 1, { fraction: 'dissolved' }),
      res('iron', 2),
    ]);
    expect(
      getExceedances(s, [{ code: 'iron', max: 0.3, fraction: 'total' }]).map(
        e => e.result_index,
      ),
    ).toEqual([1]);
    expect(
      getExceedances(s, [
        { code: 'iron', max: 0.3, fraction: 'dissolved' },
      ]).map(e => e.result_index),
    ).toEqual([0]);
  });
});

// ─── Warnings ────────────────────────────────────────────────────────────────

describe('getWaterSampleWarnings', () => {
  const codes = (well: Well): WaterSampleWarningCode[] =>
    getWaterSampleWarnings(well).map(x => x.code);

  it('flags sample-level issues', () => {
    const well = makeWell({
      well_depth: 50,
      well_screen: [
        { from: 30, to: 40, type: 'x', diameter: 100, screen_slot: 0.5 },
      ],
      hydrodynamic_events: [
        {
          id: 'e1',
          type: 'spot_measurement',
          datetime: '2026-01-01T00:00:00Z',
          static_level: 35,
        },
      ] as HydrodynamicEvent[],
      water_samples: [
        sample('dup', [res('ph', 7)], { sample_type: 'field_duplicate' }),
        sample('deep', [res('ph', 7)], {
          sampling_point: { type: 'in_well', from: 38, to: 55 },
        }),
        sample('shallow', [res('ph', 7)], {
          sampling_point: { type: 'in_well', depth: 32 },
          static_level_event_id: 'e1',
        }),
        sample('refs', [res('ph', 7)], {
          corrects: 'nope',
          parent_sample_id: 'nope2',
          static_level_event_id: 'nope3',
          sampling_point: {
            type: 'pump_discharge',
            pump_installation_id: 'p9',
          },
        }),
        sample('early', [res('ph', 7)], {
          laboratory: {
            name: 'L',
            received_at: '2026-01-10T09:00:00-03:00',
          },
        }),
        sample('sameday', [res('ph', 7)], {
          laboratory: {
            name: 'L',
            received_at: '2026-01-10T00:00:00-03:00',
            received_at_resolution: 'day',
          },
        }),
        sample('c1', [res('ph', 7)], { corrects: 'c2' }),
        sample('c2', [res('ph', 7)], { corrects: 'c1' }),
      ],
    });
    const ws = getWaterSampleWarnings(well);
    const by = (code: WaterSampleWarningCode) =>
      ws.filter(x => x.code === code).map(x => x.ids);
    expect(by('parent_missing')).toEqual([['dup']]);
    expect(by('depth_outside_screen')).toEqual([['deep']]);
    expect(by('depth_below_well_bottom')).toEqual([['deep']]);
    expect(by('depth_above_static_level')).toEqual([['shallow']]);
    expect(by('reference_unresolved')).toEqual([
      ['refs', 'nope'],
      ['refs', 'nope2'],
      ['refs', 'nope3'],
      ['refs', 'p9'],
    ]);
    expect(by('received_before_collection')).toEqual([['early']]);
    expect(by('corrects_cycle')).toEqual([['c1'], ['c2']]);
  });

  it('uses the deepest bore_hole when well_depth is absent', () => {
    const well = makeWell({
      bore_hole: [{ from: 0, to: 40, diameter: 200 }],
      water_samples: [
        sample('s', [res('ph', 7)], {
          sampling_point: { type: 'in_well', depth: 45 },
        }),
      ],
    });
    expect(codes(well)).toEqual(['depth_below_well_bottom']);
  });

  it('flags result-level issues with result_index', () => {
    const well = makeWell({
      water_samples: [
        sample('s', [
          res('iron', 1, { fraction: 'dissolved' }),
          { parameter: w('e_coli'), value: 3 },
          { parameter: w('ph'), presence: true },
          { parameter: w('lead'), qualifier: 'not_detected' },
          res('iron', 2, { fraction: 'dissolved' }),
          res('unobtainium', 1),
          res('sulfate', 1, { analyzed_at: '2026-01-10T09:00:00-03:00' }),
          res('chloride', 1, {
            analyzed_at: '2026-01-10T00:00:00-03:00',
            analyzed_at_resolution: 'day',
          }),
          res('ph', 7, { measured_in: 'field' }),
          res('ph', 7, { measured_in: 'lab' }),
        ]),
      ],
    });
    expect(
      getWaterSampleWarnings(well).map(x => [x.code, x.result_index]),
    ).toEqual([
      ['dissolved_without_filtration', 0],
      ['value_form_mismatch', 1],
      ['value_form_mismatch', 2],
      ['not_detected_without_limit', 3],
      ['dissolved_without_filtration', 4],
      ['duplicate_result', 4],
      ['unknown_parameter_code', 5],
      ['analyzed_before_collection', 6],
    ]);
  });

  it('returns nothing without samples', () => {
    expect(codes(makeWell())).toEqual([]);
  });
});
