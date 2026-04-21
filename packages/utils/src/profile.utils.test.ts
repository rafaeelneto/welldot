import { describe, expect, it } from 'vitest';

import type {
  BoreHole,
  Cave,
  Constructive,
  Fracture,
  HoleFill,
  Lithology,
  Reduction,
  SurfaceCase,
  Well,
  WellCase,
  WellScreen,
} from '@welldot/core';

import {
  calculateCilindricVolume,
  calculateHoleFillVolume,
  getConstructivePropertySummary,
  getProfileDiamValues,
  getProfileLastItemsDepths,
} from './profile.utils';

// ─── Factories ────────────────────────────────────────────────────────────────

function makeBoreHole(o: Partial<BoreHole> = {}): BoreHole {
  return { from: 0, to: 10, diameter: 200, ...o };
}

function makeWellCase(o: Partial<WellCase> = {}): WellCase {
  return { from: 0, to: 10, type: 'steel', diameter: 150, ...o };
}

function makeWellScreen(o: Partial<WellScreen> = {}): WellScreen {
  return { from: 10, to: 20, type: 'wire_wound', diameter: 100, screen_slot_mm: 0.5, ...o };
}

function makeReduction(o: Partial<Reduction> = {}): Reduction {
  return { from: 5, to: 6, diam_from: 200, diam_to: 150, type: 'conical', ...o };
}

function makeSurfaceCase(o: Partial<SurfaceCase> = {}): SurfaceCase {
  return { from: 0, to: 1, diameter: 300, ...o };
}

function makeHoleFill(o: Partial<HoleFill> = {}): HoleFill {
  return { from: 0, to: 10, type: 'gravel_pack', diameter: 250, description: 'fine gravel', ...o };
}

function makeLithology(o: Partial<Lithology> = {}): Lithology {
  return {
    from: 0,
    to: 10,
    description: 'clay',
    color: '#c8a87e',
    fgdc_texture: '601',
    geologic_unit: 'Unit A',
    aquifer_unit: '',
    ...o,
  };
}

function makeFracture(o: Partial<Fracture> = {}): Fracture {
  return { depth: 15, water_intake: true, description: 'fracture', swarm: false, azimuth: 0, dip: 45, ...o };
}

function makeCave(o: Partial<Cave> = {}): Cave {
  return { from: 20, to: 25, water_intake: false, description: 'void', ...o };
}

function emptyWell(): Well {
  return {
    bore_hole: [],
    well_case: [],
    reduction: [],
    well_screen: [],
    surface_case: [],
    hole_fill: [],
    cement_pad: { type: '', width: 0, thickness: 0, length: 0 },
    lithology: [],
    fractures: [],
    caves: [],
  };
}

function emptyConstructive(): Constructive {
  return {
    bore_hole: [],
    well_case: [],
    reduction: [],
    well_screen: [],
    surface_case: [],
    hole_fill: [],
    cement_pad: { type: '', width: 0, thickness: 0, length: 0 },
  };
}

// ─── getProfileLastItemsDepths ────────────────────────────────────────────────

describe('getProfileLastItemsDepths', () => {
  it('returns all zeros for a fully empty well', () => {
    expect(getProfileLastItemsDepths(emptyWell())).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('returns depths in component order: lithology, fractures, caves, bore_hole, hole_fill, reduction, surface_case, well_case, well_screen', () => {
    const well: Well = {
      ...emptyWell(),
      lithology: [makeLithology({ to: 5 })],
      fractures: [makeFracture({ depth: 12 })],
      caves: [makeCave({ to: 8 })],
      bore_hole: [makeBoreHole({ to: 20 })],
      hole_fill: [makeHoleFill({ to: 15 })],
      reduction: [makeReduction({ to: 7 })],
      surface_case: [makeSurfaceCase({ to: 3 })],
      well_case: [makeWellCase({ to: 18 })],
      well_screen: [makeWellScreen({ to: 25 })],
    };
    expect(getProfileLastItemsDepths(well)).toEqual([5, 12, 8, 20, 15, 7, 3, 18, 25]);
  });

  it('uses the LAST item in each array, not the first', () => {
    const well: Well = {
      ...emptyWell(),
      bore_hole: [makeBoreHole({ to: 10 }), makeBoreHole({ to: 30 })],
      well_case: [makeWellCase({ to: 10 }), makeWellCase({ to: 20 })],
    };
    const depths = getProfileLastItemsDepths(well);
    expect(depths[3]).toBe(30); // bore_hole
    expect(depths[7]).toBe(20); // well_case
  });

  it('uses `depth` field for fractures (point items), not `to`', () => {
    const well: Well = {
      ...emptyWell(),
      fractures: [makeFracture({ depth: 42 })],
    };
    expect(getProfileLastItemsDepths(well)[1]).toBe(42);
  });

  it('correctly handles fracture depth = 0 (not treated as missing)', () => {
    const well: Well = {
      ...emptyWell(),
      fractures: [makeFracture({ depth: 0 })],
    };
    expect(getProfileLastItemsDepths(well)[1]).toBe(0);
  });

  it('returns 0 for each empty array even when other arrays have data', () => {
    const well: Well = {
      ...emptyWell(),
      bore_hole: [makeBoreHole({ to: 50 })],
    };
    const depths = getProfileLastItemsDepths(well);
    expect(depths[0]).toBe(0); // lithology empty
    expect(depths[1]).toBe(0); // fractures empty
    expect(depths[3]).toBe(50); // bore_hole populated
  });

  it('uses `to` field for caves (interval items)', () => {
    const well: Well = { ...emptyWell(), caves: [makeCave({ to: 33 })] };
    expect(getProfileLastItemsDepths(well)[2]).toBe(33);
  });
});

// ─── getProfileDiamValues ─────────────────────────────────────────────────────

describe('getProfileDiamValues', () => {
  it('returns an empty array for an all-empty constructive section', () => {
    expect(getProfileDiamValues(emptyConstructive())).toEqual([]);
  });

  it('collects diameters from every component type', () => {
    const data: Constructive = {
      ...emptyConstructive(),
      bore_hole: [makeBoreHole({ diameter: 200 })],
      hole_fill: [makeHoleFill({ diameter: 250 })],
      surface_case: [makeSurfaceCase({ diameter: 300 })],
      well_screen: [makeWellScreen({ diameter: 100 })],
      well_case: [makeWellCase({ diameter: 150 })],
      reduction: [makeReduction({ diam_from: 200, diam_to: 150 })],
    };
    expect(getProfileDiamValues(data)).toEqual([200, 250, 300, 100, 150, 200, 150]);
  });

  it('flattens both diam_from and diam_to from each reduction entry', () => {
    const data: Constructive = {
      ...emptyConstructive(),
      reduction: [
        makeReduction({ diam_from: 300, diam_to: 200 }),
        makeReduction({ diam_from: 200, diam_to: 150 }),
      ],
    };
    expect(getProfileDiamValues(data)).toEqual([300, 200, 200, 150]);
  });

  it('handles multiple items in a single component', () => {
    const data: Constructive = {
      ...emptyConstructive(),
      bore_hole: [makeBoreHole({ diameter: 200 }), makeBoreHole({ diameter: 250 })],
    };
    expect(getProfileDiamValues(data)).toEqual([200, 250]);
  });

  it('includes zero diameters', () => {
    const data: Constructive = {
      ...emptyConstructive(),
      bore_hole: [makeBoreHole({ diameter: 0 })],
    };
    expect(getProfileDiamValues(data)).toContain(0);
  });
});

// ─── getConstructivePropertySummary ──────────────────────────────────────────

describe('getConstructivePropertySummary', () => {
  it('returns an empty array when all sections are empty', () => {
    expect(getConstructivePropertySummary(emptyConstructive(), 'type')).toEqual([]);
  });

  it('returns an empty array for fully absent constructive (empty partial)', () => {
    expect(getConstructivePropertySummary({}, 'diameter')).toEqual([]);
  });

  it('extracts `type` from well_screen and well_case (in component order)', () => {
    const data: Partial<Constructive> = {
      well_case: [makeWellCase({ type: 'steel' }), makeWellCase({ type: 'pvc' })],
      well_screen: [makeWellScreen({ type: 'wire_wound' })],
    };
    // component order: bore_hole, hole_fill, surface_case, well_screen, well_case, reduction
    expect(getConstructivePropertySummary<string>(data, 'type')).toEqual([
      'wire_wound',
      'steel',
      'pvc',
    ]);
  });

  it('extracts `diameter` across all component types in order', () => {
    const data: Partial<Constructive> = {
      bore_hole: [makeBoreHole({ diameter: 200 })],
      hole_fill: [makeHoleFill({ diameter: 250 })],
      surface_case: [makeSurfaceCase({ diameter: 300 })],
      well_screen: [makeWellScreen({ diameter: 100 })],
      well_case: [makeWellCase({ diameter: 150 })],
      reduction: [makeReduction({ diam_from: 99, diam_to: 88 })],
    };
    const result = getConstructivePropertySummary<number>(data, 'diameter');
    // reduction has no `diameter` field, so it contributes `undefined`
    expect(result).toEqual([200, 250, 300, 100, 150, undefined]);
  });

  it('skips undefined sections without throwing', () => {
    const data: Partial<Constructive> = {
      bore_hole: [makeBoreHole({ diameter: 200 })],
    };
    expect(() => getConstructivePropertySummary(data, 'diameter')).not.toThrow();
    expect(getConstructivePropertySummary<number>(data, 'diameter')).toEqual([200]);
  });

  it('returns undefined for a property that does not exist on items', () => {
    const data: Partial<Constructive> = {
      bore_hole: [makeBoreHole()],
    };
    const result = getConstructivePropertySummary(data, 'nonexistent_prop');
    expect(result).toEqual([undefined]);
  });
});

// ─── calculateCilindricVolume ─────────────────────────────────────────────────

describe('calculateCilindricVolume', () => {
  it('returns 0 when diameter is 0', () => {
    expect(calculateCilindricVolume(0, 10)).toBe(0);
  });

  it('returns 0 when height is 0', () => {
    expect(calculateCilindricVolume(200, 0)).toBe(0);
  });

  it('calculates correctly for diameter=1000mm, height=1m → π/4 m³', () => {
    expect(calculateCilindricVolume(1000, 1)).toBeCloseTo(Math.PI / 4, 10);
  });

  it('calculates correctly for diameter=200mm, height=5m', () => {
    // r = 0.1m → π × 0.01 × 5 = 0.05π
    expect(calculateCilindricVolume(200, 5)).toBeCloseTo(0.05 * Math.PI, 10);
  });

  it('scales linearly with height', () => {
    const v1 = calculateCilindricVolume(200, 1);
    const v3 = calculateCilindricVolume(200, 3);
    expect(v3).toBeCloseTo(v1 * 3, 10);
  });

  it('scales with the square of the radius (quadratic in diameter)', () => {
    const v1 = calculateCilindricVolume(100, 1);
    const v2 = calculateCilindricVolume(200, 1);
    expect(v2).toBeCloseTo(v1 * 4, 10);
  });
});

// ─── calculateHoleFillVolume ──────────────────────────────────────────────────

describe('calculateHoleFillVolume', () => {
  it('returns 0 when there are no hole_fill entries', () => {
    expect(calculateHoleFillVolume('gravel_pack', emptyWell())).toBe(0);
  });

  it('returns 0 when hole_fill has entries but none match the requested type', () => {
    const well: Well = {
      ...emptyWell(),
      hole_fill: [makeHoleFill({ type: 'gravel_pack' })],
    };
    expect(calculateHoleFillVolume('seal', well)).toBe(0);
  });

  it('computes the gross cylinder volume when no inner sections overlap', () => {
    const fill = makeHoleFill({ from: 0, to: 10, diameter: 200, type: 'gravel_pack' });
    const well: Well = { ...emptyWell(), hole_fill: [fill] };
    const expected = calculateCilindricVolume(200, 10);
    expect(calculateHoleFillVolume('gravel_pack', well)).toBeCloseTo(expected, 10);
  });

  it('subtracts the full well_case volume when it exactly spans the fill interval', () => {
    const fill = makeHoleFill({ from: 0, to: 10, diameter: 200, type: 'gravel_pack' });
    const casing = makeWellCase({ from: 0, to: 10, diameter: 100 });
    const well: Well = { ...emptyWell(), hole_fill: [fill], well_case: [casing] };
    const expected = calculateCilindricVolume(200, 10) - calculateCilindricVolume(100, 10);
    expect(calculateHoleFillVolume('gravel_pack', well)).toBeCloseTo(expected, 10);
  });

  it('clips the subtracted length when well_case only partially overlaps (starts inside fill)', () => {
    // fill: 0–10, casing: 5–10 → overlap = 5m
    const fill = makeHoleFill({ from: 0, to: 10, diameter: 200, type: 'gravel_pack' });
    const casing = makeWellCase({ from: 5, to: 10, diameter: 100 });
    const well: Well = { ...emptyWell(), hole_fill: [fill], well_case: [casing] };
    const expected = calculateCilindricVolume(200, 10) - calculateCilindricVolume(100, 5);
    expect(calculateHoleFillVolume('gravel_pack', well)).toBeCloseTo(expected, 10);
  });

  it('clips the subtracted length when well_case ends before fill ends (starts before fill)', () => {
    // fill: 5–15, casing: 0–10 → overlap = 5m (5–10)
    const fill = makeHoleFill({ from: 5, to: 15, diameter: 200, type: 'gravel_pack' });
    const casing = makeWellCase({ from: 0, to: 10, diameter: 100 });
    const well: Well = { ...emptyWell(), hole_fill: [fill], well_case: [casing] };
    const expected = calculateCilindricVolume(200, 10) - calculateCilindricVolume(100, 5);
    expect(calculateHoleFillVolume('gravel_pack', well)).toBeCloseTo(expected, 10);
  });

  it('does not subtract a well_case that is completely outside the fill interval (below)', () => {
    const fill = makeHoleFill({ from: 0, to: 5, diameter: 200, type: 'gravel_pack' });
    const casing = makeWellCase({ from: 6, to: 10, diameter: 100 });
    const well: Well = { ...emptyWell(), hole_fill: [fill], well_case: [casing] };
    const expected = calculateCilindricVolume(200, 5);
    expect(calculateHoleFillVolume('gravel_pack', well)).toBeCloseTo(expected, 10);
  });

  it('does not subtract a well_case that is completely outside the fill interval (above)', () => {
    const fill = makeHoleFill({ from: 5, to: 10, diameter: 200, type: 'gravel_pack' });
    const casing = makeWellCase({ from: 0, to: 4, diameter: 100 });
    const well: Well = { ...emptyWell(), hole_fill: [fill], well_case: [casing] };
    const expected = calculateCilindricVolume(200, 5);
    expect(calculateHoleFillVolume('gravel_pack', well)).toBeCloseTo(expected, 10);
  });

  it('subtracts well_screen volume when it overlaps the fill interval', () => {
    const fill = makeHoleFill({ from: 0, to: 10, diameter: 200, type: 'gravel_pack' });
    const screen = makeWellScreen({ from: 0, to: 10, diameter: 100 });
    const well: Well = { ...emptyWell(), hole_fill: [fill], well_screen: [screen] };
    const expected = calculateCilindricVolume(200, 10) - calculateCilindricVolume(100, 10);
    expect(calculateHoleFillVolume('gravel_pack', well)).toBeCloseTo(expected, 10);
  });

  it('subtracts both well_case and well_screen when both overlap the fill', () => {
    // fill: 0–10, casing: 0–5, screen: 5–10
    const fill = makeHoleFill({ from: 0, to: 10, diameter: 200, type: 'gravel_pack' });
    const casing = makeWellCase({ from: 0, to: 5, diameter: 100 });
    const screen = makeWellScreen({ from: 5, to: 10, diameter: 100 });
    const well: Well = { ...emptyWell(), hole_fill: [fill], well_case: [casing], well_screen: [screen] };
    const expected =
      calculateCilindricVolume(200, 10) -
      calculateCilindricVolume(100, 5) -
      calculateCilindricVolume(100, 5);
    expect(calculateHoleFillVolume('gravel_pack', well)).toBeCloseTo(expected, 10);
  });

  it('sums volumes across multiple fill segments of the same type', () => {
    const fill1 = makeHoleFill({ from: 0, to: 5, diameter: 200, type: 'gravel_pack' });
    const fill2 = makeHoleFill({ from: 5, to: 10, diameter: 200, type: 'gravel_pack' });
    const well: Well = { ...emptyWell(), hole_fill: [fill1, fill2] };
    const expected = calculateCilindricVolume(200, 5) + calculateCilindricVolume(200, 5);
    expect(calculateHoleFillVolume('gravel_pack', well)).toBeCloseTo(expected, 10);
  });

  it('filters by type correctly — seal fills are not counted for gravel_pack and vice-versa', () => {
    const gravelFill = makeHoleFill({ from: 0, to: 5, diameter: 200, type: 'gravel_pack' });
    const sealFill = makeHoleFill({ from: 5, to: 10, diameter: 200, type: 'seal' });
    const well: Well = { ...emptyWell(), hole_fill: [gravelFill, sealFill] };
    const gravelVolume = calculateHoleFillVolume('gravel_pack', well);
    const sealVolume = calculateHoleFillVolume('seal', well);
    expect(gravelVolume).toBeCloseTo(calculateCilindricVolume(200, 5), 10);
    expect(sealVolume).toBeCloseTo(calculateCilindricVolume(200, 5), 10);
  });

  it('handles adjacent (touching) well_case: exactly touching boundary is not counted as overlap', () => {
    // fill: 0–5, casing: 5–10 — casing.from === fill.to, no overlap
    const fill = makeHoleFill({ from: 0, to: 5, diameter: 200, type: 'gravel_pack' });
    const casing = makeWellCase({ from: 5, to: 10, diameter: 100 });
    const well: Well = { ...emptyWell(), hole_fill: [fill], well_case: [casing] };
    // !(5 > 5 || 10 < 0) → !(false || false) → true, so there IS overlap at a single point
    // overlap length = min(5,10) - max(0,5) = 5 - 5 = 0, volume subtracted = 0
    const expected = calculateCilindricVolume(200, 5);
    expect(calculateHoleFillVolume('gravel_pack', well)).toBeCloseTo(expected, 10);
  });
});
