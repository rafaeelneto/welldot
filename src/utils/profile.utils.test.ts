import { describe, it, expect } from 'vitest';
import { convertProfileFromJSON, profileToWell } from './profile.utils';
import type { Profile } from '@/src/types/profile.types';

const INCHES_TO_MM = 25.4;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toJSON(obj: unknown) {
  return JSON.stringify(obj);
}

const minimalLegacyProfile = {
  geologic: [
    {
      from: 0,
      to: 10,
      fgdc_texture: 612,
      color: '#ff0000',
      description: 'Sand',
      geologic_unit: '',
    },
  ],
  constructive: {
    bore_hole: [{ from: 0, to: 10, diam_pol: 10 }],
    well_case: [],
    well_screen: [],
    surface_case: [],
    hole_fill: [],
    reduction: [],
  },
};

const minimalNewProfile = {
  lithology: [
    {
      from: 0,
      to: 10,
      fgdc_texture: '612',
      color: '#ff0000',
      description: 'Sand',
      geologic_unit: '',
      aquifer_unit: 'Q1',
    },
  ],
  bore_hole: [{ from: 0, to: 10, diameter: 254 }],
  well_case: [],
  well_screen: [],
  surface_case: [],
  hole_fill: [],
  reduction: [],
};

// ---------------------------------------------------------------------------
// Empty / invalid input
// ---------------------------------------------------------------------------

describe('convertProfileFromJSON — invalid input', () => {
  it('throws on malformed JSON', () => {
    expect(() => convertProfileFromJSON('not-json')).toThrow(
      'Invalid profile format',
    );
  });

  it('throws on truncated JSON', () => {
    expect(() => convertProfileFromJSON('{')).toThrow('Invalid profile format');
  });

  it('returns null for null-like JSON', () => {
    expect(convertProfileFromJSON('null')).toBeNull();
  });

  it('returns null when all arrays are empty (new format)', () => {
    const empty = {
      lithology: [],
      fractures: [],
      caves: [],
      bore_hole: [],
      hole_fill: [],
      well_case: [],
      well_screen: [],
    };
    expect(convertProfileFromJSON(toJSON(empty))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Legacy format (v1) — geologic + constructive with diam_pol
// ---------------------------------------------------------------------------

describe('convertProfileFromJSON — legacy format (v1)', () => {
  it('converts geologic[] to lithology[]', () => {
    const result = convertProfileFromJSON(toJSON(minimalLegacyProfile));
    expect(result?.lithology).toHaveLength(1);
    expect(result?.lithology[0].description).toBe('Sand');
  });

  it('adds default aquifer_unit to legacy lithology items', () => {
    const result = convertProfileFromJSON(toJSON(minimalLegacyProfile));
    expect(result?.lithology[0].aquifer_unit).toBe('');
  });

  it('converts bore_hole diam_pol to diameter in mm', () => {
    const result = convertProfileFromJSON(toJSON(minimalLegacyProfile));
    expect(result?.bore_hole[0].diameter).toBeCloseTo(10 * INCHES_TO_MM);
  });

  it('converts well_case diam_pol to mm', () => {
    const profile = {
      ...minimalLegacyProfile,
      constructive: {
        ...minimalLegacyProfile.constructive,
        well_case: [{ from: 0, to: 10, diam_pol: 8, type: 'Steel' }],
      },
    };
    const result = convertProfileFromJSON(toJSON(profile));
    expect(result?.well_case[0].diameter).toBeCloseTo(8 * INCHES_TO_MM);
  });

  it('converts well_screen diam_pol to mm', () => {
    const profile = {
      ...minimalLegacyProfile,
      constructive: {
        ...minimalLegacyProfile.constructive,
        well_screen: [
          { from: 100, to: 120, diam_pol: 6, type: 'Stainless', screen_slot_mm: 0.75 },
        ],
      },
    };
    const result = convertProfileFromJSON(toJSON(profile));
    expect(result?.well_screen[0].diameter).toBeCloseTo(6 * INCHES_TO_MM);
  });

  it('converts surface_case diam_pol to mm', () => {
    const profile = {
      ...minimalLegacyProfile,
      constructive: {
        ...minimalLegacyProfile.constructive,
        surface_case: [{ from: 0, to: 5, diam_pol: 20 }],
      },
    };
    const result = convertProfileFromJSON(toJSON(profile));
    expect(result?.surface_case[0].diameter).toBeCloseTo(20 * INCHES_TO_MM);
  });

  it('converts hole_fill diam_pol to mm', () => {
    const profile = {
      ...minimalLegacyProfile,
      constructive: {
        ...minimalLegacyProfile.constructive,
        hole_fill: [
          { from: 0, to: 10, diam_pol: 10, type: 'seal', description: 'Cement' },
        ],
      },
    };
    const result = convertProfileFromJSON(toJSON(profile));
    expect(result?.hole_fill[0].diameter).toBeCloseTo(10 * INCHES_TO_MM);
  });

  it('flattens constructive fields to top level', () => {
    const result = convertProfileFromJSON(toJSON(minimalLegacyProfile));
    expect(result).not.toHaveProperty('constructive');
    expect(result).toHaveProperty('bore_hole');
  });

  it('strips geologic, constructive, info, units from result', () => {
    const profile = {
      ...minimalLegacyProfile,
      info: { headingInfo: [], endInfo: [] },
      units: { diam_unit: 'imperial', depth_unit: 'metric' },
    };
    const result = convertProfileFromJSON(toJSON(profile));
    expect(result).not.toHaveProperty('constructive');
    expect(result).not.toHaveProperty('geologic');
    expect(result).not.toHaveProperty('info');
    expect(result).not.toHaveProperty('units');
  });

  it('handles the "bole_hole" typo as bore_hole', () => {
    const profile = {
      geologic: minimalLegacyProfile.geologic,
      constructive: {
        bole_hole: [{ from: 0, to: 15, diam_pol: 12 }],
        well_case: [],
        well_screen: [],
        surface_case: [],
        hole_fill: [],
        reduction: [],
      },
    };
    const result = convertProfileFromJSON(toJSON(profile));
    expect(result?.bore_hole).toHaveLength(1);
    expect(result?.bore_hole[0].diameter).toBeCloseTo(12 * INCHES_TO_MM);
  });

  it('preserves cement_pad from constructive', () => {
    const profile = {
      ...minimalLegacyProfile,
      constructive: {
        ...minimalLegacyProfile.constructive,
        cement_pad: { type: 'Concrete', width: 2, thickness: 0.25, length: 2 },
      },
    };
    const result = convertProfileFromJSON(toJSON(profile));
    expect(result?.cement_pad.type).toBe('Concrete');
  });

  it('preserves reduction array as-is', () => {
    const profile = {
      ...minimalLegacyProfile,
      constructive: {
        ...minimalLegacyProfile.constructive,
        reduction: [{ from: 0, to: 5, diam_from: 300, diam_to: 200, type: '' }],
      },
    };
    const result = convertProfileFromJSON(toJSON(profile));
    expect(result?.reduction[0].diam_from).toBe(300);
  });

  it('defaults fractures and caves to empty arrays when absent', () => {
    const result = convertProfileFromJSON(toJSON(minimalLegacyProfile));
    expect(result?.fractures).toEqual([]);
    expect(result?.caves).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Legacy format — geologic-only (no constructive)
// ---------------------------------------------------------------------------

describe('convertProfileFromJSON — legacy geologic-only profile', () => {
  it('converts geologic-only profile without throwing', () => {
    const profile = { geologic: minimalLegacyProfile.geologic };
    const result = convertProfileFromJSON(toJSON(profile));
    expect(result?.lithology).toHaveLength(1);
    expect(result?.bore_hole).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// New format — already normalised (passthrough)
// ---------------------------------------------------------------------------

describe('convertProfileFromJSON — new format (passthrough)', () => {
  it('accepts a new-format profile without mutating data', () => {
    const result = convertProfileFromJSON(toJSON(minimalNewProfile));
    expect(result?.lithology[0].aquifer_unit).toBe('Q1');
    expect(result?.bore_hole[0].diameter).toBe(254);
  });

  it('does not add diam_pol to new-format items', () => {
    const result = convertProfileFromJSON(toJSON(minimalNewProfile));
    expect(result?.bore_hole[0]).not.toHaveProperty('diam_pol');
  });

  it('preserves existing aquifer_unit — does not overwrite with empty string', () => {
    const result = convertProfileFromJSON(toJSON(minimalNewProfile));
    expect(result?.lithology[0].aquifer_unit).toBe('Q1');
  });

  it('fills missing fields with empty-profile defaults', () => {
    const partial = {
      lithology: minimalNewProfile.lithology,
      bore_hole: [{ from: 0, to: 10, diameter: 254 }],
    };
    const result = convertProfileFromJSON(toJSON(partial));
    expect(result?.well_case).toEqual([]);
    expect(result?.fractures).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Top-level metadata fields
// ---------------------------------------------------------------------------

describe('convertProfileFromJSON — metadata fields', () => {
  it('preserves name from legacy profile', () => {
    const profile = { ...minimalLegacyProfile, name: 'Well-01' };
    expect(convertProfileFromJSON(toJSON(profile))?.name).toBe('Well-01');
  });

  it('preserves name from new-format profile', () => {
    const profile = { ...minimalNewProfile, name: 'Well-02' };
    expect(convertProfileFromJSON(toJSON(profile))?.name).toBe('Well-02');
  });

  it('preserves lat, lng, elevation', () => {
    const profile = { ...minimalNewProfile, lat: -23.5, lng: -46.6, elevation: 850 };
    const result = convertProfileFromJSON(toJSON(profile));
    expect(result?.lat).toBe(-23.5);
    expect(result?.lng).toBe(-46.6);
    expect(result?.elevation).toBe(850);
  });

  it('preserves well_driller, construction_date, obs', () => {
    const profile = {
      ...minimalNewProfile,
      well_driller: 'Driller Corp',
      construction_date: '2021-03-17',
      obs: 'Notes here',
    };
    const result = convertProfileFromJSON(toJSON(profile));
    expect(result?.well_driller).toBe('Driller Corp');
    expect(result?.construction_date).toBe('2021-03-17');
    expect(result?.obs).toBe('Notes here');
  });
});

// ---------------------------------------------------------------------------
// Full legacy profile (mirrors PROFILE_EXAMPLE from src_old)
// ---------------------------------------------------------------------------

describe('convertProfileFromJSON — full legacy profile (PROFILE_EXAMPLE)', () => {
  const fullLegacy = {
    name: 'P4 - CDP',
    geologic: [
      { from: 0, to: 6, fgdc_texture: 612, color: '#f6ebc9', description: 'Argila arenosa', geologic_unit: '' },
      { from: 6, to: 275, fgdc_texture: 682, color: '#c25c1e', description: 'Conglomerado', geologic_unit: '' },
    ],
    constructive: {
      bore_hole: [
        { from: 0, to: 20, diam_pol: 30 },
        { from: 20, to: 96, diam_pol: 20 },
      ],
      well_screen: [
        { from: 206, to: 239, diam_pol: 8, type: 'AISI 304', screen_slot_mm: 0.5 },
      ],
      reduction: [],
      surface_case: [{ from: 0, to: 20, diam_pol: 30 }],
      well_case: [
        { from: -0.5, to: 95.4, diam_pol: 14, type: 'Shedulle-40' },
        { from: 95.4, to: 206, diam_pol: 8, type: 'Shedulle-40' },
      ],
      hole_fill: [
        { from: 0, to: 20, diam_pol: 30, description: 'Cimento', type: 'seal' },
        { from: 96, to: 275, diam_pol: 20, description: 'Pré-filtro', type: 'gravel_pack' },
      ],
      cement_pad: { type: 'Concreto', thickness: 0.25, width: 2.5, length: 2.5 },
    },
    info: { headingInfo: [{ label: 'Nome', value: 'P4' }], endInfo: [] },
    units: { diam_unit: 'imperial', depth_unit: 'metric' },
  };

  it('produces a valid Profile with all sections', () => {
    const result = convertProfileFromJSON(toJSON(fullLegacy));
    expect(result).not.toBeNull();
    expect(result?.lithology).toHaveLength(2);
    expect(result?.bore_hole).toHaveLength(2);
    expect(result?.well_case).toHaveLength(2);
    expect(result?.well_screen).toHaveLength(1);
    expect(result?.surface_case).toHaveLength(1);
    expect(result?.hole_fill).toHaveLength(2);
  });

  it('correctly converts all diam_pol values across every array', () => {
    const result = convertProfileFromJSON(toJSON(fullLegacy))!;
    expect(result.bore_hole[0].diameter).toBeCloseTo(30 * INCHES_TO_MM);
    expect(result.bore_hole[1].diameter).toBeCloseTo(20 * INCHES_TO_MM);
    expect(result.well_case[0].diameter).toBeCloseTo(14 * INCHES_TO_MM);
    expect(result.well_screen[0].diameter).toBeCloseTo(8 * INCHES_TO_MM);
    expect(result.surface_case[0].diameter).toBeCloseTo(30 * INCHES_TO_MM);
    expect(result.hole_fill[0].diameter).toBeCloseTo(30 * INCHES_TO_MM);
  });

  it('no item in any constructive array retains diam_pol', () => {
    const result = convertProfileFromJSON(toJSON(fullLegacy))!;
    const allItems = [
      ...result.bore_hole,
      ...result.well_case,
      ...result.well_screen,
      ...result.surface_case,
      ...result.hole_fill,
    ];
    allItems.forEach(item => {
      expect(item).not.toHaveProperty('diam_pol');
    });
  });

  it('strips info and units from output', () => {
    const result = convertProfileFromJSON(toJSON(fullLegacy));
    expect(result).not.toHaveProperty('info');
    expect(result).not.toHaveProperty('units');
  });

  it('preserves profile name', () => {
    const result = convertProfileFromJSON(toJSON(fullLegacy));
    expect(result?.name).toBe('P4 - CDP');
  });

  it('all lithology items have aquifer_unit defaulted', () => {
    const result = convertProfileFromJSON(toJSON(fullLegacy))!;
    result.lithology.forEach(item => {
      expect(item.aquifer_unit).toBeDefined();
    });
  });
});

// ---------------------------------------------------------------------------
// .well format — profileToWell serialisation
// ---------------------------------------------------------------------------

const fullProfile: Profile = {
  name: 'Poço PP-01',
  well_driller: 'Driller Corp',
  construction_date: '2024-03-15',
  lat: -1.4558,
  lng: -48.5039,
  elevation: 12.5,
  obs: 'Sem anomalias',
  bore_hole: [{ from: 0, to: 80, diameter: 250, drilling_method: 'rotary' }],
  well_case: [{ from: 0, to: 60, type: 'steel', diameter: 200 }],
  reduction: [{ from: 58, to: 60, diam_from: 200, diam_to: 150, type: 'conical' }],
  well_screen: [{ from: 60, to: 80, type: 'pvc', diameter: 150, screen_slot_mm: 0.5 }],
  surface_case: [{ from: 0, to: 3, diameter: 300 }],
  hole_fill: [{ from: 60, to: 80, type: 'gravel_pack', diameter: 250, description: 'Seixo 2-4mm' }],
  cement_pad: { type: 'square', width: 1.0, thickness: 0.15, length: 1.0 },
  lithology: [
    { from: 0, to: 20, description: 'Areia fina', color: '#f5deb3', fgdc_texture: 'sand', geologic_unit: 'Quaternário', aquifer_unit: 'freático' },
    { from: 20, to: 80, description: 'Granito fraturado', color: '#a9a9a9', fgdc_texture: 'granite', geologic_unit: 'Embasamento', aquifer_unit: 'fraturado' },
  ],
  fractures: [
    { depth: 45.2, water_intake: true, description: 'Fratura aberta', swarm: false, azimuth: 120, dip: 35 },
  ],
  caves: [{ from: 50, to: 52, water_intake: false, description: 'Caverna seca' }],
};

describe('profileToWell — serialisation', () => {
  it('produces valid JSON', () => {
    expect(() => JSON.parse(profileToWell(fullProfile))).not.toThrow();
  });

  it('sets version to 1', () => {
    expect(JSON.parse(profileToWell(fullProfile)).v).toBe(1);
  });

  it('maps metadata to compact keys', () => {
    const w = JSON.parse(profileToWell(fullProfile));
    expect(w.n).toBe('Poço PP-01');
    expect(w.dr).toBe('Driller Corp');
    expect(w.cd).toBe('2024-03-15');
    expect(w.lt).toBe(-1.4558);
    expect(w.lg).toBe(-48.5039);
    expect(w.el).toBe(12.5);
    expect(w.ob).toBe('Sem anomalias');
  });

  it('maps bore_hole to bh[] with compact keys', () => {
    const { bh } = JSON.parse(profileToWell(fullProfile));
    expect(bh).toHaveLength(1);
    expect(bh[0]).toEqual({ f: 0, t: 80, d: 250, dm: 'rotary' });
  });

  it('omits dm when drilling_method is absent', () => {
    const p: Profile = { ...fullProfile, bore_hole: [{ from: 0, to: 10, diameter: 200 }] };
    const { bh } = JSON.parse(profileToWell(p));
    expect(bh[0]).not.toHaveProperty('dm');
  });

  it('maps well_case to wc[]', () => {
    const { wc } = JSON.parse(profileToWell(fullProfile));
    expect(wc[0]).toEqual({ f: 0, t: 60, ty: 'steel', d: 200 });
  });

  it('maps reduction to rd[] with df and d2', () => {
    const { rd } = JSON.parse(profileToWell(fullProfile));
    expect(rd[0]).toEqual({ f: 58, t: 60, df: 200, d2: 150, ty: 'conical' });
  });

  it('maps well_screen to ws[] with sl', () => {
    const { ws } = JSON.parse(profileToWell(fullProfile));
    expect(ws[0]).toEqual({ f: 60, t: 80, ty: 'pvc', d: 150, sl: 0.5 });
  });

  it('maps surface_case to sc[]', () => {
    const { sc } = JSON.parse(profileToWell(fullProfile));
    expect(sc[0]).toEqual({ f: 0, t: 3, d: 300 });
  });

  it('maps hole_fill to hf[]', () => {
    const { hf } = JSON.parse(profileToWell(fullProfile));
    expect(hf[0]).toEqual({ f: 60, t: 80, ty: 'gravel_pack', d: 250, ds: 'Seixo 2-4mm' });
  });

  it('maps cement_pad to cp', () => {
    const { cp } = JSON.parse(profileToWell(fullProfile));
    expect(cp).toEqual({ ty: 'square', w: 1.0, th: 0.15, l: 1.0 });
  });

  it('maps lithology to li[]', () => {
    const { li } = JSON.parse(profileToWell(fullProfile));
    expect(li).toHaveLength(2);
    expect(li[0]).toEqual({ f: 0, t: 20, ds: 'Areia fina', cl: '#f5deb3', tx: 'sand', gu: 'Quaternário', au: 'freático' });
  });

  it('maps fractures to fr[]', () => {
    const { fr } = JSON.parse(profileToWell(fullProfile));
    expect(fr[0]).toEqual({ dp: 45.2, wi: true, ds: 'Fratura aberta', sw: false, az: 120, di: 35 });
  });

  it('maps caves to cv[]', () => {
    const { cv } = JSON.parse(profileToWell(fullProfile));
    expect(cv[0]).toEqual({ f: 50, t: 52, wi: false, ds: 'Caverna seca' });
  });

  it('does not include cp when cement_pad is falsy', () => {
    const p = { ...fullProfile, cement_pad: null as any };
    expect(JSON.parse(profileToWell(p))).not.toHaveProperty('cp');
  });
});

// ---------------------------------------------------------------------------
// .well format — convertProfileFromJSON round-trip
// ---------------------------------------------------------------------------

describe('convertProfileFromJSON — .well format', () => {
  it('detects .well format via v field and does not throw', () => {
    expect(() => convertProfileFromJSON(profileToWell(fullProfile))).not.toThrow();
  });

  it('throws on unsupported version', () => {
    expect(() => convertProfileFromJSON(JSON.stringify({ v: 99 }))).toThrow('Unsupported .well format version: 99');
  });

  it('round-trips metadata losslessly', () => {
    const result = convertProfileFromJSON(profileToWell(fullProfile))!;
    expect(result.name).toBe(fullProfile.name);
    expect(result.well_driller).toBe(fullProfile.well_driller);
    expect(result.construction_date).toBe(fullProfile.construction_date);
    expect(result.lat).toBe(fullProfile.lat);
    expect(result.lng).toBe(fullProfile.lng);
    expect(result.elevation).toBe(fullProfile.elevation);
    expect(result.obs).toBe(fullProfile.obs);
  });

  it('round-trips bore_hole losslessly', () => {
    const result = convertProfileFromJSON(profileToWell(fullProfile))!;
    expect(result.bore_hole).toEqual(fullProfile.bore_hole);
  });

  it('round-trips well_case losslessly', () => {
    const result = convertProfileFromJSON(profileToWell(fullProfile))!;
    expect(result.well_case).toEqual(fullProfile.well_case);
  });

  it('round-trips reduction losslessly', () => {
    const result = convertProfileFromJSON(profileToWell(fullProfile))!;
    expect(result.reduction).toEqual(fullProfile.reduction);
  });

  it('round-trips well_screen losslessly', () => {
    const result = convertProfileFromJSON(profileToWell(fullProfile))!;
    expect(result.well_screen).toEqual(fullProfile.well_screen);
  });

  it('round-trips surface_case losslessly', () => {
    const result = convertProfileFromJSON(profileToWell(fullProfile))!;
    expect(result.surface_case).toEqual(fullProfile.surface_case);
  });

  it('round-trips hole_fill losslessly', () => {
    const result = convertProfileFromJSON(profileToWell(fullProfile))!;
    expect(result.hole_fill).toEqual(fullProfile.hole_fill);
  });

  it('round-trips cement_pad losslessly', () => {
    const result = convertProfileFromJSON(profileToWell(fullProfile))!;
    expect(result.cement_pad).toEqual(fullProfile.cement_pad);
  });

  it('round-trips lithology losslessly', () => {
    const result = convertProfileFromJSON(profileToWell(fullProfile))!;
    expect(result.lithology).toEqual(fullProfile.lithology);
  });

  it('round-trips fractures losslessly', () => {
    const result = convertProfileFromJSON(profileToWell(fullProfile))!;
    expect(result.fractures).toEqual(fullProfile.fractures);
  });

  it('round-trips caves losslessly', () => {
    const result = convertProfileFromJSON(profileToWell(fullProfile))!;
    expect(result.caves).toEqual(fullProfile.caves);
  });

  it('defaults empty arrays when sections are absent', () => {
    const minimal = JSON.stringify({ v: 1, n: 'test', li: [{ f: 0, t: 10, ds: 'x', cl: '#fff', tx: 'sand', gu: '', au: '' }] });
    const result = convertProfileFromJSON(minimal)!;
    expect(result.bore_hole).toEqual([]);
    expect(result.fractures).toEqual([]);
    expect(result.caves).toEqual([]);
  });
});
