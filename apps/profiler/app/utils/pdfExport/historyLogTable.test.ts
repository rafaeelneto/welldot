import type { HistoryLogEntry, Well } from '@welldot/core';
import { describe, expect, it } from 'vitest';
import { buildHistoryLogSection } from './historyLogTable';
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

describe('buildHistoryLogSection', () => {
  it('returns null when there are no log entries', () => {
    expect(buildHistoryLogSection(baseWell(), baseOptions, t)).toBeNull();
  });

  it('includes category, severity, description, and author', () => {
    const logs: HistoryLogEntry[] = [
      {
        id: '1',
        datetime: '2024-05-01T10:00:00-03:00',
        category: 'maintenance',
        description: 'Replaced pump seal',
        author: 'Jane Doe',
        severity: 'medium',
      },
    ];
    const serialized = JSON.stringify(
      buildHistoryLogSection(baseWell({ history_logs: logs }), baseOptions, t),
    );
    expect(serialized).toContain('maintenance');
    expect(serialized).toContain('medium');
    expect(serialized).toContain('Replaced pump seal');
    expect(serialized).toContain('Jane Doe');
  });

  it('appends attachment filenames to the description, falling back to the URI basename', () => {
    const logs: HistoryLogEntry[] = [
      {
        id: '1',
        datetime: '2024-05-01T10:00:00-03:00',
        category: 'inspection',
        description: 'Annual inspection',
        attachments: [
          {
            id: 'a1',
            uri: 'https://example.test/report.pdf',
            media_type: 'application/pdf',
            filename: 'report.pdf',
          },
          {
            id: 'a2',
            uri: 'https://example.test/photo.jpg',
            media_type: 'image/jpeg',
          },
        ],
      },
    ];
    const serialized = JSON.stringify(
      buildHistoryLogSection(baseWell({ history_logs: logs }), baseOptions, t),
    );
    // Rendered as their own bulleted lines, not appended inline to the description.
    expect(serialized).toContain('•  report.pdf');
    expect(serialized).toContain('•  photo.jpg');
  });

  it('falls back to the raw category/severity string for unknown values', () => {
    const logs: HistoryLogEntry[] = [
      {
        id: '1',
        datetime: '2024-05-01T10:00:00-03:00',
        category: 'custom_category',
        description: 'Something',
        severity: 'custom_severity',
      },
    ];
    const serialized = JSON.stringify(
      buildHistoryLogSection(baseWell({ history_logs: logs }), baseOptions, t),
    );
    expect(serialized).toContain('custom_category');
    expect(serialized).toContain('custom_severity');
  });

  it('sorts entries most recent first', () => {
    const logs: HistoryLogEntry[] = [
      {
        id: 'old',
        datetime: '2023-01-01T00:00:00Z',
        category: 'event',
        description: 'Older entry',
      },
      {
        id: 'new',
        datetime: '2024-01-01T00:00:00Z',
        category: 'event',
        description: 'Newer entry',
      },
    ];
    const section = buildHistoryLogSection(
      baseWell({ history_logs: logs }),
      baseOptions,
      t,
    ) as { stack: unknown[] };
    const items = section.stack;
    // items[0] is the title+header anchor (no description text); items[1] is
    // the newest entry's description body; a divider then the next entry follow.
    expect(JSON.stringify(items[1])).toContain('Newer entry');
    expect(JSON.stringify(items[3])).toContain('Older entry');
  });

  it('separates entries with a divider', () => {
    const logs: HistoryLogEntry[] = [
      {
        id: 'a',
        datetime: '2024-01-01T00:00:00Z',
        category: 'event',
        description: 'First',
      },
      {
        id: 'b',
        datetime: '2024-01-02T00:00:00Z',
        category: 'event',
        description: 'Second',
      },
    ];
    const section = buildHistoryLogSection(
      baseWell({ history_logs: logs }),
      baseOptions,
      t,
    ) as { stack: unknown[] };
    const items = section.stack;
    // anchor (title+header), first entry's body block, divider, second entry.
    expect(items).toHaveLength(4);
  });

  it('prints the maintenance type and the status_change status', () => {
    const logs: HistoryLogEntry[] = [
      {
        id: 'm',
        datetime: '2024-05-01T10:00:00-03:00',
        category: 'maintenance',
        maintenance_type: 'meter_calibration',
        description: 'Calibrated',
      },
      {
        id: 's',
        datetime: '2024-06-01T10:00:00-03:00',
        category: 'status_change',
        status: 'inactive',
        description: 'Stopped',
      },
    ];
    const serialized = JSON.stringify(
      buildHistoryLogSection(baseWell({ history_logs: logs }), baseOptions, t),
    );
    expect(serialized).toContain('status_change');
    expect(serialized).toContain(' · meter_calibration');
    expect(serialized).toContain(' · inactive');
  });
});
