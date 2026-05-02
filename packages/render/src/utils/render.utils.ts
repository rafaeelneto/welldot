// TODO remove this dependency on d3-tip by implementing our own tooltip logic using plain divs and mouse events, which will also allow us to support touch devices
import * as d3module from 'd3';
// eslint-disable-next-line import-x/default
import d3tip from 'd3-tip';

import textures from 'textures';
import { importFgdcTextures } from '~/utils/fgdcTextures';

import {
  BoreHole,
  Cave,
  CementPad,
  Fracture,
  HoleFill,
  Lithology,
  SurfaceCase,
  Units,
  WellCase,
  WellScreen,
} from '@welldot/core';
import {
  ComponentsClassNames,
  Conflict,
  SvgSelection,
  TooltipKey,
} from '~/types/render.types';
import { formatDiameter, formatLength } from '~/utils/format.utils';

const d3 = Object.assign(d3module, { tip: d3tip });

interface D3Tip {
  attr(name: string, value: string): D3Tip;
  direction(dir: string): D3Tip;
  html(fn: (event: unknown, d: unknown) => string): D3Tip;
  show(...args: unknown[]): void;
  hide(...args: unknown[]): void;
}

export type LithologyTextureOptions = {
  size: number;
  strokeWidth: number;
  stroke: string;
};

/** Returns a map from "texture.from" keys to textures.js fill objects for each lithology entry. */
export const getLithologicalFillList = async (
  data: Lithology[],
  opts: LithologyTextureOptions,
) => {
  const uniqueTextureCodes = [...new Set(data.map(d => d.fgdc_texture))];
  const fdgcTextures = await importFgdcTextures();
  const texturesLoaded = Object.fromEntries(
    uniqueTextureCodes
      .filter(code => fdgcTextures[code])
      .map(code => [code, fdgcTextures[code]]),
  );

  return Object.fromEntries(
    data.map(d => [
      `${d.fgdc_texture}.${d.from}`,
      textures
        .paths()
        .d(() => texturesLoaded[d.fgdc_texture])
        .size(opts.size)
        .strokeWidth(opts.strokeWidth)
        .stroke(opts.stroke)
        .background(d.color),
    ]),
  );
};

/** Returns all overlapping depth intervals between two arrays of depth-ranged items, carrying the max diameter of each pair. */
export const getConflictAreas = (
  array1: Conflict[],
  array2: Conflict[],
): Conflict[] =>
  array1.flatMap(item1 =>
    array2
      .filter(item2 => item2.from < item1.to && item2.to > item1.from)
      .map(item2 => ({
        from: Math.max(item2.from, item1.from),
        to: Math.min(item2.to, item1.to),
        diameter: Math.max(item1.diameter, item2.diameter),
      })),
  );

/** Merges overlapping or near-adjacent conflict segments (within `buffer` units) into single spans. */
export const mergeConflicts = (
  conflicts: Conflict[],
  buffer: number,
): Conflict[] => {
  if (conflicts.length === 0) return [];

  return [...conflicts]
    .sort((a, b) => a.from - b.from)
    .reduce<Conflict[]>((merged, current) => {
      const last = merged[merged.length - 1];
      if (last && current.from <= last.to + buffer) {
        last.to = Math.max(last.to, current.to);
        return merged;
      }
      merged.push({ ...current });
      return merged;
    }, []);
};

/** Returns clamped `getHeight` and `getYPos` helpers bound to a D3 scale and optional depth clamp range. */
export const getYAxisFunctions = (
  yScale: (value: number) => number,
  clamp?: { from: number; to: number },
) => {
  const clampFrom = clamp?.from ?? -Infinity;
  const clampTo = clamp?.to ?? Infinity;
  return {
    getHeight: ({ from, to }: { from: number; to: number }) =>
      Math.max(
        0,
        yScale(Math.min(to, clampTo)) - yScale(Math.max(from, clampFrom)),
      ),
    getYPos: ({ from }: { from: number }) => yScale(Math.max(from, clampFrom)),
  };
};

/** Returns a fill-value function for a lithology datum, registering texture patterns on the SVG as needed. */
export const getLithologyFill = async (
  geologyData: Lithology[],
  svg: SvgSelection,
  opts: LithologyTextureOptions,
) => {
  const lithologicalFill = await getLithologicalFillList(geologyData, opts);
  return (d: Lithology) => {
    const fill = lithologicalFill[`${d.fgdc_texture}.${d.from}`];
    if (!fill.url) return fill;
    svg.call(fill as unknown as (selection: SvgSelection) => void);
    return fill.url();
  };
};

/**
 * Builds a wavy horizontal contact line as an array of [x, y] points using a
 * damped random walk, giving a natural geological contact appearance.
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

/** Converts an array of [x, y] points into a smooth SVG cubic-Bézier path string using Catmull-Rom tension. */
export const ptsToSmoothPath = (pts: [number, number][]): string => {
  if (pts.length < 2) return '';
  const n = pts.length;
  const tension = 0.35;
  let d = `M ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(n - 1, i + 2)];
    const cp1x = p1[0] + (p2[0] - p0[0]) * tension;
    const cp1y = p1[1] + (p2[1] - p0[1]) * tension;
    const cp2x = p2[0] - (p3[0] - p1[0]) * tension;
    const cp2y = p2[1] - (p3[1] - p1[1]) * tension;
    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
};

/** Seeded PRNG — deterministic so every zoom/redraw produces identical shapes. */
export const makeCavePrng = (seed: number) => {
  let s = Math.abs(seed * 6271) | 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
};

/** Initialises d3-tip tooltip instances for each well component, respecting the `tooltipConfig` allow-list. */
export const populateTooltips = (
  svg: SvgSelection,
  customClasses: ComponentsClassNames,
  units: Units,
  tooltipConfig?: TooltipKey[] | false,
) => {
  const tipsText = {
    geology: (_: unknown, d: Lithology) => `
        <span class="${customClasses.tooltip.title}">Litologia</span>
        <span class="${customClasses.tooltip.primaryInfo}">De ${formatLength(d.from, units.length)} ${units.length} até ${formatLength(d.to, units.length)} ${units.length}</span>
        <span class="${customClasses.tooltip.secondaryInfo}"><strong>Descrição:</strong> ${d.description}</span>
        ${d.geologic_unit ? `<span class="${customClasses.tooltip.secondaryInfo}"><strong>Unidade geológica:</strong> ${d.geologic_unit}</span>` : ''}
        ${d.aquifer_unit ? `<span class="${customClasses.tooltip.secondaryInfo}"><strong>Unidade aquífera:</strong> ${d.aquifer_unit}</span>` : ''}
      `,
    hole: (_: unknown, d: BoreHole) => `
        <span class="${customClasses.tooltip.title}">FURO</span>
        <span class="${customClasses.tooltip.primaryInfo}">De ${formatLength(d.from, units.length)} ${units.length} até ${formatLength(d.to, units.length)} ${units.length}</span>
        <span class="${customClasses.tooltip.secondaryInfo}"><strong>Diâmetro:</strong>${formatDiameter(d.diameter, units.diameter)} ${units.diameter}</span>
        `,
    surfaceCase: (_: unknown, d: SurfaceCase) => `
            <span class="${customClasses.tooltip.title}">TUBO DE BOCA</span>
            <span class="${customClasses.tooltip.primaryInfo}">De ${formatLength(d.from, units.length)} ${units.length} até ${formatLength(d.to, units.length)} ${units.length}</span>
            <span class="${customClasses.tooltip.secondaryInfo}"><strong>Diâmetro:</strong>${formatDiameter(d.diameter, units.diameter)} ${units.diameter}</span>
          `,
    holeFill: (_: unknown, d: HoleFill) => `
          <span class="${customClasses.tooltip.title}">ESP. ANULAR</span>
          <span class="${customClasses.tooltip.primaryInfo}">De ${formatLength(d.from, units.length)} ${units.length} até ${formatLength(d.to, units.length)} ${units.length}</span>
          <span class="${customClasses.tooltip.secondaryInfo}"><strong>Diâmetro:</strong>${formatDiameter(d.diameter, units.diameter)} ${units.diameter}</span>
          <span class="${customClasses.tooltip.secondaryInfo}">
            <strong>Descrição:</strong> ${d.description}
          </span>
          `,
    wellCase: (_: unknown, d: WellCase) => `
          <span class="${customClasses.tooltip.title}">REVESTIMENTO</span>
              <span class="${customClasses.tooltip.primaryInfo}">De ${formatLength(d.from, units.length)} ${units.length} até ${formatLength(d.to, units.length)} ${units.length}</span>
              <span class="${customClasses.tooltip.secondaryInfo}">
                <strong>Diâmetro:</strong> ${formatDiameter(d.diameter, units.diameter)} ${units.diameter}
              </span>
              <span class="${customClasses.tooltip.secondaryInfo}"><strong>Tipo:</strong> ${d.type}</span>
          `,
    wellScreen: (_: unknown, d: WellScreen) => `
          <span class="${customClasses.tooltip.title}">FILTROS</span>
              <span class="${customClasses.tooltip.primaryInfo}">De ${formatLength(d.from, units.length)} ${units.length} até ${formatLength(d.to, units.length)} ${units.length}</span>
              <span class="${customClasses.tooltip.secondaryInfo}">
                <strong>Diâmetro:</strong> ${formatDiameter(d.diameter, units.diameter)} ${units.diameter}</span>
              <span class="${customClasses.tooltip.secondaryInfo}"><strong>Tipo:</strong> ${d.type}</span>
              <span class="${customClasses.tooltip.secondaryInfo}">
                <strong>Ranhura:</strong> ${d.screen_slot_mm} mm
              </span>
          `,
    conflict: (_: unknown, d: { from: number; to: number }) => `
          <span class="${customClasses.tooltip.title}">CONFLITO</span>
          <span class="${customClasses.tooltip.primaryInfo}">De ${formatLength(d.from, units.length)} ${units.length} até ${formatLength(d.to, units.length)} ${units.length}</span>
        `,
    fracture: (_: unknown, d: Fracture) => {
      const title = d.swarm ? 'ENXAME DE FRATURAS' : 'FRATURA';
      return `
          <span class="${customClasses.tooltip.title}">${title}</span>
          <span class="${customClasses.tooltip.primaryInfo}"><strong>Profundidade:</strong> ${formatLength(d.depth, units.length)} ${units.length}</span>
          ${d.water_intake ? `<span class="${customClasses.tooltip.secondaryInfo}"><strong>Entrada d'água:</strong> ${formatLength(d.depth, units.length)} ${units.length}</span>` : ''}
          <span class="${customClasses.tooltip.secondaryInfo}"><strong>Mergulho:</strong> ${d.dip}°</span>
          <span class="${customClasses.tooltip.secondaryInfo}"><strong>Azimute:</strong> ${d.azimuth}°</span>
          ${d.description ? `<span class="${customClasses.tooltip.secondaryInfo}"><strong>Descrição:</strong> ${d.description}</span>` : ''}
        `;
    },
    cementPad: (_: unknown, d: CementPad) => `
          <span class="${customClasses.tooltip.title}">LAJE DE PROTEÇÃO</span>
          <span class="${customClasses.tooltip.primaryInfo}">${d.type}</span>
          <span class="${customClasses.tooltip.secondaryInfo}"><strong>Espessura:</strong>
          ${formatLength(d.thickness, units.length)} ${units.length}</span>
          <span class="${customClasses.tooltip.secondaryInfo}">
            <strong>Largura:</strong> ${formatLength(d.width, units.length)} ${units.length}
          </span>
          <span class="${customClasses.tooltip.secondaryInfo}">
            <strong>Comprimento:</strong> ${formatLength(d.length, units.length)} ${units.length}
          </span>
        `,
    cave: (_: unknown, d: Cave) => `
          <span class="${customClasses.tooltip.title}">CAVERNA</span>
          <span class="${customClasses.tooltip.primaryInfo}">De ${formatLength(d.from, units.length)} ${units.length} até ${formatLength(d.to, units.length)} ${units.length}</span>
          ${d.water_intake ? `<span class="${customClasses.tooltip.secondaryInfo}"><strong>Entrada d'água</strong></span>` : ''}
          ${d.description ? `<span class="${customClasses.tooltip.secondaryInfo}"><strong>Descrição:</strong> ${d.description}</span>` : ''}
        `,
  };

  const noop = { show: () => {}, hide: () => {} };
  const tooltips: Record<string, D3Tip | typeof noop> = {};

  Object.getOwnPropertyNames(tipsText).forEach(tipTextKey => {
    const enabled =
      tooltipConfig === undefined
        ? true
        : tooltipConfig !== false &&
          (tooltipConfig as string[]).includes(tipTextKey);

    if (!enabled) {
      tooltips[tipTextKey] = noop;
      return;
    }

    tooltips[tipTextKey] = (d3 as unknown as { tip: () => D3Tip })
      .tip()
      .attr('class', customClasses.tooltip.root)
      .direction('e')
      .html(tipsText[tipTextKey]);

    svg.call(
      tooltips[tipTextKey] as unknown as (selection: SvgSelection) => void,
    );
  });

  return tooltips;
};
