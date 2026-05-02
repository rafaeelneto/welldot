import { Cave } from '@welldot/core';
import { DrawContext } from '~/types/render.types';
import { makeCavePrng, ptsToSmoothPath, wavyContact } from '~/utils/render.utils';

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

  cavesGroup.selectAll(`g.${classes.caves.item}`).remove();

  const rc = renderConfig.caves;

  data.forEach(cave => {
    // Two different seeds so top and bottom contacts are visually independent
    const seedTop = cave.from * 100 + cave.to;
    const seedBot = cave.to * 100 + cave.from + 999;
    const rngTop = makeCavePrng(seedTop);
    const rngBot = makeCavePrng(seedBot);

    const yTop = yScale(Math.max(cave.from, depthFrom));
    const yBot = yScale(Math.min(cave.to, depthTo));
    const span = yBot - yTop; // pixel height of the cave band

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

    // Smooth path strings for each contact
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
      : ptsToSmoothPath([...botPts].reverse()).replace(
          /^M [\d.-]+ [\d.-]+/,
          '',
        );
    const closedPath = `${topPath} L ${geoXRight.toFixed(1)},${yBot.toFixed(1)}${botReversed} L ${geoXLeft.toFixed(1)},${yTop.toFixed(1)} Z`;

    const caveTexture = cave.water_intake
      ? textures.cave_wet
      : textures.cave_dry;

    const g = cavesGroup
      .append('g')
      .attr('class', classes.caves.item)
      .datum(cave)
      .style('cursor', 'pointer')
      .on('mouseover', tooltips.cave.show)
      .on('mouseout', tooltips.cave.hide);

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
}
