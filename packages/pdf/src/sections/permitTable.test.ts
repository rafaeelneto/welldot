import type { Permit } from '@welldot/core';
import { describe, expect, it } from 'vitest';
import {
  baseWell,
  collectFields,
  findTables,
  lastSegmentLabels,
  makeTestContext,
} from '../test-utils';
import { buildPermitSection } from './permitTable';

const ctx = makeTestContext({}, lastSegmentLabels);

const permit: Permit = {
  id: 'pmt-01',
  type: 'abstraction_permit',
  authority: 'SEMAS-PA',
  identifier: '1234/2025',
  request_identifier: 'PRT-2024/0099',
  issued_at: '2025-02-10',
  valid_until: '2029-02-10',
  water_use: ['human_supply'],
  flow_rate: 15,
  daily_operating_time: 20,
  volume_limits: [{ period: 'annual', volume: 109500 }],
  conditions: [
    {
      id: 'c1',
      description: 'Install meter',
      category: 'equipment_installation',
      due_after: 'P90D',
      responsible: 'Ops team',
      fulfillments: [
        {
          id: 'f1',
          datetime: '2025-04-02T10:00:00-03:00',
          due_date: '2025-05-11',
          description: 'Meter installed',
          author: 'J. Silva',
        },
      ],
    },
    {
      id: 'c2',
      description: 'Semiannual report',
      first_due: '2025-07-31',
      recurrence: 'P6M',
    },
  ],
  history: [
    {
      id: 'h2',
      date: '2024-12-15',
      type: 'fee',
      description: 'Analysis fee',
      due_date: '2025-01-15',
      done: true,
    },
    {
      id: 'h1',
      date: '2024-11-04',
      type: 'filing',
      description: 'Request filed',
    },
  ],
  attachments: [
    {
      id: 'a',
      uri: 'https://files.example.org/portaria.pdf',
      media_type: 'application/pdf',
      filename: 'portaria.pdf',
    },
  ],
};

const well = baseWell({ permits: [permit] });

describe('buildPermitSection', () => {
  it('returns null when there are no permits', () => {
    expect(buildPermitSection(baseWell(), ctx)).toBeNull();
  });

  it('renders status, validity, grants, conditions and attachments', () => {
    const section = buildPermitSection(well, ctx, '2026-10-03');
    const text = JSON.stringify(section);
    expect(text).toContain('Active');
    expect(text).toContain('10/02/2025 → 10/02/2029');
    expect(text).toContain('SEMAS-PA');
    expect(text).toContain('1234/2025');
    expect(text).toContain('Human supply');
    expect(text).toContain('PRT-2024/0099');

    const fields = collectFields(section);
    expect(fields.authority).toEqual(['SEMAS-PA']);
    expect(fields['volumeLimits (Annual)']).toEqual(['109,500 m³']);
    expect(fields.attachments).toEqual(['portaria.pdf']);

    const [conditions, fulfillments] = findTables(section, 'number');
    expect(conditions![0]).toEqual([
      'number',
      'condition',
      'responsible',
      'status',
    ]);
    expect(conditions![1]).toEqual([
      '1',
      'Install meter\nEquipment installation',
      'Ops team',
      'Fulfilled:\u00a011/05/2025',
    ]);
    expect(conditions![2]).toEqual([
      '2',
      'Semiannual report',
      '',
      'Overdue:\u00a031/07/2025, 31/01/2026, 31/07/2026\nUpcoming:\u00a031/01/2027',
    ]);

    expect(fulfillments![0]).toEqual([
      'number',
      'fulfilledAt',
      'deadline',
      'by',
      'description',
    ]);
    expect(fulfillments).toHaveLength(2);
    const [num, fulfilledAt, ...rest] = fulfillments![1]!;
    expect(num).toBe('1');
    expect(fulfilledAt).toMatch(/\/04\/2025$/);
    expect(rest).toEqual(['11/05/2025', 'J. Silva', 'Meter installed']);
  });

  it('never prints a glyph the bundled fonts lack', () => {
    const text = JSON.stringify(buildPermitSection(well, ctx, '2026-10-03'));
    expect(text).not.toMatch(/[✓✔]/);
  });

  it('lists the administrative history oldest first', () => {
    const [history] = findTables(
      buildPermitSection(well, ctx, '2026-10-03'),
      'date',
    );
    expect(history).toEqual([
      ['date', 'type', 'description', 'situation'],
      ['04/11/2024', 'Filing', 'Request filed', ''],
      ['15/12/2024', 'Fee', 'Analysis fee', 'done'],
    ]);
  });

  it('shows the administrative status of a requested permit', () => {
    const requested: Permit = {
      id: 'pmt-r',
      type: 'abstraction_permit',
      authority: 'SEMAS-PA',
      request_identifier: 'PRT-1',
      status: 'requested',
    };
    const section = buildPermitSection(
      baseWell({ permits: [requested] }),
      ctx,
      '2026-10-03',
    );
    expect(JSON.stringify(section)).toContain('Requested');
    expect(collectFields(section).requestIdentifier).toEqual(['PRT-1']);
  });

  it('lists the most recent permit first and marks the superseded one', () => {
    const renewal: Permit = {
      ...permit,
      id: 'pmt-02',
      identifier: '999/2029',
      issued_at: '2029-01-15',
      valid_from: '2029-02-11',
      valid_until: '2033-02-10',
      supersedes: 'pmt-01',
      conditions: undefined,
      attachments: undefined,
    };
    const section = buildPermitSection(
      baseWell({ permits: [permit, renewal] }),
      ctx,
      '2029-03-01',
    );
    const text = JSON.stringify(section);
    expect(text.indexOf('999/2029')).toBeLessThan(text.indexOf('1234/2025'));
    expect(text).toContain('Superseded');
  });

  it('honors a custom date format and the table header color', () => {
    const section = buildPermitSection(
      well,
      makeTestContext(
        {
          dateFormats: { date: 'yyyy-MM-dd' },
          theme: { colors: { tableHeader: '#123456' } },
        },
        lastSegmentLabels,
      ),
      '2026-10-03',
    );
    const text = JSON.stringify(section);
    expect(text).toContain('2025-02-10 → 2029-02-10');
    expect(collectFields(section).issuedAt).toEqual(['2025-02-10']);
    expect(findTables(section, 'date')[0]![1]![0]).toBe('2024-11-04');
    expect(text).toContain('Overdue:\u00a02025-07-31, 2026-01-31, 2026-07-31');
    expect(findTables(section, 'number')[1]![1]![2]).toBe('2025-05-11');
    expect(text).not.toMatch(/\d{2}\/\d{2}\/\d{4}/);
    // The condition category uses the theme's table header color.
    expect(text).toContain('"color":"#123456"');
  });
});
