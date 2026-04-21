import * as d3module from 'd3';
import d3tip from 'd3-tip';

import textures from 'textures';

import fdgcTextures from '@/src_old/utils/fgdcTextures';

import { Lithology } from '@/src/types/profile.types';

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

export const getLithologicalFillList = (data: Lithology[]) => {
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

export function getConflictAreas(array1: any[], array2: any[]) {
  const conflicts: { from: number; to: number; diameter: number }[] = [];
  array1.forEach(item1 => {
    array2.forEach(item2 => {
      if (
        (item2.from >= item1.from && item2.from < item1.to) ||
        (item2.to <= item1.to && item2.to > item1.from)
      ) {
        // calculate ends of conflicts areas
        const a = Math.max(item2.from, item1.from);
        const b = Math.min(item2.to, item1.to);

        conflicts.push({
          from: a,
          to: b,
          diameter: Math.max(item1.diamenter, item2.diameter),
        });
      }
    });
  });
  return conflicts;
}

export function mergeConflicts(
  conflicts: { from: number; to: number; diameter: number }[],
  buffer: number,
) {
  // SORT ARRAY BY THE FROM PROPERTY
  const sortedConflicts = conflicts.sort(
    // @ts-ignore
    (a, b) => parseFloat(a.from) - parseFloat(b.from),
  );

  const mergedConflicts: { from: number; to: number; diameter: number }[] = [];

  let index = 0;
  while (index < sortedConflicts.length) {
    const conflict = sortedConflicts[index];

    const { from, diameter } = conflict;
    let { to } = conflict;

    let jumpTo = index + 1;

    for (let i = index + 1; i < sortedConflicts.length; i++) {
      const nextConflict = sortedConflicts[i];
      // if (nextConflict.to < conflict.to) {
      //   // eslint-disable-next-line no-continue
      //   continue;
      // }

      if (nextConflict.from > conflict.to + buffer) {
        jumpTo = i;
        break;
      }

      if (nextConflict.to > conflict.to && nextConflict.from >= conflict.from) {
        to = nextConflict.to;
      }
    }

    const nextConflict = sortedConflicts[index + 1];
    if (
      nextConflict &&
      nextConflict.to === conflict.to &&
      nextConflict.from === conflict.from
    ) {
      jumpTo++;
    }

    mergedConflicts.push({ from, to, diameter });

    index = jumpTo;
  }
  return mergedConflicts;
}

export function getYAxisFunctions(yScale: any) {
  return {
    getHeight: ({ from, to }: { from: number; to: number }) => {
      return yScale(to - from);
    },
    getYPos: ({ from }: { from: number }) => {
      return yScale(from);
    },
  };
}

export function getLithologyFiller(geologyData: Lithology[], svg) {
  const lithologicalFill = getLithologicalFillList(geologyData);
  return (d: Lithology) => {
    if (!lithologicalFill[`${d.fgdc_texture}.${d.from}`].url) {
      return lithologicalFill[`${d.fgdc_texture}.${d.from}`];
    }
    svg.call(lithologicalFill[`${d.fgdc_texture}.${d.from}`]);
    return lithologicalFill[`${d.fgdc_texture}.${d.from}`].url();
  };
}
