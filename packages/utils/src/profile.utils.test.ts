import { describe, expect, it } from 'vitest';

import type {
  AquiferAnalysis,
  BoreHole,
  Cave,
  Constructive,
  Fracture,
  HoleFill,
  HydrodynamicEvent,
  Lithology,
  PumpInstallation,
  Reduction,
  SurfaceCase,
  Well,
  WellCase,
  WellScreen,
} from '@welldot/core';

import {
  calculateCylindricVolume,
  calculateDrawdown,
  calculateFormationLoss,
  calculateHoleFillSegmentVolume,
  calculateHoleFillVolume,
  calculateHydraulicConductivity,
  calculateSpecificCapacity,
  calculateSubmergence,
  calculateUnitDrawdown,
  calculateWellLoss,
  getCentralizerDepths,
  getConstructivePropertySummary,
  getCurrentPump,
  getEffectiveHydrodynamicEvents,
  getLatestAquiferAnalysisField,
  getLatestPumpingDynamicLevel,
  getLatestStaticLevel,
  getProfileDiamValues,
  getProfileLastItemsDepths,
  getPumpInstallationWarnings,
  getPumpServiceTime,
  getRetractedEventIds,
  isFlowingArtesian,
} from './profile.utils';

// ─── Factories ────────────────────────────────────────────────────────────────

function makeBoreHole(o: Partial<BoreHole> = {}): BoreHole {
  return { from: 0, to: 10, diameter: 200, ...o };
}

function makeWellCase(o: Partial<WellCase> = {}): WellCase {
  return { from: 0, to: 10, type: 'steel', diameter: 150, ...o };
}

function makeWellScreen(o: Partial<WellScreen> = {}): WellScreen {
  return {
    from: 10,
    to: 20,
    type: 'wire_wound',
    diameter: 100,
    screen_slot: 0.5,
    ...o,
  };
}

function makeReduction(o: Partial<Reduction> = {}): Reduction {
  return {
    from: 5,
    to: 6,
    diam_from: 200,
    diam_to: 150,
    type: 'conical',
    ...o,
  };
}

function makeSurfaceCase(o: Partial<SurfaceCase> = {}): SurfaceCase {
  return { from: 0, to: 1, diameter: 300, ...o };
}

function makeHoleFill(o: Partial<HoleFill> = {}): HoleFill {
  return {
    from: 0,
    to: 10,
    type: 'gravel_pack',
    diameter: 250,
    description: 'fine gravel',
    ...o,
  };
}

function makeLithology(o: Partial<Lithology> = {}): Lithology {
  return {
    from: 0,
    to: 10,
    description: 'clay',
    color: '#c8a87e',
    texture: { code: '601', vocabulary: 'fgdc' },
    geologic_unit: 'Unit A',
    aquifer_unit: '',
    ...o,
  };
}

function makeFracture(o: Partial<Fracture> = {}): Fracture {
  return {
    depth: 15,
    water_intake: true,
    description: 'fracture',
    swarm: false,
    azimuth: 0,
    dip: 45,
    ...o,
  };
}

function makeCave(o: Partial<Cave> = {}): Cave {
  return { from: 20, to: 25, water_intake: false, description: 'void', ...o };
}

function emptyWell(): Well {
  return {
    version: 2,
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
    expect(getProfileLastItemsDepths(emptyWell())).toEqual([
      0, 0, 0, 0, 0, 0, 0, 0, 0,
    ]);
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
    expect(getProfileLastItemsDepths(well)).toEqual([
      5, 12, 8, 20, 15, 7, 3, 18, 25,
    ]);
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
    expect(getProfileDiamValues(data)).toEqual([
      200, 250, 300, 100, 150, 200, 150,
    ]);
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
      bore_hole: [
        makeBoreHole({ diameter: 200 }),
        makeBoreHole({ diameter: 250 }),
      ],
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
    expect(getConstructivePropertySummary(emptyConstructive(), 'type')).toEqual(
      [],
    );
  });

  it('returns an empty array for fully absent constructive (empty partial)', () => {
    expect(getConstructivePropertySummary({}, 'diameter')).toEqual([]);
  });

  it('extracts `type` from well_screen and well_case (in component order)', () => {
    const data: Partial<Constructive> = {
      well_case: [
        makeWellCase({ type: 'steel' }),
        makeWellCase({ type: 'pvc' }),
      ],
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
    expect(() =>
      getConstructivePropertySummary(data, 'diameter'),
    ).not.toThrow();
    expect(getConstructivePropertySummary<number>(data, 'diameter')).toEqual([
      200,
    ]);
  });

  it('returns undefined for a property that does not exist on items', () => {
    const data: Partial<Constructive> = {
      bore_hole: [makeBoreHole()],
    };
    const result = getConstructivePropertySummary(data, 'nonexistent_prop');
    expect(result).toEqual([undefined]);
  });
});

// ─── calculateCylindricVolume ─────────────────────────────────────────────────

describe('calculateCylindricVolume', () => {
  it('returns 0 when diameter is 0', () => {
    expect(calculateCylindricVolume(0, 10)).toBe(0);
  });

  it('returns 0 when height is 0', () => {
    expect(calculateCylindricVolume(200, 0)).toBe(0);
  });

  it('calculates correctly for diameter=1000mm, height=1m → π/4 m³', () => {
    expect(calculateCylindricVolume(1000, 1)).toBeCloseTo(Math.PI / 4, 10);
  });

  it('calculates correctly for diameter=200mm, height=5m', () => {
    // r = 0.1m → π × 0.01 × 5 = 0.05π
    expect(calculateCylindricVolume(200, 5)).toBeCloseTo(0.05 * Math.PI, 10);
  });

  it('scales linearly with height', () => {
    const v1 = calculateCylindricVolume(200, 1);
    const v3 = calculateCylindricVolume(200, 3);
    expect(v3).toBeCloseTo(v1 * 3, 10);
  });

  it('scales with the square of the radius (quadratic in diameter)', () => {
    const v1 = calculateCylindricVolume(100, 1);
    const v2 = calculateCylindricVolume(200, 1);
    expect(v2).toBeCloseTo(v1 * 4, 10);
  });
});

// ─── calculateHoleFillSegmentVolume ───────────────────────────────────────────

describe('calculateHoleFillSegmentVolume', () => {
  it('computes the gross cylinder volume when no inner sections overlap', () => {
    const fill = makeHoleFill({
      from: 0,
      to: 10,
      diameter: 200,
      type: 'gravel_pack',
    });
    const well: Well = { ...emptyWell(), hole_fill: [fill] };
    expect(calculateHoleFillSegmentVolume(fill, well)).toBeCloseTo(
      calculateCylindricVolume(200, 10),
      10,
    );
  });

  it('subtracts an overlapping well_case, clipped to the overlap length', () => {
    // fill: 0–10, casing: 5–10 → overlap = 5m
    const fill = makeHoleFill({
      from: 0,
      to: 10,
      diameter: 200,
      type: 'gravel_pack',
    });
    const casing = makeWellCase({ from: 5, to: 10, diameter: 100 });
    const well: Well = {
      ...emptyWell(),
      hole_fill: [fill],
      well_case: [casing],
    };
    const expected =
      calculateCylindricVolume(200, 10) - calculateCylindricVolume(100, 5);
    expect(calculateHoleFillSegmentVolume(fill, well)).toBeCloseTo(
      expected,
      10,
    );
  });

  it('sums to the same total as calculateHoleFillVolume across multiple segments', () => {
    const fillA = makeHoleFill({
      from: 0,
      to: 10,
      diameter: 200,
      type: 'gravel_pack',
    });
    const fillB = makeHoleFill({
      from: 10,
      to: 20,
      diameter: 250,
      type: 'gravel_pack',
    });
    const casing = makeWellCase({ from: 0, to: 20, diameter: 100 });
    const well: Well = {
      ...emptyWell(),
      hole_fill: [fillA, fillB],
      well_case: [casing],
    };
    const expectedTotal =
      calculateHoleFillSegmentVolume(fillA, well) +
      calculateHoleFillSegmentVolume(fillB, well);
    expect(calculateHoleFillVolume('gravel_pack', well)).toBeCloseTo(
      expectedTotal,
      10,
    );
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
    const fill = makeHoleFill({
      from: 0,
      to: 10,
      diameter: 200,
      type: 'gravel_pack',
    });
    const well: Well = { ...emptyWell(), hole_fill: [fill] };
    const expected = calculateCylindricVolume(200, 10);
    expect(calculateHoleFillVolume('gravel_pack', well)).toBeCloseTo(
      expected,
      10,
    );
  });

  it('subtracts the full well_case volume when it exactly spans the fill interval', () => {
    const fill = makeHoleFill({
      from: 0,
      to: 10,
      diameter: 200,
      type: 'gravel_pack',
    });
    const casing = makeWellCase({ from: 0, to: 10, diameter: 100 });
    const well: Well = {
      ...emptyWell(),
      hole_fill: [fill],
      well_case: [casing],
    };
    const expected =
      calculateCylindricVolume(200, 10) - calculateCylindricVolume(100, 10);
    expect(calculateHoleFillVolume('gravel_pack', well)).toBeCloseTo(
      expected,
      10,
    );
  });

  it('clips the subtracted length when well_case only partially overlaps (starts inside fill)', () => {
    // fill: 0–10, casing: 5–10 → overlap = 5m
    const fill = makeHoleFill({
      from: 0,
      to: 10,
      diameter: 200,
      type: 'gravel_pack',
    });
    const casing = makeWellCase({ from: 5, to: 10, diameter: 100 });
    const well: Well = {
      ...emptyWell(),
      hole_fill: [fill],
      well_case: [casing],
    };
    const expected =
      calculateCylindricVolume(200, 10) - calculateCylindricVolume(100, 5);
    expect(calculateHoleFillVolume('gravel_pack', well)).toBeCloseTo(
      expected,
      10,
    );
  });

  it('clips the subtracted length when well_case ends before fill ends (starts before fill)', () => {
    // fill: 5–15, casing: 0–10 → overlap = 5m (5–10)
    const fill = makeHoleFill({
      from: 5,
      to: 15,
      diameter: 200,
      type: 'gravel_pack',
    });
    const casing = makeWellCase({ from: 0, to: 10, diameter: 100 });
    const well: Well = {
      ...emptyWell(),
      hole_fill: [fill],
      well_case: [casing],
    };
    const expected =
      calculateCylindricVolume(200, 10) - calculateCylindricVolume(100, 5);
    expect(calculateHoleFillVolume('gravel_pack', well)).toBeCloseTo(
      expected,
      10,
    );
  });

  it('does not subtract a well_case that is completely outside the fill interval (below)', () => {
    const fill = makeHoleFill({
      from: 0,
      to: 5,
      diameter: 200,
      type: 'gravel_pack',
    });
    const casing = makeWellCase({ from: 6, to: 10, diameter: 100 });
    const well: Well = {
      ...emptyWell(),
      hole_fill: [fill],
      well_case: [casing],
    };
    const expected = calculateCylindricVolume(200, 5);
    expect(calculateHoleFillVolume('gravel_pack', well)).toBeCloseTo(
      expected,
      10,
    );
  });

  it('does not subtract a well_case that is completely outside the fill interval (above)', () => {
    const fill = makeHoleFill({
      from: 5,
      to: 10,
      diameter: 200,
      type: 'gravel_pack',
    });
    const casing = makeWellCase({ from: 0, to: 4, diameter: 100 });
    const well: Well = {
      ...emptyWell(),
      hole_fill: [fill],
      well_case: [casing],
    };
    const expected = calculateCylindricVolume(200, 5);
    expect(calculateHoleFillVolume('gravel_pack', well)).toBeCloseTo(
      expected,
      10,
    );
  });

  it('subtracts well_screen volume when it overlaps the fill interval', () => {
    const fill = makeHoleFill({
      from: 0,
      to: 10,
      diameter: 200,
      type: 'gravel_pack',
    });
    const screen = makeWellScreen({ from: 0, to: 10, diameter: 100 });
    const well: Well = {
      ...emptyWell(),
      hole_fill: [fill],
      well_screen: [screen],
    };
    const expected =
      calculateCylindricVolume(200, 10) - calculateCylindricVolume(100, 10);
    expect(calculateHoleFillVolume('gravel_pack', well)).toBeCloseTo(
      expected,
      10,
    );
  });

  it('subtracts both well_case and well_screen when both overlap the fill', () => {
    // fill: 0–10, casing: 0–5, screen: 5–10
    const fill = makeHoleFill({
      from: 0,
      to: 10,
      diameter: 200,
      type: 'gravel_pack',
    });
    const casing = makeWellCase({ from: 0, to: 5, diameter: 100 });
    const screen = makeWellScreen({ from: 5, to: 10, diameter: 100 });
    const well: Well = {
      ...emptyWell(),
      hole_fill: [fill],
      well_case: [casing],
      well_screen: [screen],
    };
    const expected =
      calculateCylindricVolume(200, 10) -
      calculateCylindricVolume(100, 5) -
      calculateCylindricVolume(100, 5);
    expect(calculateHoleFillVolume('gravel_pack', well)).toBeCloseTo(
      expected,
      10,
    );
  });

  it('sums volumes across multiple fill segments of the same type', () => {
    const fill1 = makeHoleFill({
      from: 0,
      to: 5,
      diameter: 200,
      type: 'gravel_pack',
    });
    const fill2 = makeHoleFill({
      from: 5,
      to: 10,
      diameter: 200,
      type: 'gravel_pack',
    });
    const well: Well = { ...emptyWell(), hole_fill: [fill1, fill2] };
    const expected =
      calculateCylindricVolume(200, 5) + calculateCylindricVolume(200, 5);
    expect(calculateHoleFillVolume('gravel_pack', well)).toBeCloseTo(
      expected,
      10,
    );
  });

  it('filters by type correctly — seal fills are not counted for gravel_pack and vice-versa', () => {
    const gravelFill = makeHoleFill({
      from: 0,
      to: 5,
      diameter: 200,
      type: 'gravel_pack',
    });
    const sealFill = makeHoleFill({
      from: 5,
      to: 10,
      diameter: 200,
      type: 'seal',
    });
    const well: Well = { ...emptyWell(), hole_fill: [gravelFill, sealFill] };
    const gravelVolume = calculateHoleFillVolume('gravel_pack', well);
    const sealVolume = calculateHoleFillVolume('seal', well);
    expect(gravelVolume).toBeCloseTo(calculateCylindricVolume(200, 5), 10);
    expect(sealVolume).toBeCloseTo(calculateCylindricVolume(200, 5), 10);
  });

  it('handles adjacent (touching) well_case: exactly touching boundary is not counted as overlap', () => {
    // fill: 0–5, casing: 5–10 — casing.from === fill.to, no overlap
    const fill = makeHoleFill({
      from: 0,
      to: 5,
      diameter: 200,
      type: 'gravel_pack',
    });
    const casing = makeWellCase({ from: 5, to: 10, diameter: 100 });
    const well: Well = {
      ...emptyWell(),
      hole_fill: [fill],
      well_case: [casing],
    };
    // !(5 > 5 || 10 < 0) → !(false || false) → true, so there IS overlap at a single point
    // overlap length = min(5,10) - max(0,5) = 5 - 5 = 0, volume subtracted = 0
    const expected = calculateCylindricVolume(200, 5);
    expect(calculateHoleFillVolume('gravel_pack', well)).toBeCloseTo(
      expected,
      10,
    );
  });
});

// ─── calculateDrawdown ────────────────────────────────────────────────────────

describe('calculateDrawdown', () => {
  it('returns positive drawdown when reading is below static level', () => {
    expect(calculateDrawdown(20, 5)).toBe(15);
  });

  it('returns zero when reading depth equals static level', () => {
    expect(calculateDrawdown(5, 5)).toBe(0);
  });

  it('returns negative value for artesian case (reading above static)', () => {
    expect(calculateDrawdown(3, 5)).toBe(-2);
  });
});

// ─── calculateSpecificCapacity ────────────────────────────────────────────────

describe('calculateSpecificCapacity', () => {
  it('returns flowRate / drawdown', () => {
    expect(calculateSpecificCapacity(30, 10)).toBe(3);
  });

  it('throws RangeError when drawdown is zero', () => {
    expect(() => calculateSpecificCapacity(30, 0)).toThrow(RangeError);
  });
});

// ─── calculateUnitDrawdown ────────────────────────────────────────────────────

describe('calculateUnitDrawdown', () => {
  it('returns drawdown / flowRate', () => {
    expect(calculateUnitDrawdown(10, 30)).toBeCloseTo(1 / 3);
  });

  it('throws RangeError when flowRate is zero', () => {
    expect(() => calculateUnitDrawdown(10, 0)).toThrow(RangeError);
  });
});

// ─── calculateFormationLoss ───────────────────────────────────────────────────

describe('calculateFormationLoss', () => {
  it('returns jacobB × flowRate', () => {
    expect(calculateFormationLoss(0.5, 20)).toBe(10);
  });

  it('returns zero when jacobB is zero', () => {
    expect(calculateFormationLoss(0, 20)).toBe(0);
  });
});

// ─── calculateWellLoss ────────────────────────────────────────────────────────

describe('calculateWellLoss', () => {
  it('returns jacobC × flowRate²', () => {
    expect(calculateWellLoss(0.01, 20)).toBe(4);
  });

  it('returns zero when jacobC is zero', () => {
    expect(calculateWellLoss(0, 20)).toBe(0);
  });
});

// ─── calculateHydraulicConductivity ──────────────────────────────────────────

describe('calculateHydraulicConductivity', () => {
  it('returns transmissivity / aquiferThickness', () => {
    expect(calculateHydraulicConductivity(50, 20)).toBe(2.5);
  });

  it('throws RangeError when aquiferThickness is zero', () => {
    expect(() => calculateHydraulicConductivity(50, 0)).toThrow(RangeError);
  });
});

// ─── Query utility factories ──────────────────────────────────────────────────

function makeSpotMeasurement(
  datetime: string,
  static_level: number,
): HydrodynamicEvent {
  return {
    id: crypto.randomUUID(),
    type: 'spot_measurement',
    datetime,
    static_level,
  } as HydrodynamicEvent;
}

function makeAirliftEvent(datetime: string): HydrodynamicEvent {
  return {
    id: crypto.randomUUID(),
    type: 'airlift',
    datetime,
    flow_rate: 10,
  } as HydrodynamicEvent;
}

function makeAquiferAnalysisEntry(
  datetime: string,
  fields: Partial<AquiferAnalysis>,
): AquiferAnalysis {
  return { datetime, ...fields } as AquiferAnalysis;
}

// ─── getLatestStaticLevel ─────────────────────────────────────────────────────

describe('getLatestStaticLevel', () => {
  it('returns undefined for a well with no hydrodynamic_events', () => {
    expect(getLatestStaticLevel(emptyWell())).toBeUndefined();
  });

  it('returns undefined when all events lack static_level', () => {
    const well: Well = {
      ...emptyWell(),
      hydrodynamic_events: [makeAirliftEvent('2024-01-01T00:00:00Z')],
    };
    expect(getLatestStaticLevel(well)).toBeUndefined();
  });

  it('returns static_level from a single matching event', () => {
    const well: Well = {
      ...emptyWell(),
      hydrodynamic_events: [makeSpotMeasurement('2024-01-01T00:00:00Z', 12.5)],
    };
    expect(getLatestStaticLevel(well)).toBe(12.5);
  });

  it('returns static_level from the most recent event (not array order)', () => {
    const well: Well = {
      ...emptyWell(),
      hydrodynamic_events: [
        makeSpotMeasurement('2024-01-01T00:00:00Z', 10),
        makeSpotMeasurement('2024-06-01T00:00:00Z', 7),
      ],
    };
    expect(getLatestStaticLevel(well)).toBe(7);
  });

  it('correctly handles mixed timezones when comparing datetimes', () => {
    // 2024-01-01T10:00:00+05:00 == 2024-01-01T05:00:00Z (earlier)
    // 2024-01-01T09:00:00Z (later)
    const well: Well = {
      ...emptyWell(),
      hydrodynamic_events: [
        makeSpotMeasurement('2024-01-01T10:00:00+05:00', 20),
        makeSpotMeasurement('2024-01-01T09:00:00Z', 15),
      ],
    };
    expect(getLatestStaticLevel(well)).toBe(15);
  });
});

// ─── getLatestAquiferAnalysisField ────────────────────────────────────────────

describe('getLatestAquiferAnalysisField', () => {
  it('returns undefined when aquifer_analysis is absent', () => {
    expect(
      getLatestAquiferAnalysisField(emptyWell(), 'transmissivity'),
    ).toBeUndefined();
  });

  it('returns undefined when no entry has the requested field', () => {
    const well: Well = {
      ...emptyWell(),
      aquifer_analysis: [
        makeAquiferAnalysisEntry('2024-01-01T00:00:00Z', {
          storativity: 0.001,
        }),
      ],
    };
    expect(
      getLatestAquiferAnalysisField(well, 'transmissivity'),
    ).toBeUndefined();
  });

  it('returns the field value from a single matching entry', () => {
    const well: Well = {
      ...emptyWell(),
      aquifer_analysis: [
        makeAquiferAnalysisEntry('2024-01-01T00:00:00Z', {
          transmissivity: 42,
        }),
      ],
    };
    expect(getLatestAquiferAnalysisField(well, 'transmissivity')).toBe(42);
  });

  it('returns the value from the most recent entry when multiple entries have the field', () => {
    const well: Well = {
      ...emptyWell(),
      aquifer_analysis: [
        makeAquiferAnalysisEntry('2024-01-01T00:00:00Z', {
          transmissivity: 100,
        }),
        makeAquiferAnalysisEntry('2024-06-01T00:00:00Z', {
          transmissivity: 200,
        }),
      ],
    };
    expect(getLatestAquiferAnalysisField(well, 'transmissivity')).toBe(200);
  });

  it('is typed as number | undefined for a numeric field', () => {
    const well: Well = {
      ...emptyWell(),
      aquifer_analysis: [
        makeAquiferAnalysisEntry('2024-01-01T00:00:00Z', {
          transmissivity: 50,
        }),
      ],
    };
    const result: number | undefined = getLatestAquiferAnalysisField(
      well,
      'transmissivity',
    );
    expect(result).toBe(50);
  });
});

// ─── isFlowingArtesian ────────────────────────────────────────────────────────

describe('isFlowingArtesian', () => {
  it('returns false when there is no static level', () => {
    expect(isFlowingArtesian(emptyWell())).toBe(false);
  });

  it('returns true when the latest static level is negative (above ground)', () => {
    const well: Well = {
      ...emptyWell(),
      hydrodynamic_events: [makeSpotMeasurement('2024-01-01T00:00:00Z', -1.2)],
    };
    expect(isFlowingArtesian(well)).toBe(true);
  });

  it('uses the most recent level, not any past one', () => {
    const well: Well = {
      ...emptyWell(),
      hydrodynamic_events: [
        makeSpotMeasurement('2020-01-01T00:00:00Z', -0.5),
        makeSpotMeasurement('2024-01-01T00:00:00Z', 3),
      ],
    };
    expect(isFlowingArtesian(well)).toBe(false);
  });

  it('returns false for a level exactly at ground', () => {
    const well: Well = {
      ...emptyWell(),
      hydrodynamic_events: [makeSpotMeasurement('2024-01-01T00:00:00Z', 0)],
    };
    expect(isFlowingArtesian(well)).toBe(false);
  });
});

// ─── getCentralizerDepths ─────────────────────────────────────────────────────

describe('getCentralizerDepths', () => {
  it('returns a single depth when from === to', () => {
    expect(getCentralizerDepths({ from: 12, to: 12, type: 'rigid' })).toEqual([
      12,
    ]);
  });

  it('expands an interval by spacing, inclusive of both ends', () => {
    expect(
      getCentralizerDepths({ from: 6, to: 30, spacing: 6, type: 'rigid' }),
    ).toEqual([6, 12, 18, 24, 30]);
  });

  it('stops before exceeding `to` when spacing does not divide evenly', () => {
    expect(
      getCentralizerDepths({ from: 0, to: 10, spacing: 4, type: 'rigid' }),
    ).toEqual([0, 4, 8]);
  });

  it('returns only the endpoints when spacing is unknown', () => {
    expect(getCentralizerDepths({ from: 10, to: 50, type: 'rigid' })).toEqual([
      10, 50,
    ]);
  });

  it('absorbs floating-point drift', () => {
    expect(
      getCentralizerDepths({ from: 0, to: 0.9, spacing: 0.3, type: 'rigid' }),
    ).toEqual([0, 0.3, 0.6, 0.9]);
  });

  it('tolerates inverted from/to', () => {
    expect(
      getCentralizerDepths({ from: 12, to: 0, spacing: 6, type: 'rigid' }),
    ).toEqual([0, 6, 12]);
  });
});

// ─── v2.3 — ledger corrections ───────────────────────────────────────────────

function spot(
  id: string,
  datetime: string,
  static_level: number,
  extra: Record<string, unknown> = {},
): HydrodynamicEvent {
  return {
    id,
    type: 'spot_measurement',
    datetime,
    static_level,
    ...extra,
  } as HydrodynamicEvent;
}

describe('getRetractedEventIds / getEffectiveHydrodynamicEvents', () => {
  it('returns an empty set and every event when nothing is corrected', () => {
    const well = {
      ...emptyWell(),
      hydrodynamic_events: [spot('a', '2024-01-01T00:00:00Z', 10)],
    };
    expect(getRetractedEventIds(well).size).toBe(0);
    expect(getEffectiveHydrodynamicEvents(well)).toHaveLength(1);
  });

  it('excludes every event in a correction chain except the last', () => {
    const well = {
      ...emptyWell(),
      hydrodynamic_events: [
        spot('a', '2024-01-01T00:00:00Z', 10),
        spot('b', '2024-01-01T00:00:00Z', 11, { corrects: 'a' }),
        spot('c', '2024-01-01T00:00:00Z', 12, { corrects: 'b' }),
      ],
    };
    expect([...getRetractedEventIds(well)].sort()).toEqual(['a', 'b']);
    expect(getEffectiveHydrodynamicEvents(well).map(e => e.id)).toEqual(['c']);
  });

  it('getLatestStaticLevel ignores a retracted newer event', () => {
    const well = {
      ...emptyWell(),
      hydrodynamic_events: [
        spot('old', '2023-01-01T00:00:00Z', 8),
        spot('wrong', '2024-06-01T00:00:00Z', 99),
        spot('fix', '2024-06-01T00:00:00Z', 9, { corrects: 'wrong' }),
      ],
    };
    expect(getLatestStaticLevel(well)).toBe(9);
  });
});

// ─── v2.3 — pump installations ───────────────────────────────────────────────

function makePump(o: Partial<PumpInstallation> = {}): PumpInstallation {
  return {
    id: 'p1',
    installed_at: '2024-01-01T00:00:00Z',
    type: 'submersible',
    ...o,
  };
}

describe('getCurrentPump', () => {
  it('returns undefined without pump_installations', () => {
    expect(getCurrentPump(emptyWell())).toBeUndefined();
  });

  it('returns undefined when every installation is removed', () => {
    const well = {
      ...emptyWell(),
      pump_installations: [makePump({ removed_at: '2024-06-01T00:00:00Z' })],
    };
    expect(getCurrentPump(well)).toBeUndefined();
  });

  it('returns the entry without removed_at', () => {
    const well = {
      ...emptyWell(),
      pump_installations: [
        makePump({ id: 'old', removed_at: '2024-06-01T00:00:00Z' }),
        makePump({ id: 'new', installed_at: '2024-06-01T01:00:00Z' }),
      ],
    };
    expect(getCurrentPump(well)?.id).toBe('new');
  });

  it('returns the most recently installed open entry when several are open', () => {
    const well = {
      ...emptyWell(),
      pump_installations: [
        makePump({ id: 'b', installed_at: '2024-03-01T00:00:00Z' }),
        makePump({ id: 'a', installed_at: '2024-01-01T00:00:00Z' }),
      ],
    };
    expect(getCurrentPump(well)?.id).toBe('b');
  });
});

describe('getLatestPumpingDynamicLevel / calculateSubmergence', () => {
  const constantRate = (
    id: string,
    datetime: string,
    lastDepth: number,
    extra: Record<string, unknown> = {},
  ) =>
    ({
      id,
      type: 'constant_rate',
      datetime,
      steps: [
        {
          rate: 10,
          readings: [
            { elapsed: 1, depth: lastDepth - 5 },
            { elapsed: 60, depth: lastDepth },
          ],
        },
      ],
      ...extra,
    }) as HydrodynamicEvent;

  it('returns undefined without pumping data', () => {
    expect(getLatestPumpingDynamicLevel(emptyWell())).toBeUndefined();
  });

  it('uses the last reading of the most recent pumping event', () => {
    const well = {
      ...emptyWell(),
      hydrodynamic_events: [
        constantRate('a', '2023-01-01T00:00:00Z', 30),
        constantRate('b', '2024-01-01T00:00:00Z', 35),
      ],
    };
    expect(getLatestPumpingDynamicLevel(well)).toBe(35);
  });

  it('ignores airlift and retracted events', () => {
    const well = {
      ...emptyWell(),
      hydrodynamic_events: [
        constantRate('a', '2023-01-01T00:00:00Z', 30),
        constantRate('b', '2024-01-01T00:00:00Z', 99),
        constantRate('c', '2024-01-02T00:00:00Z', 31, { corrects: 'b' }),
        {
          ...constantRate('air', '2025-01-01T00:00:00Z', 50),
          type: 'airlift',
        } as HydrodynamicEvent,
      ],
    };
    expect(getLatestPumpingDynamicLevel(well)).toBe(31);
  });

  it('falls back to a newer aquifer_analysis dynamic_level', () => {
    const well = {
      ...emptyWell(),
      hydrodynamic_events: [constantRate('a', '2023-01-01T00:00:00Z', 30)],
      aquifer_analysis: [
        {
          id: 'aa',
          datetime: '2024-01-01T00:00:00Z',
          source_event_ids: ['a'],
          dynamic_level: 33,
        },
      ],
    };
    expect(getLatestPumpingDynamicLevel(well)).toBe(33);
  });

  it('computes intake_depth − dynamic_level for the current pump', () => {
    const well = {
      ...emptyWell(),
      hydrodynamic_events: [constantRate('a', '2024-01-01T00:00:00Z', 40)],
      pump_installations: [makePump({ intake_depth: 55 })],
    };
    expect(calculateSubmergence(well)).toBe(15);
  });

  it('returns a negative value when the intake is above the water level', () => {
    const well = {
      ...emptyWell(),
      hydrodynamic_events: [constantRate('a', '2024-01-01T00:00:00Z', 40)],
      pump_installations: [makePump({ intake_depth: 35 })],
    };
    expect(calculateSubmergence(well)).toBe(-5);
  });

  it('returns undefined without intake_depth', () => {
    const well = {
      ...emptyWell(),
      hydrodynamic_events: [constantRate('a', '2024-01-01T00:00:00Z', 40)],
      pump_installations: [makePump()],
    };
    expect(calculateSubmergence(well)).toBeUndefined();
  });
});

describe('getPumpServiceTime', () => {
  it('sums the durations of installations sharing a serial', () => {
    const well = {
      ...emptyWell(),
      pump_installations: [
        makePump({
          id: 'a',
          serial: 'S1',
          installed_at: '2024-01-01T00:00:00Z',
          removed_at: '2024-01-01T10:00:00Z',
        }),
        makePump({
          id: 'b',
          serial: 'S1',
          installed_at: '2024-02-01T00:00:00Z',
          removed_at: '2024-02-01T05:00:00Z',
        }),
        makePump({
          id: 'c',
          serial: 'OTHER',
          installed_at: '2024-01-01T00:00:00Z',
          removed_at: '2024-03-01T00:00:00Z',
        }),
      ],
    };
    expect(getPumpServiceTime(well, 'S1')).toBe(15 * 60);
  });

  it('counts an open installation up to now', () => {
    const well = {
      ...emptyWell(),
      pump_installations: [
        makePump({ serial: 'S1', installed_at: '2024-01-01T00:00:00Z' }),
      ],
    };
    const now = new Date('2024-01-01T02:00:00Z');
    expect(getPumpServiceTime(well, 'S1', now)).toBe(120);
  });
});

describe('getPumpInstallationWarnings', () => {
  const base = (): Well => ({
    ...emptyWell(),
    bore_hole: [makeBoreHole({ from: 0, to: 80 })],
    well_screen: [makeWellScreen({ from: 60, to: 80 })],
  });

  it('returns no warnings for a consistent installation', () => {
    const well = {
      ...base(),
      pump_installations: [makePump({ intake_depth: 50 })],
    };
    expect(getPumpInstallationWarnings(well)).toEqual([]);
  });

  it('flags an intake below the bore hole bottom', () => {
    const well = {
      ...base(),
      pump_installations: [makePump({ intake_depth: 90 })],
    };
    expect(getPumpInstallationWarnings(well)).toContainEqual({
      code: 'intake_below_well_bottom',
      ids: ['p1'],
    });
  });

  it('flags an intake below a shallower well_depth', () => {
    const well = {
      ...base(),
      well_depth: 40,
      pump_installations: [makePump({ intake_depth: 50 })],
    };
    expect(getPumpInstallationWarnings(well)).toContainEqual({
      code: 'intake_below_well_bottom',
      ids: ['p1'],
    });
  });

  it('flags an intake inside a screen interval', () => {
    const well = {
      ...base(),
      pump_installations: [makePump({ intake_depth: 70 })],
    };
    expect(getPumpInstallationWarnings(well)).toContainEqual({
      code: 'intake_in_screen',
      ids: ['p1'],
    });
  });

  it('flags more than one open installation', () => {
    const well = {
      ...base(),
      pump_installations: [makePump({ id: 'a' }), makePump({ id: 'b' })],
    };
    expect(getPumpInstallationWarnings(well)).toContainEqual({
      code: 'multiple_open_installations',
      ids: ['a', 'b'],
    });
  });

  it('flags removed_at not after installed_at', () => {
    const well = {
      ...base(),
      pump_installations: [
        makePump({
          installed_at: '2024-01-01T00:00:00Z',
          removed_at: '2024-01-01T00:00:00Z',
        }),
      ],
    };
    expect(getPumpInstallationWarnings(well)).toContainEqual({
      code: 'removed_before_installed',
      ids: ['p1'],
    });
  });
});
