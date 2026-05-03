// TODO remove this dependency on d3-tip by implementing our own tooltip logic using plain divs and mouse events, which will also allow us to support touch devices
import * as d3module from 'd3';
// eslint-disable-next-line import-x/default
import d3tip from 'd3-tip';
import sanitizeHtml from 'sanitize-html';

import type {
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
import type {
  ComponentsClassNames,
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

/** Strips all HTML tags from a value before inserting it into tooltip markup. */
const esc = (v: unknown): string =>
  sanitizeHtml(String(v ?? ''), { allowedTags: [], allowedAttributes: {} });

/** Initialises d3-tip tooltip instances for each well component, respecting the `tooltipConfig` allow-list. Skips re-initialisation if the SVG was already set up. */
export const populateTooltips = (
  svg: SvgSelection,
  customClasses: ComponentsClassNames,
  units: Units,
  tooltipConfig?: TooltipKey[] | false,
) => {
  type WithNode = { node?: () => Element | null };
  const svgEl =
    typeof (svg as WithNode).node === 'function'
      ? (svg as { node: () => Element | null }).node()
      : null;
  if (svgEl?.getAttribute('data-tooltips-init') === 'true') {
    return {} as Record<
      string,
      { show: (...a: unknown[]) => void; hide: (...a: unknown[]) => void }
    >;
  }

  const tipsText = {
    geology: (_: unknown, d: Lithology) => `
        <span class="${customClasses.tooltip.title}">Litologia</span>
        <span class="${customClasses.tooltip.primaryInfo}">De ${esc(formatLength(d.from, units.length))} ${esc(units.length)} até ${esc(formatLength(d.to, units.length))} ${esc(units.length)}</span>
        <span class="${customClasses.tooltip.secondaryInfo}"><strong>Descrição:</strong> ${esc(d.description)}</span>
        ${d.geologic_unit ? `<span class="${customClasses.tooltip.secondaryInfo}"><strong>Unidade geológica:</strong> ${esc(d.geologic_unit)}</span>` : ''}
        ${d.aquifer_unit ? `<span class="${customClasses.tooltip.secondaryInfo}"><strong>Unidade aquífera:</strong> ${esc(d.aquifer_unit)}</span>` : ''}
      `,
    hole: (_: unknown, d: BoreHole) => `
        <span class="${customClasses.tooltip.title}">FURO</span>
        <span class="${customClasses.tooltip.primaryInfo}">De ${esc(formatLength(d.from, units.length))} ${esc(units.length)} até ${esc(formatLength(d.to, units.length))} ${esc(units.length)}</span>
        <span class="${customClasses.tooltip.secondaryInfo}"><strong>Diâmetro:</strong>${esc(formatDiameter(d.diameter, units.diameter))} ${esc(units.diameter)}</span>
        `,
    surfaceCase: (_: unknown, d: SurfaceCase) => `
            <span class="${customClasses.tooltip.title}">TUBO DE BOCA</span>
            <span class="${customClasses.tooltip.primaryInfo}">De ${esc(formatLength(d.from, units.length))} ${esc(units.length)} até ${esc(formatLength(d.to, units.length))} ${esc(units.length)}</span>
            <span class="${customClasses.tooltip.secondaryInfo}"><strong>Diâmetro:</strong>${esc(formatDiameter(d.diameter, units.diameter))} ${esc(units.diameter)}</span>
          `,
    holeFill: (_: unknown, d: HoleFill) => `
          <span class="${customClasses.tooltip.title}">ESP. ANULAR</span>
          <span class="${customClasses.tooltip.primaryInfo}">De ${esc(formatLength(d.from, units.length))} ${esc(units.length)} até ${esc(formatLength(d.to, units.length))} ${esc(units.length)}</span>
          <span class="${customClasses.tooltip.secondaryInfo}"><strong>Diâmetro:</strong>${esc(formatDiameter(d.diameter, units.diameter))} ${esc(units.diameter)}</span>
          <span class="${customClasses.tooltip.secondaryInfo}">
            <strong>Descrição:</strong> ${esc(d.description)}
          </span>
          `,
    wellCase: (_: unknown, d: WellCase) => `
          <span class="${customClasses.tooltip.title}">REVESTIMENTO</span>
              <span class="${customClasses.tooltip.primaryInfo}">De ${esc(formatLength(d.from, units.length))} ${esc(units.length)} até ${esc(formatLength(d.to, units.length))} ${esc(units.length)}</span>
              <span class="${customClasses.tooltip.secondaryInfo}">
                <strong>Diâmetro:</strong> ${esc(formatDiameter(d.diameter, units.diameter))} ${esc(units.diameter)}
              </span>
              <span class="${customClasses.tooltip.secondaryInfo}"><strong>Tipo:</strong> ${esc(d.type)}</span>
          `,
    wellScreen: (_: unknown, d: WellScreen) => `
          <span class="${customClasses.tooltip.title}">FILTROS</span>
              <span class="${customClasses.tooltip.primaryInfo}">De ${esc(formatLength(d.from, units.length))} ${esc(units.length)} até ${esc(formatLength(d.to, units.length))} ${esc(units.length)}</span>
              <span class="${customClasses.tooltip.secondaryInfo}">
                <strong>Diâmetro:</strong> ${esc(formatDiameter(d.diameter, units.diameter))} ${esc(units.diameter)}</span>
              <span class="${customClasses.tooltip.secondaryInfo}"><strong>Tipo:</strong> ${esc(d.type)}</span>
              <span class="${customClasses.tooltip.secondaryInfo}">
                <strong>Ranhura:</strong> ${esc(d.screen_slot_mm)} mm
              </span>
          `,
    conflict: (_: unknown, d: { from: number; to: number }) => `
          <span class="${customClasses.tooltip.title}">CONFLITO</span>
          <span class="${customClasses.tooltip.primaryInfo}">De ${esc(formatLength(d.from, units.length))} ${esc(units.length)} até ${esc(formatLength(d.to, units.length))} ${esc(units.length)}</span>
        `,
    fracture: (_: unknown, d: Fracture) => {
      const title = d.swarm ? 'ENXAME DE FRATURAS' : 'FRATURA';
      return `
          <span class="${customClasses.tooltip.title}">${title}</span>
          <span class="${customClasses.tooltip.primaryInfo}"><strong>Profundidade:</strong> ${esc(formatLength(d.depth, units.length))} ${esc(units.length)}</span>
          ${d.water_intake ? `<span class="${customClasses.tooltip.secondaryInfo}"><strong>Entrada d'água:</strong> ${esc(formatLength(d.depth, units.length))} ${esc(units.length)}</span>` : ''}
          <span class="${customClasses.tooltip.secondaryInfo}"><strong>Mergulho:</strong> ${esc(d.dip)}°</span>
          <span class="${customClasses.tooltip.secondaryInfo}"><strong>Azimute:</strong> ${esc(d.azimuth)}°</span>
          ${d.description ? `<span class="${customClasses.tooltip.secondaryInfo}"><strong>Descrição:</strong> ${esc(d.description)}</span>` : ''}
        `;
    },
    cementPad: (_: unknown, d: CementPad) => `
          <span class="${customClasses.tooltip.title}">LAJE DE PROTEÇÃO</span>
          <span class="${customClasses.tooltip.primaryInfo}">${esc(d.type)}</span>
          <span class="${customClasses.tooltip.secondaryInfo}"><strong>Espessura:</strong>
          ${esc(formatLength(d.thickness, units.length))} ${esc(units.length)}</span>
          <span class="${customClasses.tooltip.secondaryInfo}">
            <strong>Largura:</strong> ${esc(formatLength(d.width, units.length))} ${esc(units.length)}
          </span>
          <span class="${customClasses.tooltip.secondaryInfo}">
            <strong>Comprimento:</strong> ${esc(formatLength(d.length, units.length))} ${esc(units.length)}
          </span>
        `,
    cave: (_: unknown, d: Cave) => `
          <span class="${customClasses.tooltip.title}">CAVERNA</span>
          <span class="${customClasses.tooltip.primaryInfo}">De ${esc(formatLength(d.from, units.length))} ${esc(units.length)} até ${esc(formatLength(d.to, units.length))} ${esc(units.length)}</span>
          ${d.water_intake ? `<span class="${customClasses.tooltip.secondaryInfo}"><strong>Entrada d'água</strong></span>` : ''}
          ${d.description ? `<span class="${customClasses.tooltip.secondaryInfo}"><strong>Descrição:</strong> ${esc(d.description)}</span>` : ''}
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

  svgEl?.setAttribute('data-tooltips-init', 'true');

  return tooltips;
};
