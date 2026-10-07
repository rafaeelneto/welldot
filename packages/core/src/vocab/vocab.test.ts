import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { DOCUMENT_TYPES } from './attachment.vocab';
import {
  CEMENT_PAD_TYPES,
  CENTRALIZER_TYPES,
  CONSTRUCTION_MATERIALS,
  DRILLING_METHODS,
} from './construction.vocab';
import { WELL_PURPOSES, WELL_TYPES } from './general.vocab';
import {
  HISTORY_LOG_CATEGORIES,
  HISTORY_LOG_SEVERITIES,
} from './history.vocab';
import {
  AQUIFER_ANALYSIS_METHODS,
  HYDRODYNAMIC_EVENT_TYPES,
  MEASUREMENT_METHODS,
} from './hydrodynamic.vocab';
import {
  DECLARED_METHODS,
  MAINTENANCE_TYPES,
  METER_TYPES,
  POWER_SOURCES,
  PUMP_TYPES,
  READING_SOURCES,
} from './operation.vocab';
import {
  CONDITION_CATEGORIES,
  PERMIT_HISTORY_TYPES,
  PERMIT_TYPES,
  WATER_USES,
} from './permit.vocab';
import { type VocabEntry, getVocabLabel, vocabValues } from './vocab';
import {
  SAMPLE_TYPES,
  SAMPLING_DEVICES,
  SAMPLING_METHODS,
  SAMPLING_POINT_TYPES,
} from './waterSample.vocab';

const docs = (file: string) =>
  readFileSync(new URL(`../../docs/spec/v2/${file}`, import.meta.url), 'utf8');

/**
 * Each vocabulary with the spec heading that documents it. The heading is
 * matched as a prefix; the first table after it must list exactly the
 * vocabulary's values.
 */
const VOCABULARIES: [
  name: string,
  vocab: readonly VocabEntry[],
  file: string,
  heading: string,
][] = [
  ['WELL_TYPES', WELL_TYPES, 'format-reference.md', '## `well_type`'],
  ['WELL_PURPOSES', WELL_PURPOSES, 'format-reference.md', '## `well_purpose`'],
  [
    'DRILLING_METHODS',
    DRILLING_METHODS,
    'format-reference.md',
    '## `bore_hole[].drilling_method`',
  ],
  [
    'CONSTRUCTION_MATERIALS',
    CONSTRUCTION_MATERIALS,
    'format-reference.md',
    '## Construction materials',
  ],
  [
    'CENTRALIZER_TYPES',
    CENTRALIZER_TYPES,
    'format-reference.md',
    '## `centralizers[].type`',
  ],
  [
    'CEMENT_PAD_TYPES',
    CEMENT_PAD_TYPES,
    'format-reference.md',
    '## `cement_pad.type`',
  ],
  [
    'PUMP_TYPES',
    PUMP_TYPES,
    'format-reference.md',
    '## `pump_installations[].type`',
  ],
  [
    'POWER_SOURCES',
    POWER_SOURCES,
    'format-reference.md',
    '## `pump_installations[].power_source`',
  ],
  ['PERMIT_TYPES', PERMIT_TYPES, 'format-reference.md', '## `permits[].type`'],
  ['WATER_USES', WATER_USES, 'format-reference.md', '## `permits[].water_use`'],
  [
    'CONDITION_CATEGORIES',
    CONDITION_CATEGORIES,
    'format-reference.md',
    '## `permits[].conditions[].category`',
  ],
  [
    'PERMIT_HISTORY_TYPES',
    PERMIT_HISTORY_TYPES,
    'format-reference.md',
    '## `permits[].history[].type`',
  ],
  ['METER_TYPES', METER_TYPES, 'format-reference.md', '## `meters[].type`'],
  ['READING_SOURCES', READING_SOURCES, 'format-reference.md', '**`source`**'],
  ['DECLARED_METHODS', DECLARED_METHODS, 'format-reference.md', '**`method`**'],
  [
    'MEASUREMENT_METHODS',
    MEASUREMENT_METHODS,
    'format-reference.md',
    '## `hydrodynamic_events[].measurement_method`',
  ],
  [
    'AQUIFER_ANALYSIS_METHODS',
    AQUIFER_ANALYSIS_METHODS,
    'format-reference.md',
    '## `aquifer_analysis[].method`',
  ],
  [
    'HISTORY_LOG_CATEGORIES',
    HISTORY_LOG_CATEGORIES,
    'format-reference.md',
    '## `history_logs[].category`',
  ],
  [
    'HISTORY_LOG_SEVERITIES',
    HISTORY_LOG_SEVERITIES,
    'format-reference.md',
    '## `history_logs[].severity`',
  ],
  [
    'MAINTENANCE_TYPES',
    MAINTENANCE_TYPES,
    'format-reference.md',
    '## `history_logs[].maintenance_type`',
  ],
  [
    'DOCUMENT_TYPES',
    DOCUMENT_TYPES,
    'format-reference.md',
    '## `Attachment.document_type`',
  ],
  [
    'HYDRODYNAMIC_EVENT_TYPES',
    HYDRODYNAMIC_EVENT_TYPES,
    'object-schemas.md',
    '### Event types',
  ],
  [
    'SAMPLE_TYPES',
    SAMPLE_TYPES,
    'water-quality.md',
    '### `water_samples[].sample_type`',
  ],
  [
    'SAMPLING_METHODS',
    SAMPLING_METHODS,
    'water-quality.md',
    '### `water_samples[].sampling_method`',
  ],
  [
    'SAMPLING_POINT_TYPES',
    SAMPLING_POINT_TYPES,
    'water-quality.md',
    '### `water_samples[].sampling_point.type`',
  ],
  [
    'SAMPLING_DEVICES',
    SAMPLING_DEVICES,
    'water-quality.md',
    '### `water_samples[].sampling_point.device`',
  ],
];

/** Values in the first markdown table following the line starting with `heading`. */
function documentedValues(file: string, heading: string): string[] {
  const lines = docs(file).split('\n');
  const start = lines.findIndex((line: string) => line.startsWith(heading));
  if (start === -1) throw new Error(`${heading} not found in ${file}`);
  const values: string[] = [];
  let inTable = false;
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('|')) {
      // The first row is the header (e.g. "| `type` | …").
      const isHeader = !inTable;
      inTable = true;
      if (isHeader) continue;
      const match = /^\|\s*`([^`]+)`/.exec(line);
      if (match) values.push(match[1]!);
    } else if (inTable) {
      break;
    }
  }
  return values;
}

describe('recommended vocabularies', () => {
  it.each(VOCABULARIES)('%s has unique keys and en/pt labels', (_, vocab) => {
    const values = vocab.map(entry => entry.value);
    expect(new Set(values).size).toBe(values.length);
    for (const entry of vocab) {
      expect(entry.value).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(entry.label.en?.trim()).toBeTruthy();
      expect(entry.label.pt?.trim()).toBeTruthy();
    }
  });

  it.each(VOCABULARIES)(
    '%s matches its spec table',
    (_, vocab, file, heading) => {
      expect(documentedValues(file, heading).sort()).toEqual(
        vocab.map(entry => entry.value).sort(),
      );
    },
  );
});

describe('getVocabLabel', () => {
  it('translates recommended values', () => {
    expect(getVocabLabel(PERMIT_TYPES, 'exemption', 'pt')).toBe(
      'Dispensa / uso insignificante',
    );
  });

  it('returns free-text and x- values as-is', () => {
    expect(getVocabLabel(PERMIT_TYPES, 'x-special', 'pt')).toBe('x-special');
    expect(getVocabLabel(PERMIT_TYPES, 'Outorga antiga', 'en')).toBe(
      'Outorga antiga',
    );
  });
});

describe('vocabValues', () => {
  it('leaves deprecated values out unless asked', () => {
    expect(vocabValues(WELL_TYPES)).not.toContain('artesian');
    expect(vocabValues(WELL_TYPES, { includeDeprecated: true })).toContain(
      'artesian',
    );
  });
});
