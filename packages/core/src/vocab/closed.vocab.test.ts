import { describe, expect, it } from 'vitest';

import { WellSchema } from '../validators/well.validators';
import {
  FRACTION_VALUES,
  MEASURED_IN_VALUES,
  MEASUREMENT_LOCATIONS,
  NUMERIC_QUALIFIERS,
  PARAMETER_GROUPS,
  PERMIT_ADMINISTRATIVE_STATUSES,
  PERMIT_ADMINISTRATIVE_STATUS_VALUES,
  PRODUCTION_ENTRY_TYPES,
  QUALIFIER_VALUES,
  RESULT_FRACTIONS,
  RESULT_QUALIFIERS,
  VALIDATION_STATUSES,
  VALIDATION_STATUS_VALUES,
  VOLUME_LIMIT_PERIODS,
  WELL_STATUSES,
  WELL_STATUS_VALUES,
} from './closed.vocab';
import { getVocabLabel } from './vocab';

describe('closed vocabularies', () => {
  it('lists each value once', () => {
    for (const list of [
      WELL_STATUS_VALUES,
      PERMIT_ADMINISTRATIVE_STATUS_VALUES,
      QUALIFIER_VALUES,
      FRACTION_VALUES,
      VALIDATION_STATUS_VALUES,
    ]) {
      expect(new Set(list).size).toBe(list.length);
    }
  });

  it('keeps numeric qualifiers a subset of all qualifiers', () => {
    for (const q of NUMERIC_QUALIFIERS) expect(QUALIFIER_VALUES).toContain(q);
    expect(NUMERIC_QUALIFIERS).not.toContain('not_detected');
  });

  it('matches what the schema accepts for a status_change entry', () => {
    const base = {
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
    };
    for (const status of WELL_STATUS_VALUES) {
      const parsed = WellSchema.safeParse({
        ...base,
        history_logs: [
          {
            id: 'h1',
            datetime: '2024-01-01T00:00:00Z',
            category: 'status_change',
            description: 'x',
            status,
          },
        ],
      });
      expect(parsed.success).toBe(true);
    }
  });
});

describe('closed vocabulary labels', () => {
  it('labels every entry in en and pt', () => {
    for (const vocab of [
      WELL_STATUSES,
      PERMIT_ADMINISTRATIVE_STATUSES,
      PRODUCTION_ENTRY_TYPES,
      RESULT_QUALIFIERS,
      RESULT_FRACTIONS,
      MEASUREMENT_LOCATIONS,
      VALIDATION_STATUSES,
      PARAMETER_GROUPS,
      VOLUME_LIMIT_PERIODS,
    ]) {
      for (const entry of vocab) {
        expect(entry.label.en).toBeTruthy();
        expect(entry.label.pt).toBeTruthy();
      }
    }
  });

  it('works with getVocabLabel and keeps unknown values as-is', () => {
    expect(getVocabLabel(WELL_STATUSES, 'inactive', 'pt')).toBe('Paralisado');
    expect(getVocabLabel(RESULT_FRACTIONS, 'dissolved', 'en')).toBe(
      'Dissolved',
    );
    expect(getVocabLabel(WELL_STATUSES, 'x-unknown', 'pt')).toBe('x-unknown');
  });

  it('derives the bare value lists from the entries', () => {
    expect(WELL_STATUS_VALUES).toEqual(WELL_STATUSES.map(e => e.value));
    expect(MEASURED_IN_VALUES).toEqual(['field', 'lab']);
  });
});
