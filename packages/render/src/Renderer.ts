// TODO use only the need parts of d3 instead of importing the whole library, which will reduce bundle size and improve performance
import * as d3module from 'd3';
// eslint-disable-next-line import-x/default
import d3tip from 'd3-tip';

import { defu } from 'defu';
import {
  createWellTextures,
  type WellTextures,
} from './configs/render.textures';

const d3 = Object.assign(d3module, { tip: d3tip });

import {
  isWellEmpty,
  type Constructive,
  type SurfaceCase,
  type Units,
  type Well,
} from '@welldot/core';
import { getProfileLastItemsDepths } from '@welldot/utils';
import {
  ComponentsClassNames,
  DeepPartial,
  DrawContext,
  DrawGroups,
  Highlights,
  InstanceState,
  RenderConfig,
  SvgInstance,
  SvgSelection,
  WellTheme,
} from '~/types/render.types';
import { getLengthUnit } from '~/utils/format.utils';
import { DEFAULT_COMPONENTS_CLASS_NAMES } from './configs/render.classnames';
import {
  DEFAULT_WELL_THEME,
  INTERACTIVE_RENDER_CONFIG,
} from './configs/render.configs';
import { drawAnnotationLabels } from './renderers/annotation-labels.renderer';
import { drawCaves } from './renderers/caves.renderer';
import { drawConstructionLabels } from './renderers/construction-labels.renderer';
import { drawConstructive } from './renderers/construction.renderer';
import { drawFractures } from './renderers/fractures.renderer';
import { drawHighlights } from './renderers/highlights.renderer';
import { drawWellLegend } from './renderers/legend.renderer';
import { drawLithology } from './renderers/lithology.renderer';
import { drawUnitLabels } from './renderers/unit-labels.renderer';
import { asSvgElement } from './utils/d3.utils';
import { buildSvgStyleBlock } from './utils/render.styles';
import {
  filterByDepth,
  populateTooltips,
  preloadFgdcTextures,
} from './utils/render.utils';

/**
 * SVG-based renderer for geological well profiles.
 *
 * One instance manages one or more SVG panels (multi-panel layouts for long wells).
 * Call `prepareSvg()` once to initialise the DOM and preload textures, then call
 * `draw(profile)` whenever the profile data changes.
 *
 * @example
 * ```ts
 * const renderer = new WellRenderer(
 *   [{ selector: '#well-svg', height: 600, width: 300, margins: { top: 20, right: 10, bottom: 20, left: 40 } }],
 *   { renderConfig: INTERACTIVE_RENDER_CONFIG },
 * );
 * await renderer.prepareSvg();
 * renderer.draw(profile);
 * ```
 */
export class WellRenderer {
  private svgInstances: SvgInstance[] = [];
  private instanceStates: InstanceState[] = [];
  private textures: WellTextures = createWellTextures();
  private onError?: (err: Error) => void;

  classes = DEFAULT_COMPONENTS_CLASS_NAMES;
  private renderConfig: RenderConfig = INTERACTIVE_RENDER_CONFIG;
  private theme: WellTheme = DEFAULT_WELL_THEME;
  private units: Units = {
    length: 'm',
    diameter: 'mm',
  };

  /**
   * @param svgs - One entry per SVG panel; multi-entry for split-panel layouts.
   * @param options.classNames - Override default BEM CSS class names.
   * @param options.units - Active measurement units (`length` and `diameter`).
   * @param options.renderConfig - Rendering behaviour (zoom, pan, animation, layout). Defaults to `INTERACTIVE_RENDER_CONFIG`.
   * @param options.theme - Visual theme overrides. Merged on top of `DEFAULT_WELL_THEME`.
   * @param options.onError - Called when a draw error occurs (e.g., a renderer throws). Falls back to `console.error` if omitted.
   */
  constructor(
    svgs: SvgInstance[],
    options: {
      classNames?: DeepPartial<ComponentsClassNames>;
      units?: Units;
      renderConfig?: DeepPartial<RenderConfig>;
      theme?: DeepPartial<WellTheme>;
      onError?: (err: Error) => void;
    } = {},
  ) {
    if (svgs.length === 0) {
      console.warn(
        '[WellRenderer] No SVG instances provided. The renderer will be a no-op.',
      );
      return;
    }
    this.svgInstances = svgs;
    if (options.onError) this.onError = options.onError;

    if (options.classNames) {
      this.classes = defu(
        options.classNames,
        DEFAULT_COMPONENTS_CLASS_NAMES,
      ) as ComponentsClassNames;
    }

    if (options.units) {
      this.units = { ...this.units, ...options.units };
    }

    if (options.renderConfig) {
      this.renderConfig = defu(
        options.renderConfig,
        INTERACTIVE_RENDER_CONFIG,
      ) as RenderConfig;
    }

    this.theme = defu(options.theme ?? {}, DEFAULT_WELL_THEME) as WellTheme;

    this.textures = createWellTextures(this.renderConfig.textures);
  }

  private initInstanceSvg(inst: SvgInstance, index: number): InstanceState {
    const clipId = `fractures-clip-${index}`;
    const clipRectId = `fractures-clip-rect-${index}`;
    const { selector, height, width, margins } = inst;
    const svgWidth = width + margins.left + margins.right;
    const svgHeight = height + margins.top + margins.bottom;

    const svg = d3.select(selector) as SvgSelection;
    svg.selectAll('*').remove();

    svg.attr('height', svgHeight).attr('width', svgWidth);

    const defs = svg.append('defs');
    defs.append('style').text(buildSvgStyleBlock(this.theme));
    defs
      .append('clipPath')
      .attr('id', clipId)
      .append('rect')
      .attr('id', clipRectId)
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 100000)
      .attr('height', 10000);

    const poco = svg.append('g').attr('class', this.classes.wellGroup);

    const geologic = poco
      .append('g')
      .attr('class', this.classes.geologicGroup)
      .attr('transform', `translate(${margins.left}, ${margins.top})`);

    geologic.append('g').attr('class', this.classes.yAxis);
    geologic.append('g').attr('class', this.classes.unitLabels.group);
    geologic.append('g').attr('class', this.classes.lithology.group);
    geologic.append('g').attr('class', this.classes.caves.group);
    geologic.append('g').attr('class', this.classes.labels.lithology.group);
    geologic.append('g').attr('class', this.classes.highlights.geologicGroup);

    const construction = poco
      .append('g')
      .attr('class', this.classes.constructionGroup)
      .attr(
        'transform',
        `translate(${margins.left + width / 2}, ${margins.top})`,
      );

    const fracturesGroup = poco
      .append('g')
      .attr('class', this.classes.fractures.group)
      .attr('transform', `translate(${margins.left}, ${margins.top})`)
      .attr('clip-path', `url(#${clipId})`);

    fracturesGroup
      .append('g')
      .attr('class', this.classes.highlights.fracturesGroup);

    construction
      .append('g')
      .attr('class', this.classes.constructionLabels.group);
    construction.append('g').attr('class', this.classes.cementPad.group);
    construction.append('g').attr('class', this.classes.boreHole.group);
    construction.append('g').attr('class', this.classes.surfaceCase.group);
    construction.append('g').attr('class', this.classes.holeFill.group);
    construction.append('g').attr('class', this.classes.wellCase.group);
    construction.append('g').attr('class', this.classes.wellScreen.group);
    construction.append('g').attr('class', this.classes.conflict.group);
    construction
      .append('g')
      .attr('class', this.classes.highlights.constructionGroup);

    Object.values(this.textures).forEach(texture => svg.call(texture));

    return { svg, height, width, margins, clipId, clipRectId };
  }

  /** Renders a standalone legend into the element matched by `selector`. */
  public renderLegend(selector: string, profile: Well): void {
    drawWellLegend(selector, profile, {
      config: this.renderConfig.legend,
      theme: this.theme,
      classNames: this.classes.legend,
      textures: this.renderConfig.textures,
    });
  }

  /**
   * Initialises the SVG DOM structure and preloads FGDC textures.
   * Must be called once before the first `draw()`.
   */
  public async prepareSvg() {
    await preloadFgdcTextures();
    this.instanceStates = this.svgInstances.map((inst, i) =>
      this.initInstanceSvg(inst, i),
    );
  }

  /**
   * Renders the well profile into all configured SVG panels.
   * @param profile - The well data to render.
   * @param options.units - Override the instance-level measurement units for this render.
   * @param options.highlights - Highlight overlays to display on top of the profile.
   */
  draw(
    profile: Well,
    options: { units?: Units; highlights?: Highlights } = {},
  ) {
    if (isWellEmpty(profile)) return;
    this.units = { ...this.units, ...options.units };
    const highlights = options.highlights ?? {};

    const maxValues = getProfileLastItemsDepths(profile);
    const maxYValues = d3.max(maxValues) || 0;

    if (this.instanceStates.length === 1) {
      this.drawLogToInstance(
        this.instanceStates[0],
        profile,
        0,
        maxYValues,
        highlights,
      );
      return;
    }

    const totalHeight =
      this.instanceStates.reduce((s, st) => s + st.height, 0) || 1;
    const yScaleGlobal = d3
      .scaleLinear()
      .domain([0, maxYValues])
      .range([0, totalHeight]);

    let currentDepth = 0;
    for (const state of this.instanceStates) {
      const maxSvgDepth = yScaleGlobal.invert(
        yScaleGlobal(currentDepth) + state.height,
      );
      this.drawLogToInstance(
        state,
        profile,
        currentDepth,
        maxSvgDepth,
        highlights,
      );
      currentDepth = maxSvgDepth;
    }
  }

  private drawLogToInstance(
    state: InstanceState,
    profile: Well,
    depthFrom: number,
    depthTo: number,
    highlights: Highlights = {},
  ) {
    const svg = state.svg;

    const pocoGroup = svg.select(`.${this.classes.wellGroup}`);
    const lithologyGroup = svg.select(`.${this.classes.lithology.group}`);
    const fracturesGroup = svg.select(`.${this.classes.fractures.group}`);
    const cavesGroup = svg.select(`.${this.classes.caves.group}`);
    const lithologyLabelsGroup = svg.select(
      `.${this.classes.labels.lithology.group}`,
    );
    const constructionGroup = svg.select(`.${this.classes.constructionGroup}`);
    const cementPadGroup = svg.select(`.${this.classes.cementPad.group}`);
    const holeGroup = svg.select(`.${this.classes.boreHole.group}`);
    const surfaceCaseGroup = svg.select(`.${this.classes.surfaceCase.group}`);
    const holeFillGroup = svg.select(`.${this.classes.holeFill.group}`);
    const wellCaseGroup = svg.select(`.${this.classes.wellCase.group}`);
    const wellScreenGroup = svg.select(`.${this.classes.wellScreen.group}`);
    const conflictGroup = svg.select(`.${this.classes.conflict.group}`);
    const constructionLabelsGroup = svg.select(
      `.${this.classes.constructionLabels.group}`,
    );
    const highlightsGeologicGroup = svg.select(
      `.${this.classes.highlights.geologicGroup}`,
    );
    const highlightsConstructionGroup = svg.select(
      `.${this.classes.highlights.constructionGroup}`,
    );
    const highlightsFracturesGroup = svg.select(
      `.${this.classes.highlights.fracturesGroup}`,
    );
    const unitLabelsGroup = svg.select(`.${this.classes.unitLabels.group}`);

    const svgWidth = state.width + state.margins.left + state.margins.right;
    const svgHeight = state.height + state.margins.top + state.margins.bottom;
    const { pocoWidthRatio, pocoCenterRatio } = this.renderConfig.layout;
    const POCO_WIDTH = svgWidth * pocoWidthRatio;
    const POCO_CENTER = svgWidth * pocoCenterRatio;

    const { duration, ease } = this.renderConfig.animation;
    const transition = d3.transition().duration(duration).ease(ease);

    const tooltips = populateTooltips(
      svg,
      this.classes,
      this.units,
      this.renderConfig.tooltips,
    );

    const { xLeft: geoXLeft, xRightInset: geoXRightInset } =
      this.renderConfig.geologic;
    const geoXRight = svgWidth - geoXRightInset;
    const pocoCenterX = state.width / 2 + POCO_CENTER / 2;

    const geologicData = {
      lithology: profile.lithology,
      fractures: profile.fractures,
      caves: profile.caves,
    };
    const constructionData = {
      cement_pad: profile.cement_pad,
      bore_hole: profile.bore_hole,
      hole_fill: profile.hole_fill,
      surface_case: profile.surface_case,
      well_case: profile.well_case,
      well_screen: profile.well_screen,
      reduction: profile.reduction,
      fractures: profile.fractures,
    } as Constructive;

    const contentHeight = svgHeight - state.margins.top - state.margins.bottom;

    const yScaleLocal = d3
      .scaleLinear()
      .domain([depthFrom, depthTo])
      .range([0, contentHeight]);

    const depthFactor = this.units.length === 'ft' ? 3.28084 : 1;
    const yScaleAxis = d3
      .scaleLinear()
      .domain([depthFrom * depthFactor, depthTo * depthFactor])
      .range([0, contentHeight]);

    const yAxis = d3
      .axisLeft(yScaleAxis)
      .tickFormat(
        (d: d3module.NumberValue) => `${d}${getLengthUnit(this.units.length)}`,
      );

    const gY = svg.select<SVGGElement>(`.${this.classes.yAxis}`).call(yAxis);

    gY.select('.domain')
      .attr('stroke', this.theme.labels.color)
      .attr('fill', 'none');
    gY.selectAll('.tick line').attr('stroke', this.theme.labels.color);
    gY.selectAll('.tick text')
      .attr('fill', this.theme.labels.color)
      .attr('stroke', 'none')
      .attr(
        'font-size',
        this.theme.labels.scaleFontSize ?? this.theme.labels.fontSize,
      )
      .attr(
        'font-family',
        this.theme.labels.scaleFont ??
          this.theme.labels.bodyFont ??
          'sans-serif',
      );

    type SpanDatum = { from?: number; to?: number; thickness?: number };

    const spanY = (d: SpanDatum): number => {
      if (d.thickness) return yScaleLocal(0) - yScaleLocal(d.thickness);
      return yScaleLocal(Math.max(d.from ?? 0, depthFrom));
    };

    const spanH = (d: SpanDatum): number => {
      if (d.thickness) return yScaleLocal(d.thickness) - yScaleLocal(0);
      return Math.max(
        0,
        yScaleLocal(Math.min(d.to ?? 0, depthTo)) -
          yScaleLocal(Math.max(d.from ?? 0, depthFrom)),
      );
    };

    const groups: DrawGroups = {
      lithologyGroup,
      unitLabelsGroup,
      cavesGroup,
      fracturesGroup,
      lithologyLabelsGroup,
      constructionGroup,
      constructionLabelsGroup,
      cementPadGroup,
      holeGroup,
      surfaceCaseGroup,
      holeFillGroup,
      wellCaseGroup,
      wellScreenGroup,
      conflictGroup,
      highlightsGeologicGroup,
      highlightsConstructionGroup,
      highlightsFracturesGroup,
    };

    const ctx: DrawContext = {
      svg,
      state,
      svgWidth,
      svgHeight,
      POCO_WIDTH,
      POCO_CENTER,
      pocoCenterX,
      geoXLeft,
      geoXRight,
      depthFrom,
      depthTo,
      yScale: yScaleLocal,
      transition,
      tooltips,
      renderConfig: this.renderConfig,
      theme: this.theme,
      classes: this.classes,
      textures: this.textures,
      units: this.units,
      constructionData,
      groups,
    };

    const inDepth = filterByDepth(depthFrom, depthTo);
    const filteredConstruction = {
      ...constructionData,
      bore_hole: constructionData.bore_hole.filter(inDepth),
      hole_fill: constructionData.hole_fill.filter(inDepth),
      surface_case: constructionData.surface_case.filter(inDepth),
      well_case: constructionData.well_case.filter(inDepth),
      well_screen: constructionData.well_screen.filter(inDepth),
      reduction: constructionData.reduction?.filter(inDepth) ?? [],
    };

    const zooming = (e: { transform: d3module.ZoomTransform }): void => {
      const transform = e.transform;
      const zoomedCtx: DrawContext = {
        ...ctx,
        yScale: transform.rescaleY(yScaleLocal),
      };

      gY.call(yAxis.scale(transform.rescaleY(yScaleAxis)));

      pocoGroup
        .selectAll('rect')
        .attr('y', (d: unknown) => {
          if (!d) return null;
          return transform.applyY(spanY(d as SpanDatum));
        })
        .attr('height', (d: unknown) => {
          if (!d) return null;
          return transform.k * spanH(d as SpanDatum);
        });

      // Surface case: update fill rect y/height and side line y1/y2
      surfaceCaseGroup
        .selectAll(`g.${this.classes.surfaceCase.rect}`)
        .each((d: unknown, i, nodes) => {
          if (!d) return;
          const sc = d as SurfaceCase;
          const g = d3.select(nodes[i] as Element);
          const y = transform.applyY(spanY(sc));
          const h = transform.k * spanH(sc);
          g.select('.surface-case-fill').attr('y', y).attr('height', h);
          g.selectAll('.surface-case-side')
            .attr('y1', y)
            .attr('y2', y + h);
        });

      // Fractures: recompute transform so rotation pivot tracks the scaled depth
      fracturesGroup
        .selectAll(`g.${this.classes.fractures.item}`)
        .attr('transform', (d: unknown) => {
          if (!d) return null;
          const f = d as { depth: number; dip: number };
          const cx = pocoCenterX;
          const cy = transform.applyY(yScaleLocal(f.depth));
          return `translate(0,${cy}) rotate(${f.dip},${cx},0)`;
        });

      // Delegated redraws — unconditional, each renderer self-guards:
      drawCaves(zoomedCtx, geologicData.caves?.filter(inDepth) ?? []);
      drawUnitLabels(zoomedCtx, profile.lithology?.filter(inDepth) ?? []);
      drawAnnotationLabels(zoomedCtx, {
        lithology: profile.lithology?.filter(inDepth) ?? [],
        fractures:
          profile.fractures?.filter(
            f => f.depth >= depthFrom && f.depth < depthTo,
          ) ?? [],
        caves: profile.caves?.filter(inDepth) ?? [],
      });
      drawConstructionLabels(zoomedCtx, {
        well_case: constructionData.well_case.filter(inDepth),
        well_screen: constructionData.well_screen.filter(inDepth),
      });
      drawHighlights(zoomedCtx, highlights);
    };

    const drawProfile = () => {
      drawLithology(ctx, profile.lithology?.filter(inDepth) ?? []);
      drawUnitLabels(ctx, profile.lithology?.filter(inDepth) ?? []);
      drawAnnotationLabels(ctx, {
        lithology: profile.lithology?.filter(inDepth) ?? [],
        fractures:
          profile.fractures?.filter(
            f => f.depth >= depthFrom && f.depth < depthTo,
          ) ?? [],
        caves: profile.caves?.filter(inDepth) ?? [],
      });
      drawCaves(ctx, profile.caves?.filter(inDepth) ?? []);
      drawFractures(
        ctx,
        profile.fractures?.filter(
          // exclusive upper bound: depthTo is the start of the next panel
          f => f.depth >= depthFrom && f.depth < depthTo,
        ) ?? [],
      );
      drawConstructive(ctx, filteredConstruction);
      drawConstructionLabels(ctx, {
        well_case: filteredConstruction.well_case,
        well_screen: filteredConstruction.well_screen,
      });
      svg.select(`#${state.clipRectId}`).attr('y', 0).attr('height', svgHeight);
      drawHighlights(ctx, highlights);
    };

    try {
      drawProfile();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (this.onError) {
        this.onError(error);
      } else {
        console.error('[WellRenderer] drawProfile failed:', error);
      }
    }

    const { zoom: zoomEnabled, pan: panEnabled } = this.renderConfig;
    if (zoomEnabled || panEnabled) {
      const zoomNode = d3.zoom<SVGSVGElement, unknown>();
      if (zoomEnabled || panEnabled) zoomNode.on('zoom', zooming);
      if (!zoomEnabled) zoomNode.scaleExtent([1, 1]);
      if (!panEnabled)
        zoomNode.filter(e => e.type === 'wheel' || e.type === 'dblclick');
      asSvgElement<SVGSVGElement>(svg).call(zoomNode);

      const initialZoom = this.renderConfig.zoomLevel ?? 1;
      if (initialZoom !== 1) {
        asSvgElement<SVGSVGElement>(svg).call(
          zoomNode.transform,
          d3.zoomIdentity.scale(initialZoom),
        );
      }
    }
  }
}

export default {
  WellRenderer,
};
