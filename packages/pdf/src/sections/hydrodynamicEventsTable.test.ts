import type { HydrodynamicEvent } from '@welldot/core';
import { describe, expect, it } from 'vitest';
import {
  baseWell,
  findTables,
  lastSegmentLabels,
  makeTestContext,
} from '../test-utils';
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
    // Values never wrap away from their unit.
    expect(serialized).toContain(
      '{"text":"8.0 m³/h","style":"columnRight","noWrap":true}',
    );
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

  it('lists one row per event, most recent first', () => {
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
    const [table] = findTables(
      buildHydrodynamicEventsSection(well, ctx),
      'datetime',
    );
    expect(table![0]).toEqual([
      'datetime',
      'type',
      'ne',
      'nd',
      'flowRate',
      'operator',
    ]);
    expect(table).toHaveLength(1 + 2);
    expect(table![1]![2]).toBe('2.00 m');
    expect(table![2]![2]).toBe('1.00 m');
    // No reading, no rate: unknown, never zero.
    expect(table![1]![3]).toBe('—');
    expect(table![1]![4]).toBe('—');
  });

  it('adds a notes column only when an event has notes', () => {
    const events: HydrodynamicEvent[] = [
      {
        id: 'a',
        type: 'spot_measurement',
        datetime: '2024-01-01T00:00:00Z',
        static_level: 1,
        notes: 'Logger reset',
      },
      {
        id: 'b',
        type: 'spot_measurement',
        datetime: '2024-01-02T00:00:00Z',
        static_level: 2,
      },
    ];
    const well = baseWell({ hydrodynamic_events: events });
    const [table] = findTables(
      buildHydrodynamicEventsSection(well, ctx),
      'datetime',
    );
    expect(table![0]).toContain('notes');
    expect(table![2]).toContain('Logger reset');
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
});
