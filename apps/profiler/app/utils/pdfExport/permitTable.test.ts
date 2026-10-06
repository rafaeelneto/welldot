import type { Permit, Well } from '@welldot/core';
import { describe, expect, it } from 'vitest';
import { buildPermitSection } from './permitTable';
import type { PdfExportOptions } from './types';

function baseWell(overrides: Partial<Well> = {}): Well {
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
    ...overrides,
  };
}

const baseOptions: PdfExportOptions = {
  header: 'Header',
  breakPages: false,
  scale: 500,
  metadataPosition: 'before',
  headingInfo: [],
  endInfo: [],
  lengthUnit: 'm',
  diameterUnit: 'mm',
  coordinateFormat: 'DD',
  locale: 'en',
  baseUrl: 'https://example.test',
};

const t = (key: string) => key.split('.').pop()!;

const permit: Permit = {
  id: 'pmt-01',
  type: 'abstraction_permit',
  authority: 'SEMAS-PA',
  number: '1234/2025',
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
      category: 'meter_installation',
      due_after: 'P90D',
    },
    {
      id: 'c2',
      description: 'Semiannual report',
      first_due: '2025-07-31',
      recurrence: 'P6M',
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

const well = baseWell({
  permits: [permit],
  history_logs: [
    {
      id: 'log-1',
      datetime: '2025-04-02T10:00:00-03:00',
      category: 'permit_condition',
      description: 'Meter installed',
      permit_id: 'pmt-01',
      condition_id: 'c1',
      due_date: '2025-05-11',
    },
  ],
});

describe('buildPermitSection', () => {
  it('returns null when there are no permits', () => {
    expect(buildPermitSection(baseWell(), baseOptions, t)).toBeNull();
  });

  it('renders status, validity, grants, conditions and attachments', () => {
    const section = buildPermitSection(well, baseOptions, t, '2026-10-03');
    const text = JSON.stringify(section);
    expect(text).toContain('active');
    expect(text).toContain('10/02/2025 → 10/02/2029');
    expect(text).toContain('SEMAS-PA');
    expect(text).toContain('1234/2025');
    expect(text).toContain('human_supply');
    expect(text).toContain(
      'Install meter (meter_installation) — fulfilled 11/05/2025',
    );
    expect(text).toContain('overdue: 31/07/2025, 31/01/2026, 31/07/2026');
    expect(text).toContain('upcoming: 31/01/2027');
    expect(text).toContain('portaria.pdf');
  });

  it('lists the most recent permit first and marks the superseded one', () => {
    const renewal: Permit = {
      ...permit,
      id: 'pmt-02',
      number: '999/2029',
      issued_at: '2029-01-15',
      valid_from: '2029-02-11',
      valid_until: '2033-02-10',
      supersedes: 'pmt-01',
      conditions: undefined,
      attachments: undefined,
    };
    const section = buildPermitSection(
      baseWell({ permits: [permit, renewal] }),
      baseOptions,
      t,
      '2029-03-01',
    );
    const text = JSON.stringify(section);
    expect(text.indexOf('999/2029')).toBeLessThan(text.indexOf('1234/2025'));
    expect(text).toContain('superseded');
  });
});
