import * as d3module from 'd3';
import d3tip from 'd3-tip';

import textures from 'textures';

import fdgcTextures from '@/src_old/utils/fgdcTextures';

import { BoreHole, Cave, CementPad, Fracture, HoleFill, Lithology, SurfaceCase, WellCase, WellScreen } from '@/src/lib/@types/well.types';
import { ComponentsClassNames } from '../@types/drawer.types';
import { Units, UnitsTypes } from '../@types/units.types';
import { formatDiameter, formatLength } from '../utils/format.utils';

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

export function getLithologyFill(geologyData: Lithology[], svg) {
  const lithologicalFill = getLithologicalFillList(geologyData);
  return (d: Lithology) => {
    if (!lithologicalFill[`${d.fgdc_texture}.${d.from}`].url) {
      return lithologicalFill[`${d.fgdc_texture}.${d.from}`];
    }
    svg.call(lithologicalFill[`${d.fgdc_texture}.${d.from}`]);
    return lithologicalFill[`${d.fgdc_texture}.${d.from}`].url();
  };
}

/**
 * Build a wavy horizontal contact line as an array of [x, y] points.
 *
 * The line spans from xLeft to xRight at a nominal y of baseY.
 * Each sample is displaced vertically by a combination of a low-frequency
 * sinusoidal curve (for large-scale curvature) and a high-frequency random
 * component (for small-scale roughness), giving a natural geological contact.
 *
 * @param xLeft   - leftmost x coordinate (matches lithology rect x)
 * @param xRight  - rightmost x coordinate (matches lithology rect right edge)
 * @param baseY   - nominal pixel y for this contact depth
 * @param amp     - maximum vertical displacement in pixels
 * @param steps   - number of sample points (more = smoother)
 * @param rng     - seeded PRNG; must be freshly constructed per call
 */
export function wavyContact (
  xLeft: number,
  xRight: number,
  baseY: number,
  amp: number,
  steps: number,
  rng: () => number,
): [number, number][] {
  const pts: [number, number][] = [];

  // Damped random walk: each step nudges the current offset by a small
  // delta then damps it back toward zero, so adjacent samples are correlated
  // (no jagged spikes) and the line never wanders far from baseY.
  let offset = 0;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const x = xLeft + t * (xRight - xLeft);
    offset += (rng() - 0.5) * amp * 0.6;
    offset *= 0.75; // damping keeps the line close to baseY
    pts.push([x, baseY + offset]);
  }
  return pts;
};

/**
 * Convert an array of [x, y] points into a smooth SVG cubic-Bézier path
 * string using Catmull-Rom tension. Produces natural curved contacts rather
 * than the jagged edges of a raw polyline.
 */
export function ptsToSmoothPath (pts: [number, number][]): string {
  if (pts.length < 2) return '';
  const n       = pts.length;
  const tension = 0.35;
  let d = `M ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const p0   = pts[Math.max(0, i - 1)];
    const p1   = pts[i];
    const p2   = pts[i + 1];
    const p3   = pts[Math.min(n - 1, i + 2)];
    const cp1x = p1[0] + (p2[0] - p0[0]) * tension;
    const cp1y = p1[1] + (p2[1] - p0[1]) * tension;
    const cp2x = p2[0] - (p3[0] - p1[0]) * tension;
    const cp2y = p2[1] - (p3[1] - p1[1]) * tension;
    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
};

/**
 * Seeded PRNG — deterministic so every zoom/redraw produces identical shapes.
 */
export function makeCavePrng(seed: number) {
  let s = Math.abs(seed * 6271) | 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
};


export function populateTooltips(svg: d3module.Selection<d3module.BaseType, unknown, HTMLElement, any>, customClasses: ComponentsClassNames, units: Units) {
    const tipsText = {
      geology: (_, d: Lithology) => `
        <span class="${customClasses.tooltipTitle}">Litologia</span>
        <span class="${customClasses.tooltipPrimaryInfo}">De ${formatLength(d.from, units.length)} ${units.length} até ${formatLength(d.to, units.length)} ${units.length}</span>
        <span class="${customClasses.tooltipSecondaryInfo}"><strong>Descrição:</strong> ${d.description}</span>
        ${d.geologic_unit ? `<span class="${customClasses.tooltipSecondaryInfo}"><strong>Unidade geológica:</strong> ${d.geologic_unit}</span>` : ''}
        ${d.aquifer_unit ? `<span class="${customClasses.tooltipSecondaryInfo}"><strong>Unidade aquífera:</strong> ${d.aquifer_unit}</span>` : ''}
      `,
      hole: (_, d: BoreHole) => {
        return `
        <span class="${customClasses.tooltipTitle}">FURO</span>
        <span class="${customClasses.tooltipPrimaryInfo}">De ${formatLength(d.from, units.length)} ${units.length} até ${formatLength(d.to, units.length)} ${units.length}</span>
        <span class="${customClasses.tooltipSecondaryInfo}"><strong>Diâmetro:</strong>${formatDiameter(d.diameter, units.diameter)} ${units.diameter}</span>
        `;
      },
      surfaceCase: (_, d: SurfaceCase) => {
        return `
            <span class="${customClasses.tooltipTitle}">TUBO DE BOCA</span>
            <span class="${customClasses.tooltipPrimaryInfo}">De ${formatLength(d.from, units.length)} ${units.length} até ${formatLength(d.to, units.length)} ${units.length}</span>
            <span class="${customClasses.tooltipSecondaryInfo}"><strong>Diâmetro:</strong>${formatDiameter(d.diameter, units.diameter)} ${units.diameter}</span>
          `;
      },
      holeFill: (_, d: HoleFill) => {
        return `
          <span class="${customClasses.tooltipTitle}">ESP. ANULAR</span>
          <span class="${customClasses.tooltipPrimaryInfo}">De ${formatLength(d.from, units.length)} ${units.length} até ${formatLength(d.to, units.length)} ${units.length}</span>
          <span class="${customClasses.tooltipSecondaryInfo}"><strong>Diâmetro:</strong>${formatDiameter(d.diameter, units.diameter)} ${units.diameter}</span>
          <span class="${customClasses.tooltipSecondaryInfo}">
            <strong>Descrição:</strong> ${d.description}
          </span>
          `;
      },
      wellCase: (_, d: WellCase) => {
        return `
          <span class="${customClasses.tooltipTitle}">REVESTIMENTO</span>
              <span class="${customClasses.tooltipPrimaryInfo}">De ${formatLength(d.from, units.length)} ${units.length} até ${formatLength(d.to, units.length)} ${units.length}</span>
              <span class="${customClasses.tooltipSecondaryInfo}">
                <strong>Diâmetro:</strong> ${formatDiameter(d.diameter, units.diameter)} ${units.diameter}
              </span>
              <span class="${customClasses.tooltipSecondaryInfo}"><strong>Tipo:</strong> ${d.type}</span>
          `;
      },
      wellScreen: (_, d: WellScreen) => {
        return `
          <span class="${customClasses.tooltipTitle}">FILTROS</span>
              <span class="${customClasses.tooltipPrimaryInfo}">De ${formatLength(d.from, units.length)} ${units.length} até ${formatLength(d.to, units.length)} ${units.length}</span>
              <span class="${customClasses.tooltipSecondaryInfo}">
                <strong>Diâmetro:</strong> ${formatDiameter(d.diameter, units.diameter)} ${units.diameter}</span>
              <span class="${customClasses.tooltipSecondaryInfo}"><strong>Tipo:</strong> ${d.type}</span>
              <span class="${customClasses.tooltipSecondaryInfo}">
                <strong>Ranhura:</strong> ${d.screen_slot_mm} mm
              </span>
          `;
      },
      conflict: (_, d: { from: number, to: number }) => {
        return `
          <span class="${customClasses.tooltipTitle}">CONFLITO</span>
          <span class="${customClasses.tooltipPrimaryInfo}">De ${formatLength(d.from, units.length)} ${units.length} até ${formatLength(d.to, units.length)} ${units.length}</span>
        `;
      },
      fracture: (_event: unknown, d: Fracture) => {
        const title = d.swarm ? 'ENXAME DE FRATURAS' : 'FRATURA';
        return `
          <span class="${customClasses.tooltipTitle}">${title}</span>
          <span class="${customClasses.tooltipPrimaryInfo}"><strong>Profundidade:</strong> ${formatLength(d.depth, units.length)} ${units.length}</span>
          ${d.water_intake ? `<span class="${customClasses.tooltipSecondaryInfo}"><strong>Entrada d'água:</strong> ${formatLength(d.depth, units.length)} ${units.length}</span>` : ''}
          <span class="${customClasses.tooltipSecondaryInfo}"><strong>Mergulho:</strong> ${d.dip}°</span>
          <span class="${customClasses.tooltipSecondaryInfo}"><strong>Azimute:</strong> ${d.azimuth}°</span>
          ${d.description ? `<span class="${customClasses.tooltipSecondaryInfo}"><strong>Descrição:</strong> ${d.description}</span>` : ''}
        `;
      },
      cementPad: (_event: unknown, d: CementPad) => {
        return `
          <span class="${customClasses.tooltipTitle}">LAJE DE PROTEÇÃO</span>
          <span class="${customClasses.tooltipPrimaryInfo}">${d.type}</span>
          <span class="${customClasses.tooltipSecondaryInfo}"><strong>Espessura:</strong>
          ${formatLength(d.thickness, units.length)} ${units.length}</span>
          <span class="${customClasses.tooltipSecondaryInfo}">
            <strong>Largura:</strong> ${formatLength(d.width, units.length)} ${units.length}
          </span>
          <span class="${customClasses.tooltipSecondaryInfo}">
            <strong>Comprimento:</strong> ${formatLength(d.length, units.length)} ${units.length}
          </span>
        `;
      },
      cave: (_event: unknown, d: Cave) => {
        return `
          <span class="${customClasses.tooltipTitle}">CAVERNA</span>
          <span class="${customClasses.tooltipPrimaryInfo}">De ${formatLength(d.from, units.length)} ${units.length} até ${formatLength(d.to, units.length)} ${units.length}</span>
          ${d.water_intake ? `<span class="${customClasses.tooltipSecondaryInfo}"><strong>Entrada d'água</strong></span>` : ''}
          ${d.description ? `<span class="${customClasses.tooltipSecondaryInfo}"><strong>Descrição:</strong> ${d.description}</span>` : ''}
        `;
      },
    };

    const tooltips: any = {};

    Object.getOwnPropertyNames(tipsText).forEach(tipTextKey => {
      tooltips[tipTextKey] = d3
        // @ts-ignore
        .tip()
        .attr('class', customClasses.tooltip)
        .direction('e')
        .html(tipsText[tipTextKey]);

      svg.call(tooltips[tipTextKey]);
    });

    return tooltips;
  }