/**
 * Pure geometry for the construction column: open pipe walls, casing shoes,
 * borehole shoulders, annulus interfaces and the cement pad. No DOM access;
 * every function takes the scales it needs, so the renderers and the zoom
 * handler share the same shapes.
 */

export type Interval = { from: number; to: number; diameter: number };
type Span = { from: number; to: number };

/** Depth tolerance (m) for joints between intervals. */
const JOINT_EPS = 1e-3;

/** Diameter of the first interval covering `depth`, or `undefined`. */
export function diameterAt(
  items: Interval[],
  depth: number,
): number | undefined {
  return items.find(i => depth >= i.from && depth <= i.to)?.diameter;
}

/** How each end of an interval meets the panel and its neighbours. */
export type IntervalEnds = {
  /** The interval goes on above the panel top. */
  cutTop: boolean;
  /** The interval goes on below the panel bottom. */
  cutBottom: boolean;
  /** Another interval of the string ends where this one starts. */
  joinedTop: boolean;
  /** Another interval of the string starts where this one ends. */
  joinedBottom: boolean;
};

/**
 * Classifies both ends of `item` within the panel `[depthFrom, depthTo]`.
 * `string` holds every interval the item can butt against (the item itself
 * may be included). Only butt joints count: a narrower pipe hung inside a
 * wider one does not hide the wider pipe's end.
 */
export function getIntervalEnds(
  item: Span,
  string: Span[],
  depthFrom: number,
  depthTo: number,
): IntervalEnds {
  return {
    cutTop: item.from < depthFrom - JOINT_EPS,
    cutBottom: item.to > depthTo + JOINT_EPS,
    joinedTop: string.some(
      o => o !== item && Math.abs(o.to - item.from) < JOINT_EPS,
    ),
    joinedBottom: string.some(
      o => o !== item && Math.abs(o.from - item.to) < JOINT_EPS,
    ),
  };
}

/** The two vertical walls of a pipe, open at both ends. */
export function pipeWallsPath(
  xLeft: number,
  xRight: number,
  yTop: number,
  yBottom: number,
): string {
  return `M${xLeft},${yTop}V${yBottom}M${xRight},${yTop}V${yBottom}`;
}

/**
 * Casing shoe: a filled right triangle outside each wall, its base on `y`.
 * Always two closed subpaths, so a transition can slide it with the walls.
 */
export function shoePath(
  xLeft: number,
  xRight: number,
  y: number,
  size: number,
): string {
  return (
    `M${xLeft},${y - size}L${xLeft},${y}L${xLeft - size},${y}Z` +
    `M${xRight},${y - size}L${xRight},${y}L${xRight + size},${y}Z`
  );
}

/**
 * Screen end mark: a line across the pipe at the screen's top or base, from
 * wall to wall. Drawn dashed and thin, it marks the slotted section's limit
 * without reading as a closed pipe end.
 */
export function screenEndPath(
  xLeft: number,
  xRight: number,
  y: number,
): string {
  return `M${xLeft},${y}H${xRight}`;
}

/** Scales shared by the outline builders. */
export type OutlineScales = {
  /** Depth (m) → y (px). */
  y: (depth: number) => number;
  /** Diameter (mm) → left wall x (px). */
  left: (diameter: number) => number;
  /** Diameter (mm) → right wall x (px). */
  right: (diameter: number) => number;
  depthFrom: number;
  depthTo: number;
};

const clampDepth = (s: OutlineScales, depth: number) =>
  Math.min(Math.max(depth, s.depthFrom), s.depthTo);

const inPanel = (s: OutlineScales, depth: number) =>
  depth >= s.depthFrom - JOINT_EPS && depth <= s.depthTo + JOINT_EPS;

/** Horizontal step on both sides, from diameter `a` to diameter `b` at `y`. */
const shoulders = (s: OutlineScales, a: number, b: number, y: number) =>
  `M${s.left(a)},${y}H${s.left(b)}M${s.right(a)},${y}H${s.right(b)}`;

/**
 * Borehole outline for one interval: its walls, open at the mouth and at
 * panel cuts. Where the hole narrows below it, a shoulder joins its walls to
 * the narrower ones; where it widens below an older interval, a shoulder
 * joins the narrower walls to its own. Only where no interval goes on below
 * does it close with a bottom line (the total depth).
 */
export function boreHoleOutlinePath(
  item: Interval,
  holes: Interval[],
  s: OutlineScales,
): string {
  const yTop = s.y(clampDepth(s, item.from));
  const yBottom = s.y(clampDepth(s, item.to));
  let d = pipeWallsPath(
    s.left(item.diameter),
    s.right(item.diameter),
    yTop,
    yBottom,
  );

  if (item.from > JOINT_EPS && inPanel(s, item.from)) {
    const above = holes.find(
      o => o !== item && o.from < item.from && o.to >= item.from - JOINT_EPS,
    );
    if (above && above.diameter < item.diameter)
      d += shoulders(s, above.diameter, item.diameter, yTop);
  }

  if (inPanel(s, item.to)) {
    const below = holes.find(
      o => o !== item && o.from <= item.to + JOINT_EPS && o.to > item.to,
    );
    if (!below) {
      d += `M${s.left(item.diameter)},${yBottom}H${s.right(item.diameter)}`;
    } else if (below.diameter < item.diameter) {
      d += shoulders(s, item.diameter, below.diameter, yBottom);
    }
  }
  return d;
}

/**
 * Hole fill outline: walls against the borehole plus a line at each
 * interface with another material or with the open hole. Interfaces skip
 * the surface and panel cuts, and stop at the outside of the pipe at that
 * depth, so they never cross the casing.
 */
export function holeFillOutlinePath(
  item: Interval,
  pipes: Interval[],
  s: OutlineScales,
): string {
  const yTop = s.y(clampDepth(s, item.from));
  const yBottom = s.y(clampDepth(s, item.to));
  const xL = s.left(item.diameter);
  const xR = s.right(item.diameter);
  let d = pipeWallsPath(xL, xR, yTop, yBottom);

  const interfaces = [item.from, item.to].filter(
    depth => depth > JOINT_EPS && inPanel(s, depth),
  );
  for (const depth of interfaces) {
    const y = s.y(depth);
    const pipe = diameterAt(pipes, depth);
    if (pipe !== undefined && pipe < item.diameter) {
      d += `M${xL},${y}H${s.left(pipe)}M${s.right(pipe)},${y}H${xR}`;
    } else {
      d += `M${xL},${y}H${xR}`;
    }
  }
  return d;
}

/**
 * Pipes inside `[from, to]` as non-overlapping slices, each with the widest
 * pipe diameter over it. Adjacent slices of equal diameter are merged.
 */
export function pipeSlices(
  pipes: Interval[],
  from: number,
  to: number,
): Interval[] {
  const cuts = [...new Set([from, to, ...pipes.flatMap(p => [p.from, p.to])])]
    .filter(d => d >= from && d <= to)
    .sort((a, b) => a - b);

  const slices: Interval[] = [];
  for (let i = 1; i < cuts.length; i++) {
    const a = cuts[i - 1]!;
    const b = cuts[i]!;
    const mid = (a + b) / 2;
    const widest = Math.max(
      0,
      ...pipes.filter(p => p.from <= mid && p.to >= mid).map(p => p.diameter),
    );
    if (widest === 0) continue;
    const last = slices[slices.length - 1];
    if (last && last.to === a && last.diameter === widest) last.to = b;
    else slices.push({ from: a, to: b, diameter: widest });
  }
  return slices;
}

/**
 * Hole fill area: the borehole interval with the pipes cut out (fill it with
 * `fill-rule: evenodd`), so the material only covers the annulus and never
 * shows through at the pipe's edges.
 */
export function annulusFillPath(
  item: Interval,
  pipes: Interval[],
  s: OutlineScales,
): string {
  const from = clampDepth(s, item.from);
  const to = clampDepth(s, item.to);
  const box = (dia: number, a: number, b: number) =>
    `M${s.left(dia)},${s.y(a)}H${s.right(dia)}V${s.y(b)}H${s.left(dia)}Z`;
  const inner = pipes.filter(p => p.diameter < item.diameter);
  return (
    box(item.diameter, from, to) +
    pipeSlices(inner, from, to)
      .map(p => box(p.diameter, p.from, p.to))
      .join('')
  );
}

/**
 * Diameters (mm) that place the cement pad at the surface. `opening` is the
 * pipe the pad is cast around: the casing or screen, else the surface case
 * (with its drawing padding) when it is the only pipe, else the borehole of
 * an uncased well; `0` when nothing reaches 0 m. `outer` is the widest item
 * at 0 m, which the pad covers: surface case, borehole and annulus fill sit
 * under it.
 */
export function getPadDiameters(
  data: {
    surface_case: Interval[];
    well_case: Interval[];
    well_screen: Interval[];
    bore_hole: Interval[];
    hole_fill: Interval[];
  },
  surfaceCasePaddingRatio: number,
): { opening: number; outer: number } {
  const surfaceCase = diameterAt(data.surface_case, 0);
  const paddedSurfaceCase =
    surfaceCase === undefined
      ? undefined
      : surfaceCase * (1 + surfaceCasePaddingRatio);
  const casing = diameterAt([...data.well_case, ...data.well_screen], 0);
  const hole = diameterAt(data.bore_hole, 0);
  const opening = casing ?? paddedSurfaceCase ?? hole ?? 0;
  const outer = Math.max(
    opening,
    paddedSurfaceCase ?? 0,
    hole ?? 0,
    diameterAt(data.hole_fill, 0) ?? 0,
  );
  return { opening, outer };
}

export type CementPadGeometry = {
  /** Box around both slabs, used for highlights. */
  bbox: { x: number; y: number; width: number; height: number };
  /** Closed outlines of the left and right slabs (empty when no slab). */
  slabs: [string, string];
};

/**
 * Cement pad drawn as two slabs resting on the surface line `surfaceY`, one
 * each side of the pipe it is cast around (`openingWidth`), covering
 * everything out to `outerWidth` (surface case, annulus). The pad is not
 * drawn to scale (its real width is metres, the column is millimetres): its
 * width is a `widthRatio` of the column, widened so each slab keeps at least
 * 1.5 × `height` px beside the opening and `height` px past `outerWidth`.
 * The outer ends are break lines, the drafting mark for an element that
 * goes on beyond the drawing.
 *
 * `pocoCenter` and the widths use the construction renderer's convention:
 * x = (pocoCenter − width) / 2.
 */
export function getCementPadGeometry(
  pocoWidth: number,
  pocoCenter: number,
  surfaceY: number,
  config: { widthRatio: number; height: number },
  openingWidth = 0,
  outerWidth = openingWidth,
): CementPadGeometry {
  const h = config.height;
  const opening = Math.max(0, openingWidth);
  const width = Math.max(
    pocoWidth * config.widthRatio,
    opening + 3 * h,
    outerWidth + 2 * h,
  );
  const xLeft = (pocoCenter - width) / 2;
  const xRight = xLeft + width;
  const oLeft = (pocoCenter - opening) / 2;
  const oRight = oLeft + opening;
  const yTop = surfaceY - h;
  const a = h * 0.3;

  // Break line ("Z") at x from y0 to y1; dir is the side the slab goes on.
  const breakLine = (x: number, y0: number, y1: number, dir: -1 | 1) =>
    `L${x + dir * a},${y0 + (y1 - y0) * 0.4}` +
    `L${x - dir * a},${y0 + (y1 - y0) * 0.6}L${x},${y1}`;

  const bbox = { x: xLeft, y: yTop, width, height: h };
  if (opening === 0) {
    return {
      bbox,
      slabs: [
        `M${xLeft},${yTop}H${xRight}${breakLine(xRight, yTop, surfaceY, 1)}` +
          `H${xLeft}${breakLine(xLeft, surfaceY, yTop, -1)}Z`,
        '',
      ],
    };
  }
  return {
    bbox,
    slabs: [
      `M${oLeft},${yTop}H${xLeft}${breakLine(xLeft, yTop, surfaceY, -1)}H${oLeft}Z`,
      `M${oRight},${yTop}H${xRight}${breakLine(xRight, yTop, surfaceY, 1)}H${oRight}Z`,
    ],
  };
}
