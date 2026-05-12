import * as d3 from 'd3';

import { Cave } from '@welldot/core';
import { DrawContext } from '~/types/render.types';
import { mergeEnter } from '~/utils/d3.utils';
import { makeIntervalKey } from '~/utils/key.utils';
import {
  makeSeededPrng,
  ptsToSmoothPath,
  wavyContact,
} from '~/utils/render.utils';

/**
 * Renders cave bands as wavy closed SVG paths with texture fill.
 *
 * Each cave is drawn as a full-width band whose top and bottom contacts are
 * irregular and wavy rather than straight horizontal lines. Two independent
 * seeded PRNGs ensure the top and bottom contacts are visually uncorrelated.
 * Geometry is fully deterministic via those seeded PRNGs, so every redraw
 * (including zoom) produces identical shapes. Returns early if `data` is empty.
 */
export function drawCaves(ctx: DrawContext, data: Cave[]): void {
  if (!data.length) return;

  const {
    groups: { cavesGroup },
    geoXLeft,
    geoXRight,
    depthFrom,
    depthTo,
    yScale,
    renderConfig,
    theme,
    textures,
    classes,
    tooltips,
  } = ctx;

  const rc = renderConfig.caves;

  const groups = cavesGroup
    .selectAll(`g.${classes.caves.item}`)
    .data(data, makeIntervalKey('cave'));

  groups.exit().transition(ctx.transition).style('opacity', 0).remove();

  const entered = groups
    .enter()
    .append('g')
    .attr('class', classes.caves.item)
    .style('cursor', 'pointer')
    .on('mouseover', tooltips.cave.show)
    .on('mouseout', tooltips.cave.hide)
    .style('opacity', 0);

  const merged = mergeEnter(entered, groups);

  merged.each(function (cave) {
    const g = d3.select(this);
    g.selectAll('*').remove();

    // Two different seeds so top and bottom contacts are visually independent.
    // Multiplying by 100 ensures uniqueness even for small integer coordinates
    // (e.g. from=5, to=10 → seedTop=510; from=10, to=5 → seedTop=1005).
    // The +999 offset on seedBot prevents seedTop == seedBot when from == to.
    const seedTop = cave.from * 100 + cave.to;
    const seedBot = cave.to * 100 + cave.from + 999;
    const rngTop = makeSeededPrng(seedTop);
    const rngBot = makeSeededPrng(seedBot);

    const yTop = yScale(Math.max(cave.from, depthFrom));
    const yBot = yScale(Math.min(cave.to, depthTo));
    const span = yBot - yTop;

    const amp = Math.max(
      rc.amplitude.min,
      Math.min(span * rc.amplitude.ratio, rc.amplitude.max),
    );

    const topCut = cave.from < depthFrom;
    const botCut = cave.to > depthTo;

    const topPts = topCut
      ? ([
          [geoXLeft, yTop],
          [geoXRight, yTop],
        ] as [number, number][])
      : wavyContact(geoXLeft, geoXRight, yTop, amp, rc.pathSteps, rngTop);
    const botPts = botCut
      ? ([
          [geoXLeft, yBot],
          [geoXRight, yBot],
        ] as [number, number][])
      : wavyContact(geoXLeft, geoXRight, yBot, amp, rc.pathSteps, rngBot);

    const topPath = topCut
      ? `M ${geoXLeft.toFixed(1)},${yTop.toFixed(1)} L ${geoXRight.toFixed(1)},${yTop.toFixed(1)}`
      : ptsToSmoothPath(topPts);
    const botPath = botCut
      ? `M ${geoXLeft.toFixed(1)},${yBot.toFixed(1)} L ${geoXRight.toFixed(1)},${yBot.toFixed(1)}`
      : ptsToSmoothPath(botPts);

    // Closed filled region:
    //   top contact L→R  +  right vertical edge down
    //   +  bottom contact R→L (reversed)  +  left vertical edge up  +  Z
    const botReversed = botCut
      ? `L ${geoXLeft.toFixed(1)},${yBot.toFixed(1)}`
      : ptsToSmoothPath([...botPts].reverse(), { omitMoveTo: true });
    const closedPath = `${topPath} L ${geoXRight.toFixed(1)},${yBot.toFixed(1)}${botReversed} L ${geoXLeft.toFixed(1)},${yTop.toFixed(1)} Z`;

    const caveTexture = cave.water_intake
      ? textures.cave_wet
      : textures.cave_dry;
    const caveStroke = cave.water_intake
      ? theme.cave.wetStroke
      : theme.cave.dryStroke;

    g.append('path')
      .attr('class', classes.caves.fill)
      .attr('d', closedPath)
      .attr('fill', caveTexture.url())
      .attr('fill-opacity', theme.cave.fillOpacity)
      .attr('stroke', 'none');

    g.append('path')
      .attr('class', classes.caves.contact)
      .attr('d', topPath)
      .attr('fill', 'none')
      .attr('stroke', caveStroke)
      .attr('stroke-width', theme.cave.contactStrokeWidth)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round');

    g.append('path')
      .attr('class', classes.caves.contact)
      .attr('d', botPath)
      .attr('fill', 'none')
      .attr('stroke', caveStroke)
      .attr('stroke-width', theme.cave.contactStrokeWidth)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round');
  });

  merged.transition(ctx.transition).style('opacity', 1);
}
