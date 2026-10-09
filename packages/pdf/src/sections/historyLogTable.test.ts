import type { HistoryLogEntry } from '@welldot/core';
import { describe, expect, it } from 'vitest';
import { baseWell, lastSegmentLabels, makeTestContext } from '../test-utils';
import { buildHistoryLogSection } from './historyLogTable';

const ctx = makeTestContext({}, lastSegmentLabels);

describe('buildHistoryLogSection', () => {
  it('returns null when there are no log entries', () => {
    expect(buildHistoryLogSection(baseWell(), ctx)).toBeNull();
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
      buildHistoryLogSection(baseWell({ history_logs: logs }), ctx),
    );
    expect(serialized).toContain('Maintenance');
    expect(serialized).toContain('Medium');
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
      buildHistoryLogSection(baseWell({ history_logs: logs }), ctx),
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
      buildHistoryLogSection(baseWell({ history_logs: logs }), ctx),
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
      ctx,
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
      ctx,
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
      buildHistoryLogSection(baseWell({ history_logs: logs }), ctx),
    );
    expect(serialized).toContain('Status change');
    expect(serialized).toContain(' · Meter calibration');
    expect(serialized).toContain(' · Inactive');
  });

  it('honors a custom dateTime format and the theme divider color', () => {
    const logs: HistoryLogEntry[] = [
      {
        id: 'a',
        datetime: '2024-03-05T12:00:00Z',
        category: 'event',
        description: 'First',
      },
      {
        id: 'b',
        datetime: '2024-03-04T12:00:00Z',
        category: 'event',
        description: 'Second',
      },
    ];
    const serialized = JSON.stringify(
      buildHistoryLogSection(
        baseWell({ history_logs: logs }),
        makeTestContext(
          {
            dateFormats: { dateTime: "yyyy-MM-dd '@' HH:mm" },
            theme: { colors: { divider: '#123456' } },
          },
          lastSegmentLabels,
        ),
      ),
    );
    expect(serialized).toMatch(/2024-03-05 @ \d{2}:\d{2}/);
    expect(serialized).not.toContain('05/03/2024');
    expect(serialized).toContain('#123456');
  });

  it('resolves labels from the package label pack', () => {
    const logs: HistoryLogEntry[] = [
      {
        id: '1',
        datetime: '2024-05-01T10:00:00-03:00',
        category: 'status_change',
        status: 'inactive',
        description: 'Stopped',
        author: 'Jane Doe',
      },
    ];
    const serialized = JSON.stringify(
      buildHistoryLogSection(
        baseWell({ history_logs: logs }),
        makeTestContext(),
      ),
    );
    expect(serialized).toContain('History Logs');
    expect(serialized).toContain('by Jane Doe');
    expect(serialized).toContain(' · Inactive');
  });
});
