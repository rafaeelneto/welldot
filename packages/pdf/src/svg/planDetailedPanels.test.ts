import { describe, expect, it } from 'vitest';
import {
  FIT_EPSILON,
  OVERLAP_HEIGHT,
  planDetailedPanels,
  type PlanDetailedPanelsOptions,
} from './planDetailedPanels';

const padding = 50;
const pageHeight = 650;
const ptPerMeter = 5; // a full page (600 pt of drawing) spans 120 m

const plan = (options: Partial<PlanDetailedPanelsOptions> = {}) =>
  planDetailedPanels({
    totalDepth: 615,
    ptPerMeter,
    contacts: [],
    breakPages: true,
    pageHeight,
    padding,
    ...options,
  });

const contact = (depth: number) => ({ depth, above: 'A', below: 'B' });

describe('planDetailedPanels', () => {
  it('draws one panel for the whole profile without page breaks', () => {
    expect(plan({ breakPages: false })).toEqual([
      {
        height: 615 * ptPerMeter + padding,
        breakBefore: false,
        depthFrom: 0,
        depthTo: 615,
      },
    ]);
  });

  it('starts at the top of a pipe sticking up above the ground', () => {
    expect(plan({ breakPages: false, topDepth: -2 })[0]).toEqual({
      height: 617 * ptPerMeter + padding,
      breakBefore: false,
      depthFrom: -2,
      depthTo: 615,
    });
    const panels = plan({ topDepth: -2 });
    expect(panels[0]).toMatchObject({ depthFrom: -2, depthTo: 118 });
    expect(panels[panels.length - 1]!.depthTo).toBe(615);
  });

  it('fills pages at the exact scale and repeats the bottom of each page', () => {
    const panels = plan();
    const overlap = OVERLAP_HEIGHT / ptPerMeter;

    expect(panels[0]).toMatchObject({ depthFrom: 0, depthTo: 120 });
    expect(panels[0]!.repeatedTo).toBeUndefined();
    expect(panels[1]).toMatchObject({
      depthFrom: 120 - overlap,
      depthTo: 240 - overlap,
      repeatedTo: 120,
      breakBefore: true,
    });
    for (const p of panels) {
      expect(p.height).toBeCloseTo(
        (p.depthTo - p.depthFrom) * ptPerMeter + padding,
      );
      expect(p.height).toBeLessThanOrEqual(pageHeight);
    }
    expect(panels[panels.length - 1]!.depthTo).toBe(615);
  });

  it('snaps a break to the deepest contact just above the natural end', () => {
    const panels = plan({
      contacts: [contact(50), contact(105), contact(110)],
    });
    expect(panels[0]).toMatchObject({ depthTo: 110, snap: contact(110) });
    expect(panels[1]).toMatchObject({ repeatedTo: 110 });
  });

  it('ignores contacts outside the snap window', () => {
    // 15 % of a 120 m span: contacts above 102 m are too far up.
    const panels = plan({ contacts: [contact(100)] });
    expect(panels[0]).toMatchObject({ depthTo: 120 });
    expect(panels[0]!.snap).toBeUndefined();
  });

  it('fills the room left on the first page', () => {
    const panels = plan({ firstPageRemaining: 300 });
    expect(panels[0]).toMatchObject({ breakBefore: false, depthFrom: 0 });
    expect(panels[0]!.height).toBeCloseTo(300 - FIT_EPSILON);
    expect(panels[1]!.breakBefore).toBe(true);
  });

  it('starts on a new page when too little room is left', () => {
    const panels = plan({ firstPageRemaining: padding + 40 });
    expect(panels[0]).toMatchObject({ breakBefore: true, depthTo: 120 });
  });

  it('caps the overlap at a quarter of a page', () => {
    const panels = plan({ overlap: 10_000 });
    expect(panels[1]!.depthFrom).toBeCloseTo(120 - 30);
  });

  it('always advances and ends at the bottom of the well', () => {
    for (const total of [1, 119.9, 120, 121, 777.7]) {
      const panels = plan({
        totalDepth: total,
        contacts: [contact(total / 2), contact(total * 0.9)],
        firstPageRemaining: 400,
      });
      expect(panels[panels.length - 1]!.depthTo).toBe(total);
      panels.slice(1).forEach((p, i) => {
        expect(p.depthTo).toBeGreaterThan(panels[i]!.depthTo);
      });
    }
  });

  it('keeps the first-panel reserve free, on the first page or a new one', () => {
    const reserved = plan({ firstPageRemaining: 300, firstPanelReserve: 40 });
    expect(reserved[0]!.height).toBeCloseTo(300 - FIT_EPSILON - 40);
    expect(reserved[1]!.height).toBeLessThanOrEqual(pageHeight);
    expect(reserved[1]!.depthTo - reserved[1]!.depthFrom).toBeCloseTo(120);

    const pushed = plan({
      firstPageRemaining: padding + 40,
      firstPanelReserve: 40,
    });
    expect(pushed[0]).toMatchObject({ breakBefore: true });
    expect(pushed[0]!.height).toBeCloseTo(pageHeight - 40);
  });
});
