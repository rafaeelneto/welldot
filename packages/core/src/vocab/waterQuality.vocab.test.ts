import { describe, expect, it } from 'vitest';

import {
  BR_GM_MS_888_2021,
  EU_2020_2184,
  WATER_QUALITY_LIMIT_SETS,
  WHO_GDWQ_2022,
  getLimitSet,
} from './waterQuality.limits';
import {
  WATER_QUALITY_PARAMETERS,
  getParameterDefinition,
  isKnownParameter,
  parameterKey,
} from './waterQuality.vocab';

describe('water quality vocabulary', () => {
  it('has the 98 core codes, all unique', () => {
    expect(WATER_QUALITY_PARAMETERS).toHaveLength(98);
    const codes = new Set(WATER_QUALITY_PARAMETERS.map(d => d.code));
    expect(codes.size).toBe(98);
  });

  it('has unique CAS equivalences', () => {
    const cas = WATER_QUALITY_PARAMETERS.flatMap(d => (d.cas ? [d.cas] : []));
    expect(new Set(cas).size).toBe(cas.length);
  });

  it('carries a Portuguese label for every code', () => {
    for (const d of WATER_QUALITY_PARAMETERS) expect(d.labels.pt).toBeTruthy();
  });

  it('resolves CAS numbers to their welldot entry', () => {
    expect(
      getParameterDefinition({ code: '14808-79-8', vocabulary: 'cas' })?.code,
    ).toBe('sulfate');
    expect(parameterKey({ code: '14808-79-8', vocabulary: 'cas' })).toBe(
      'sulfate',
    );
    expect(parameterKey({ code: 'sulfate', vocabulary: 'welldot' })).toBe(
      'sulfate',
    );
  });

  it('keys unknown CAS and x- codes by vocabulary', () => {
    expect(parameterKey({ code: '71-43-2', vocabulary: 'cas' })).toBe(
      'cas:71-43-2',
    );
    expect(parameterKey({ code: 'foo', vocabulary: 'x-lab' })).toBe(
      'x-lab:foo',
    );
    expect(
      getParameterDefinition({ code: 'foo', vocabulary: 'x-lab' }),
    ).toBeUndefined();
  });

  it('distinguishes expression bases', () => {
    expect(
      parameterKey({ code: 'nitrate_as_n', vocabulary: 'welldot' }),
    ).not.toBe(parameterKey({ code: 'nitrate_as_no3', vocabulary: 'welldot' }));
  });

  it('flags unknown welldot codes only', () => {
    expect(isKnownParameter({ code: 'sulfate', vocabulary: 'welldot' })).toBe(
      true,
    );
    expect(
      isKnownParameter({ code: 'unobtainium', vocabulary: 'welldot' }),
    ).toBe(false);
    expect(isKnownParameter({ code: '71-43-2', vocabulary: 'cas' })).toBe(true);
  });

  it('marks presence and text forms', () => {
    expect(
      getParameterDefinition({ code: 'e_coli', vocabulary: 'welldot' })?.form,
    ).toBe('presence');
    expect(
      getParameterDefinition({ code: 'odor', vocabulary: 'welldot' })?.form,
    ).toBe('text');
    expect(
      getParameterDefinition({ code: 'e_coli_mpn', vocabulary: 'welldot' })
        ?.form,
    ).toBe('value');
  });
});

describe('water quality limit sets', () => {
  it('only references core vocabulary codes', () => {
    const codes = new Set(WATER_QUALITY_PARAMETERS.map(d => d.code));
    for (const set of WATER_QUALITY_LIMIT_SETS)
      for (const limit of set.limits)
        expect(codes.has(limit.code), `${set.id}:${limit.code}`).toBe(true);
  });

  it('never references attenuation turbidity', () => {
    for (const set of WATER_QUALITY_LIMIT_SETS)
      expect(set.limits.some(l => l.code === 'turbidity_fau')).toBe(false);
  });

  it('finds sets by id', () => {
    expect(getLimitSet('who_gdwq_2022')).toBe(WHO_GDWQ_2022);
    expect(getLimitSet('br_gm_ms_888_2021')).toBe(BR_GM_MS_888_2021);
    expect(getLimitSet('eu_2020_2184')).toBe(EU_2020_2184);
    expect(getLimitSet('nope')).toBeUndefined();
  });
});
