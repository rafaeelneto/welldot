import type { WaterSample } from '@welldot/core';
import { describe, expect, it } from 'vitest';
import { baseWell, lastSegmentLabels, makeTestContext } from '../test-utils';
import { buildWaterSampleSection } from './waterSampleTable';

const ctx = makeTestContext({}, lastSegmentLabels);

const wd = (code: string) => ({ code, vocabulary: 'welldot' });

const routine: WaterSample = {
  id: 's1',
  datetime: '2024-03-10T09:00:00-03:00',
  sample_type: 'routine',
  campaign: 'C-2024-1',
  sampling_point: { type: 'in_well', from: 40, to: 52, device: 'bailer' },
  laboratory: {
    name: 'LabX',
    report_number: 'R-123',
    received_at: '2024-03-10T18:00:00-03:00',
    received_temperature: 4.2,
  },
  results: [
    { parameter: wd('arsenic'), value: 0.02, measured_in: 'lab' },
    { parameter: wd('e_coli'), presence: true, measured_in: 'lab' },
    {
      parameter: wd('nitrate_as_no3'),
      qualifier: 'not_detected',
      detection_limit: 0.5,
      method: 'US EPA 300.0',
    },
    { parameter: wd('fluoride'), value: 0.3, lab_flags: ['J'] },
  ],
};

const original: WaterSample = {
  id: 's2',
  datetime: '2024-01-05T10:00:00-03:00',
  sample_type: 'routine',
  results: [{ parameter: wd('arsenic'), value: 0.5 }],
};

const correction: WaterSample = {
  id: 's3',
  datetime: '2024-01-05T10:00:00-03:00',
  sample_type: 'routine',
  corrects: 's2',
  results: [{ parameter: wd('arsenic'), value: 0.005 }],
};

interface Node {
  table?: { widths?: unknown[]; body: unknown[][] };
  [key: string]: unknown;
}

/** Collects every results table (7 columns) in the content tree. */
function resultTables(node: unknown, out: Node[] = []): Node[] {
  if (Array.isArray(node)) node.forEach(n => resultTables(n, out));
  else if (node && typeof node === 'object') {
    const n = node as Node;
    if (n.table?.widths?.length === 7) out.push(n);
    Object.values(n).forEach(v => resultTables(v, out));
  }
  return out;
}

describe('buildWaterSampleSection', () => {
  it('returns null when there are no samples', () => {
    expect(buildWaterSampleSection(baseWell(), ctx)).toBeNull();
    expect(
      buildWaterSampleSection(baseWell({ water_samples: [] }), ctx),
    ).toBeNull();
  });

  it('prints one card per effective sample, retracted ones excluded', () => {
    const section = buildWaterSampleSection(
      baseWell({ water_samples: [routine, original, correction] }),
      ctx,
    );
    const tables = resultTables(section);
    // s2 is retracted by s3: two cards, oldest first (s3, then s1).
    expect(tables).toHaveLength(2);
    expect(tables[0]!.table!.body).toHaveLength(1 + 1);
    expect(tables[1]!.table!.body).toHaveLength(1 + routine.results.length);

    const serialized = JSON.stringify(section);
    expect(serialized).toContain('title');
    expect(serialized).toContain('correction');
    expect(serialized).toContain('C-2024-1');
    expect(serialized).toContain('R-123');
    expect(serialized).toContain('LabX');
    expect(serialized).toContain('40.00 m');
    expect(serialized).toContain('52.00 m');
    expect(serialized).toContain('US EPA 300.0');
    // No limit set selected: nothing is highlighted.
    expect(serialized).not.toContain('#b91c1c');
    expect(serialized).not.toContain('limitSet');
  });

  it('formats not detected and presence results', () => {
    const section = buildWaterSampleSection(
      baseWell({ water_samples: [routine] }),
      ctx,
    );
    const [table] = resultTables(section);
    const valueOf = (row: number) =>
      (table!.table!.body[row]![1] as { text: string }).text;
    // nitrate: not detected, with its detection limit.
    expect(valueOf(3)).toMatch(/0[.,]5/);
    expect(valueOf(3)).not.toBe('—');
    // e_coli: presence.
    expect(valueOf(2)).not.toBe('');
    expect(valueOf(2)).not.toMatch(/\d/);
  });

  it('marks exceedances when a limit set is selected', () => {
    const section = buildWaterSampleSection(
      baseWell({ water_samples: [routine] }),
      makeTestContext(
        { waterQualityLimitSet: 'who_gdwq_2022' },
        lastSegmentLabels,
      ),
    );
    const [table] = resultTables(section);
    const isMarked = (row: number) =>
      (table!.table!.body[row]![0] as { color?: string }).color === '#b91c1c';
    // arsenic 0.02 > 0.01 and E. coli present exceed; nitrate (ND) and
    // fluoride 0.3 < 1.5 do not.
    expect(isMarked(1)).toBe(true);
    expect(isMarked(2)).toBe(true);
    expect(isMarked(3)).toBe(false);
    expect(isMarked(4)).toBe(false);

    const serialized = JSON.stringify(section);
    expect(serialized).toContain(
      'limitSet: WHO Guidelines for Drinking-water Quality (2022)',
    );
    expect(serialized).toContain('exceedances: 2');
  });

  it('ignores an unknown limit set id', () => {
    const serialized = JSON.stringify(
      buildWaterSampleSection(
        baseWell({ water_samples: [routine] }),
        makeTestContext({ waterQualityLimitSet: 'nope' }, lastSegmentLabels),
      ),
    );
    expect(serialized).not.toContain('#b91c1c');
  });

  it('uses the theme exceedance color and custom date formats', () => {
    const section = buildWaterSampleSection(
      baseWell({ water_samples: [routine] }),
      makeTestContext(
        {
          waterQualityLimitSet: 'who_gdwq_2022',
          theme: { colors: { exceedance: '#ff00aa' } },
          dateFormats: { date: 'yyyy-MM-dd', dateTime: 'yyyy-MM-dd HH:mm' },
        },
        lastSegmentLabels,
      ),
    );
    const [table] = resultTables(section);
    const colorOf = (row: number) =>
      (table!.table!.body[row]![0] as { color?: string }).color;
    expect(colorOf(1)).toBe('#ff00aa');
    expect(colorOf(3)).toBeUndefined();

    const serialized = JSON.stringify(section);
    expect(serialized).not.toContain('#b91c1c');
    // Sample datetime and lab receipt follow the custom pattern.
    expect(serialized).toMatch(/"\d{4}-\d{2}-\d{2} \d{2}:\d{2}"/);
    expect(serialized).toMatch(/receivedAt: \d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
    expect(serialized).not.toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });
});
