// @vitest-environment jsdom
import type { Well } from '@welldot/core';
import * as d3 from 'd3';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_COMPONENTS_CLASS_NAMES as classes } from '~/configs/render.classnames';
import { WellRenderer } from './Renderer';

const emptyWell = {
  version: 2,
  lithology: [],
  fractures: [],
  caves: [],
  bore_hole: [],
  hole_fill: [],
  surface_case: [],
  well_case: [],
  well_screen: [],
  reduction: [],
} as unknown as Well;

async function preparedRenderer() {
  document.body.innerHTML = '<svg id="panel"></svg>';
  const renderer = new WellRenderer([
    {
      selector: '#panel',
      width: 200,
      height: 400,
      margins: { top: 10, right: 10, bottom: 10, left: 40 },
    },
  ]);
  await renderer.prepareSvg();
  return renderer;
}

/** Puts a stale child into each group, as a previous draw leaves them. */
function fillGroups() {
  const svg = d3.select('#panel');
  svg.select(`.${classes.lithology.group}`).append('rect');
  svg.select(`.${classes.wellCase.group}`).append('rect');
  svg.select(`.${classes.cementPad.group}`).append('rect');
  svg.select(`.${classes.pump.group}`).append('g');
  svg.select(`.${classes.yAxis}`).append('g').attr('class', 'tick');
  svg
    .select(`.${classes.fractures.group}`)
    .append('g')
    .attr('class', classes.fractures.item);
  return svg;
}

const count = (selector: string) =>
  document.querySelectorAll(`#panel ${selector}`).length;

describe('WellRenderer.clear', () => {
  let renderer: WellRenderer;
  beforeEach(async () => {
    renderer = await preparedRenderer();
  });

  it('removes what was drawn and keeps the panel structure', () => {
    fillGroups();
    renderer.clear();

    expect(count(`.${classes.lithology.group} > *`)).toBe(0);
    expect(count(`.${classes.wellCase.group} > *`)).toBe(0);
    expect(count(`.${classes.cementPad.group} > *`)).toBe(0);
    expect(count(`.${classes.pump.group} > *`)).toBe(0);
    expect(count(`.${classes.yAxis} > *`)).toBe(0);
    expect(count(`g.${classes.fractures.item}`)).toBe(0);
    // Structure from prepareSvg() survives, so draw() still finds its groups.
    expect(count(`.${classes.lithology.group}`)).toBe(1);
    expect(count(`.${classes.wellCase.group}`)).toBe(1);
    expect(count(`.${classes.highlights.fracturesGroup}`)).toBe(1);
  });

  it('runs on draw() with an empty well', () => {
    fillGroups();
    renderer.draw(emptyWell);

    expect(count(`.${classes.lithology.group} > *`)).toBe(0);
    expect(count(`.${classes.wellCase.group} > *`)).toBe(0);
    expect(count(`g.${classes.fractures.item}`)).toBe(0);
  });
});
