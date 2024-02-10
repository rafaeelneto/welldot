import * as d3module from 'd3';
import d3tip from 'd3-tip';

import textures from 'textures';

import fdgcTextures from './fgdcTextures';

import { GEOLOGIC_COMPONENT_TYPE } from '../types/profile.types';

const d3 = {
  ...d3module,
  tip: d3tip,
};

export function responsivefy(svg) {
  const container = d3.select(svg.node().parentNode);
  // this is the code that resizes the chart
  // it will be called on load
  // and in response to window resizes
  // gets the width of the container
  // and resizes the svg to fill it
  // while maintaining a consistent aspect ratio
  function resize() {
    const h = parseInt(container.style('height').slice(0, -2));
    const w = parseInt(container.style('width').slice(0, -2));

    svg
      .attr('width', w)
      .attr('height', h)
      .attr('viewBox', `0 0 ${w} ${h}`)
      .attr('preserveAspectRatio', 'xMinYMid');
  }

  // container will be the DOM element
  // that the svg is appended to
  // we then measure the container
  // and find its aspect ratio

  // const width = svg.style('width');
  // const height = svg.style('height');

  // set viewBox attribute to the initial size
  // control scaling with preserveAspectRatio
  // resize svg on inital page load
  svg
    // .attr('viewBox', `0 0 ${width} ${height}`)
    .call(resize);

  // add a listener so the chart will be resized
  // when the window resizes
  // multiple listeners for the same event type
  // requires a namespace, i.e., 'click.foo'
  // api docs: https://goo.gl/F3ZCFr
  d3.select(window).on(`resize.${container.attr('id')}`, resize);
  return svg;
}

export const getLithologicalFillList = (data: GEOLOGIC_COMPONENT_TYPE[]) => {
  const profileTextures: (number | string)[] = [];
  data.forEach(element => {
    const texture: number | string = element.fgdc_texture;
    if (profileTextures.indexOf(texture) < 0) {
      profileTextures.push(texture);
    }
  });

  const litologicalFill = {};
  const texturesLoaded = {};

  profileTextures.forEach(textureCode => {
    if (fdgcTextures[textureCode]) {
      texturesLoaded[textureCode] = fdgcTextures[textureCode];
    }
  });

  data.forEach(d => {
    litologicalFill[`${d.fgdc_texture}.${d.from}`] = textures
      .paths()
      .d(s => texturesLoaded[d.fgdc_texture])
      .size(150)
      .strokeWidth(0.8)
      .stroke('#303030')
      .background(d.color);
  });
  return litologicalFill;
};

export default {
  responsivefy,
  getLithologicalFillList,
};
