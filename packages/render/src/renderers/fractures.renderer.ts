import { Fracture } from '@welldot/core';
import { DrawContext } from '~/types/render.types';

function makePrng(seed: number): () => number {
  let s = Math.abs(seed * 7919) | 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function wavyLine(
  rng: () => number,
  steps: number,
  baseY: number,
  jitter: number,
  startInset: number,
  endInset: number,
): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const nx = startInset + t * (1 - startInset - endInset);
    const dy = baseY + (rng() * 2 - 1) * jitter;
    pts.push([nx, dy]);
  }
  return pts;
}

/**
 * Renders fractures onto the fractures SVG group.
 *
 * Single fractures are drawn as a wavy polyline with small branching cracks.
 * Swarm fractures are drawn as a set of parallel wavy lines (with a thicker
 * central line) connected by short bridge lines. Geometry for each fracture
 * is fully deterministic via a seeded PRNG keyed on the fracture depth.
 * Returns early if `data` is empty.
 */
export function drawFractures(ctx: DrawContext, data: Fracture[]): void {
  if (!data.length) return;

  const {
    groups: { fracturesGroup },
    POCO_WIDTH,
    pocoCenterX,
    yScale,
    renderConfig,
    theme,
    classes,
    tooltips,
  } = ctx;

  fracturesGroup.selectAll(`g.${classes.fractures.item}`).remove();

  const rf = renderConfig.fractures;
  const halfWidth = (POCO_WIDTH * rf.widthMultiplier) / 2;
  const xa = pocoCenterX - halfWidth;
  const w = halfWidth * 2;

  const xAt = (nx: number) => xa + nx * w;
  const RC = 'round' as const;

  data.forEach(fracture => {
    const rng = makePrng(fracture.depth);
    const cy = yScale(fracture.depth);

    const g = fracturesGroup
      .append('g')
      .attr('class', classes.fractures.item)
      .datum(fracture)
      .attr(
        'transform',
        `translate(0,${cy}) rotate(${fracture.dip},${pocoCenterX},0)`,
      )
      .on('mouseover', tooltips.fracture.show)
      .on('mouseout', tooltips.fracture.hide)
      .style('cursor', 'pointer');

    const hitBuffer = fracture.swarm ? rf.hitBuffer.swarm : rf.hitBuffer.single;
    g.append('rect')
      .attr('class', classes.fractures.hitArea)
      .attr('x', xa)
      .attr('y', -hitBuffer)
      .attr('width', w)
      .attr('height', hitBuffer * 2)
      .attr('fill', 'transparent')
      .style('pointer-events', 'all');

    const fractureStroke = fracture.water_intake
      ? theme.fracture.wetStroke
      : theme.fracture.dryStroke;

    const appendLine = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      sw: number,
    ) =>
      g
        .append('line')
        .attr('class', classes.fractures.line)
        .attr('x1', x1)
        .attr('y1', y1)
        .attr('x2', x2)
        .attr('y2', y2)
        .attr('stroke', fractureStroke)
        .attr('stroke-width', sw)
        .attr('stroke-linecap', RC);

    const appendPolyline = (pts: [number, number][], sw: number) =>
      g
        .append('polyline')
        .attr('class', classes.fractures.polyline)
        .attr('points', pts.map(([nx, dy]) => `${xAt(nx)},${dy}`).join(' '))
        .attr('stroke', fractureStroke)
        .attr('stroke-width', sw)
        .attr('fill', 'none')
        .attr('stroke-linecap', RC)
        .attr('stroke-linejoin', RC);

    if (fracture.swarm) {
      const lineCount =
        rf.swarm.lineCountBase + Math.round(rng() * rf.swarm.lineCountVariance);
      const halfSpread = rf.swarm.spread / 2;

      const bases = Array.from(
        { length: lineCount },
        () => (rng() * 2 - 1) * halfSpread,
      ).sort((a, b) => a - b);

      bases.forEach((base, idx) => {
        const isCentral = idx === Math.floor(lineCount / 2);
        const sw = isCentral
          ? theme.fracture.swarm.centralStrokeWidth
          : theme.fracture.swarm.sideStrokeWidthBase +
            rng() * theme.fracture.swarm.sideStrokeWidthVariance;
        const steps = 6 + Math.round(rng() * 3);
        const jitter = 0.8 + rng() * 1.2;
        const insetL = 0.04 + rng() * 0.12;
        const insetR = 0.04 + rng() * 0.12;
        appendPolyline(wavyLine(rng, steps, base, jitter, insetL, insetR), sw);
      });

      const bridgeCount = 2 + Math.round(rng() * 2);
      for (let b = 0; b < bridgeCount; b++) {
        const nx = 0.15 + rng() * 0.7;
        const pairIdx = Math.floor(rng() * (bases.length - 1));
        appendLine(
          xAt(nx),
          bases[pairIdx],
          xAt(nx + (rng() - 0.5) * 0.06),
          bases[pairIdx + 1],
          0.6,
        );
      }

      const primaryBase = bases[Math.floor(lineCount / 2)];
      for (let wc = 0; wc < 2; wc++) {
        const nx = 0.2 + rng() * 0.6;
        const len = 3 + rng() * 3;
        const dir = rng() > 0.5 ? -1 : 1;
        appendLine(
          xAt(nx),
          primaryBase,
          xAt(nx + (rng() - 0.5) * 0.04),
          primaryBase + dir * len,
          0.8,
        );
      }
    } else {
      const steps = 7 + Math.round(rng() * 3);
      const insetL = 0.03 + rng() * 0.08;
      const insetR = 0.03 + rng() * 0.08;
      appendPolyline(
        wavyLine(rng, steps, 0, 2, insetL, insetR),
        theme.fracture.single.mainStrokeWidth,
      );

      const crackCount = 2 + Math.round(rng() * 2);
      for (let c = 0; c < crackCount; c++) {
        const nx = insetL + rng() * (1 - insetL - insetR);
        const len = 3.5 + rng() * 3.5;
        const dir = rng() > 0.5 ? 1 : -1;
        appendLine(
          xAt(nx),
          (rng() * 2 - 1) * 1.5,
          xAt(nx + (rng() - 0.5) * 0.03),
          dir * len,
          theme.fracture.single.crackStrokeWidth,
        );
      }
    }
  });
}
