import { describe, expect, it } from 'vitest';

import {
  calculatedWellDepth,
  checkIfProfileIsEmpty,
  convertProfileFromJSON,
  deserializeWell,
  isWellEmpty,
  profileToWell,
  redactWell,
  SECTION_KEYS,
  serializeWell,
  VISIBILITY_LEAF_KEYS,
  VISIBILITY_TREE,
} from './well.utils';

import { parseWell } from '../validators/well.validators';

import type {
  BoreHole,
  Cave,
  CementPad,
  Fracture,
  HoleFill,
  Lithology,
  Reduction,
  SectionVisibility,
  SurfaceCase,
  Well,
  WellCase,
  WellScreen,
} from '../types/well.types';

// ─── Factories ────────────────────────────────────────────────────────────────

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

function makeBoreHole(overrides: Partial<BoreHole> = {}): BoreHole {
  return { from: 0, to: 10, diameter: 200, ...overrides };
}

function makeWellCase(overrides: Partial<WellCase> = {}): WellCase {
  return { from: 0, to: 10, type: 'steel', diameter: 150, ...overrides };
}

function makeReduction(overrides: Partial<Reduction> = {}): Reduction {
  return {
    from: 5,
    to: 6,
    diam_from: 200,
    diam_to: 150,
    type: 'conical',
    ...overrides,
  };
}

function makeWellScreen(overrides: Partial<WellScreen> = {}): WellScreen {
  return {
    from: 10,
    to: 20,
    type: 'wire_wound',
    diameter: 150,
    screen_slot: 0.5,
    ...overrides,
  };
}

function makeSurfaceCase(overrides: Partial<SurfaceCase> = {}): SurfaceCase {
  return { from: 0, to: 1, diameter: 300, ...overrides };
}

function makeHoleFill(overrides: Partial<HoleFill> = {}): HoleFill {
  return {
    from: 0,
    to: 5,
    type: 'gravel_pack',
    diameter: 250,
    description: 'fine gravel',
    ...overrides,
  };
}

function makeCementPad(overrides: Partial<CementPad> = {}): CementPad {
  return { type: 'square', width: 1, thickness: 0.1, length: 1, ...overrides };
}

function makeLithology(overrides: Partial<Lithology> = {}): Lithology {
  return {
    from: 0,
    to: 5,
    description: 'clay',
    color: '#c8a87e',
    texture: { code: '601', vocabulary: 'fgdc' },
    geologic_unit: 'Formation A',
    aquifer_unit: 'Aquifer B',
    ...overrides,
  };
}

function makeFracture(overrides: Partial<Fracture> = {}): Fracture {
  return {
    depth: 15,
    water_intake: true,
    description: 'open fracture',
    swarm: false,
    azimuth: 90,
    dip: 45,
    ...overrides,
  };
}

function makeCave(overrides: Partial<Cave> = {}): Cave {
  return {
    from: 20,
    to: 21,
    water_intake: false,
    description: 'small void',
    ...overrides,
  };
}

function fullWell(): Well {
  return {
    version: 2,
    well_type: 'tubular',
    name: 'Well-01',
    well_driller: 'Driller Co.',
    construction_date: '2023-06-15',
    location: { lat: -1.4558, lng: -48.5044, elevation: 12 },
    obs: 'Artesian zone at 40m',
    well_depth: 145.5,
    bore_hole: [makeBoreHole()],
    well_case: [makeWellCase()],
    reduction: [makeReduction()],
    well_screen: [makeWellScreen()],
    surface_case: [makeSurfaceCase()],
    hole_fill: [makeHoleFill()],
    cement_pad: makeCementPad(),
    lithology: [makeLithology()],
    fractures: [makeFracture()],
    caves: [makeCave()],
  };
}

// ─── isWellEmpty ─────────────────────────────────────────────────────────────

describe('isWellEmpty', () => {
  describe('null / undefined input', () => {
    it('returns true for null', () => {
      expect(isWellEmpty(null)).toBe(true);
    });

    it('returns true for undefined', () => {
      expect(isWellEmpty(undefined)).toBe(true);
    });
  });

  describe('all-empty well', () => {
    it('returns true when all arrays are empty and no legacy keys', () => {
      expect(isWellEmpty(emptyWell())).toBe(true);
    });
  });

  describe('legacy structural keys', () => {
    it('returns false when well has a constructive key', () => {
      const w = { ...emptyWell(), constructive: {} } as unknown as Well;
      expect(isWellEmpty(w)).toBe(false);
    });

    it('returns false when well has a geologic key', () => {
      const w = { ...emptyWell(), geologic: {} } as unknown as Well;
      expect(isWellEmpty(w)).toBe(false);
    });
  });

  describe('single non-empty array makes well non-empty', () => {
    it('returns false when lithology has entries', () => {
      expect(
        isWellEmpty({ ...emptyWell(), lithology: [makeLithology()] }),
      ).toBe(false);
    });

    it('returns false when fractures has entries', () => {
      expect(isWellEmpty({ ...emptyWell(), fractures: [makeFracture()] })).toBe(
        false,
      );
    });

    it('returns false when caves has entries', () => {
      expect(isWellEmpty({ ...emptyWell(), caves: [makeCave()] })).toBe(false);
    });

    it('returns false when bore_hole has entries', () => {
      expect(isWellEmpty({ ...emptyWell(), bore_hole: [makeBoreHole()] })).toBe(
        false,
      );
    });

    it('returns false when hole_fill has entries', () => {
      expect(isWellEmpty({ ...emptyWell(), hole_fill: [makeHoleFill()] })).toBe(
        false,
      );
    });

    it('returns false when well_case has entries', () => {
      expect(isWellEmpty({ ...emptyWell(), well_case: [makeWellCase()] })).toBe(
        false,
      );
    });

    it('returns false when well_screen has entries', () => {
      expect(
        isWellEmpty({ ...emptyWell(), well_screen: [makeWellScreen()] }),
      ).toBe(false);
    });
  });

  describe('arrays not checked by isWellEmpty (optional well features)', () => {
    it('returns true when only surface_case has entries (intentionally not checked)', () => {
      expect(
        isWellEmpty({ ...emptyWell(), surface_case: [makeSurfaceCase()] }),
      ).toBe(true);
    });

    it('returns true when only reduction has entries (intentionally not checked)', () => {
      expect(
        isWellEmpty({ ...emptyWell(), reduction: [makeReduction()] }),
      ).toBe(true);
    });
  });

  describe('metadata-only well', () => {
    it('returns true when only optional metadata fields are set', () => {
      const w: Well = {
        ...emptyWell(),
        well_type: 'tubular',
        name: 'Test Well',
        well_driller: 'Driller',
        construction_date: '2023-01-01',
        lat: -1.0,
        lng: -48.0,
        elevation: 10,
        obs: 'some notes',
      };
      expect(isWellEmpty(w)).toBe(true);
    });
  });

  describe('cement_pad does not affect result', () => {
    it('returns true even when cement_pad has non-default values', () => {
      expect(isWellEmpty({ ...emptyWell(), cement_pad: makeCementPad() })).toBe(
        true,
      );
    });
  });
});

// ─── serializeWell ────────────────────────────────────────────────────────────

describe('serializeWell', () => {
  describe('output format', () => {
    it('produces valid JSON', () => {
      expect(() => JSON.parse(serializeWell(emptyWell()))).not.toThrow();
    });

    it('includes version: 2', () => {
      const parsed = JSON.parse(serializeWell(emptyWell()));
      expect(parsed.version).toBe(2);
    });

    it('includes all required array fields even when empty', () => {
      const parsed = JSON.parse(serializeWell(emptyWell()));
      for (const key of [
        'bore_hole',
        'well_case',
        'reduction',
        'well_screen',
        'surface_case',
        'hole_fill',
        'lithology',
        'fractures',
        'caves',
      ]) {
        expect(parsed).toHaveProperty(key);
      }
    });
  });

  describe('minimal well (no optional fields)', () => {
    it('does not include undefined optional metadata keys', () => {
      const parsed = JSON.parse(serializeWell(emptyWell()));
      for (const key of [
        'well_type',
        'name',
        'well_driller',
        'construction_date',
        'lat',
        'lng',
        'elevation',
        'well_depth',
        'obs',
      ]) {
        expect(parsed).not.toHaveProperty(key);
      }
    });

    it('omits cement_pad when it is falsy (null cast)', () => {
      const w = { ...emptyWell(), cement_pad: null } as unknown as Well;
      const parsed = JSON.parse(serializeWell(w));
      expect(parsed).not.toHaveProperty('cement_pad');
    });

    it('includes cement_pad when it has zero-value properties (object is truthy)', () => {
      const w = {
        ...emptyWell(),
        cement_pad: { type: '', width: 0, thickness: 0, length: 0 },
      };
      const parsed = JSON.parse(serializeWell(w));
      expect(parsed.cement_pad).toEqual({
        type: '',
        width: 0,
        thickness: 0,
        length: 0,
      });
    });
  });

  describe('full well with all optional fields', () => {
    it('includes all optional metadata in output', () => {
      const well = fullWell();
      const parsed = JSON.parse(serializeWell(well));
      expect(parsed.well_type).toBe('tubular');
      expect(parsed.name).toBe('Well-01');
      expect(parsed.well_driller).toBe('Driller Co.');
      expect(parsed.construction_date).toBe('2023-06-15');
      expect(parsed.obs).toBe('Artesian zone at 40m');
      expect(parsed.well_depth).toBe(145.5);
      expect(parsed.location).toEqual({
        lat: -1.4558,
        lng: -48.5044,
        elevation: 12,
      });
      expect(parsed).not.toHaveProperty('lat');
      expect(parsed).not.toHaveProperty('lng');
      expect(parsed).not.toHaveProperty('elevation');
    });

    it('includes cement_pad when provided', () => {
      const parsed = JSON.parse(serializeWell(fullWell()));
      expect(parsed.cement_pad).toEqual(makeCementPad());
    });

    it('preserves all array contents as-is', () => {
      const well = fullWell();
      const parsed = JSON.parse(serializeWell(well));
      expect(parsed.bore_hole).toEqual(well.bore_hole);
      expect(parsed.well_case).toEqual(well.well_case);
      expect(parsed.reduction).toEqual(well.reduction);
      expect(parsed.well_screen).toEqual(well.well_screen);
      expect(parsed.surface_case).toEqual(well.surface_case);
      expect(parsed.hole_fill).toEqual(well.hole_fill);
      expect(parsed.lithology).toEqual(well.lithology);
      expect(parsed.fractures).toEqual(well.fractures);
      expect(parsed.caves).toEqual(well.caves);
    });
  });

  describe('round-trip', () => {
    it('round-trips an empty well: arrays survive serialize → deserialize', () => {
      const restored = deserializeWell(serializeWell(emptyWell()));
      expect(restored).not.toBeNull();
      expect(restored!.bore_hole).toEqual([]);
      expect(restored!.lithology).toEqual([]);
    });

    it('round-trips a full well: all fields survive serialize → deserialize', () => {
      const original = fullWell();
      const restored = deserializeWell(serializeWell(original));
      expect(restored).not.toBeNull();
      expect(restored!.well_type).toBe(original.well_type);
      expect(restored!.name).toBe(original.name);
      expect(restored!.well_depth).toBe(original.well_depth);
      expect(restored!.bore_hole).toEqual(original.bore_hole);
      expect(restored!.well_case).toEqual(original.well_case);
      expect(restored!.reduction).toEqual(original.reduction);
      expect(restored!.well_screen).toEqual(original.well_screen);
      expect(restored!.surface_case).toEqual(original.surface_case);
      expect(restored!.hole_fill).toEqual(original.hole_fill);
      expect(restored!.cement_pad).toEqual(original.cement_pad);
      expect(restored!.lithology).toEqual(original.lithology);
      expect(restored!.fractures).toEqual(original.fractures);
      expect(restored!.caves).toEqual(original.caves);
      // v2: location round-trips if set on the well
      const withLocation = {
        ...original,
        location: { lat: -1.4558, lng: -48.5044, elevation: 12 },
      };
      const restoredV2 = deserializeWell(serializeWell(withLocation));
      expect(restoredV2!.location).toEqual(withLocation.location);
    });
  });
});

// ─── deserializeWell ──────────────────────────────────────────────────────────

describe('deserializeWell', () => {
  describe('error cases', () => {
    it('throws "Invalid profile format" for non-JSON string', () => {
      expect(() => deserializeWell('not json')).toThrow(
        'Invalid profile format',
      );
    });

    it('throws "Invalid profile format" for empty string', () => {
      expect(() => deserializeWell('')).toThrow('Invalid profile format');
    });

    it('throws "Invalid profile format" for malformed JSON', () => {
      expect(() => deserializeWell('{key: value}')).toThrow(
        'Invalid profile format',
      );
    });

    it('throws "Invalid profile format" for JSON null', () => {
      expect(() => deserializeWell('null')).toThrow('Invalid profile format');
    });

    it('throws "Invalid profile format" for JSON number', () => {
      expect(() => deserializeWell('42')).toThrow('Invalid profile format');
    });

    it('throws "Invalid profile format" for JSON array', () => {
      expect(() => deserializeWell('[]')).toThrow('Invalid profile format');
    });

    it('throws "Invalid profile format" for JSON string primitive', () => {
      expect(() => deserializeWell('"hello"')).toThrow(
        'Invalid profile format',
      );
    });

    it('throws "Unsupported .well format version: 0" for version 0', () => {
      expect(() => deserializeWell(JSON.stringify({ version: 0 }))).toThrow(
        'Unsupported .well format version: 0',
      );
    });

    it('accepts version: 2 without throwing', () => {
      expect(() =>
        deserializeWell(JSON.stringify({ version: 2 })),
      ).not.toThrow();
    });

    it('throws "Unsupported .well format version: 99" for version 99', () => {
      expect(() => deserializeWell(JSON.stringify({ version: 99 }))).toThrow(
        'Unsupported .well format version: 99',
      );
    });
  });

  describe('empty / no-data input', () => {
    // '{}' does NOT return null: isWellEmpty({}) is false because
    // `undefined?.length === 0` evaluates to false, so the conjunction is false.
    // The legacy path merges an empty constructive/geologic on top of createEmptyWell().
    it('returns a Well (not null) for empty JSON object "{}"', () => {
      const result = deserializeWell('{}');
      expect(result).not.toBeNull();
      expect(result!.bore_hole).toEqual([]);
      expect(result!.lithology).toEqual([]);
      expect(result!.fractures).toEqual([]);
      expect(result!.caves).toEqual([]);
    });
  });

  describe('v1 format', () => {
    it('returns a Well from minimal v1 payload { version: 1 }', () => {
      const result = deserializeWell(JSON.stringify({ version: 1 }));
      expect(result).not.toBeNull();
      expect(result!.bore_hole).toEqual([]);
      expect(result!.well_case).toEqual([]);
      expect(result!.reduction).toEqual([]);
      expect(result!.well_screen).toEqual([]);
      expect(result!.surface_case).toEqual([]);
      expect(result!.hole_fill).toEqual([]);
      expect(result!.lithology).toEqual([]);
      expect(result!.fractures).toEqual([]);
      expect(result!.caves).toEqual([]);
    });

    it('uses default cement_pad when absent from v1 payload', () => {
      const result = deserializeWell(JSON.stringify({ version: 1 }));
      expect(result!.cement_pad).toEqual({
        type: '',
        width: 0,
        thickness: 0,
        length: 0,
      });
    });

    it('uses provided cement_pad from v1 payload', () => {
      const pad = makeCementPad();
      const result = deserializeWell(
        JSON.stringify({ version: 1, cement_pad: pad }),
      );
      expect(result!.cement_pad).toEqual(pad);
    });

    it('extracts all optional metadata from v1 payload', () => {
      const result = deserializeWell(
        JSON.stringify({
          version: 1,
          well_type: 'artesian',
          name: 'P-01',
          well_driller: 'Driller XYZ',
          construction_date: '2020-03-10',
          lat: -2.0,
          lng: -45.0,
          elevation: 5,
          obs: 'high yield',
        }),
      );
      expect(result!.well_type).toBe('artesian');
      expect(result!.name).toBe('P-01');
      expect(result!.well_driller).toBe('Driller XYZ');
      expect(result!.construction_date).toBe('2020-03-10');
      expect(result!.lat).toBe(-2.0);
      expect(result!.lng).toBe(-45.0);
      expect(result!.elevation).toBe(5);
      expect(result!.obs).toBe('high yield');
    });

    it('handles partial optional metadata (absent fields stay undefined)', () => {
      const result = deserializeWell(
        JSON.stringify({ version: 1, name: 'Partial', lat: -3.5 }),
      );
      expect(result!.name).toBe('Partial');
      expect(result!.lat).toBe(-3.5);
      expect(result!.well_type).toBeUndefined();
      expect(result!.lng).toBeUndefined();
    });

    it('defaults null array value to [] via ?? operator', () => {
      const result = deserializeWell(
        JSON.stringify({ version: 1, bore_hole: null }),
      );
      expect(result!.bore_hole).toEqual([]);
    });

    it('preserves bore_hole array from v1 payload', () => {
      const bh = [makeBoreHole({ from: 0, to: 50, diameter: 300 })];
      const result = deserializeWell(
        JSON.stringify({ version: 1, bore_hole: bh }),
      );
      expect(result!.bore_hole).toEqual(bh);
    });

    it('preserves reduction array from v1 payload', () => {
      const red = [makeReduction()];
      const result = deserializeWell(
        JSON.stringify({ version: 1, reduction: red }),
      );
      expect(result!.reduction).toEqual(red);
    });

    it('normalizes lithology: defaults missing aquifer_unit to ""', () => {
      const rawItem = {
        from: 0,
        to: 5,
        description: 'sand',
        color: '#f5deb3',
        fgdc_texture: '101',
        geologic_unit: 'Unit A',
      };
      const result = deserializeWell(
        JSON.stringify({ version: 1, lithology: [rawItem] }),
      );
      expect(result!.lithology[0].aquifer_unit).toBe('');
    });

    it('normalizes lithology: preserves existing aquifer_unit', () => {
      const item = makeLithology({ aquifer_unit: 'Pirabas Aquifer' });
      const result = deserializeWell(
        JSON.stringify({ version: 1, lithology: [item] }),
      );
      expect(result!.lithology[0].aquifer_unit).toBe('Pirabas Aquifer');
    });
  });

  describe('legacy format — flat (no constructive/geologic wrapper)', () => {
    it('parses bore_hole at root level', () => {
      const bh = [makeBoreHole()];
      const result = deserializeWell(JSON.stringify({ bore_hole: bh }));
      expect(result!.bore_hole).toEqual(bh);
    });

    it('parses well_case at root level', () => {
      const wc = [makeWellCase()];
      const result = deserializeWell(JSON.stringify({ well_case: wc }));
      expect(result!.well_case).toEqual(wc);
    });

    it('extracts all metadata fields from root', () => {
      const result = deserializeWell(
        JSON.stringify({
          bore_hole: [makeBoreHole()],
          name: 'Legacy Well',
          lat: -1.2,
          lng: -48.1,
          elevation: 20,
          obs: 'legacy notes',
          well_type: 'hand_dug',
          well_driller: 'Manual',
          construction_date: '2010-05-01',
        }),
      );
      expect(result!.name).toBe('Legacy Well');
      expect(result!.lat).toBe(-1.2);
      expect(result!.lng).toBe(-48.1);
      expect(result!.elevation).toBe(20);
      expect(result!.obs).toBe('legacy notes');
      expect(result!.well_type).toBe('hand_dug');
      expect(result!.well_driller).toBe('Manual');
      expect(result!.construction_date).toBe('2010-05-01');
    });
  });

  describe('legacy format — nested constructive/geologic', () => {
    it('reads bore_hole from constructive sub-object', () => {
      const bh = [makeBoreHole()];
      const result = deserializeWell(
        JSON.stringify({ constructive: { bore_hole: bh } }),
      );
      expect(result!.bore_hole).toEqual(bh);
    });

    it('uses raw.geologic as lithology fallback when raw.lithology is absent', () => {
      const litho = [makeLithology()];
      const result = deserializeWell(
        JSON.stringify({
          constructive: { bore_hole: [makeBoreHole()] },
          geologic: litho,
        }),
      );
      expect(result!.lithology).toHaveLength(1);
      expect(result!.lithology[0].description).toBe('clay');
    });

    it('prefers raw.lithology over raw.geologic when both present', () => {
      const result = deserializeWell(
        JSON.stringify({
          bore_hole: [makeBoreHole()],
          lithology: [makeLithology({ description: 'limestone' })],
          geologic: [makeLithology({ description: 'sandstone' })],
        }),
      );
      expect(result!.lithology[0].description).toBe('limestone');
    });

    it('defaults missing aquifer_unit to "" in legacy lithology', () => {
      const rawItem = {
        from: 0,
        to: 5,
        description: 'clay',
        color: '#ccc',
        fgdc_texture: '601',
        geologic_unit: 'Unit C',
      };
      const result = deserializeWell(
        JSON.stringify({ bore_hole: [makeBoreHole()], lithology: [rawItem] }),
      );
      expect(result!.lithology[0].aquifer_unit).toBe('');
    });

    it('preserves existing aquifer_unit in legacy lithology', () => {
      const item = makeLithology({ aquifer_unit: 'Barreiras Aquifer' });
      const result = deserializeWell(
        JSON.stringify({ bore_hole: [makeBoreHole()], lithology: [item] }),
      );
      expect(result!.lithology[0].aquifer_unit).toBe('Barreiras Aquifer');
    });
  });

  describe('bole_hole typo compatibility', () => {
    it('reads bole_hole as bore_hole', () => {
      const bh = [makeBoreHole({ from: 0, to: 30, diameter: 250 })];
      const result = deserializeWell(JSON.stringify({ bole_hole: bh }));
      expect(result!.bore_hole).toEqual(bh);
    });

    it('bole_hole takes precedence when both bole_hole and bore_hole are present', () => {
      const typo = [makeBoreHole({ diameter: 100 })];
      const correct = [makeBoreHole({ diameter: 250 })];
      // normalizeConstructive: src.bole_hole ?? src.bore_hole → bole_hole wins
      const result = deserializeWell(
        JSON.stringify({ bole_hole: typo, bore_hole: correct }),
      );
      expect(result!.bore_hole[0].diameter).toBe(100);
    });
  });

  describe('diam_pol → diameter conversion', () => {
    it('converts 4 diam_pol inches to 101.6 mm in bore_hole', () => {
      const result = deserializeWell(
        JSON.stringify({ bore_hole: [{ from: 0, to: 10, diam_pol: 4 }] }),
      );
      expect(result!.bore_hole[0].diameter).toBeCloseTo(101.6, 10);
      expect(
        (result!.bore_hole[0] as Record<string, unknown>)['diam_pol'],
      ).toBeUndefined();
    });

    it('converts diam_pol: 0 to diameter: 0', () => {
      const result = deserializeWell(
        JSON.stringify({ bore_hole: [{ from: 0, to: 10, diam_pol: 0 }] }),
      );
      expect(result!.bore_hole[0].diameter).toBe(0);
    });

    it('leaves items unchanged when no item has diam_pol', () => {
      const result = deserializeWell(
        JSON.stringify({ bore_hole: [makeBoreHole({ diameter: 200 })] }),
      );
      expect(result!.bore_hole[0].diameter).toBe(200);
    });

    it('converts diam_pol in well_case', () => {
      const result = deserializeWell(
        JSON.stringify({
          well_case: [{ from: 0, to: 10, type: 'pvc', diam_pol: 6 }],
        }),
      );
      expect(result!.well_case[0].diameter).toBeCloseTo(6 * 25.4, 10);
    });

    it('converts diam_pol in surface_case', () => {
      const result = deserializeWell(
        JSON.stringify({
          bore_hole: [makeBoreHole()],
          surface_case: [{ from: 0, to: 1, diam_pol: 12 }],
        }),
      );
      expect(result!.surface_case[0].diameter).toBeCloseTo(12 * 25.4, 10);
    });

    it('converts diam_pol in well_screen', () => {
      const result = deserializeWell(
        JSON.stringify({
          bore_hole: [makeBoreHole()],
          well_screen: [
            {
              from: 10,
              to: 20,
              type: 'wire_wound',
              diam_pol: 4,
              screen_slot_mm: 0.5,
            },
          ],
        }),
      );
      expect(result!.well_screen[0].diameter).toBeCloseTo(4 * 25.4, 10);
    });

    it('converts diam_pol in hole_fill', () => {
      const result = deserializeWell(
        JSON.stringify({
          bore_hole: [makeBoreHole()],
          hole_fill: [
            {
              from: 0,
              to: 5,
              type: 'gravel_pack',
              diam_pol: 8,
              description: 'gravel',
            },
          ],
        }),
      );
      expect(result!.hole_fill[0].diameter).toBeCloseTo(8 * 25.4, 10);
    });

    it('does NOT convert diam_pol in reduction (passed through as-is)', () => {
      const result = deserializeWell(
        JSON.stringify({
          bore_hole: [makeBoreHole()],
          reduction: [
            {
              from: 5,
              to: 6,
              diam_from: 200,
              diam_to: 150,
              type: 'conical',
              diam_pol: 99,
            },
          ],
        }),
      );
      const r = result!.reduction[0] as Record<string, unknown>;
      expect(r['diam_pol']).toBe(99);
      expect(r['diameter']).toBeUndefined();
    });

    it('returns empty array unchanged', () => {
      const result = deserializeWell(
        JSON.stringify({ bore_hole: [], well_case: [makeWellCase()] }),
      );
      expect(result!.bore_hole).toEqual([]);
    });

    // When any item in an array has diam_pol, ALL items are mapped through the conversion.
    // Items without diam_pol: destructuring gives diam_pol=undefined, so
    // (undefined || 0) * 25.4 = 0. Also, the spread `...rest` may contain
    // `diameter`, but `diameter: 0` at the end of the map object overwrites it.
    it('mixed array: item without diam_pol gets diameter: 0 (overwrites existing diameter)', () => {
      const result = deserializeWell(
        JSON.stringify({
          bore_hole: [
            { from: 0, to: 10, diam_pol: 4 },
            { from: 10, to: 20, diameter: 150 },
          ],
        }),
      );
      expect(result!.bore_hole[0].diameter).toBeCloseTo(101.6, 10);
      expect(result!.bore_hole[1].diameter).toBe(0);
    });
  });

  describe('cement_pad in legacy format', () => {
    it('includes cement_pad from legacy payload when provided', () => {
      const pad = makeCementPad();
      const result = deserializeWell(
        JSON.stringify({ bore_hole: [makeBoreHole()], cement_pad: pad }),
      );
      expect(result!.cement_pad).toEqual(pad);
    });

    it('uses default empty cement_pad when absent from legacy payload', () => {
      const result = deserializeWell(
        JSON.stringify({ bore_hole: [makeBoreHole()] }),
      );
      expect(result!.cement_pad).toEqual({
        type: '',
        width: 0,
        thickness: 0,
        length: 0,
      });
    });
  });

  describe('null array coalescing', () => {
    it('hole_fill: null coalesces to [] before conversion', () => {
      const result = deserializeWell(
        JSON.stringify({ bore_hole: [makeBoreHole()], hole_fill: null }),
      );
      expect(result!.hole_fill).toEqual([]);
    });

    it('surface_case: null coalesces to []', () => {
      const result = deserializeWell(
        JSON.stringify({ bore_hole: [makeBoreHole()], surface_case: null }),
      );
      expect(result!.surface_case).toEqual([]);
    });
  });

  describe('calculated well_depth', () => {
    it('fills well_depth from the deepest constructive interval when absent (v2)', () => {
      const result = deserializeWell(
        JSON.stringify({
          version: 2,
          bore_hole: [makeBoreHole({ from: 0, to: 120 })],
        }),
      );
      expect(result!.well_depth).toBe(120);
    });

    it('fills well_depth from the deepest constructive interval when absent (v1)', () => {
      const result = deserializeWell(
        JSON.stringify({
          bore_hole: [makeBoreHole({ from: 0, to: 88 })],
        }),
      );
      expect(result!.well_depth).toBe(88);
    });

    it('does not override an explicit well_depth with the calculated one', () => {
      const result = deserializeWell(
        JSON.stringify({
          version: 2,
          well_depth: 42,
          bore_hole: [makeBoreHole({ from: 0, to: 120 })],
        }),
      );
      expect(result!.well_depth).toBe(42);
    });

    it('leaves well_depth undefined when there is no constructive data to calculate from', () => {
      const result = deserializeWell(JSON.stringify({ version: 2 }));
      expect(result!.well_depth).toBeUndefined();
    });

    it('ignores lithology depth — only constructive arrays count', () => {
      const result = deserializeWell(
        JSON.stringify({
          version: 2,
          bore_hole: [makeBoreHole({ from: 0, to: 50 })],
          lithology: [makeLithology({ from: 0, to: 500 })],
        }),
      );
      expect(result!.well_depth).toBe(50);
    });

    it('picks the deepest across multiple constructive arrays', () => {
      const result = deserializeWell(
        JSON.stringify({
          version: 2,
          bore_hole: [makeBoreHole({ from: 0, to: 100 })],
          well_screen: [makeWellScreen({ from: 90, to: 212 })],
        }),
      );
      expect(result!.well_depth).toBe(212);
    });
  });
});

// ─── deprecated aliases ───────────────────────────────────────────────────────

describe('deprecated aliases', () => {
  it('profileToWell is the same reference as serializeWell', () => {
    expect(profileToWell).toBe(serializeWell);
  });

  it('checkIfProfileIsEmpty is the same reference as isWellEmpty', () => {
    expect(checkIfProfileIsEmpty).toBe(isWellEmpty);
  });

  it('convertProfileFromJSON is the same reference as deserializeWell', () => {
    expect(convertProfileFromJSON).toBe(deserializeWell);
  });

  it('profileToWell produces identical output to serializeWell', () => {
    const well = fullWell();
    expect(profileToWell(well)).toBe(serializeWell(well));
  });

  it('checkIfProfileIsEmpty produces identical output to isWellEmpty', () => {
    expect(checkIfProfileIsEmpty(null)).toBe(isWellEmpty(null));
    expect(checkIfProfileIsEmpty(emptyWell())).toBe(isWellEmpty(emptyWell()));
    expect(checkIfProfileIsEmpty(fullWell())).toBe(isWellEmpty(fullWell()));
  });

  it('convertProfileFromJSON produces identical output to deserializeWell', () => {
    const json = serializeWell(fullWell());
    expect(convertProfileFromJSON(json)).toEqual(deserializeWell(json));
  });
});

// ─── v2 normalizations (deserializeWell) ────────────────────────────────────

describe('v2 normalizations — deserializeWell', () => {
  it('v1 fgdc_texture → texture object on deserialize', () => {
    const result = deserializeWell(
      JSON.stringify({
        version: 1,
        lithology: [
          {
            from: 0,
            to: 5,
            description: 'sand',
            color: '#f5deb3',
            fgdc_texture: '607',
            geologic_unit: 'Q',
            aquifer_unit: 'freático',
          },
        ],
      }),
    );
    expect(result!.lithology[0].texture).toEqual({
      code: '607',
      vocabulary: 'fgdc',
    });
  });

  it('v1 screen_slot_mm → screen_slot on deserialize', () => {
    const result = deserializeWell(
      JSON.stringify({
        version: 1,
        well_screen: [
          {
            from: 10,
            to: 20,
            type: 'wire_wound',
            diameter: 150,
            screen_slot_mm: 0.5,
          },
        ],
      }),
    );
    expect(result!.well_screen[0].screen_slot).toBe(0.5);
    expect(
      (result!.well_screen[0] as Record<string, unknown>)['screen_slot_mm'],
    ).toBeUndefined();
  });

  it('v1 flat lat/lng/elevation → location object on deserialize', () => {
    const result = deserializeWell(
      JSON.stringify({ version: 1, lat: -1.45, lng: -48.5, elevation: 12.5 }),
    );
    expect(result!.location).toEqual({
      lat: -1.45,
      lng: -48.5,
      elevation: 12.5,
    });
  });

  it('v1 lat/lng without elevation → location without elevation', () => {
    const result = deserializeWell(
      JSON.stringify({ version: 1, lat: -1.45, lng: -48.5 }),
    );
    expect(result!.location).toEqual({ lat: -1.45, lng: -48.5 });
    expect(result!.location!.elevation).toBeUndefined();
  });

  it('version: 9 throws with message containing "9"', () => {
    expect(() => deserializeWell(JSON.stringify({ version: 9 }))).toThrow('9');
  });

  it('v2 JSON accepted without error and preserves all v2 fields', () => {
    const v2 = {
      version: 2,
      well_id: [{ authority: 'SIAGAS', id: 'SP-001', primary: true }],
      location: { lat: -1.45, lng: -48.5, elevation: 12.5 },
      profiles: ['https://welldot.org/profiles/brazil-ana/v1/schema.json'],
      hydrodynamic_events: [
        {
          id: 'evt-001',
          type: 'spot_measurement',
          datetime: '2010-07-22T09:15:00-03:00',
          static_level: 31.2,
        },
      ],
      aquifer_analysis: [
        {
          id: 'ana-001',
          datetime: '2010-07-22T10:00:00-03:00',
          source_event_ids: ['evt-001'],
          specific_capacity: 21.17,
        },
      ],
      history_logs: [
        {
          id: 'log-001',
          datetime: '2006-03-10T00:00:00-03:00',
          category: 'event',
          description: 'Well commissioned.',
        },
      ],
    };
    const result = deserializeWell(JSON.stringify(v2));
    expect(result!.well_id).toEqual(v2.well_id);
    expect(result!.location).toEqual(v2.location);
    expect(result!.profiles).toEqual(v2.profiles);
    expect(result!.hydrodynamic_events).toHaveLength(1);
    expect(result!.aquifer_analysis).toHaveLength(1);
    expect(result!.history_logs).toHaveLength(1);
  });
});

// ─── v2 serialize ────────────────────────────────────────────────────────────

describe('v2 serialize', () => {
  it('serializes well with hydrodynamic_events', () => {
    const well: Well = {
      ...emptyWell(),
      hydrodynamic_events: [
        {
          id: 'evt-001',
          type: 'spot_measurement',
          datetime: '2010-07-22T09:15:00-03:00',
          static_level: 31.2,
        },
      ],
    };
    const parsed = JSON.parse(serializeWell(well));
    expect(parsed.hydrodynamic_events).toHaveLength(1);
    expect(parsed.hydrodynamic_events[0].static_level).toBe(31.2);
  });

  it('v2 round-trip: deserialize v2 → serialize → re-parse equals original', () => {
    const v2json = JSON.stringify({
      version: 2,
      well_type: 'tubular',
      location: { lat: -1.45, lng: -48.5, elevation: 12.5 },
      bore_hole: [{ from: 0, to: 80, diameter: 250 }],
      well_case: [],
      reduction: [],
      well_screen: [
        {
          from: 60,
          to: 80,
          type: 'wire_wound',
          diameter: 150,
          screen_slot: 0.5,
        },
      ],
      surface_case: [],
      hole_fill: [],
      cement_pad: { type: 'square', width: 1, thickness: 0.15, length: 1 },
      lithology: [],
      fractures: [],
      caves: [],
    });
    const deserialized = deserializeWell(v2json)!;
    const reserialized = serializeWell(deserialized);
    const reparsed = deserializeWell(reserialized)!;
    expect(reparsed.location).toEqual(deserialized.location);
    expect(reparsed.well_screen[0].screen_slot).toBe(0.5);
    expect(JSON.parse(reserialized).version).toBe(2);
    expect(JSON.parse(reserialized)).not.toHaveProperty('lat');
    expect(JSON.parse(reserialized)).not.toHaveProperty('lng');
    expect(JSON.parse(reserialized)).not.toHaveProperty('elevation');
  });
});

// ─── parseWell ────────────────────────────────────────────────────────────────

describe('parseWell', () => {
  // Minimal valid v2 document
  function minV2(overrides: Record<string, unknown> = {}): string {
    return JSON.stringify({
      version: 2,
      well_type: 'tubular',
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
    });
  }

  // Minimal valid v1 document
  function minV1(overrides: Record<string, unknown> = {}): string {
    return JSON.stringify({
      version: 1,
      well_type: 'tubular',
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
    });
  }

  describe('error cases', () => {
    it('throws on non-JSON input', () => {
      expect(() => parseWell('not json')).toThrow();
    });

    it('normalizes to v2 when version is absent', () => {
      const result = parseWell(
        JSON.stringify({
          well_type: 'tubular',
          bore_hole: [],
          well_case: [],
          reduction: [],
          well_screen: [],
          surface_case: [],
          hole_fill: [],
          lithology: [],
          fractures: [],
          caves: [],
        }),
      );
      expect(result.version).toBe(2);
    });

    it('succeeds when well_type is absent (field is optional)', () => {
      expect(() =>
        parseWell(
          JSON.stringify({
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
          }),
        ),
      ).not.toThrow();
    });

    it('throws on unsupported version', () => {
      expect(() => parseWell(minV2({ version: 99 }))).toThrow(
        'Unsupported .well format version: 99',
      );
    });
  });

  describe('v2 document', () => {
    it('accepts a minimal valid v2 document', () => {
      expect(() => parseWell(minV2())).not.toThrow();
    });

    it('returns version: 2', () => {
      expect(parseWell(minV2()).version).toBe(2);
    });

    it('passes through unknown top-level fields (foreign-members rule)', () => {
      const result = parseWell(minV2({ 'x-custom': 'value' }));
      expect((result as Record<string, unknown>)['x-custom']).toBe('value');
    });

    it('accepts cement_pad when present', () => {
      const result = parseWell(minV2({ cement_pad: makeCementPad() }));
      expect(result.cement_pad).toEqual(makeCementPad());
    });

    it('accepts absent cement_pad', () => {
      const result = parseWell(minV2());
      expect(result.cement_pad).toBeUndefined();
    });

    it('accepts storativity: null', () => {
      const result = parseWell(
        minV2({
          aquifer_analysis: [
            {
              id: 'a1',
              datetime: '2006-03-15T16:00:00-03:00',
              source_event_ids: [],
              storativity: null,
            },
          ],
        }),
      );
      expect(result.aquifer_analysis![0].storativity).toBeNull();
    });
  });

  describe('v1 → v2 normalizations', () => {
    it('version 1 is normalized to version 2 in output', () => {
      expect(parseWell(minV1()).version).toBe(2);
    });

    it('fgdc_texture → texture object', () => {
      const result = parseWell(
        minV1({
          lithology: [
            {
              from: 0,
              to: 5,
              description: 'sand',
              color: '#f5deb3',
              fgdc_texture: '607',
              geologic_unit: 'Q',
              aquifer_unit: 'freático',
            },
          ],
        }),
      );
      expect(result.lithology[0].texture).toEqual({
        code: '607',
        vocabulary: 'fgdc',
      });
    });

    it('screen_slot_mm → screen_slot', () => {
      const result = parseWell(
        minV1({
          well_screen: [
            {
              from: 10,
              to: 20,
              type: 'wire_wound',
              diameter: 150,
              screen_slot_mm: 0.5,
            },
          ],
        }),
      );
      expect(result.well_screen[0].screen_slot).toBe(0.5);
      expect(
        (result.well_screen[0] as Record<string, unknown>)['screen_slot_mm'],
      ).toBeUndefined();
    });

    it('lat/lng/elevation → location object', () => {
      const result = parseWell(
        minV1({ lat: -1.45, lng: -48.5, elevation: 12.5 }),
      );
      expect(result.location).toEqual({
        lat: -1.45,
        lng: -48.5,
        elevation: 12.5,
      });
    });

    it('lat/lng without elevation → location without elevation field', () => {
      const result = parseWell(minV1({ lat: -1.45, lng: -48.5 }));
      expect(result.location).toEqual({ lat: -1.45, lng: -48.5 });
      expect(result.location!.elevation).toBeUndefined();
    });

    it('existing location object takes precedence over flat lat/lng', () => {
      const result = parseWell(
        minV1({ location: { lat: -2.0, lng: -49.0 }, lat: -1.45, lng: -48.5 }),
      );
      expect(result.location).toEqual({ lat: -2.0, lng: -49.0 });
    });

    it('bole_hole typo → bore_hole', () => {
      const bh = [{ from: 0, to: 30, diameter: 250 }];
      const result = parseWell(
        JSON.stringify({
          version: 1,
          well_type: 'tubular',
          bole_hole: bh,
          well_case: [],
          reduction: [],
          well_screen: [],
          surface_case: [],
          hole_fill: [],
          lithology: [],
          fractures: [],
          caves: [],
        }),
      );
      expect(result.bore_hole).toEqual(bh);
    });

    it('diam_pol → diameter in bore_hole', () => {
      const result = parseWell(
        minV1({ bore_hole: [{ from: 0, to: 10, diam_pol: 4 }] }),
      );
      expect(result.bore_hole[0].diameter).toBeCloseTo(101.6, 10);
      expect(
        (result.bore_hole[0] as Record<string, unknown>)['diam_pol'],
      ).toBeUndefined();
    });

    it('diam_pol → diameter in well_case', () => {
      const result = parseWell(
        minV1({ well_case: [{ from: 0, to: 10, type: 'pvc', diam_pol: 6 }] }),
      );
      expect(result.well_case[0].diameter).toBeCloseTo(6 * 25.4, 10);
    });

    it('diam_pol → diameter in well_screen', () => {
      const result = parseWell(
        minV1({
          well_screen: [
            {
              from: 10,
              to: 20,
              type: 'wire_wound',
              diam_pol: 4,
              screen_slot: 0.5,
            },
          ],
        }),
      );
      expect(result.well_screen[0].diameter).toBeCloseTo(4 * 25.4, 10);
    });

    it('diam_pol → diameter in surface_case', () => {
      const result = parseWell(
        minV1({ surface_case: [{ from: 0, to: 1, diam_pol: 12 }] }),
      );
      expect(result.surface_case[0].diameter).toBeCloseTo(12 * 25.4, 10);
    });

    it('diam_pol → diameter in hole_fill', () => {
      const result = parseWell(
        minV1({
          hole_fill: [
            {
              from: 0,
              to: 5,
              type: 'gravel_pack',
              diam_pol: 8,
              description: 'gravel',
            },
          ],
        }),
      );
      expect(result.hole_fill[0].diameter).toBeCloseTo(8 * 25.4, 10);
    });
  });
});

// ─── mergeWell defu behavior ─────────────────────────────────────────────────

function minWell(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
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
  });
}

describe('mergeWell defu behavior', () => {
  describe('parseWell', () => {
    it('preserves top-level x- fields', () => {
      const result = parseWell(minWell({ 'x-siagas': { registro: 'SP-001' } }));
      expect((result as Record<string, unknown>)['x-siagas']).toEqual({
        registro: 'SP-001',
      });
    });

    it('does not concatenate source arrays with raw', () => {
      const result = parseWell(
        minWell({ bore_hole: [{ from: 0, to: 80, diameter: 250 }] }),
      );
      expect(result.bore_hole).toHaveLength(1);
    });

    it('version stays 2 after v1 normalization', () => {
      const result = parseWell(
        JSON.stringify({
          version: 1,
          well_type: 'tubular',
          bore_hole: [],
          well_case: [],
          reduction: [],
          well_screen: [],
          surface_case: [],
          hole_fill: [],
          lithology: [],
          fractures: [],
          caves: [],
        }),
      );
      expect(result.version).toBe(2);
    });
  });

  describe('deserializeWell', () => {
    it('preserves top-level x- fields in v2 path', () => {
      const result = deserializeWell(
        JSON.stringify({
          version: 2,
          'x-custom': 'hello',
          bore_hole: [],
          well_case: [],
          reduction: [],
          well_screen: [],
          surface_case: [],
          hole_fill: [],
          lithology: [],
          fractures: [],
          caves: [],
        }),
      );
      expect((result as unknown as Record<string, unknown>)['x-custom']).toBe(
        'hello',
      );
    });

    it('does not concatenate arrays in v2 path', () => {
      const result = deserializeWell(
        JSON.stringify({
          version: 2,
          bore_hole: [{ from: 0, to: 10, diameter: 200 }],
          well_case: [],
          reduction: [],
          well_screen: [],
          surface_case: [],
          hole_fill: [],
          lithology: [],
          fractures: [],
          caves: [],
        }),
      );
      expect(result!.bore_hole).toHaveLength(1);
    });
  });
});

// ─── redactWell ──────────────────────────────────────────────────────────────

describe('redactWell', () => {
  const ALL_VISIBLE: SectionVisibility = {
    general: true,
    constructive: true,
    geology: true,
    hydrodynamic: true,
    history: true,
    operation: true,
    water_quality: true,
  };

  function fullV2Well(): Well {
    return {
      ...fullWell(),
      well_id: [{ authority: 'ANA', id: '12345' }],
      lat: -1.4558,
      lng: -48.5044,
      elevation: 12,
      hydrodynamic_events: [
        { type: 'spot_measurement', date: '2023-06-15' },
      ] as unknown as Well['hydrodynamic_events'],
      aquifer_analysis: [
        { date: '2023-06-15', transmissivity: 10 },
      ] as unknown as Well['aquifer_analysis'],
      history_logs: [
        { date: '2023-06-15', category: 'inspection', severity: 'low' },
      ] as unknown as Well['history_logs'],
    };
  }

  it('returns a well deep-equal to the input when all sections are visible', () => {
    const well = fullV2Well();
    expect(redactWell(well, ALL_VISIBLE)).toEqual(well);
  });

  it('does not mutate the input well', () => {
    const well = fullV2Well();
    const snapshot = structuredClone(well);
    redactWell(well, { ...ALL_VISIBLE, general: false });
    expect(well).toEqual(snapshot);
  });

  it('clears general fields when general is hidden', () => {
    const result = redactWell(fullV2Well(), {
      ...ALL_VISIBLE,
      general: false,
    });
    expect(result.well_id).toBeUndefined();
    expect(result.location).toBeUndefined();
    expect(result.well_type).toBeUndefined();
    expect(result.name).toBeUndefined();
    expect(result.well_driller).toBeUndefined();
    expect(result.construction_date).toBeUndefined();
    expect(result.obs).toBeUndefined();
    expect(result.lat).toBeUndefined();
    expect(result.lng).toBeUndefined();
    expect(result.elevation).toBeUndefined();
    // Untouched sections keep their data
    expect(result.bore_hole).toHaveLength(1);
    expect(result.lithology).toHaveLength(1);
    expect(result.well_depth).toBe(145.5);
  });

  it('empties constructive arrays, cement_pad, and well_depth when constructive is hidden', () => {
    const result = redactWell(fullV2Well(), {
      ...ALL_VISIBLE,
      constructive: false,
    });
    expect(result.bore_hole).toEqual([]);
    expect(result.well_case).toEqual([]);
    expect(result.reduction).toEqual([]);
    expect(result.well_screen).toEqual([]);
    expect(result.surface_case).toEqual([]);
    expect(result.hole_fill).toEqual([]);
    expect(result.cement_pad).toBeUndefined();
    expect(result.well_depth).toBeUndefined();
    // Untouched sections keep their data
    expect(result.name).toBe('Well-01');
    expect(result.lithology).toHaveLength(1);
  });

  it('empties geologic arrays when geology is hidden', () => {
    const result = redactWell(fullV2Well(), { ...ALL_VISIBLE, geology: false });
    expect(result.lithology).toEqual([]);
    expect(result.fractures).toEqual([]);
    expect(result.caves).toEqual([]);
    expect(result.bore_hole).toHaveLength(1);
  });

  it('empties hydrodynamic arrays when hydrodynamic is hidden', () => {
    const result = redactWell(fullV2Well(), {
      ...ALL_VISIBLE,
      hydrodynamic: false,
    });
    expect(result.hydrodynamic_events).toEqual([]);
    expect(result.aquifer_analysis).toEqual([]);
    expect(result.history_logs).toHaveLength(1);
  });

  it('empties history_logs when history is hidden', () => {
    const result = redactWell(fullV2Well(), { ...ALL_VISIBLE, history: false });
    expect(result.history_logs).toEqual([]);
    expect(result.hydrodynamic_events).toHaveLength(1);
  });

  it('empties everything when all sections are hidden, preserving version', () => {
    const result = redactWell(fullV2Well(), {
      general: false,
      constructive: false,
      geology: false,
      hydrodynamic: false,
      history: false,
    });
    expect(result.version).toBe(2);
    expect(result.name).toBeUndefined();
    expect(result.bore_hole).toEqual([]);
    expect(result.lithology).toEqual([]);
    expect(result.hydrodynamic_events).toEqual([]);
    expect(result.history_logs).toEqual([]);
  });

  describe('field-level visibility', () => {
    function operationalWell(): Well {
      return {
        ...fullV2Well(),
        attachments: [{ uri: 'https://example.test/a.pdf' }],
        pump_installations: [{ id: 'p1' }],
        meters: [{ id: 'm1' }],
        operating_regime: [{ id: 'r1' }],
        production: [{ id: 'e1', meter_id: 'm1' }],
        permits: [{ id: 'o1' }],
        water_samples: [{ id: 's1' }],
      } as unknown as Well;
    }

    it('hides single operation fields and keeps their siblings', () => {
      const result = redactWell(operationalWell(), {
        meters: false,
        permits: false,
      });
      expect(result.meters).toBeUndefined();
      expect(result.permits).toBeUndefined();
      expect(result.pump_installations).toHaveLength(1);
      expect(result.operating_regime).toHaveLength(1);
      // References from visible records are left as-is.
      expect(result.production).toEqual([{ id: 'e1', meter_id: 'm1' }]);
    });

    it('treats a hidden section as hiding all of its fields', () => {
      const result = redactWell(operationalWell(), {
        operation: false,
        meters: true,
      });
      expect(result.meters).toBeUndefined();
      expect(result.pump_installations).toBeUndefined();
      expect(result.production).toBeUndefined();
    });

    it('splits general into identification, location, obs and attachments', () => {
      const result = redactWell(operationalWell(), {
        location: false,
        attachments: false,
      });
      expect(result.location).toBeUndefined();
      expect(result.lat).toBeUndefined();
      expect(result.attachments).toBeUndefined();
      expect(result.name).toBe('Well-01');
      expect(result.well_id).toHaveLength(1);
      expect(result.obs).toBe(operationalWell().obs);

      const noId = redactWell(operationalWell(), { identification: false });
      expect(noId.name).toBeUndefined();
      expect(noId.well_id).toBeUndefined();
      expect(noId.lat).toBe(-1.4558);
    });

    it('keeps well_depth until every constructive field is hidden', () => {
      expect(
        redactWell(operationalWell(), { bore_hole: false }).well_depth,
      ).toBe(145.5);
      const allHidden = Object.fromEntries(
        VISIBILITY_TREE.constructive.map(k => [k, false]),
      );
      const result = redactWell(operationalWell(), allHidden);
      expect(result.well_depth).toBeUndefined();
      expect(result.bore_hole).toEqual([]);
      expect(result.cement_pad).toBeUndefined();
    });

    it('hides single geology and hydrodynamic fields', () => {
      const result = redactWell(operationalWell(), {
        fractures: false,
        aquifer_analysis: false,
      });
      expect(result.fractures).toEqual([]);
      expect(result.lithology).toHaveLength(1);
      expect(result.aquifer_analysis).toEqual([]);
      expect(result.hydrodynamic_events).toHaveLength(1);
    });

    it('returns an equal well for an empty visibility object', () => {
      const well = operationalWell();
      expect(redactWell(well, {})).toEqual(well);
    });
  });

  describe('VISIBILITY_TREE / VISIBILITY_LEAF_KEYS', () => {
    it('covers every section, with field-less sections as leaves', () => {
      expect(Object.keys(VISIBILITY_TREE)).toEqual([...SECTION_KEYS]);
      expect(VISIBILITY_LEAF_KEYS).toContain('history');
      expect(VISIBILITY_LEAF_KEYS).toContain('water_quality');
      expect(VISIBILITY_LEAF_KEYS).toContain('meters');
      expect(VISIBILITY_LEAF_KEYS).not.toContain('operation');
      expect(new Set(VISIBILITY_LEAF_KEYS).size).toBe(
        VISIBILITY_LEAF_KEYS.length,
      );
    });
  });
});

// ─── v2.1 additions ───────────────────────────────────────────────────────────

describe('v2.1 — centralizers and well_purpose', () => {
  const V21_DOC = {
    version: 2,
    well_type: 'tubular',
    well_purpose: ['production', 'monitoring'],
    bore_hole: [{ from: 0, to: 60, diameter: 250 }],
    well_case: [{ from: 0, to: 40, type: 'pvc', diameter: 168.3 }],
    reduction: [],
    well_screen: [],
    surface_case: [],
    hole_fill: [],
    centralizers: [
      { from: 6, to: 36, spacing: 6, type: 'spring_bow', diameter: 240 },
      { from: 39, to: 39, type: 'rigid' },
    ],
    lithology: [],
    fractures: [],
    caves: [],
  };

  it('parseWell accepts centralizers and well_purpose', () => {
    const well = parseWell(JSON.stringify(V21_DOC));
    expect(well.centralizers).toEqual(V21_DOC.centralizers);
    expect(well.well_purpose).toEqual(['production', 'monitoring']);
  });

  it('parseWell accepts an interval without spacing (unknown spacing)', () => {
    const doc = {
      ...V21_DOC,
      centralizers: [{ from: 10, to: 50, type: 'x-custom' }],
    };
    expect(() => parseWell(JSON.stringify(doc))).not.toThrow();
  });

  it('parseWell rejects non-positive spacing', () => {
    const doc = {
      ...V21_DOC,
      centralizers: [{ from: 10, to: 50, spacing: 0, type: 'rigid' }],
    };
    expect(() => parseWell(JSON.stringify(doc))).toThrow();
  });

  it('parseWell rejects a non-array well_purpose', () => {
    const doc = { ...V21_DOC, well_purpose: 'monitoring' };
    expect(() => parseWell(JSON.stringify(doc))).toThrow();
  });

  it('v2.0 documents without the new fields still parse', () => {
    const { centralizers: _c, well_purpose: _p, ...v20 } = V21_DOC;
    const well = parseWell(JSON.stringify(v20));
    expect(well.centralizers).toBeUndefined();
    expect(well.well_purpose).toBeUndefined();
  });

  it('round-trips through serializeWell → deserializeWell', () => {
    const well = deserializeWell(JSON.stringify(V21_DOC))!;
    const again = deserializeWell(serializeWell(well))!;
    expect(again.centralizers).toEqual(V21_DOC.centralizers);
    expect(again.well_purpose).toEqual(V21_DOC.well_purpose);
  });

  it('centralizers do not extend the calculated well_depth', () => {
    const doc = {
      ...V21_DOC,
      bore_hole: [{ from: 0, to: 30, diameter: 250 }],
      well_case: [],
      centralizers: [{ from: 0, to: 90, spacing: 6, type: 'rigid' }],
    };
    expect(deserializeWell(JSON.stringify(doc))!.well_depth).toBe(30);
  });

  it('redactWell removes well_purpose with general and centralizers with constructive', () => {
    const well = deserializeWell(JSON.stringify(V21_DOC))!;
    const visibility: SectionVisibility = {
      general: false,
      constructive: false,
      geology: true,
      hydrodynamic: true,
      history: true,
      operation: true,
      water_quality: true,
    };
    const result = redactWell(well, visibility);
    expect(result.well_purpose).toBeUndefined();
    expect(result.centralizers).toBeUndefined();
  });
});

// ─── v2.3 additions ───────────────────────────────────────────────────────────

describe('v2.3 — attachments and pump_installations', () => {
  const V23_DOC = {
    version: 2,
    well_type: 'tubular',
    bore_hole: [{ from: 0, to: 80, diameter: 250 }],
    well_case: [{ from: 0, to: 50, type: 'pvc', diameter: 168.3 }],
    reduction: [],
    well_screen: [],
    surface_case: [],
    hole_fill: [],
    lithology: [],
    fractures: [],
    caves: [],
    attachments: [
      {
        id: 'att-1',
        uri: 'https://files.example.org/pp01/relatorio-perfuracao.pdf',
        media_type: 'application/pdf',
        document_type: 'drilling_report',
      },
    ],
    pump_installations: [
      {
        id: 'pump-01',
        installed_at: '2020-03-01T10:00:00-03:00',
        removed_at: '2024-11-18T15:00:00-03:00',
        installed_by: 'Perfurações Silva Ltda.',
        removed_by: 'Bombas Norte',
        type: 'submersible',
        serial: 'SN-1',
        intake_depth: 55,
      },
      {
        id: 'pump-02',
        installed_at: '2024-11-18T16:00:00-03:00',
        type: 'submersible',
        power_source: 'grid',
        intake_depth: 60,
        rated_flow_rate: 15,
        rated_power: 5.5,
        stages: 8,
        riser_diameter: 60.3,
        riser_material: 'galvanized_steel',
        check_valve: true,
        electrical: { voltage: 380, phases: 3, cable_section: 6 },
        attachments: [
          {
            id: 'att-1',
            uri: 'https://files.example.org/pp01/curva.pdf',
            media_type: 'application/pdf',
            document_type: 'pump_curve',
          },
        ],
      },
    ],
    hydrodynamic_events: [
      {
        id: 'ev-1',
        type: 'spot_measurement',
        datetime: '2025-01-10T09:00:00-03:00',
        static_level: 12.3,
      },
      {
        id: 'ev-2',
        type: 'spot_measurement',
        datetime: '2025-01-10T09:00:00-03:00',
        static_level: 13.2,
        corrects: 'ev-1',
        attachments: [
          {
            id: 'att-1',
            uri: 'https://files.example.org/pp01/ficha.jpg',
            media_type: 'image/jpeg',
            document_type: 'field_sheet',
          },
        ],
      },
    ],
    aquifer_analysis: [
      {
        id: 'aa-1',
        datetime: '2025-01-12T09:00:00-03:00',
        source_event_ids: ['ev-2'],
        attachments: [
          {
            id: 'att-1',
            uri: 'https://files.example.org/pp01/teste.pdf',
            media_type: 'application/pdf',
            document_type: 'test_report',
          },
        ],
      },
    ],
  };

  it('parseWell accepts root attachments, pump_installations, corrects and nested attachments', () => {
    const well = parseWell(JSON.stringify(V23_DOC));
    expect(well.attachments).toEqual(V23_DOC.attachments);
    expect(well.pump_installations).toEqual(V23_DOC.pump_installations);
    expect(well.hydrodynamic_events?.[1]).toMatchObject({
      corrects: 'ev-1',
      attachments: V23_DOC.hydrodynamic_events[1].attachments,
    });
    expect(well.aquifer_analysis?.[0].attachments).toEqual(
      V23_DOC.aquifer_analysis[0].attachments,
    );
  });

  it('parseWell rejects a pump without installed_at', () => {
    const doc = {
      ...V23_DOC,
      pump_installations: [{ id: 'p', type: 'submersible' }],
    };
    expect(() => parseWell(JSON.stringify(doc))).toThrow();
  });

  it('parseWell rejects an installed_at without UTC offset', () => {
    const doc = {
      ...V23_DOC,
      pump_installations: [
        { id: 'p', type: 'jet', installed_at: '2024-01-01T10:00:00' },
      ],
    };
    expect(() => parseWell(JSON.stringify(doc))).toThrow();
  });

  it('parseWell rejects electrical.phases other than 1 or 3', () => {
    const doc = {
      ...V23_DOC,
      pump_installations: [
        {
          id: 'p',
          type: 'submersible',
          installed_at: '2024-01-01T10:00:00Z',
          electrical: { phases: 2 },
        },
      ],
    };
    expect(() => parseWell(JSON.stringify(doc))).toThrow();
  });

  it('parseWell rejects an attachment without media_type', () => {
    const doc = {
      ...V23_DOC,
      attachments: [{ id: 'a', uri: 'https://example.org/x.pdf' }],
    };
    expect(() => parseWell(JSON.stringify(doc))).toThrow();
  });

  it('v2.1 documents without the new blocks still parse', () => {
    const {
      attachments: _a,
      pump_installations: _p,
      hydrodynamic_events: _h,
      aquifer_analysis: _aa,
      ...v21
    } = V23_DOC;
    const well = parseWell(JSON.stringify(v21));
    expect(well.attachments).toBeUndefined();
    expect(well.pump_installations).toBeUndefined();
  });

  it('round-trips through serializeWell → deserializeWell', () => {
    const well = deserializeWell(JSON.stringify(V23_DOC))!;
    const again = deserializeWell(serializeWell(well))!;
    expect(again.attachments).toEqual(V23_DOC.attachments);
    expect(again.pump_installations).toEqual(V23_DOC.pump_installations);
    expect(again.hydrodynamic_events).toEqual(V23_DOC.hydrodynamic_events);
    expect(again.aquifer_analysis).toEqual(V23_DOC.aquifer_analysis);
  });

  it('pump intake_depth does not extend the calculated well_depth', () => {
    const doc = {
      ...V23_DOC,
      pump_installations: [
        {
          id: 'p',
          type: 'submersible',
          installed_at: '2024-01-01T10:00:00Z',
          intake_depth: 200,
        },
      ],
    };
    expect(deserializeWell(JSON.stringify(doc))!.well_depth).toBe(80);
  });

  it('redactWell removes pump_installations with operation', () => {
    const well = deserializeWell(JSON.stringify(V23_DOC))!;
    const result = redactWell(well, {
      general: true,
      constructive: true,
      geology: true,
      hydrodynamic: true,
      history: true,
      operation: false,
      water_quality: true,
    });
    expect(result.pump_installations).toBeUndefined();
    expect(result.attachments).toEqual(V23_DOC.attachments);
    expect(result.hydrodynamic_events).toEqual(well.hydrodynamic_events);
  });

  it('redactWell removes root attachments with general', () => {
    const well = deserializeWell(JSON.stringify(V23_DOC))!;
    const result = redactWell(well, {
      general: false,
      constructive: true,
      geology: true,
      hydrodynamic: true,
      history: true,
      operation: true,
      water_quality: true,
    });
    expect(result.attachments).toBeUndefined();
    expect(result.pump_installations).toEqual(well.pump_installations);
  });
});

// ─── v2.3 — permits ──────────────────────────────────────────────────────────

describe('v2.3 — permits, history and condition fulfillments', () => {
  const PERMIT_DOC = {
    version: 2,
    well_type: 'tubular',
    bore_hole: [{ from: 0, to: 80, diameter: 250 }],
    well_case: [],
    reduction: [],
    well_screen: [],
    surface_case: [],
    hole_fill: [],
    lithology: [],
    fractures: [],
    caves: [],
    permits: [
      {
        id: 'pmt-01',
        type: 'abstraction_permit',
        authority: 'SEMAS-PA',
        identifier: '1234/2025',
        request_identifier: 'PRT-2024/0099',
        status: 'granted',
        issued_at: '2025-02-10',
        valid_until: '2029-02-10',
        water_use: ['human_supply'],
        flow_rate: 15,
        daily_operating_time: 20,
        volume_limits: [{ period: 'annual', volume: 109500 }],
        monthly_schedule: [{ month: 1, flow_rate: 12, days: 31 }],
        conditions: [
          {
            id: 'c1',
            description: 'Instalar hidrômetro na saída do poço',
            category: 'equipment_installation',
            due_after: 'P90D',
            responsible: 'Equipe de operação',
            fulfillments: [
              {
                id: 'f1',
                datetime: '2025-04-02T10:00:00-03:00',
                due_date: '2025-05-11',
                description: 'Hidrômetro instalado e comunicado ao órgão',
                author: 'J. Silva',
              },
            ],
          },
          {
            id: 'c2',
            description: 'Relatório semestral de nível e vazão',
            category: 'reporting',
            first_due: '2025-07-31',
            recurrence: 'P6M',
          },
        ],
        history: [
          {
            id: 'h1',
            date: '2024-11-04',
            type: 'filing',
            description: 'Requerimento protocolado',
          },
          {
            id: 'h2',
            date: '2024-12-15',
            type: 'fee',
            description: 'Taxa de análise',
            done: true,
            due_date: '2025-01-15',
          },
        ],
        attachments: [
          {
            id: 'att-1',
            uri: 'https://files.example.org/pp01/portaria-1234-2025.pdf',
            media_type: 'application/pdf',
            document_type: 'permit_document',
          },
        ],
      },
    ],
  };

  const withPermit = (patch: Record<string, unknown>) => ({
    ...PERMIT_DOC,
    permits: [{ ...PERMIT_DOC.permits[0], ...patch }],
  });

  it('parseWell accepts permits with history and fulfillments', () => {
    const well = parseWell(JSON.stringify(PERMIT_DOC));
    expect(well.permits).toEqual(PERMIT_DOC.permits);
  });

  it('parseWell rejects a permit without authority', () => {
    const { authority: _a, ...noAuthority } = PERMIT_DOC.permits[0];
    expect(() =>
      parseWell(JSON.stringify({ ...PERMIT_DOC, permits: [noAuthority] })),
    ).toThrow();
  });

  it('parseWell accepts a requested permit without identifier', () => {
    const { identifier: _i, ...requested } = PERMIT_DOC.permits[0];
    const doc = {
      ...PERMIT_DOC,
      permits: [{ ...requested, status: 'requested' }],
    };
    expect(() => parseWell(JSON.stringify(doc))).not.toThrow();
  });

  it('parseWell rejects an unknown administrative status', () => {
    const doc = withPermit({ status: 'archived' });
    expect(() => parseWell(JSON.stringify(doc))).toThrow();
  });

  it('parseWell rejects history and fulfillment dates in the wrong form', () => {
    const history = withPermit({
      history: [{ id: 'h', date: '2025-01-01T00:00:00Z', description: 'x' }],
    });
    expect(() => parseWell(JSON.stringify(history))).toThrow();
    const fulfillment = withPermit({
      conditions: [
        {
          id: 'c',
          description: 'x',
          fulfillments: [{ id: 'f', datetime: '2025-01-01' }],
        },
      ],
    });
    expect(() => parseWell(JSON.stringify(fulfillment))).toThrow();
  });

  it('parseWell rejects permit dates that are instants', () => {
    const doc = withPermit({ valid_until: '2029-02-10T00:00:00Z' });
    expect(() => parseWell(JSON.stringify(doc))).toThrow();
  });

  it('parseWell rejects durations with time components', () => {
    const doc = withPermit({
      conditions: [{ id: 'c', description: 'x', due_after: 'PT12H' }],
    });
    expect(() => parseWell(JSON.stringify(doc))).toThrow();
    const empty = withPermit({
      conditions: [{ id: 'c', description: 'x', recurrence: 'P' }],
    });
    expect(() => parseWell(JSON.stringify(empty))).toThrow();
  });

  it('parseWell accepts combined date durations', () => {
    const doc = withPermit({
      conditions: [{ id: 'c', description: 'x', recurrence: 'P1Y6M' }],
    });
    expect(() => parseWell(JSON.stringify(doc))).not.toThrow();
  });

  it('parseWell rejects a monthly_schedule month outside 1–12', () => {
    const doc = withPermit({ monthly_schedule: [{ month: 13 }] });
    expect(() => parseWell(JSON.stringify(doc))).toThrow();
  });

  it('parseWell rejects an unknown volume_limits period', () => {
    const doc = withPermit({
      volume_limits: [{ period: 'weekly', volume: 10 }],
    });
    expect(() => parseWell(JSON.stringify(doc))).toThrow();
  });

  it('round-trips through serializeWell → deserializeWell', () => {
    const well = deserializeWell(JSON.stringify(PERMIT_DOC))!;
    const again = deserializeWell(serializeWell(well))!;
    expect(again.permits).toEqual(PERMIT_DOC.permits);
  });

  it('redactWell removes permits with operation', () => {
    const well = deserializeWell(JSON.stringify(PERMIT_DOC))!;
    const result = redactWell(well, {
      general: true,
      constructive: true,
      geology: true,
      hydrodynamic: true,
      history: true,
      operation: false,
      water_quality: true,
    });
    expect(result.permits).toBeUndefined();
  });
});

describe('v2.3 — meters, production, operating_regime and log fields', () => {
  const OPS_DOC = {
    version: 2,
    well_type: 'tubular',
    well_purpose: ['production'],
    bore_hole: [{ from: 0, to: 80, diameter: 250 }],
    well_case: [],
    reduction: [],
    well_screen: [],
    surface_case: [],
    hole_fill: [],
    lithology: [],
    fractures: [],
    caves: [],
    meters: [
      {
        id: 'hm-01',
        installed_at: '2025-04-02T09:00:00-03:00',
        removed_at: '2026-03-05T11:00:00-03:00',
        installed_by: 'J. Souza',
        removed_by: 'Hidro Serviços',
        type: 'mechanical',
        max_reading: 99999,
      },
      {
        id: 'hm-02',
        installed_at: '2026-03-05T11:30:00-03:00',
        type: 'electromagnetic',
        manufacturer: 'Saga',
        model: 'MAG-50',
        nominal_diameter: 50,
        attachments: [
          {
            id: 'hm-02-photo',
            uri: 'https://example.org/hm-02.jpg',
            media_type: 'image/jpeg',
            document_type: 'photo',
          },
        ],
      },
    ],
    production: [
      {
        id: 'p1',
        type: 'meter_reading',
        datetime: '2025-04-02T09:00:00-03:00',
        meter_id: 'hm-01',
        reading: 0,
      },
      {
        id: 'p2',
        type: 'meter_reading',
        datetime: '2026-03-05T11:00:00-03:00',
        meter_id: 'hm-01',
        reading: 81240,
      },
      {
        id: 'p3',
        type: 'meter_reading',
        datetime: '2026-03-05T11:30:00-03:00',
        meter_id: 'hm-02',
        reading: 0,
      },
      {
        id: 'p4',
        type: 'meter_reading',
        datetime: '2026-09-30T08:00:00-03:00',
        meter_id: 'hm-02',
        reading: 52310,
        source: 'telemetry',
      },
      {
        id: 'p5',
        type: 'declared_volume',
        period_start: '2025-01-01T00:00:00-03:00',
        period_end: '2025-04-01T00:00:00-03:00',
        volume: 12000,
        method: 'reported',
      },
      {
        id: 'p6',
        type: 'meter_reading',
        datetime: '2026-09-30T08:00:00-03:00',
        meter_id: 'hm-02',
        reading: 52300,
        corrects: 'p4',
        sequence: 1,
      },
    ],
    operating_regime: [
      {
        id: 'r1',
        effective_from: '2025-04-02T09:00:00-03:00',
        flow_rate: 14,
        daily_operating_time: 18,
        days_per_week: 7,
      },
    ],
    history_logs: [
      {
        id: 'log-1',
        datetime: '2025-04-02T09:00:00-03:00',
        category: 'status_change',
        description: 'Poço entra em operação',
        status: 'active',
      },
      {
        id: 'log-2',
        datetime: '2026-03-05T11:30:00-03:00',
        category: 'maintenance',
        description: 'Troca de hidrômetro',
        maintenance_type: 'meter_calibration',
        meter_id: 'hm-01',
        pump_installation_id: 'pump-02',
        hydrodynamic_event_ids: ['ev-1'],
      },
    ],
  };

  it('parseWell accepts the new blocks and log fields', () => {
    const well = parseWell(JSON.stringify(OPS_DOC));
    expect(well.meters).toEqual(OPS_DOC.meters);
    expect(well.production).toEqual(OPS_DOC.production);
    expect(well.operating_regime).toEqual(OPS_DOC.operating_regime);
    expect(well.history_logs).toEqual(OPS_DOC.history_logs);
  });

  it('parseWell rejects a meter installed_at without offset', () => {
    const doc = {
      ...OPS_DOC,
      meters: [{ id: 'm', installed_at: '2025-04-02T09:00:00' }],
    };
    expect(() => parseWell(JSON.stringify(doc))).toThrow();
  });

  it('parseWell rejects a meter_reading without meter_id', () => {
    const { meter_id: _m, ...noMeter } = OPS_DOC.production[0];
    expect(() =>
      parseWell(JSON.stringify({ ...OPS_DOC, production: [noMeter] })),
    ).toThrow();
  });

  it('parseWell rejects a declared_volume without period_end', () => {
    const { period_end: _p, ...noEnd } = OPS_DOC.production[4];
    expect(() =>
      parseWell(JSON.stringify({ ...OPS_DOC, production: [noEnd] })),
    ).toThrow();
  });

  it('parseWell keeps unknown production entry types', () => {
    const custom = { id: 'x1', type: 'x-pulse', pulses: 120 };
    const well = parseWell(
      JSON.stringify({ ...OPS_DOC, production: [custom] }),
    );
    expect(well.production).toEqual([custom]);
  });

  it('parseWell rejects a status outside the closed vocabulary', () => {
    const doc = {
      ...OPS_DOC,
      history_logs: [{ ...OPS_DOC.history_logs[0], status: 'x-paused' }],
    };
    expect(() => parseWell(JSON.stringify(doc))).toThrow();
  });

  it('parseWell rejects regime values out of range', () => {
    const base = OPS_DOC.operating_regime[0];
    expect(() =>
      parseWell(
        JSON.stringify({
          ...OPS_DOC,
          operating_regime: [{ ...base, days_per_week: 8 }],
        }),
      ),
    ).toThrow();
    expect(() =>
      parseWell(
        JSON.stringify({
          ...OPS_DOC,
          operating_regime: [{ ...base, daily_operating_time: 25 }],
        }),
      ),
    ).toThrow();
  });

  it('round-trips through serializeWell → deserializeWell', () => {
    const well = deserializeWell(JSON.stringify(OPS_DOC))!;
    const again = deserializeWell(serializeWell(well))!;
    expect(again.meters).toEqual(OPS_DOC.meters);
    expect(again.production).toEqual(OPS_DOC.production);
    expect(again.operating_regime).toEqual(OPS_DOC.operating_regime);
    expect(again.history_logs).toEqual(OPS_DOC.history_logs);
  });

  it('redactWell removes the operational blocks with operation', () => {
    const well = deserializeWell(JSON.stringify(OPS_DOC))!;
    const result = redactWell(well, {
      general: true,
      constructive: true,
      geology: true,
      hydrodynamic: true,
      history: true,
      operation: false,
      water_quality: true,
    });
    expect(result.meters).toBeUndefined();
    expect(result.production).toBeUndefined();
    expect(result.operating_regime).toBeUndefined();
    expect(result.history_logs).toEqual(well.history_logs);
  });
});

describe('v2.3 — water_samples', () => {
  const SAMPLE_A = {
    id: 'ws-2026-09-a',
    datetime: '2026-09-15T09:30:00-03:00',
    sample_type: 'routine',
    campaign: '2026-Q3',
    sampling_method: 'low_flow',
    sampling_point: { type: 'in_well', depth: 42.5, device: 'low_flow_pump' },
    purge: {
      duration: 35,
      volume: 0.0105,
      flow_rate: 0.018,
      stabilized: true,
      readings: [
        {
          elapsed: 25,
          parameter: { code: 'ph', vocabulary: 'welldot' },
          value: 4.9,
        },
        {
          elapsed: 30,
          parameter: { code: 'ph', vocabulary: 'welldot' },
          value: 4.8,
        },
        {
          elapsed: 35,
          parameter: { code: 'ph', vocabulary: 'welldot' },
          value: 4.8,
        },
      ],
    },
    static_level_event_id: 'evt-2026-09-15',
    collected_by: 'Field team A',
    chain_of_custody: 'CC-0918',
    laboratory: {
      name: 'Lab X',
      accreditation: 'ISO/IEC 17025 #1234',
      report_number: 'LD-4471/26',
      batch_id: 'WO-88213',
      sample_id: '88213-01',
      received_at: '2026-09-15T18:20:00-03:00',
      received_temperature: 4.1,
    },
    attachments: [
      {
        id: 'a1',
        uri: 'https://files.example.org/pm01/LD-4471-26.pdf',
        media_type: 'application/pdf',
        document_type: 'lab_report',
      },
    ],
    results: [
      {
        parameter: { code: 'ph', vocabulary: 'welldot' },
        value: 4.8,
        measured_in: 'field',
      },
      {
        parameter: { code: 'specific_conductance', vocabulary: 'welldot' },
        value: 1240,
        measured_in: 'field',
      },
      {
        parameter: { code: 'turbidity_fnu', vocabulary: 'welldot' },
        value: 3.1,
        measured_in: 'field',
      },
      {
        parameter: { code: 'sulfate', vocabulary: 'welldot' },
        value: 412,
        method: 'US EPA 300.0',
        measured_in: 'lab',
        analyzed_at: '2026-09-17T00:00:00-03:00',
        analyzed_at_resolution: 'day',
        validation: { status: 'validated', validated_by: 'QA reviewer' },
      },
      {
        parameter: { code: 'iron', vocabulary: 'welldot' },
        value: 18.6,
        fraction: 'dissolved',
        filtration: { pore_size: 0.45, location: 'field' },
        method: 'US EPA 200.8',
        measured_in: 'lab',
      },
      {
        parameter: { code: 'cyanide_wad_as_cn', vocabulary: 'welldot' },
        qualifier: 'estimated',
        value: 0.004,
        detection_limit: 0.002,
        quantification_limit: 0.005,
        measured_in: 'lab',
        lab_flags: ['J'],
        validation: { status: 'qualified', qualifier: 'J' },
      },
      {
        parameter: { code: '71-43-2', vocabulary: 'cas' },
        qualifier: '<',
        value: 0.001,
        measured_in: 'lab',
      },
      {
        parameter: { code: 'e_coli', vocabulary: 'welldot' },
        presence: false,
        measured_in: 'lab',
        analyzed_at: '2026-09-15T19:10:00-03:00',
      },
    ],
  };

  const SAMPLE_B = {
    id: 'ws-2026-09-b',
    datetime: '2026-09-15T09:35:00-03:00',
    sample_type: 'field_duplicate',
    parent_sample_id: 'ws-2026-09-a',
    campaign: '2026-Q3',
    sampling_point: { type: 'in_well', depth: 42.5, device: 'low_flow_pump' },
    results: [
      {
        parameter: { code: 'sulfate', vocabulary: 'welldot' },
        value: 398,
        measured_in: 'lab',
      },
    ],
  };

  const WQ_DOC = {
    version: 2,
    well_type: 'tubular',
    well_purpose: ['monitoring'],
    bore_hole: [{ from: 0, to: 60, diameter: 150 }],
    well_case: [],
    reduction: [],
    well_screen: [],
    surface_case: [],
    hole_fill: [],
    lithology: [],
    fractures: [],
    caves: [],
    water_samples: [SAMPLE_A, SAMPLE_B],
    history_logs: [
      {
        id: 'log-1',
        datetime: '2026-09-15T09:30:00-03:00',
        category: 'maintenance',
        description: 'Quarterly sampling',
        maintenance_type: 'water_sampling',
        sample_ids: ['ws-2026-09-a', 'ws-2026-09-b'],
      },
    ],
  };

  const withResult = (result: Record<string, unknown>) =>
    JSON.stringify({
      ...WQ_DOC,
      water_samples: [
        { ...SAMPLE_B, sample_type: 'routine', results: [result] },
      ],
    });

  const withPoint = (sampling_point: Record<string, unknown>) =>
    JSON.stringify({
      ...WQ_DOC,
      water_samples: [{ ...SAMPLE_B, sampling_point }],
    });

  it('parses the spec example', () => {
    const well = parseWell(JSON.stringify(WQ_DOC));
    expect(well.water_samples).toHaveLength(2);
    expect(well.water_samples![0]!.results).toHaveLength(8);
    expect(well.history_logs![0]!.sample_ids).toEqual([
      'ws-2026-09-a',
      'ws-2026-09-b',
    ]);
  });

  it('round-trips through serialize and deserialize', () => {
    const well = deserializeWell(JSON.stringify(WQ_DOC))!;
    expect(well.water_samples).toEqual(WQ_DOC.water_samples);
    const again = deserializeWell(serializeWell(well))!;
    expect(again.water_samples).toEqual(WQ_DOC.water_samples);
  });

  it('accepts not_detected with no value form', () => {
    expect(() =>
      parseWell(
        withResult({
          parameter: { code: 'arsenic', vocabulary: 'welldot' },
          qualifier: 'not_detected',
          detection_limit: 0.001,
        }),
      ),
    ).not.toThrow();
  });

  it('accepts x- parameters with a unit', () => {
    expect(() =>
      parseWell(
        withResult({
          parameter: { code: 'pfas_sum', vocabulary: 'x-lab' },
          value: 12,
          unit: 'ng/L',
        }),
      ),
    ).not.toThrow();
  });

  it('rejects an empty results array', () => {
    expect(() =>
      parseWell(
        JSON.stringify({
          ...WQ_DOC,
          water_samples: [{ ...SAMPLE_B, results: [] }],
        }),
      ),
    ).toThrow();
  });

  it.each([
    ['two value forms', { value: 1, presence: true }],
    ['no value form', {}],
    ['not_detected with a value', { qualifier: 'not_detected', value: 0.001 }],
    ['< without a numeric value', { qualifier: '<', presence: false }],
    ['unit on a welldot code', { value: 1, unit: 'ug/L' }],
    [
      'day resolution with another value',
      {
        value: 1,
        analyzed_at: '2026-09-17T00:00:00-03:00',
        analyzed_at_resolution: 'hour',
      },
    ],
    [
      'unknown validation status',
      { value: 1, validation: { status: 'approved' } },
    ],
  ])('rejects a result with %s', (_label, extra) => {
    expect(() =>
      parseWell(
        withResult({
          parameter: { code: 'sulfate', vocabulary: 'welldot' },
          ...extra,
        }),
      ),
    ).toThrow();
  });

  it('rejects an x- code without unit and an unknown vocabulary', () => {
    expect(() =>
      parseWell(
        withResult({
          parameter: { code: 'foo', vocabulary: 'x-lab' },
          value: 1,
        }),
      ),
    ).toThrow();
    expect(() =>
      parseWell(
        withResult({
          parameter: { code: 'foo', vocabulary: 'pubchem' },
          value: 1,
        }),
      ),
    ).toThrow();
  });

  it('rejects depth together with from/to', () => {
    expect(() =>
      parseWell(withPoint({ type: 'in_well', depth: 40, from: 38, to: 42 })),
    ).toThrow();
    expect(() =>
      parseWell(withPoint({ type: 'in_well', from: 38, to: 42 })),
    ).not.toThrow();
  });

  it('rejects received_at_resolution other than day', () => {
    expect(() =>
      parseWell(
        JSON.stringify({
          ...WQ_DOC,
          water_samples: [
            {
              ...SAMPLE_B,
              laboratory: {
                name: 'Lab',
                received_at: '2026-09-15T00:00:00-03:00',
                received_at_resolution: 'month',
              },
            },
          ],
        }),
      ),
    ).toThrow();
  });

  it('redactWell removes water_samples with water_quality', () => {
    const well = deserializeWell(JSON.stringify(WQ_DOC))!;
    const result = redactWell(well, {
      general: true,
      constructive: true,
      geology: true,
      hydrodynamic: true,
      history: true,
      operation: true,
      water_quality: false,
    });
    expect(result.water_samples).toBeUndefined();
    expect(result.history_logs).toEqual(well.history_logs);
  });
});

// ─── calculatedWellDepth ─────────────────────────────────────────────────────

describe('calculatedWellDepth', () => {
  it('returns the deepest constructive `to`, ignoring geology', () => {
    const well = {
      ...fullWell(),
      lithology: [{ from: 0, to: 999 }],
    } as unknown as Well;
    const constructive = [
      ...well.bore_hole,
      ...well.well_case,
      ...well.well_screen,
      ...well.hole_fill,
      ...well.reduction,
      ...well.surface_case,
    ].map(i => i.to);
    expect(calculatedWellDepth(well)).toBe(Math.max(0, ...constructive));
  });

  it('returns 0 for a well without constructive data', () => {
    expect(
      calculatedWellDepth({
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
      }),
    ).toBe(0);
  });
});
