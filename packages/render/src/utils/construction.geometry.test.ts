import { describe, expect, it } from 'vitest';
import {
  annulusFillPath,
  boreHoleOutlinePath,
  getCementPadGeometry,
  getIntervalEnds,
  getPadDiameters,
  holeFillOutlinePath,
  type OutlineScales,
  pipeSlices,
  pipeWallsPath,
  screenEndPath,
  shoePath,
} from './construction.geometry';

/** 1 m = 1 px; a diameter d spans [-d/2, d/2] around x = 0. */
const scales = (depthFrom = 0, depthTo = 100): OutlineScales => ({
  y: d => d,
  left: d => -d / 2,
  right: d => d / 2,
  depthFrom,
  depthTo,
});

/** Horizontal segments `[y, x1, x2]` of a path made of `M x,y` / `H x` / `V y` / `L x,y`. */
function horizontals(d: string): [number, number, number][] {
  const out: [number, number, number][] = [];
  let x = 0;
  let y = 0;
  for (const [, cmd, args] of d.matchAll(/([MHVLZ])([^MHVLZ]*)/g)) {
    const n = args!.split(/[ ,]+/).filter(Boolean).map(Number);
    if (cmd === 'M' || cmd === 'L') {
      if (cmd === 'L' && n[1] === y && n[0] !== x) out.push([y, x, n[0]!]);
      [x, y] = [n[0]!, n[1]!];
    } else if (cmd === 'H') {
      out.push([y, x, n[0]!]);
      x = n[0]!;
    } else if (cmd === 'V') {
      y = n[0]!;
    }
  }
  return out;
}

describe('getIntervalEnds', () => {
  const casing = { from: 0, to: 18 };
  const screen = { from: 18, to: 30 };
  const string = [casing, screen];

  it('marks a butt joint at each shared depth', () => {
    expect(getIntervalEnds(casing, string, 0, 100)).toMatchObject({
      joinedTop: false,
      joinedBottom: true,
    });
    expect(getIntervalEnds(screen, string, 0, 100)).toMatchObject({
      joinedTop: true,
      joinedBottom: false,
    });
  });

  it('marks cuts where the interval goes on past the panel', () => {
    expect(getIntervalEnds(screen, string, 20, 25)).toMatchObject({
      cutTop: true,
      cutBottom: true,
    });
    expect(getIntervalEnds(casing, string, 0, 18)).toMatchObject({
      cutTop: false,
      cutBottom: false,
    });
  });

  it('does not treat a pipe hung inside another as a joint', () => {
    const outer = { from: 0, to: 60 };
    const liner = { from: 50, to: 120 };
    expect(getIntervalEnds(outer, [outer, liner], 0, 200).joinedBottom).toBe(
      false,
    );
  });
});

describe('pipeWallsPath', () => {
  it('draws only the two walls', () => {
    const d = pipeWallsPath(-10, 10, 0, 50);
    expect(d).toBe('M-10,0V50M10,0V50');
    expect(horizontals(d)).toEqual([]);
  });
});

describe('shoePath', () => {
  it('puts a triangle outside each wall, its base on the pipe end', () => {
    expect(shoePath(-10, 10, 50, 4)).toBe(
      'M-10,46L-10,50L-14,50ZM10,46L10,50L14,50Z',
    );
  });
});

describe('screenEndPath', () => {
  it('runs from wall to wall at the limit', () => {
    expect(screenEndPath(-10, 10, 20)).toBe('M-10,20H10');
  });
});

describe('boreHoleOutlinePath', () => {
  const wide = { from: 0, to: 18, diameter: 311 };
  const narrow = { from: 18, to: 120, diameter: 203 };
  const holes = [wide, narrow];

  it('leaves the mouth open', () => {
    expect(
      horizontals(boreHoleOutlinePath(wide, holes, scales(0, 200))),
    ).not.toContainEqual(expect.arrayContaining([0]));
  });

  it('steps down to the narrower hole only between the walls', () => {
    const steps = horizontals(boreHoleOutlinePath(wide, holes, scales(0, 200)));
    expect(steps).toEqual([
      [18, -155.5, -101.5],
      [18, 155.5, 101.5],
    ]);
  });

  it('closes the bottom at total depth', () => {
    expect(
      horizontals(boreHoleOutlinePath(narrow, holes, scales(0, 200))),
    ).toEqual([[120, -101.5, 101.5]]);
  });

  it('leaves the bottom open when the panel cuts it', () => {
    expect(
      horizontals(boreHoleOutlinePath(narrow, holes, scales(0, 60))),
    ).toEqual([]);
  });

  it('steps out where a wider interval starts below a narrower one', () => {
    const pilot = { from: 0, to: 30, diameter: 150 };
    const reamed = { from: 30, to: 60, diameter: 250 };
    expect(
      horizontals(boreHoleOutlinePath(reamed, [pilot, reamed], scales(0, 100))),
    ).toContainEqual([30, -75, -125]);
  });
});

describe('holeFillOutlinePath', () => {
  const pipes = [{ from: 0, to: 18, diameter: 219 }];

  it('limits the interface to the annulus where a pipe crosses it', () => {
    const seal = { from: 0, to: 18, diameter: 311 };
    expect(horizontals(holeFillOutlinePath(seal, pipes, scales()))).toEqual([
      [18, -155.5, -109.5],
      [18, 109.5, 155.5],
    ]);
  });

  it('spans the hole where no pipe is', () => {
    const plug = { from: 30, to: 40, diameter: 203 };
    expect(horizontals(holeFillOutlinePath(plug, pipes, scales()))).toEqual([
      [30, -101.5, 101.5],
      [40, -101.5, 101.5],
    ]);
  });

  it('skips the surface and panel cuts', () => {
    const seal = { from: 0, to: 50, diameter: 311 };
    expect(
      horizontals(holeFillOutlinePath(seal, pipes, scales(10, 40))),
    ).toEqual([]);
  });
});

describe('pipeSlices', () => {
  it('keeps the widest pipe over each depth, without overlaps', () => {
    const pipes = [
      { from: 0, to: 60, diameter: 273 },
      { from: 50, to: 120, diameter: 168 },
    ];
    expect(pipeSlices(pipes, 0, 100)).toEqual([
      { from: 0, to: 60, diameter: 273 },
      { from: 60, to: 100, diameter: 168 },
    ]);
  });

  it('leaves gaps where no pipe is', () => {
    expect(pipeSlices([{ from: 10, to: 20, diameter: 100 }], 0, 30)).toEqual([
      { from: 10, to: 20, diameter: 100 },
    ]);
  });
});

describe('annulusFillPath', () => {
  it('cuts the pipe out of the fill', () => {
    const seal = { from: 0, to: 18, diameter: 311 };
    const d = annulusFillPath(
      seal,
      [{ from: 0, to: 18, diameter: 219 }],
      scales(),
    );
    expect(d).toBe('M-155.5,0H155.5V18H-155.5Z' + 'M-109.5,0H109.5V18H-109.5Z');
  });

  it('is the whole interval where no pipe is', () => {
    const plug = { from: 30, to: 40, diameter: 203 };
    expect(annulusFillPath(plug, [], scales())).toBe(
      'M-101.5,30H101.5V40H-101.5Z',
    );
  });
});

describe('getPadDiameters', () => {
  const data = {
    surface_case: [] as { from: number; to: number; diameter: number }[],
    well_case: [{ from: 0, to: 18, diameter: 219 }],
    well_screen: [],
    bore_hole: [{ from: 0, to: 18, diameter: 311 }],
    hole_fill: [{ from: 0, to: 18, diameter: 311 }],
  };

  it('is cast around the casing and covers the hole', () => {
    expect(getPadDiameters(data, 0.1)).toEqual({ opening: 219, outer: 311 });
  });

  it('keeps the casing as the opening and covers the surface case', () => {
    const { opening, outer } = getPadDiameters(
      { ...data, surface_case: [{ from: 0, to: 6, diameter: 340 }] },
      0.1,
    );
    expect(opening).toBe(219);
    expect(outer).toBeCloseTo(374);
  });

  it('opens on the surface case when it is the only pipe', () => {
    const { opening } = getPadDiameters(
      {
        ...data,
        well_case: [],
        surface_case: [{ from: 0, to: 6, diameter: 340 }],
      },
      0.1,
    );
    expect(opening).toBeCloseTo(374);
  });

  it('opens on the borehole of an uncased well', () => {
    expect(getPadDiameters({ ...data, well_case: [] }, 0.1)).toEqual({
      opening: 311,
      outer: 311,
    });
  });
});

describe('getCementPadGeometry', () => {
  const config = { widthRatio: 1.4, height: 6 };

  it('splits the pad around the opening, resting on the surface', () => {
    const { bbox, slabs } = getCementPadGeometry(100, 60, 50, config, 40);
    expect(bbox).toEqual({ x: -40, y: 44, width: 140, height: 6 });
    expect(slabs[0]).toMatch(/^M10,44H-40/);
    expect(slabs[1]).toMatch(/^M50,44H100/);
    // The slabs stop at the opening: nothing is drawn between x 10 and 50.
    for (const d of slabs)
      for (const [, a, b] of horizontals(d))
        expect(Math.min(a, b) >= 50 || Math.max(a, b) <= 10).toBe(true);
  });

  it('ends each slab with a break line, not a square end', () => {
    const { slabs } = getCementPadGeometry(100, 60, 50, config, 40);
    expect(slabs[0]).toContain('L-41.8,46.4L-38.2,47.6L-40,50');
  });

  it('reaches past the outer items it covers', () => {
    const { bbox } = getCementPadGeometry(100, 60, 50, config, 40, 150);
    expect(bbox.width).toBe(162);
  });

  it('draws one slab when no pipe goes through', () => {
    const { slabs } = getCementPadGeometry(100, 60, 50, config, 0);
    expect(slabs[1]).toBe('');
    expect(slabs[0]).toMatch(/^M-40,44H100/);
  });
});
