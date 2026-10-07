import type { HydrodynamicEvent } from '@welldot/core';
import { describe, expect, it } from 'vitest';
import { baseWell, lastSegmentLabels, makeTestContext } from '../test-utils';
import { buildHydrodynamicEventsSection } from './hydrodynamicEventsTable';

const ctx = makeTestContext({}, lastSegmentLabels);

describe('buildHydrodynamicEventsSection', () => {
  it('returns null when there are no events', () => {
    expect(buildHydrodynamicEventsSection(baseWell(), ctx)).toBeNull();
  });

  it('summarizes a constant_rate event: static level, dynamic level, and rate', () => {
    const events: HydrodynamicEvent[] = [
      {
        id: '1',
        type: 'constant_rate',
        datetime: '2024-05-01T10:00:00-03:00',
        static_level: 12.5,
        operator: 'Acme Drilling',
        steps: [
          {
            rate: 8,
            readings: [
              { elapsed: 0, depth: 12.5 },
              { elapsed: 60, depth: 15.2 },
            ],
          },
        ],
      },
    ];
    const well = baseWell({ hydrodynamic_events: events });
    const serialized = JSON.stringify(
      buildHydrodynamicEventsSection(well, ctx),
    );
    expect(serialized).toContain('12.50 m');
    expect(serialized).toContain('15.20 m');
    expect(serialized).toContain('8.0 m³/h');
    expect(serialized).toContain('Acme Drilling');
  });

  it('uses pumping_rate for recovery_only events', () => {
    const events: HydrodynamicEvent[] = [
      {
        id: '2',
        type: 'recovery_only',
        datetime: '2024-05-02T10:00:00-03:00',
        pumping_rate: 10,
        recovery: { readings: [{ elapsed: 0, depth: 10 }] },
      },
    ];
    const well = baseWell({ hydrodynamic_events: events });
    const serialized = JSON.stringify(
      buildHydrodynamicEventsSection(well, ctx),
    );
    expect(serialized).toContain('10.0 m³/h');
  });

  it('falls back to the raw type string for unknown event types', () => {
    const events: HydrodynamicEvent[] = [
      {
        id: '3',
        type: 'custom_test',
        datetime: '2024-05-03T10:00:00-03:00',
      } as unknown as HydrodynamicEvent,
    ];
    const well = baseWell({ hydrodynamic_events: events });
    const serialized = JSON.stringify(
      buildHydrodynamicEventsSection(well, ctx),
    );
    expect(serialized).toContain('custom_test');
  });

  it('sorts events most recent first', () => {
    const events: HydrodynamicEvent[] = [
      {
        id: 'old',
        type: 'spot_measurement',
        datetime: '2023-01-01T00:00:00Z',
        static_level: 1,
      },
      {
        id: 'new',
        type: 'spot_measurement',
        datetime: '2024-01-01T00:00:00Z',
        static_level: 2,
      },
    ];
    const well = baseWell({ hydrodynamic_events: events });
    const section = buildHydrodynamicEventsSection(well, ctx) as {
      stack: unknown[];
    };
    const items = section.stack;
    // items[0] is the title+header anchor (no stats); items[1] is the
    // newest event's stats block; a divider then the next event follow.
    expect(JSON.stringify(items[1])).toContain('2.00 m');
    expect(JSON.stringify(items[3])).toContain('1.00 m');
  });

  it('separates events with a divider', () => {
    const events: HydrodynamicEvent[] = [
      {
        id: 'a',
        type: 'spot_measurement',
        datetime: '2024-01-01T00:00:00Z',
        static_level: 1,
      },
      {
        id: 'b',
        type: 'spot_measurement',
        datetime: '2024-01-02T00:00:00Z',
        static_level: 2,
      },
    ];
    const well = baseWell({ hydrodynamic_events: events });
    const section = buildHydrodynamicEventsSection(well, ctx) as {
      stack: unknown[];
    };
    const items = section.stack;
    // anchor (title+header), first event's stats block, divider, second event.
    expect(items).toHaveLength(4);
  });

  it('formats the event datetime with a custom dateFormats.dateTime', () => {
    const events: HydrodynamicEvent[] = [
      {
        id: 'a',
        type: 'spot_measurement',
        datetime: '2024-01-02T03:04:00',
        static_level: 1,
      },
    ];
    const well = baseWell({ hydrodynamic_events: events });
    const serialized = JSON.stringify(
      buildHydrodynamicEventsSection(
        well,
        makeTestContext(
          { dateFormats: { dateTime: 'yyyy-MM-dd HH:mm' } },
          lastSegmentLabels,
        ),
      ),
    );
    expect(serialized).toContain('2024-01-02 03:04');
  });

  it('colors the entry divider with the theme divider color and page width', () => {
    const events: HydrodynamicEvent[] = [
      {
        id: 'a',
        type: 'spot_measurement',
        datetime: '2024-01-01T00:00:00Z',
        static_level: 1,
      },
      {
        id: 'b',
        type: 'spot_measurement',
        datetime: '2024-01-02T00:00:00Z',
        static_level: 2,
      },
    ];
    const well = baseWell({ hydrodynamic_events: events });
    const custom = makeTestContext(
      { theme: { colors: { divider: '#abcdef' } }, page: { size: 'A3' } },
      lastSegmentLabels,
    );
    const section = buildHydrodynamicEventsSection(well, custom) as {
      stack: { canvas?: { lineColor: string; x2: number }[] }[];
    };
    const line = section.stack[2]!.canvas![0]!;
    expect(line.lineColor).toBe('#abcdef');
    expect(line.x2).toBe(custom.page.contentWidth);
  });
});
