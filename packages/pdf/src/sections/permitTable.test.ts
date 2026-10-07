import type { Permit } from '@welldot/core';
import { describe, expect, it } from 'vitest';
import { baseWell, lastSegmentLabels, makeTestContext } from '../test-utils';
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
    expect(text).toContain(
      'Install meter (Equipment installation · responsible: Ops team) — Fulfilled 11/05/2025',
    );
    expect(text).toContain('deadline 11/05/2025 · J. Silva · Meter installed');
    expect(text).toContain('Overdue: 31/07/2025, 31/01/2026, 31/07/2026');
    expect(text).toContain('Upcoming: 31/01/2027');
    expect(text).toContain('portaria.pdf');
  });

  it('lists the administrative history oldest first', () => {
    const text = JSON.stringify(buildPermitSection(well, ctx, '2026-10-03'));
    expect(text).toContain('04/11/2024 · Filing · Request filed');
    expect(text).toContain('15/12/2024 · Fee · Analysis fee · (done)');
    expect(text.indexOf('Request filed')).toBeLessThan(
      text.indexOf('Analysis fee'),
    );
  });

  it('shows the administrative status of a requested permit', () => {
    const requested: Permit = {
      id: 'pmt-r',
      type: 'abstraction_permit',
      authority: 'SEMAS-PA',
      request_identifier: 'PRT-1',
      status: 'requested',
    };
    const text = JSON.stringify(
      buildPermitSection(baseWell({ permits: [requested] }), ctx, '2026-10-03'),
    );
    expect(text).toContain('Requested');
    expect(text).toContain('requestIdentifier: PRT-1');
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
    expect(text).toContain('issuedAt: 2025-02-10');
    expect(text).toContain('2024-11-04 · Filing · Request filed');
    expect(text).toContain('Overdue: 2025-07-31, 2026-01-31, 2026-07-31');
    expect(text).toContain('deadline 2025-05-11 · J. Silva');
    expect(text).not.toMatch(/\d{2}\/\d{2}\/\d{4}/);
    // Fulfillment lines use the theme's table header color.
    expect(text).toContain('"color":"#123456"');
  });
});
