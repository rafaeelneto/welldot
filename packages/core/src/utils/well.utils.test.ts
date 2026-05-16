import { describe, expect, it } from 'vitest';

import {
  checkIfProfileIsEmpty,
  convertProfileFromJSON,
  deserializeWell,
  isWellEmpty,
  profileToWell,
  serializeWell,
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
