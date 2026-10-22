import { describe, expect, it } from 'vitest';

import { WellSchema } from '../validators/well.validators';
import {
  BAROMETRIC_COMPENSATIONS,
  BAROMETRIC_COMPENSATION_VALUES,
  FRACTION_VALUES,
  MEASURED_IN_VALUES,
  MEASUREMENT_LOCATIONS,
  NUMERIC_QUALIFIERS,
  PARAMETER_GROUPS,
  PERMIT_ADMINISTRATIVE_STATUSES,
  PERMIT_ADMINISTRATIVE_STATUS_VALUES,
  PRODUCTION_ENTRY_TYPES,
  QUALIFIER_VALUES,
  READING_AGGREGATIONS,
  READING_AGGREGATION_VALUES,
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
      BAROMETRIC_COMPENSATION_VALUES,
      READING_AGGREGATION_VALUES,
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

  it('matches what the schema accepts for a logger_series', () => {
    const base = {
      version: '2.4',
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
    const datetime = '2026-07-01T00:00:00-03:00';
    const reading = { datetime, depth: 18, depth_min: 17, depth_max: 19 };
    for (const barometric_compensation of BAROMETRIC_COMPENSATION_VALUES) {
      for (const aggregation of READING_AGGREGATION_VALUES) {
        const parsed = WellSchema.safeParse({
          ...base,
          hydrodynamic_events: [
            {
              id: 'ls',
              type: 'logger_series',
              datetime,
              barometric_compensation,
              aggregation,
              readings: [reading],
            },
          ],
        });
        expect(parsed.success).toBe(true);
      }
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
      BAROMETRIC_COMPENSATIONS,
      READING_AGGREGATIONS,
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
    expect(BAROMETRIC_COMPENSATION_VALUES).toEqual([
      'barologger',
      'vented',
      'none',
    ]);
    expect(READING_AGGREGATION_VALUES).toEqual(['none', 'hourly', 'daily']);
  });

  it('labels the logger_series vocabularies', () => {
    expect(getVocabLabel(BAROMETRIC_COMPENSATIONS, 'vented', 'pt')).toBe(
      'Cabo ventilado',
    );
    expect(getVocabLabel(READING_AGGREGATIONS, 'none', 'en')).toBe(
      'Raw readings',
    );
  });
});
