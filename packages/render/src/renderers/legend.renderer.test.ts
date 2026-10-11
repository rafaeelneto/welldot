import type { Well } from '@welldot/core';
import { describe, expect, it } from 'vitest';
import { INTERACTIVE_RENDER_CONFIG } from '../configs/render.configs';
import { getWellLegendItems } from './legend.renderer';

function makeWell(overrides: Partial<Well> = {}): Well {
  return { version: 2, ...overrides } as unknown as Well;
}

describe('getWellLegendItems', () => {
  it('returns nothing for an empty well', () => {
    expect(getWellLegendItems(makeWell())).toEqual([]);
  });

  it('lists one entry per symbol the well needs, in display order', () => {
    const well = makeWell({
      bore_hole: [{ from: 0, to: 120, diameter: 0.3 }],
      fractures: [
        { depth: 30, swarm: true, water_intake: false },
        { depth: 40, swarm: false, water_intake: false },
      ],
      pump_installations: [
        { id: 'p1', installed_at: '2026-01-01T00:00:00Z', intake_depth: 60 },
      ],
    } as unknown as Partial<Well>);

    const items = getWellLegendItems(well);
    expect(items.map(i => i.key)).toEqual([
      'fractureSingle',
      'fractureSwarm',
      'boreHole',
      'pump',
    ]);
    expect(items.map(i => i.label)).toEqual([
      INTERACTIVE_RENDER_CONFIG.legend.labels.fractureSingle,
      INTERACTIVE_RENDER_CONFIG.legend.labels.fractureSwarm,
      INTERACTIVE_RENDER_CONFIG.legend.labels.boreHole,
      INTERACTIVE_RENDER_CONFIG.legend.labels.pump,
    ]);
  });

  it('labels entries from the given labels', () => {
    const items = getWellLegendItems(
      makeWell({
        bore_hole: [{ from: 0, to: 10, diameter: 0.3 }],
      } as Partial<Well>),
      { ...INTERACTIVE_RENDER_CONFIG.legend.labels, boreHole: 'Borehole' },
    );
    expect(items).toEqual([
      {
        kind: 'construction',
        key: 'boreHole',
        label: 'Borehole',
        subKind: 'boreHole',
      },
    ]);
  });

  it('skips the pump when every installation was removed', () => {
    const well = makeWell({
      pump_installations: [
        {
          id: 'p1',
          installed_at: '2026-01-01T00:00:00Z',
          removed_at: '2026-02-01T00:00:00Z',
          intake_depth: 60,
        },
      ],
    } as unknown as Partial<Well>);
    expect(getWellLegendItems(well)).toEqual([]);
  });
});
