// TODO remove this dependency on d3-tip by implementing our own tooltip logic using plain divs and mouse events, which will also allow us to support touch devices
// eslint-disable-next-line import-x/default
import d3tip from 'd3-tip';
import sanitizeHtml from 'sanitize-html';

import type {
  BoreHole,
  Cave,
  CementPad,
  Centralizer,
  Fracture,
  HoleFill,
  Lithology,
  PumpInstallation,
  Reduction,
  SurfaceCase,
  Units,
  WellCase,
  WellScreen,
} from '@welldot/core';
import {
  CEMENT_PAD_TYPES,
  CENTRALIZER_TYPES,
  CONSTRUCTION_MATERIALS,
  getVocabLabel,
  powerFromCanonical,
} from '@welldot/core';
import { formatNumber } from '@welldot/utils';
import type {
  ComponentsClassNames,
  SvgSelection,
  TooltipKey,
  TooltipLabels,
} from '~/types/render.types';
import {
  formatDiameter,
  formatLength,
  getDiameterUnit,
  getLengthUnit,
} from '~/utils/format.utils';

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

type CachedTooltips = Record<
  string,
  D3Tip | { show: () => void; hide: () => void }
>;

const _tooltipCache = new WeakMap<
  Element,
  { signature: string; tooltips: CachedTooltips }
>();

/**
 * Initialises d3-tip tooltip instances for each well component, respecting the
 * `tooltipConfig` allow-list. Caches instances per SVG element to prevent
 * duplicate DOM nodes on re-render, but only while `units`/`tooltipConfig`/
 * `labels`/`locale` are unchanged — a redraw after any of those change (e.g.
 * the user switches unit or language) regenerates the tooltip content instead
 * of returning stale HTML from the first render.
 */
export const populateTooltips = (
  svg: SvgSelection,
  customClasses: ComponentsClassNames,
  units: Units,
  tooltipConfig: TooltipKey[] | false | undefined,
  labels: TooltipLabels,
  locale: 'en' | 'pt',
) => {
  type WithNode = { node?: () => Element | null };
  const svgEl =
    typeof (svg as WithNode).node === 'function'
      ? (svg as { node: () => Element | null }).node()
      : null;
  const signature = JSON.stringify({ units, tooltipConfig, labels, locale });
  const cached = svgEl ? _tooltipCache.get(svgEl) : undefined;
  if (cached && cached.signature === signature) {
    return cached.tooltips;
  }

  const material = (value: string) =>
    getVocabLabel(CONSTRUCTION_MATERIALS, value, locale);

  const tipsText = {
    geology: (_: unknown, d: Lithology) => `
        <span class="${customClasses.tooltip.title}">${labels.geology.title}</span>
        <span class="${customClasses.tooltip.primaryInfo}">${labels.common.from} ${esc(formatLength(d.from, units.length, locale))} ${esc(getLengthUnit(units.length))} ${labels.common.to} ${esc(formatLength(d.to, units.length, locale))} ${esc(getLengthUnit(units.length))}</span>
        <span class="${customClasses.tooltip.secondaryInfo}"><strong>${labels.common.description}</strong> ${esc(d.description)}</span>
        ${d.geologic_unit ? `<span class="${customClasses.tooltip.secondaryInfo}"><strong>${labels.geology.geologicUnit}</strong> ${esc(d.geologic_unit)}</span>` : ''}
        ${d.aquifer_unit ? `<span class="${customClasses.tooltip.secondaryInfo}"><strong>${labels.geology.aquiferUnit}</strong> ${esc(d.aquifer_unit)}</span>` : ''}
      `,
    hole: (_: unknown, d: BoreHole) => `
        <span class="${customClasses.tooltip.title}">${labels.hole.title}</span>
        <span class="${customClasses.tooltip.primaryInfo}">${labels.common.from} ${esc(formatLength(d.from, units.length, locale))} ${esc(getLengthUnit(units.length))} ${labels.common.to} ${esc(formatLength(d.to, units.length, locale))} ${esc(getLengthUnit(units.length))}</span>
        <span class="${customClasses.tooltip.secondaryInfo}"><strong>${labels.common.diameter}</strong>${esc(formatDiameter(d.diameter, units.diameter, locale))} ${esc(getDiameterUnit(units.diameter, locale))}</span>
        `,
    surfaceCase: (_: unknown, d: SurfaceCase) => `
            <span class="${customClasses.tooltip.title}">${labels.surfaceCase.title}</span>
            <span class="${customClasses.tooltip.primaryInfo}">${labels.common.from} ${esc(formatLength(d.from, units.length, locale))} ${esc(getLengthUnit(units.length))} ${labels.common.to} ${esc(formatLength(d.to, units.length, locale))} ${esc(getLengthUnit(units.length))}</span>
            <span class="${customClasses.tooltip.secondaryInfo}"><strong>${labels.common.diameter}</strong>${esc(formatDiameter(d.diameter, units.diameter, locale))} ${esc(getDiameterUnit(units.diameter, locale))}</span>
          `,
    holeFill: (_: unknown, d: HoleFill) => `
          <span class="${customClasses.tooltip.title}">${labels.holeFill.title}</span>
          <span class="${customClasses.tooltip.primaryInfo}">${labels.common.from} ${esc(formatLength(d.from, units.length, locale))} ${esc(getLengthUnit(units.length))} ${labels.common.to} ${esc(formatLength(d.to, units.length, locale))} ${esc(getLengthUnit(units.length))}</span>
          <span class="${customClasses.tooltip.secondaryInfo}"><strong>${labels.common.diameter}</strong>${esc(formatDiameter(d.diameter, units.diameter, locale))} ${esc(getDiameterUnit(units.diameter, locale))}</span>
          <span class="${customClasses.tooltip.secondaryInfo}">
            <strong>${labels.common.description}</strong> ${esc(d.description)}
          </span>
          `,
    wellCase: (_: unknown, d: WellCase) => `
          <span class="${customClasses.tooltip.title}">${labels.wellCase.title}</span>
              <span class="${customClasses.tooltip.primaryInfo}">${labels.common.from} ${esc(formatLength(d.from, units.length, locale))} ${esc(getLengthUnit(units.length))} ${labels.common.to} ${esc(formatLength(d.to, units.length, locale))} ${esc(getLengthUnit(units.length))}</span>
              <span class="${customClasses.tooltip.secondaryInfo}">
                <strong>${labels.common.diameter}</strong> ${esc(formatDiameter(d.diameter, units.diameter, locale))} ${esc(getDiameterUnit(units.diameter, locale))}
              </span>
              <span class="${customClasses.tooltip.secondaryInfo}"><strong>${labels.common.type}</strong> ${esc(material(d.type))}</span>
          `,
    wellScreen: (_: unknown, d: WellScreen) => `
          <span class="${customClasses.tooltip.title}">${labels.wellScreen.title}</span>
              <span class="${customClasses.tooltip.primaryInfo}">${labels.common.from} ${esc(formatLength(d.from, units.length, locale))} ${esc(getLengthUnit(units.length))} ${labels.common.to} ${esc(formatLength(d.to, units.length, locale))} ${esc(getLengthUnit(units.length))}</span>
              <span class="${customClasses.tooltip.secondaryInfo}">
                <strong>${labels.common.diameter}</strong> ${esc(formatDiameter(d.diameter, units.diameter, locale))} ${esc(getDiameterUnit(units.diameter, locale))}</span>
              <span class="${customClasses.tooltip.secondaryInfo}"><strong>${labels.common.type}</strong> ${esc(material(d.type))}</span>
              <span class="${customClasses.tooltip.secondaryInfo}">
                <strong>${labels.wellScreen.slot}</strong> ${esc(formatNumber(d.screen_slot, { maximumFractionDigits: 2, locale }))} mm
              </span>
          `,
    reduction: (_: unknown, d: Reduction) => `
          <span class="${customClasses.tooltip.title}">${labels.reduction.title}</span>
              <span class="${customClasses.tooltip.primaryInfo}">${labels.common.from} ${esc(formatLength(d.from, units.length, locale))} ${esc(getLengthUnit(units.length))} ${labels.common.to} ${esc(formatLength(d.to, units.length, locale))} ${esc(getLengthUnit(units.length))}</span>
              <span class="${customClasses.tooltip.secondaryInfo}">
                <strong>${labels.common.diameter}</strong> ${esc(formatDiameter(d.diam_from, units.diameter, locale))} → ${esc(formatDiameter(d.diam_to, units.diameter, locale))} ${esc(getDiameterUnit(units.diameter, locale))}
              </span>
              <span class="${customClasses.tooltip.secondaryInfo}"><strong>${labels.common.type}</strong> ${esc(material(d.type))}</span>
          `,
    centralizer: (_: unknown, d: Centralizer & { depth: number }) => `
          <span class="${customClasses.tooltip.title}">${labels.centralizer.title}</span>
          <span class="${customClasses.tooltip.primaryInfo}"><strong>${labels.centralizer.depth}</strong> ${esc(formatLength(d.depth, units.length, locale))} ${esc(getLengthUnit(units.length))}</span>
          ${d.from !== d.to ? `<span class="${customClasses.tooltip.secondaryInfo}">${labels.common.from} ${esc(formatLength(d.from, units.length, locale))} ${esc(getLengthUnit(units.length))} ${labels.common.to} ${esc(formatLength(d.to, units.length, locale))} ${esc(getLengthUnit(units.length))}</span>` : ''}
          ${d.spacing ? `<span class="${customClasses.tooltip.secondaryInfo}"><strong>${labels.centralizer.spacing}</strong> ${esc(formatLength(d.spacing, units.length, locale))} ${esc(getLengthUnit(units.length))}</span>` : ''}
          <span class="${customClasses.tooltip.secondaryInfo}"><strong>${labels.common.type}</strong> ${esc(getVocabLabel(CENTRALIZER_TYPES, d.type, locale))}</span>
          ${d.diameter ? `<span class="${customClasses.tooltip.secondaryInfo}"><strong>${labels.common.diameter}</strong> ${esc(formatDiameter(d.diameter, units.diameter, locale))} ${esc(getDiameterUnit(units.diameter, locale))}</span>` : ''}
          ${d.description ? `<span class="${customClasses.tooltip.secondaryInfo}"><strong>${labels.common.description}</strong> ${esc(d.description)}</span>` : ''}
        `,
    pump: (_: unknown, d: PumpInstallation) => {
      const typeLabel =
        (labels.pump as Record<string, string>)[`type_${d.type}`] ?? d.type;
      const model = [d.manufacturer, d.model].filter(Boolean).join(' ');
      return `
          <span class="${customClasses.tooltip.title}">${labels.pump.title}</span>
          <span class="${customClasses.tooltip.primaryInfo}">${esc(typeLabel)}</span>
          ${d.intake_depth !== undefined ? `<span class="${customClasses.tooltip.secondaryInfo}"><strong>${labels.pump.intakeDepth}</strong> ${esc(formatLength(d.intake_depth, units.length, locale))} ${esc(getLengthUnit(units.length))}</span>` : ''}
          ${model ? `<span class="${customClasses.tooltip.secondaryInfo}"><strong>${labels.pump.model}</strong> ${esc(model)}</span>` : ''}
          ${d.rated_power !== undefined ? `<span class="${customClasses.tooltip.secondaryInfo}"><strong>${labels.pump.power}</strong> ${esc(formatNumber(powerFromCanonical(d.rated_power, units.power ?? 'kW'), { maximumFractionDigits: 2, locale }))} ${esc(units.power ?? 'kW')}</span>` : ''}
          ${d.riser_diameter !== undefined ? `<span class="${customClasses.tooltip.secondaryInfo}"><strong>${labels.pump.riser}</strong> ${esc(formatDiameter(d.riser_diameter, units.diameter, locale))} ${esc(getDiameterUnit(units.diameter, locale))}${d.riser_material ? ` · ${esc(material(d.riser_material))}` : ''}</span>` : ''}
        `;
    },
    conflict: (_: unknown, d: { from: number; to: number }) => `
          <span class="${customClasses.tooltip.title}">${labels.conflict.title}</span>
          <span class="${customClasses.tooltip.primaryInfo}">${labels.common.from} ${esc(formatLength(d.from, units.length, locale))} ${esc(getLengthUnit(units.length))} ${labels.common.to} ${esc(formatLength(d.to, units.length, locale))} ${esc(getLengthUnit(units.length))}</span>
        `,
    fracture: (_: unknown, d: Fracture) => {
      const title = d.swarm
        ? labels.fracture.titleSwarm
        : labels.fracture.title;
      return `
          <span class="${customClasses.tooltip.title}">${title}</span>
          <span class="${customClasses.tooltip.primaryInfo}"><strong>${labels.fracture.depth}</strong> ${esc(formatLength(d.depth, units.length, locale))} ${esc(getLengthUnit(units.length))}</span>
          ${d.water_intake ? `<span class="${customClasses.tooltip.secondaryInfo}"><strong>${labels.fracture.waterIntake}</strong> ${esc(formatLength(d.depth, units.length, locale))} ${esc(getLengthUnit(units.length))}</span>` : ''}
          ${typeof d.dip === 'number' ? `<span class="${customClasses.tooltip.secondaryInfo}"><strong>${labels.fracture.dip}</strong> ${esc(d.dip)}°</span>` : ''}
          ${typeof d.azimuth === 'number' ? `<span class="${customClasses.tooltip.secondaryInfo}"><strong>${labels.fracture.azimuth}</strong> ${esc(d.azimuth)}°</span>` : ''}
          ${d.description ? `<span class="${customClasses.tooltip.secondaryInfo}"><strong>${labels.common.description}</strong> ${esc(d.description)}</span>` : ''}
        `;
    },
    cementPad: (_: unknown, d: CementPad) => `
          <span class="${customClasses.tooltip.title}">${labels.cementPad.title}</span>
          <span class="${customClasses.tooltip.primaryInfo}">${esc(getVocabLabel(CEMENT_PAD_TYPES, d.type, locale))}</span>
          <span class="${customClasses.tooltip.secondaryInfo}"><strong>${labels.cementPad.thickness}</strong>
          ${esc(formatLength(d.thickness, units.length, locale))} ${esc(getLengthUnit(units.length))}</span>
          <span class="${customClasses.tooltip.secondaryInfo}">
            <strong>${labels.cementPad.width}</strong> ${esc(formatLength(d.width, units.length, locale))} ${esc(getLengthUnit(units.length))}
          </span>
          <span class="${customClasses.tooltip.secondaryInfo}">
            <strong>${labels.cementPad.length}</strong> ${esc(formatLength(d.length, units.length, locale))} ${esc(getLengthUnit(units.length))}
          </span>
        `,
    cave: (_: unknown, d: Cave) => `
          <span class="${customClasses.tooltip.title}">${labels.cave.title}</span>
          <span class="${customClasses.tooltip.primaryInfo}">${labels.common.from} ${esc(formatLength(d.from, units.length, locale))} ${esc(getLengthUnit(units.length))} ${labels.common.to} ${esc(formatLength(d.to, units.length, locale))} ${esc(getLengthUnit(units.length))}</span>
          ${d.water_intake ? `<span class="${customClasses.tooltip.secondaryInfo}"><strong>${labels.cave.waterIntake}</strong></span>` : ''}
          ${d.description ? `<span class="${customClasses.tooltip.secondaryInfo}"><strong>${labels.common.description}</strong> ${esc(d.description)}</span>` : ''}
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

    tooltips[tipTextKey] = (d3tip as unknown as () => D3Tip)()
      .attr('class', customClasses.tooltip.root)
      .direction('e')
      .html(tipsText[tipTextKey]);

    svg.call(
      tooltips[tipTextKey] as unknown as (selection: SvgSelection) => void,
    );
  });

  svgEl?.setAttribute('data-tooltips-init', 'true');
  if (svgEl) _tooltipCache.set(svgEl, { signature, tooltips });

  return tooltips;
};
