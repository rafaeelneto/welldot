// Display helpers added to permit, operation and waterQuality utils.
import { describe, expect, it } from 'vitest';

import type { Meter, Permit, Well } from '@welldot/core';
import { getVocabLabel } from '@welldot/core';

import { formatMeterLabel } from './operation.utils';
import {
  CONDITION_DEADLINE_STATUSES,
  getActivePermit,
  PERMIT_STATUSES,
  permitLabel,
} from './permit.utils';
import {
  formatWaterQualityResult,
  parameterUnitSymbol,
} from './waterQuality.utils';

function well(permits: Permit[]): Well {
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
    permits,
  };
}

const permit = (id: string, issued: string, until: string): Permit =>
  ({
    id,
    type: 'abstraction_permit',
    authority: 'AUTH',
    identifier: `${id}/2024`,
    issued_at: issued,
    valid_until: until,
  }) as Permit;

describe('permitLabel', () => {
  it('joins authority and identifier, falling back when missing', () => {
    expect(permitLabel(permit('p1', '2024-01-01', '2030-01-01'))).toBe(
      'AUTH p1/2024',
    );
    expect(permitLabel(undefined, 'unknown')).toBe('unknown');
  });
});

describe('getActivePermit', () => {
  it('picks the active permit with the latest start', () => {
    const w = well([
      permit('old', '2020-01-01', '2030-01-01'),
      permit('new', '2024-01-01', '2030-01-01'),
      permit('expired', '2010-01-01', '2012-01-01'),
    ]);
    expect(getActivePermit(w, '2025-06-01')?.id).toBe('new');
    expect(getActivePermit(w, '2011-06-01')?.id).toBe('expired');
    expect(getActivePermit(well([]), '2025-06-01')).toBeUndefined();
  });
});

describe('formatMeterLabel', () => {
  const meter = {
    id: 'm1',
    installed_at: '2024-02-01T12:00:00',
    serial: 'SN-1',
  } as Meter;

  it('uses the untyped label, serial and install date', () => {
    expect(
      formatMeterLabel(meter, { locale: 'en', untypedLabel: 'Meter' }),
    ).toBe('Meter · S/N SN-1 · 01/02/2024');
  });

  it('labels the type in the locale and honors dateFormat', () => {
    const label = formatMeterLabel(
      { ...meter, type: 'electromagnetic', serial: undefined },
      { locale: 'en', untypedLabel: 'Meter', dateFormat: 'yyyy-MM-dd' },
    );
    expect(label).toMatch(/^Electromagnetic · 2024-02-01$/i);
  });
});

describe('parameterUnitSymbol', () => {
  it('falls back to mg/L for unmapped CAS numbers and to unit otherwise', () => {
    expect(
      parameterUnitSymbol({
        parameter: { vocabulary: 'cas', code: '0000-00-0' },
      }),
    ).toBe('mg/L');
    expect(
      parameterUnitSymbol({
        parameter: { vocabulary: 'welldot', code: 'x-custom' },
        unit: 'ppb',
      }),
    ).toBe('ppb');
  });
});

describe('formatWaterQualityResult', () => {
  const labels = {
    notDetected: 'ND',
    present: 'present',
    absent: 'absent',
    estimated: 'est.',
  };

  it('renders qualifiers, presence and text', () => {
    expect(
      formatWaterQualityResult({ qualifier: 'not_detected' }, labels),
    ).toBe('ND');
    expect(formatWaterQualityResult({ presence: false }, labels)).toBe(
      'absent',
    );
    expect(formatWaterQualityResult({ text: 'clear' }, labels)).toBe('clear');
    expect(formatWaterQualityResult({ value: 1, qualifier: '<' }, labels)).toBe(
      '< 1',
    );
    expect(
      formatWaterQualityResult(
        { value: 0.004, qualifier: 'estimated' },
        labels,
        n => n.toFixed(3),
      ),
    ).toBe('0.004 (est.)');
    expect(formatWaterQualityResult({}, labels)).toBe('—');
  });
});

describe('derived status vocabularies', () => {
  it('labels every derived permit status once, without granted', () => {
    const values = PERMIT_STATUSES.map(e => e.value);
    expect(new Set(values).size).toBe(values.length);
    expect(values).toHaveLength(10);
    expect(values).not.toContain('granted');
    expect(getVocabLabel(PERMIT_STATUSES, 'active', 'pt')).toBe('Vigente');
    expect(getVocabLabel(PERMIT_STATUSES, 'revoked', 'en')).toBe('Revoked');
  });

  it('labels condition deadline states', () => {
    expect(getVocabLabel(CONDITION_DEADLINE_STATUSES, 'overdue', 'pt')).toBe(
      'Atrasada',
    );
  });
});
