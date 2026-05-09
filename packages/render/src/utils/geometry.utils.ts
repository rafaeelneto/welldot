/**
 * Builds a wavy horizontal contact line as an array of [x, y] points using a
 * damped random walk, giving a natural geological contact appearance.
 * The 0.75 damping factor ensures the offset returns toward zero rather than
 * drifting unboundedly across the width.
 */
export const wavyContact = (
  xLeft: number,
  xRight: number,
  baseY: number,
  amp: number,
  steps: number,
  rng: () => number,
): [number, number][] => {
  const pts: [number, number][] = [];
  let offset = 0;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const x = xLeft + t * (xRight - xLeft);
    offset += (rng() - 0.5) * amp * 0.6;
    offset *= 0.75;
    pts.push([x, baseY + offset]);
  }
  return pts;
};

/**
 * Converts an array of [x, y] points into a smooth SVG cubic-Bézier path string using Catmull-Rom tension (0.35).
 * @param options.omitMoveTo - When true, omits the leading `M x,y` command so the path can be
 *   appended directly to an existing path string without repositioning the pen.
 */
export const ptsToSmoothPath = (
  pts: [number, number][],
  options: { omitMoveTo?: boolean } = {},
): string => {
  if (pts.length < 2) return '';
  const n = pts.length;
  const tension = 0.35;
  const segments: string[] = [];
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(n - 1, i + 2)];
    const cp1x = p1[0] + (p2[0] - p0[0]) * tension;
    const cp1y = p1[1] + (p2[1] - p0[1]) * tension;
    const cp2x = p2[0] - (p3[0] - p1[0]) * tension;
    const cp2y = p2[1] - (p3[1] - p1[1]) * tension;
    segments.push(
      `C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`,
    );
  }
  const body = segments.join(' ');
  return options.omitMoveTo
    ? body
    : `M ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)} ${body}`;
};

/**
 * Seeded Park-Miller LCG PRNG — deterministic so every zoom/redraw produces identical shapes.
 * @param seed - Initial seed value (typically a domain coordinate like depth or cave boundary).
 * @param scramble - Multiplier applied to the seed before entering the LCG cycle.
 *   Different values produce visually distinct random distributions for different domains.
 *   Default 6271 is used for caves; pass 7919 for fractures.
 */
export const makeSeededPrng = (seed: number, scramble = 6271) => {
  let s = Math.abs(seed * scramble) | 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
};
