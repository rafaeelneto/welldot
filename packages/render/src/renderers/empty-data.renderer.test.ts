// @vitest-environment jsdom
import * as d3 from 'd3';
import { describe, expect, it } from 'vitest';
import { DEFAULT_COMPONENTS_CLASS_NAMES as classes } from '~/configs/render.classnames';
import {
  DEFAULT_WELL_THEME,
  INTERACTIVE_RENDER_CONFIG,
} from '~/configs/render.configs';
import type { DrawContext } from '~/types/render.types';
import { drawCaves } from './caves.renderer';
import { drawFractures } from './fractures.renderer';
import { drawLithology } from './lithology.renderer';
import { drawUnitLabels } from './unit-labels.renderer';

const noop = { show: () => {}, hide: () => {} };

function makeCtx(
  groups: Record<string, unknown>,
  renderConfig = INTERACTIVE_RENDER_CONFIG,
): DrawContext {
  const svg = d3.select(document.body).append('svg');
  return {
    svg,
    groups,
    geoXLeft: 0,
    geoXRight: 100,
    depthFrom: 0,
    depthTo: 100,
    yScale: d3.scaleLinear().domain([0, 100]).range([0, 400]),
    POCO_WIDTH: 50,
    POCO_CENTER: 50,
    pocoCenterX: 50,
    transition: d3.transition().duration(0),
    tooltips: { geology: noop, fracture: noop, cave: noop },
    renderConfig,
    theme: DEFAULT_WELL_THEME,
    classes,
    textures: {},
  } as unknown as DrawContext;
}

/** A group holding one item already bound to a datum, as a previous draw leaves it. */
function drawnGroup(tag: string, itemClass: string) {
  const group = d3.select(document.body).append('svg').append('g');
  group
    .selectAll(`${tag}.${itemClass}`)
    .data([{ from: 0, to: 10, depth: 5 }])
    .enter()
    .append(tag)
    .attr('class', itemClass);
  return group;
}

/** Lets the zero-duration exit transitions run. */
const flushTransitions = () => new Promise(r => setTimeout(r, 50));

describe('renderers with empty data', () => {
  it('drawLithology removes the layers already drawn', async () => {
    const lithologyGroup = drawnGroup('rect', classes.lithology.rect);
    drawLithology(makeCtx({ lithologyGroup }), []);
    await flushTransitions();
    expect(lithologyGroup.selectAll('*').size()).toBe(0);
  });

  it('drawFractures removes the fractures already drawn', async () => {
    const fracturesGroup = drawnGroup('g', classes.fractures.item);
    drawFractures(makeCtx({ fracturesGroup }), []);
    await flushTransitions();
    expect(fracturesGroup.selectAll('*').size()).toBe(0);
  });

  it('drawCaves removes the caves already drawn', async () => {
    const cavesGroup = drawnGroup('g', classes.caves.item);
    drawCaves(makeCtx({ cavesGroup }), []);
    await flushTransitions();
    expect(cavesGroup.selectAll('*').size()).toBe(0);
  });

  it('drawUnitLabels clears the strip, also when disabled', () => {
    const unitLabelsGroup = drawnGroup('rect', 'strip');
    drawUnitLabels(makeCtx({ unitLabelsGroup }), []);
    expect(unitLabelsGroup.selectAll('*').size()).toBe(0);

    const disabledGroup = drawnGroup('rect', 'strip');
    drawUnitLabels(
      makeCtx(
        { unitLabelsGroup: disabledGroup },
        {
          ...INTERACTIVE_RENDER_CONFIG,
          unitLabels: {
            ...INTERACTIVE_RENDER_CONFIG.unitLabels,
            active: false,
          },
        },
      ),
      [],
    );
    expect(disabledGroup.selectAll('*').size()).toBe(0);
  });
});
