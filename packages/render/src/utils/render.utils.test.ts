import type {
  BoreHole,
  Cave,
  CementPad,
  Fracture,
  HoleFill,
  Lithology,
  Units,
} from '@welldot/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentsClassNames, SvgSelection } from '~/types/render.types';

// vi.hoisted lets these be referenced inside vi.mock factories (which are hoisted)
const mockTexturePaths = vi.hoisted(() => ({
  d: vi.fn().mockReturnThis(),
  size: vi.fn().mockReturnThis(),
  strokeWidth: vi.fn().mockReturnThis(),
  stroke: vi.fn().mockReturnThis(),
  background: vi.fn().mockReturnThis(),
  url: vi.fn().mockReturnValue('url(#mock-texture)'),
}));

vi.mock('d3', () => ({
  tip: vi.fn(() => ({
    attr: vi.fn().mockReturnThis(),
    direction: vi.fn().mockReturnThis(),
    html: vi.fn().mockReturnThis(),
  })),
}));

vi.mock('d3-tip', () => ({
  default: vi.fn(() => ({
    attr: vi.fn().mockReturnThis(),
    direction: vi.fn().mockReturnThis(),
    html: vi.fn().mockReturnThis(),
  })),
}));

vi.mock('textures', () => ({
  default: { paths: vi.fn(() => mockTexturePaths) },
}));

vi.mock('~/utils/fgdcTextures', () => ({
  importFgdcTextures: vi.fn().mockResolvedValue({ '120': 'M 0,0 L 10,10', '601': 'M 0,0 L 5,5' }),
}));

import {
  getConflictAreas,
  getLithologicalFillList,
  getLithologyFill,
  getYAxisFunctions,
  LithologyTextureOptions,
  makeCavePrng,
  mergeConflicts,
  populateTooltips,
  ptsToSmoothPath,
  wavyContact,
} from './render.utils';

// --- Factories ---

const makeLithology = (overrides: Partial<Lithology> = {}): Lithology => ({
  from: 0,
  to: 10,
  description: 'clay',
  color: '#aabbcc',
  fgdc_texture: '120',
  geologic_unit: '',
  aquifer_unit: '',
  ...overrides,
});

const makeUnits = (): Units => ({ length: 'm', diameter: 'mm' });

const makeClasses = (): ComponentsClassNames => ({
  tooltip: {
    root: 'tip',
    title: 'tip-title',
    primaryInfo: 'tip-primary',
    secondaryInfo: 'tip-secondary',
  },
  yAxis: '',
  wellGroup: '',
  geologicGroup: '',
  lithology: { group: '', rect: '' },
  labels: { lithology: { group: '', depth: '', label: '', divider: '' } },
  fractures: { group: '', item: '', hitArea: '', line: '', polyline: '' },
  caves: { group: '', item: '', fill: '', contact: '' },
  constructionGroup: '',
  constructionLabels: { group: '' },
  cementPad: { group: '', item: '' },
  boreHole: { group: '', rect: '' },
  surfaceCase: { group: '', rect: '' },
  holeFill: { group: '', rect: '' },
  wellCase: { group: '', rect: '' },
  wellScreen: { group: '', rect: '' },
  conflict: { group: '', rect: '' },
  unitLabels: { group: '', geoRect: '', aqRect: '', text: '' },
  legend: {
    border: '',
    title: '',
    item: '',
    label: '',
    fracturePoly: '',
    caveFill: '',
    constructionRect: '',
  },
  highlights: {
    geologicGroup: '',
    constructionGroup: '',
    fracturesGroup: '',
    item: '',
    rect: '',
    label: '',
    labelBg: '',
  },
});

const makeSvg = () => ({ call: vi.fn() }) as unknown as SvgSelection;

const DEFAULT_TEXTURE_OPTS: LithologyTextureOptions = {
  size: 150,
  strokeWidth: 0.8,
  stroke: '#303030',
};

beforeEach(() => {
  vi.clearAllMocks();
  // clearAllMocks resets call history but preserves implementation — restore chaining
  mockTexturePaths.d.mockReturnThis();
  mockTexturePaths.size.mockReturnThis();
  mockTexturePaths.strokeWidth.mockReturnThis();
  mockTexturePaths.stroke.mockReturnThis();
  mockTexturePaths.background.mockReturnThis();
  mockTexturePaths.url.mockReturnValue('url(#mock-texture)');
});

// ---------------------------------------------------------------------------

describe('makeCavePrng', () => {
  it('returns a function', () => {
    expect(typeof makeCavePrng(42)).toBe('function');
  });

  it('all output values are in [0, 1]', () => {
    const rng = makeCavePrng(12345);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('same seed produces identical sequence', () => {
    const rng1 = makeCavePrng(99);
    const rng2 = makeCavePrng(99);
    for (let i = 0; i < 20; i++) {
      expect(rng1()).toBe(rng2());
    }
  });

  it('different seeds produce different first values', () => {
    const v1 = makeCavePrng(1)();
    const v2 = makeCavePrng(2)();
    expect(v1).not.toBe(v2);
  });
});

// ---------------------------------------------------------------------------

describe('wavyContact', () => {
  it('returns exactly `steps` points', () => {
    const pts = wavyContact(0, 100, 50, 5, 20, makeCavePrng(1));
    expect(pts).toHaveLength(20);
  });

  it('first point x equals xLeft', () => {
    const pts = wavyContact(10, 200, 50, 5, 10, makeCavePrng(1));
    expect(pts[0][0]).toBe(10);
  });

  it('last point x equals xRight', () => {
    const pts = wavyContact(10, 200, 50, 5, 10, makeCavePrng(1));
    expect(pts[pts.length - 1][0]).toBe(200);
  });

  it('all y-values stay within baseY ± amp (damping ensures this)', () => {
    const baseY = 50;
    const amp = 8;
    const pts = wavyContact(0, 100, baseY, amp, 50, makeCavePrng(99));
    pts.forEach(([, y]) => {
      expect(y).toBeGreaterThanOrEqual(baseY - amp);
      expect(y).toBeLessThanOrEqual(baseY + amp);
    });
  });

  it('x-values are strictly increasing', () => {
    const pts = wavyContact(0, 100, 50, 5, 15, makeCavePrng(1));
    for (let i = 1; i < pts.length; i++) {
      expect(pts[i][0]).toBeGreaterThan(pts[i - 1][0]);
    }
  });

  it('steps=2 produces two endpoints at xLeft and xRight', () => {
    const pts = wavyContact(5, 95, 50, 5, 2, makeCavePrng(1));
    expect(pts).toHaveLength(2);
    expect(pts[0][0]).toBe(5);
    expect(pts[1][0]).toBe(95);
  });
});

// ---------------------------------------------------------------------------

describe('ptsToSmoothPath', () => {
  it('returns empty string for empty array', () => {
    expect(ptsToSmoothPath([])).toBe('');
  });

  it('returns empty string for single point', () => {
    expect(ptsToSmoothPath([[10, 20]])).toBe('');
  });

  it('two points: result starts with M and contains one C command', () => {
    const result = ptsToSmoothPath([
      [0, 0],
      [10, 10],
    ]);
    expect(result.startsWith('M ')).toBe(true);
    expect((result.match(/ C /g) || []).length).toBe(1);
  });

  it('correctly encodes first-point coordinates after M', () => {
    const pts: [number, number][] = [
      [3.5, 7.2],
      [20, 30],
    ];
    expect(ptsToSmoothPath(pts)).toContain('M 3.5,7.2');
  });

  it('N points produce N-1 cubic Bézier segments', () => {
    const pts: [number, number][] = [
      [0, 0],
      [10, 5],
      [20, 0],
      [30, 5],
      [40, 0],
    ];
    const result = ptsToSmoothPath(pts);
    expect((result.match(/ C /g) || []).length).toBe(pts.length - 1);
  });
});

// ---------------------------------------------------------------------------

describe('getYAxisFunctions', () => {
  const yScale = (d: number) => d * 10;

  describe('without clamp', () => {
    it('getHeight returns full scaled range', () => {
      const { getHeight } = getYAxisFunctions(yScale);
      expect(getHeight({ from: 0, to: 10 })).toBe(100);
    });

    it('getHeight for a sub-range', () => {
      const { getHeight } = getYAxisFunctions(yScale);
      expect(getHeight({ from: 3, to: 7 })).toBe(40);
    });

    it('getYPos returns scaled start depth', () => {
      const { getYPos } = getYAxisFunctions(yScale);
      expect(getYPos({ from: 5 })).toBe(50);
    });
  });

  describe('with clamp { from: 2, to: 8 }', () => {
    const { getHeight, getYPos } = getYAxisFunctions(yScale, {
      from: 2,
      to: 8,
    });

    it('range spanning clamp edges is trimmed to clamp width', () => {
      expect(getHeight({ from: 0, to: 10 })).toBe(60); // (8-2) * 10
    });

    it('range fully beyond clampTo returns 0', () => {
      expect(getHeight({ from: 9, to: 10 })).toBe(0);
    });

    it('range starting below clampFrom is trimmed at bottom', () => {
      expect(getHeight({ from: 0, to: 3 })).toBe(10); // (3-2) * 10
    });

    it('getYPos for depth below clampFrom returns clamped position', () => {
      expect(getYPos({ from: 0 })).toBe(20); // clamped to 2 → 2 * 10
    });

    it('getYPos for depth within range is unchanged', () => {
      expect(getYPos({ from: 5 })).toBe(50);
    });
  });
});

// ---------------------------------------------------------------------------

describe('getConflictAreas', () => {
  it('both arrays empty → empty result', () => {
    expect(getConflictAreas([], [])).toEqual([]);
  });

  it('no overlap → empty result', () => {
    const a = [{ from: 0, to: 5, diameter: 10 }];
    const b = [{ from: 6, to: 10, diameter: 8 }];
    expect(getConflictAreas(a, b)).toEqual([]);
  });

  it('partial overlap: item2 starts inside item1', () => {
    const a = [{ from: 0, to: 10, diameter: 10 }];
    const b = [{ from: 5, to: 15, diameter: 8 }];
    const result = getConflictAreas(a, b);
    expect(result).toHaveLength(1);
    expect(result[0].from).toBe(5);
    expect(result[0].to).toBe(10);
    expect(result[0].diameter).toBe(10); // max(10, 8)
  });

  it('item2 fully inside item1 → item2 range with max diameter', () => {
    const a = [{ from: 0, to: 20, diameter: 10 }];
    const b = [{ from: 5, to: 15, diameter: 12 }];
    const result = getConflictAreas(a, b);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ from: 5, to: 15, diameter: 12 });
  });

  it('item2 spans across item1 → item1 range is returned', () => {
    const a = [{ from: 5, to: 10, diameter: 10 }];
    const b = [{ from: 0, to: 20, diameter: 8 }];
    const result = getConflictAreas(a, b);
    expect(result).toHaveLength(1);
    expect(result[0].from).toBe(5);
    expect(result[0].to).toBe(10);
  });

  it('multiple overlapping pairs produce multiple entries', () => {
    const a = [
      { from: 0, to: 10, diameter: 10 },
      { from: 20, to: 30, diameter: 6 },
    ];
    const b = [{ from: 5, to: 25, diameter: 8 }];
    expect(getConflictAreas(a, b)).toHaveLength(2);
  });

  it('item2 touching item1 only at start boundary is not a conflict', () => {
    const a = [{ from: 5, to: 10, diameter: 10 }];
    const b = [{ from: 0, to: 5, diameter: 8 }];
    expect(getConflictAreas(a, b)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------

describe('mergeConflicts', () => {
  it('empty input → empty result', () => {
    expect(mergeConflicts([], 0)).toEqual([]);
  });

  it('single conflict → returned unchanged', () => {
    expect(mergeConflicts([{ from: 0, to: 10, diameter: 5 }], 0)).toEqual([
      { from: 0, to: 10, diameter: 5 },
    ]);
  });

  it('two overlapping conflicts → merged into one', () => {
    const c = [
      { from: 0, to: 10, diameter: 5 },
      { from: 8, to: 15, diameter: 5 },
    ];
    const result = mergeConflicts(c, 0);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ from: 0, to: 15 });
  });

  it('two non-adjacent conflicts (gap > buffer) → two separate entries', () => {
    const c = [
      { from: 0, to: 5, diameter: 5 },
      { from: 10, to: 15, diameter: 5 },
    ];
    expect(mergeConflicts(c, 0)).toHaveLength(2);
  });

  it('three chained conflicts are fully merged into one (regression for stale conflict.to bug)', () => {
    const c = [
      { from: 0, to: 5, diameter: 5 },
      { from: 3, to: 8, diameter: 5 },
      { from: 6, to: 10, diameter: 5 },
    ];
    const result = mergeConflicts(c, 0);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ from: 0, to: 10 });
  });

  it('buffer=2: conflicts with gap ≤ 2 are merged', () => {
    const c = [
      { from: 0, to: 5, diameter: 5 },
      { from: 7, to: 10, diameter: 5 }, // gap = 2, exactly at buffer
    ];
    expect(mergeConflicts(c, 2)).toHaveLength(1);
  });

  it('buffer=2: conflicts with gap > 2 stay separate', () => {
    const c = [
      { from: 0, to: 5, diameter: 5 },
      { from: 8, to: 12, diameter: 5 }, // gap = 3, beyond buffer
    ];
    expect(mergeConflicts(c, 2)).toHaveLength(2);
  });

  it('duplicate {from, to} pairs → deduplicated into one entry', () => {
    const c = [
      { from: 5, to: 10, diameter: 5 },
      { from: 5, to: 10, diameter: 5 },
    ];
    expect(mergeConflicts(c, 0)).toHaveLength(1);
  });

  it('unsorted input is sorted then merged correctly', () => {
    const c = [
      { from: 8, to: 12, diameter: 5 },
      { from: 0, to: 5, diameter: 5 },
      { from: 3, to: 9, diameter: 5 },
    ];
    const result = mergeConflicts(c, 0);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ from: 0, to: 12 });
  });
});

// ---------------------------------------------------------------------------

describe('getLithologicalFillList', () => {
  it('empty array → empty object', async () => {
    expect(
      Object.keys(await getLithologicalFillList([], DEFAULT_TEXTURE_OPTS)),
    ).toHaveLength(0);
  });

  it('single lithology creates entry keyed by "texture.from"', async () => {
    const result = await getLithologicalFillList(
      [makeLithology({ fgdc_texture: '120', from: 5 })],
      DEFAULT_TEXTURE_OPTS,
    );
    expect(result).toHaveProperty('120.5');
  });

  it('two lithologies with same texture but different from → two entries (no key collision)', async () => {
    const lits = [
      makeLithology({ fgdc_texture: '120', from: 0 }),
      makeLithology({ fgdc_texture: '120', from: 10 }),
    ];
    const result = await getLithologicalFillList(lits, DEFAULT_TEXTURE_OPTS);
    expect(Object.keys(result)).toHaveLength(2);
    expect(result).toHaveProperty('120.0');
    expect(result).toHaveProperty('120.10');
  });

  it('two lithologies with different texture codes → two entries', async () => {
    const lits = [
      makeLithology({ fgdc_texture: '120', from: 0 }),
      makeLithology({ fgdc_texture: '601', from: 10 }),
    ];
    expect(
      Object.keys(await getLithologicalFillList(lits, DEFAULT_TEXTURE_OPTS)),
    ).toHaveLength(2);
  });

  it('texture code absent from fgdcTextures → entry created without throwing', async () => {
    const lit = makeLithology({ fgdc_texture: '999', from: 0 });
    await expect(
      getLithologicalFillList([lit], DEFAULT_TEXTURE_OPTS),
    ).resolves.not.toThrow();
    expect(
      await getLithologicalFillList([lit], DEFAULT_TEXTURE_OPTS),
    ).toHaveProperty('999.0');
  });

  it('forwards size to textures.paths().size()', async () => {
    await getLithologicalFillList(
      [makeLithology({ fgdc_texture: '120', from: 0 })],
      { size: 42, strokeWidth: 1, stroke: '#ff0000' },
    );
    expect(mockTexturePaths.size).toHaveBeenCalledWith(42);
  });

  it('forwards strokeWidth to textures.paths().strokeWidth()', async () => {
    await getLithologicalFillList(
      [makeLithology({ fgdc_texture: '120', from: 0 })],
      { size: 150, strokeWidth: 2.5, stroke: '#ff0000' },
    );
    expect(mockTexturePaths.strokeWidth).toHaveBeenCalledWith(2.5);
  });

  it('forwards stroke to textures.paths().stroke()', async () => {
    await getLithologicalFillList(
      [makeLithology({ fgdc_texture: '120', from: 0 })],
      { size: 150, strokeWidth: 1, stroke: '#aabbcc' },
    );
    expect(mockTexturePaths.stroke).toHaveBeenCalledWith('#aabbcc');
  });
});

// ---------------------------------------------------------------------------

describe('getLithologyFill', () => {
  it('returns a function', async () => {
    const fill = await getLithologyFill([makeLithology()], makeSvg(), DEFAULT_TEXTURE_OPTS);
    expect(typeof fill).toBe('function');
  });

  it('calling the returned function returns the texture url string', async () => {
    const lit = makeLithology({ fgdc_texture: '120', from: 0 });
    const fill = await getLithologyFill([lit], makeSvg(), DEFAULT_TEXTURE_OPTS);
    expect(fill(lit)).toBe('url(#mock-texture)');
  });

  it('svg.call is invoked once per fill call', async () => {
    const svg = makeSvg();
    const lit = makeLithology({ fgdc_texture: '120', from: 0 });
    const fill = await getLithologyFill([lit], svg, DEFAULT_TEXTURE_OPTS);
    fill(lit);
    expect(svg.call).toHaveBeenCalledTimes(1);
  });

  it('svg.call is invoked with the texture object', async () => {
    const svg = makeSvg();
    const lit = makeLithology({ fgdc_texture: '120', from: 0 });
    const fill = await getLithologyFill([lit], svg, DEFAULT_TEXTURE_OPTS);
    fill(lit);
    expect(svg.call).toHaveBeenCalledWith(mockTexturePaths);
  });

  it('forwards texture opts through to getLithologicalFillList', async () => {
    const lit = makeLithology({ fgdc_texture: '120', from: 0 });
    const fill = await getLithologyFill(
      [lit],
      makeSvg(),
      { size: 99, strokeWidth: 3, stroke: '#112233' },
    );
    fill(lit);
    expect(mockTexturePaths.size).toHaveBeenCalledWith(99);
    expect(mockTexturePaths.strokeWidth).toHaveBeenCalledWith(3);
    expect(mockTexturePaths.stroke).toHaveBeenCalledWith('#112233');
  });
});

// ---------------------------------------------------------------------------

describe('populateTooltips', () => {
  const ALL_KEYS = [
    'geology',
    'hole',
    'surfaceCase',
    'holeFill',
    'wellCase',
    'wellScreen',
    'conflict',
    'fracture',
    'cementPad',
    'cave',
  ];

  it('tooltipConfig=undefined → all 10 keys present as real tips (no show/hide)', () => {
    const tooltips = populateTooltips(makeSvg(), makeClasses(), makeUnits());
    ALL_KEYS.forEach(k => {
      expect(tooltips[k]).toBeDefined();
      expect('show' in tooltips[k]).toBe(false);
    });
  });

  it('tooltipConfig=false → all 10 are noop objects with show/hide', () => {
    const tooltips = populateTooltips(
      makeSvg(),
      makeClasses(),
      makeUnits(),
      false,
    );
    ALL_KEYS.forEach(k => {
      expect(typeof tooltips[k].show).toBe('function');
      expect(typeof tooltips[k].hide).toBe('function');
    });
  });

  it('tooltipConfig array → only listed keys are real tips; rest are noop', () => {
    const tooltips = populateTooltips(makeSvg(), makeClasses(), makeUnits(), [
      'geology',
      'hole',
    ]);
    expect('show' in tooltips.geology).toBe(false);
    expect('show' in tooltips.hole).toBe(false);
    expect(typeof tooltips.fracture.show).toBe('function');
    expect(typeof tooltips.cave.show).toBe('function');
  });

  it('svg.call is invoked once per enabled tip', () => {
    const svg = makeSvg();
    populateTooltips(svg, makeClasses(), makeUnits(), ['geology', 'hole']);
    expect(svg.call).toHaveBeenCalledTimes(2);
  });

  it('svg.call is not invoked when tooltipConfig=false', () => {
    const svg = makeSvg();
    populateTooltips(svg, makeClasses(), makeUnits(), false);
    expect(svg.call).not.toHaveBeenCalled();
  });

  describe('HTML content', () => {
    function getHtmlFn(key: string) {
      const tooltips = populateTooltips(makeSvg(), makeClasses(), makeUnits());
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ((tooltips[key] as any).html as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
    }

    it('geology tooltip includes lithology description and depth range', () => {
      const lit = makeLithology({ description: 'sandstone', from: 5, to: 20 });
      const html = getHtmlFn('geology')(null, lit);
      expect(html).toContain('sandstone');
      expect(html).toContain('5');
      expect(html).toContain('20');
    });

    it('geology tooltip includes optional geologic_unit when present', () => {
      const lit = makeLithology({ geologic_unit: 'Botucatu' });
      const html = getHtmlFn('geology')(null, lit);
      expect(html).toContain('Botucatu');
    });

    it('hole tooltip includes diameter', () => {
      const hole: BoreHole = { from: 0, to: 50, diameter: 200 };
      expect(getHtmlFn('hole')(null, hole)).toContain('200');
    });

    it('fracture with swarm=true shows "ENXAME DE FRATURAS"', () => {
      const f: Fracture = {
        depth: 10,
        water_intake: false,
        description: '',
        swarm: true,
        azimuth: 90,
        dip: 45,
      };
      expect(getHtmlFn('fracture')(null, f)).toContain('ENXAME DE FRATURAS');
    });

    it('fracture with swarm=false shows "FRATURA" and not the swarm label', () => {
      const f: Fracture = {
        depth: 10,
        water_intake: false,
        description: '',
        swarm: false,
        azimuth: 90,
        dip: 45,
      };
      const html = getHtmlFn('fracture')(null, f);
      expect(html).toContain('FRATURA');
      expect(html).not.toContain('ENXAME');
    });

    it('cementPad tooltip includes thickness, width, and length', () => {
      const pad: CementPad = {
        type: 'concrete',
        thickness: 0.2,
        width: 1.0,
        length: 1.5,
      };
      const html = getHtmlFn('cementPad')(null, pad);
      expect(html).toContain('0.2');
      expect(html).toContain('1.5');
    });

    it('cave tooltip includes from and to depths', () => {
      const cave: Cave = {
        from: 15,
        to: 20,
        water_intake: false,
        description: '',
      };
      const html = getHtmlFn('cave')(null, cave);
      expect(html).toContain('15');
      expect(html).toContain('20');
    });

    it('holeFill tooltip includes description', () => {
      const hf: HoleFill = {
        from: 0,
        to: 10,
        type: 'gravel_pack',
        diameter: 150,
        description: 'coarse gravel',
      };
      expect(getHtmlFn('holeFill')(null, hf)).toContain('coarse gravel');
    });

    it('conflict tooltip includes depth range', () => {
      const c = { from: 5, to: 10 };
      const html = getHtmlFn('conflict')(null, c);
      expect(html).toContain('5');
      expect(html).toContain('10');
    });
  });
});
