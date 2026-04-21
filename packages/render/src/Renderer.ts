// TODO use only the need parts of d3 instead of importing the whole library, which will reduce bundle size and improve performance
import * as d3module from 'd3';
// eslint-disable-next-line import-x/default
import d3tip from 'd3-tip';

import { defu } from 'defu';
import { createWellTextures } from './configs/render.textures';

const d3 = Object.assign(d3module, { tip: d3tip });

import {
  isWellEmpty,
  type BoreHole,
  type Cave,
  type CementPad,
  type Constructive,
  type Fracture,
  type HoleFill,
  type Lithology,
  type SurfaceCase,
  type Units,
  type Well,
  type WellCase,
  type WellScreen,
} from '@welldot/core';
import {
  getProfileDiamValues,
  getProfileLastItemsDepths,
} from '@welldot/utils';
import {
  ComponentsClassNames,
  Conflict,
  CssVarsConfig,
  DeepPartial,
  InstanceState,
  RenderConfig,
  SvgInstance,
  SvgSelection,
} from '~/types/render.types';
import {
  formatDiameter,
  getDiameterUnit,
  getLengthUnit,
} from '~/utils/format.utils';
import {
  CSS_VAR_MAP,
  DEFAULT_COMPONENTS_CLASS_NAMES,
  INTERACTIVE_RENDER_CONFIG,
} from './configs/render.configs';
import {
  getConflictAreas,
  getLithologyFill,
  getYAxisFunctions,
  makeCavePrng,
  mergeConflicts,
  populateTooltips,
  ptsToSmoothPath,
  wavyContact,
} from './utils/render.utils';

const DEFAULTS_TEXTURES = createWellTextures();
export class WellRenderer {
  private svgInstances: SvgInstance[] = [];
  private instanceStates: InstanceState[] = [];

  classes = DEFAULT_COMPONENTS_CLASS_NAMES;
  private renderConfig: RenderConfig = INTERACTIVE_RENDER_CONFIG;
  private units: Units = {
    length: 'm',
    diameter: 'mm',
  };

  constructor(
    svgs: SvgInstance[],
    options: {
      classNames?: DeepPartial<ComponentsClassNames>;
      units?: Units;
      renderConfig?: DeepPartial<RenderConfig>;
    } = {},
  ) {
    if (svgs.length === 0) return;
    console.log('Initializing WellRenderer with SVG instances:', svgs);
    this.svgInstances = svgs;

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

    return this;
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

    if (this.renderConfig.cssVars) {
      const vars = this.renderConfig.cssVars;
      for (const key of Object.keys(vars) as (keyof CssVarsConfig)[]) {
        const val = vars[key];
        if (val !== undefined) svg.style(CSS_VAR_MAP[key], val);
      }
    }

    const defs = svg.append('defs');
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
    geologic
      .append('g')
      .attr('class', this.classes.caves.group)
      .attr('clip-path', `url(#${clipId})`);
    geologic.append('g').attr('class', this.classes.labels.lithology.group);

    const construction = poco
      .append('g')
      .attr('class', this.classes.constructionGroup)
      .attr(
        'transform',
        `translate(${margins.left + width / 2}, ${margins.top})`,
      );

    poco
      .append('g')
      .attr('class', this.classes.fractures.group)
      .attr('transform', `translate(${margins.left}, ${margins.top})`)
      .attr('clip-path', `url(#${clipId})`);

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

    Object.values(DEFAULTS_TEXTURES).forEach(texture => svg.call(texture));

    return { svg, height, width, margins, clipId, clipRectId };
  }

  public async prepareSvg() {
    this.instanceStates = this.svgInstances.map((inst, i) =>
      this.initInstanceSvg(inst, i),
    );
  }

  draw(profile: Well, options: { units?: Units } = {}) {
    if (isWellEmpty(profile)) return;
    this.units = { ...this.units, ...options.units };

    const maxValues = getProfileLastItemsDepths(profile);
    const maxYValues = d3.max(maxValues) || 0;

    if (this.instanceStates.length === 1) {
      this.drawLogToInstance(this.instanceStates[0], profile, 0, maxYValues);
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
      this.drawLogToInstance(state, profile, currentDepth, maxSvgDepth);
      currentDepth = maxSvgDepth;
    }
  }

  private drawLogToInstance(
    state: InstanceState,
    profile: Well,
    depthFrom: number,
    depthTo: number,
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

    // ─────────────────────────────────────────────────────────────────────────
    // updateGeology
    // ─────────────────────────────────────────────────────────────────────────

    const { xLeft: geoXLeft, xRightInset: geoXRightInset } =
      this.renderConfig.geologic;
    const geoXRight = svgWidth - geoXRightInset;
    const pocoCenterX = state.width / 2 + POCO_CENTER / 2;

    const drawLithology = async (data: Lithology[], yScale) => {
      const { getHeight, getYPos } = getYAxisFunctions(yScale, {
        from: depthFrom,
        to: depthTo,
      });

      const rects = lithologyGroup
        .selectAll(`.${this.classes.lithology.rect}`)
        .data(data);

      rects.exit().remove();

      const newLayers = rects
        .enter()
        .append('rect')
        .attr('class', this.classes.lithology.rect)
        .attr('x', geoXLeft)
        .attr('width', geoXRight - geoXLeft)
        .on('mouseover', tooltips.geology.show)
        .on('mouseout', tooltips.geology.hide);

      newLayers
        // @ts-ignore
        .merge(rects)
        .attr('y', getYPos)
        // @ts-ignore
        .transition(transition)
        .attr('height', getHeight)
        .style('fill', getLithologyFill(data, svg));
    };

    // ─────────────────────────────────────────────────────────────────────────
    // drawUnitLabels
    // ─────────────────────────────────────────────────────────────────────────

    const drawUnitLabels = (
      data: Lithology[],
      yScale: d3.ScaleLinear<number, number>,
    ) => {
      const unitLabelsGroup = svg.select(`.${this.classes.unitLabels.group}`);
      unitLabelsGroup.selectAll('*').remove();

      const ru = this.renderConfig.unitLabels;
      const sw = ru.stripWidth;

      const groupByField = (field: 'geologic_unit' | 'aquifer_unit') => {
        const groups: { unit: string; from: number; to: number }[] = [];
        for (const layer of data) {
          const unit = layer[field];
          if (!unit) continue;
          const from = Math.max(layer.from, depthFrom);
          const to = Math.min(layer.to, depthTo);
          if (from >= to) continue;
          const last = groups[groups.length - 1];
          if (last && last.unit === unit) {
            last.to = to;
          } else groups.push({ unit, from, to });
        }
        return groups;
      };

      const hasGeo = data.some(d => d.geologic_unit);
      const hasAq = data.some(d => d.aquifer_unit);

      // Strips start at ru.xOffset (geologic group coordinates).
      // When both exist: geo at xOffset, aq at xOffset + stripWidth + 1.
      const geoX = ru.xOffset;
      const aqX = hasGeo && hasAq ? ru.xOffset + sw + 1 : ru.xOffset;

      const drawStrip = (
        groups: { unit: string; from: number; to: number }[],
        stripX: number,
        rectClass: string,
      ) => {
        groups.forEach((group, idx) => {
          const yTop = yScale(group.from);
          const yBot = yScale(group.to);
          const height = yBot - yTop;
          if (height < 1) return;

          const isFirst = idx === 0;
          const isLast = idx === groups.length - 1;

          unitLabelsGroup
            .append('rect')
            .attr('class', rectClass)
            .attr('x', stripX)
            .attr('y', yTop)
            .attr('width', sw)
            .attr('height', height);

          const appendEdge = (y: number, strokeWidth: number) =>
            unitLabelsGroup
              .append('line')
              .attr('class', 'unit-divider-line')
              .attr('x1', stripX)
              .attr('x2', stripX + sw)
              .attr('y1', y)
              .attr('y2', y)
              .attr('stroke-width', strokeWidth);

          appendEdge(yTop, isFirst ? ru.outerEdgeWidth : ru.innerDividerWidth);
          appendEdge(yBot, isLast ? ru.outerEdgeWidth : ru.innerDividerWidth);

          if (height >= ru.minHeightForText) {
            const maxChars = Math.floor(height / (ru.fontSize * 0.55));
            const label =
              group.unit.length > maxChars
                ? `${group.unit.slice(0, maxChars - 1)}…`
                : group.unit;

            unitLabelsGroup
              .append('text')
              .attr('class', this.classes.unitLabels.text)
              .attr(
                'transform',
                `translate(${(stripX + sw / 2).toFixed(1)},${((yTop + yBot) / 2).toFixed(1)}) rotate(-90)`,
              )
              .attr('text-anchor', 'middle')
              .attr('dominant-baseline', 'middle')
              .attr('font-size', ru.fontSize)
              .text(label);
          }
        });
      };

      if (hasGeo)
        drawStrip(
          groupByField('geologic_unit'),
          geoX,
          this.classes.unitLabels.geoRect,
        );
      if (hasAq)
        drawStrip(
          groupByField('aquifer_unit'),
          aqX,
          this.classes.unitLabels.aqRect,
        );
    };

    // ─────────────────────────────────────────────────────────────────────────
    // updateCaves
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Caves are rendered as full-width lithology-like bands whose top and bottom
     * contacts are irregular and wavy rather than straight horizontal lines.
     *
     * Approach:
     *   1. Use the same x-extents as the lithology rects (x=10 to x=svgWidth-100)
     *      so the cave band visually replaces the lithology fill in that interval.
     *   2. Generate a wavy top contact and a wavy bottom contact using independent
     *      seeded PRNGs so the two edges are uncorrelated (they won't mirror each
     *      other) and every redraw—including zoom—produces identical geometry.
     *   3. Build a single closed SVG path from the two contacts:
     *        top contact (left → right)
     *        → vertical right edge connecting to the bottom contact
     *        → bottom contact (right → left)
     *        → vertical left edge back to start
     *      This gives a wavy-edged filled band exactly like a lithology layer.
     *   4. Stroke the top and bottom contact lines separately so they appear as
     *      distinct, crisp geological contacts on top of the fill.
     *   5. Fill with the cave_dry / cave_wet texture from DEFAULTS_TEXTURES,
     *      registered via svg.call() exactly as every other texture in this file.
     */
    const drawCaves = (data: Cave[], yScale) => {
      cavesGroup.selectAll(`g.${this.classes.caves.item}`).remove();

      const rc = this.renderConfig.caves;

      data.forEach(cave => {
        // Two different seeds so top and bottom contacts are visually independent
        const seedTop = cave.from * 100 + cave.to;
        const seedBot = cave.to * 100 + cave.from + 999;
        const rngTop = makeCavePrng(seedTop);
        const rngBot = makeCavePrng(seedBot);

        const yTop = yScale(cave.from);
        const yBot = yScale(cave.to);
        const span = yBot - yTop; // pixel height of the cave band

        const amp = Math.max(
          rc.amplitude.min,
          Math.min(span * rc.amplitude.ratio, rc.amplitude.max),
        );

        const topPts = wavyContact(
          geoXLeft,
          geoXRight,
          yTop,
          amp,
          rc.pathSteps,
          rngTop,
        );
        const botPts = wavyContact(
          geoXLeft,
          geoXRight,
          yBot,
          amp,
          rc.pathSteps,
          rngBot,
        );

        // Smooth path strings for each contact
        const topPath = ptsToSmoothPath(topPts);
        const botPath = ptsToSmoothPath(botPts);

        // Closed filled region:
        //   top contact L→R  +  right vertical edge down
        //   +  bottom contact R→L (reversed)  +  left vertical edge up  +  Z
        const botReversed = ptsToSmoothPath([...botPts].reverse());
        const closedPath = `${
          topPath
        } L ${geoXRight.toFixed(1)},${botPts[botPts.length - 1][1].toFixed(1)}${
          // Strip the leading 'M x,y' from the reversed bottom path so the
          // concatenated path stays as one continuous sub-path.
          botReversed.replace(/^M [\d.-]+ [\d.-]+/, '')
        } L ${geoXLeft.toFixed(1)},${topPts[0][1].toFixed(1)} Z`;

        const caveTexture = cave.water_intake
          ? DEFAULTS_TEXTURES.cave_wet
          : DEFAULTS_TEXTURES.cave_dry;

        const g = cavesGroup
          .append('g')
          .attr('class', this.classes.caves.item)
          .datum(cave)
          .style('cursor', 'pointer')
          .on('mouseover', tooltips.cave.show)
          .on('mouseout', tooltips.cave.hide);

        g.append('path')
          .attr('class', this.classes.caves.fill)
          .attr('d', closedPath)
          .attr('fill', caveTexture.url())
          .attr('stroke', 'none');

        g.append('path')
          .attr('class', this.classes.caves.contact)
          .attr('data-wet', String(!!cave.water_intake))
          .attr('d', topPath)
          .attr('fill', 'none')
          .attr('stroke-linecap', 'round')
          .attr('stroke-linejoin', 'round');

        g.append('path')
          .attr('class', this.classes.caves.contact)
          .attr('data-wet', String(!!cave.water_intake))
          .attr('d', botPath)
          .attr('fill', 'none')
          .attr('stroke-linecap', 'round')
          .attr('stroke-linejoin', 'round');
      });
    };

    // ─────────────────────────────────────────────────────────────────────────
    // updateFractures
    // ─────────────────────────────────────────────────────────────────────────

    const drawFractures = (data: Fracture[], yScale) => {
      fracturesGroup.selectAll(`g.${this.classes.fractures.item}`).remove();

      const rf = this.renderConfig.fractures;
      const halfWidth = (POCO_WIDTH * rf.widthMultiplier) / 2;
      const xa = pocoCenterX - halfWidth;
      const w = halfWidth * 2;

      const xAt = (nx: number) => xa + nx * w;
      const RC = 'round' as const;

      const makePrng = (seed: number) => {
        let s = Math.abs(seed * 7919) | 1;
        return () => {
          s = (s * 16807) % 2147483647;
          return (s - 1) / 2147483646;
        };
      };

      const wavyLine = (
        rng: () => number,
        steps: number,
        baseY: number,
        jitter: number,
        startInset: number,
        endInset: number,
      ): [number, number][] => {
        const pts: [number, number][] = [];
        for (let i = 0; i < steps; i++) {
          const t = i / (steps - 1);
          const nx = startInset + t * (1 - startInset - endInset);
          const dy = baseY + (rng() * 2 - 1) * jitter;
          pts.push([nx, dy]);
        }
        return pts;
      };

      data.forEach(fracture => {
        const rng = makePrng(fracture.depth);
        const cy = yScale(fracture.depth);

        const g = fracturesGroup
          .append('g')
          .attr('class', this.classes.fractures.item)
          .datum(fracture)
          .attr(
            'transform',
            `translate(0,${cy}) rotate(${fracture.dip},${pocoCenterX},0)`,
          )
          .on('mouseover', tooltips.fracture.show)
          .on('mouseout', tooltips.fracture.hide)
          .style('cursor', 'pointer');

        const hitBuffer = fracture.swarm
          ? rf.hitBuffer.swarm
          : rf.hitBuffer.single;
        g.append('rect')
          .attr('class', this.classes.fractures.hitArea)
          .attr('x', xa)
          .attr('y', -hitBuffer)
          .attr('width', w)
          .attr('height', hitBuffer * 2)
          .attr('fill', 'transparent')
          .style('pointer-events', 'all');

        const isWet = String(!!fracture.water_intake);

        const appendLine = (
          x1: number,
          y1: number,
          x2: number,
          y2: number,
          sw: number,
        ) =>
          g
            .append('line')
            .attr('class', this.classes.fractures.line)
            .attr('data-wet', isWet)
            .attr('x1', x1)
            .attr('y1', y1)
            .attr('x2', x2)
            .attr('y2', y2)
            .attr('stroke-width', sw)
            .attr('stroke-linecap', RC);

        const appendPolyline = (pts: [number, number][], sw: number) =>
          g
            .append('polyline')
            .attr('class', this.classes.fractures.polyline)
            .attr('data-wet', isWet)
            .attr('points', pts.map(([nx, dy]) => `${xAt(nx)},${dy}`).join(' '))
            .attr('stroke-width', sw)
            .attr('fill', 'none')
            .attr('stroke-linecap', RC)
            .attr('stroke-linejoin', RC);

        if (fracture.swarm) {
          const lineCount =
            rf.swarm.lineCountBase +
            Math.round(rng() * rf.swarm.lineCountVariance);
          const halfSpread = rf.swarm.spread / 2;

          const bases = Array.from(
            { length: lineCount },
            () => (rng() * 2 - 1) * halfSpread,
          ).sort((a, b) => a - b);

          bases.forEach((base, idx) => {
            const isCentral = idx === Math.floor(lineCount / 2);
            const sw = isCentral
              ? rf.swarm.centralStrokeWidth
              : rf.swarm.sideStrokeWidthBase +
                rng() * rf.swarm.sideStrokeWidthVariance;
            const steps = 6 + Math.round(rng() * 3);
            const jitter = 0.8 + rng() * 1.2;
            const insetL = 0.04 + rng() * 0.12;
            const insetR = 0.04 + rng() * 0.12;
            appendPolyline(
              wavyLine(rng, steps, base, jitter, insetL, insetR),
              sw,
            );
          });

          const bridgeCount = 2 + Math.round(rng() * 2);
          for (let b = 0; b < bridgeCount; b++) {
            const nx = 0.15 + rng() * 0.7;
            const pairIdx = Math.floor(rng() * (bases.length - 1));
            appendLine(
              xAt(nx),
              bases[pairIdx],
              xAt(nx + (rng() - 0.5) * 0.06),
              bases[pairIdx + 1],
              0.6,
            );
          }

          const primaryBase = bases[Math.floor(lineCount / 2)];
          for (let wc = 0; wc < 2; wc++) {
            const nx = 0.2 + rng() * 0.6;
            const len = 3 + rng() * 3;
            const dir = rng() > 0.5 ? -1 : 1;
            appendLine(
              xAt(nx),
              primaryBase,
              xAt(nx + (rng() - 0.5) * 0.04),
              primaryBase + dir * len,
              0.8,
            );
          }
        } else {
          const steps = 7 + Math.round(rng() * 3);
          const insetL = 0.03 + rng() * 0.08;
          const insetR = 0.03 + rng() * 0.08;
          appendPolyline(
            wavyLine(rng, steps, 0, 2, insetL, insetR),
            rf.single.mainStrokeWidth,
          );

          const crackCount = 2 + Math.round(rng() * 2);
          for (let c = 0; c < crackCount; c++) {
            const nx = insetL + rng() * (1 - insetL - insetR);
            const len = 3.5 + rng() * 3.5;
            const dir = rng() > 0.5 ? 1 : -1;
            appendLine(
              xAt(nx),
              (rng() * 2 - 1) * 1.5,
              xAt(nx + (rng() - 0.5) * 0.03),
              dir * len,
              rf.single.crackStrokeWidth,
            );
          }
        }
      });
    };

    // ─────────────────────────────────────────────────────────────────────────
    // drawConstructionLabels
    // ─────────────────────────────────────────────────────────────────────────

    const drawConstructionLabels = (
      data: { well_case: WellCase[]; well_screen: WellScreen[] },
      fullData: Constructive,
      yScale: d3.ScaleLinear<number, number>,
    ) => {
      constructionLabelsGroup.selectAll('*').remove();

      const clc = this.renderConfig.constructionLabels;
      const fmtD = (mm: number) => formatDiameter(mm, this.units.diameter);
      const dUnit = getDiameterUnit(this.units.diameter);

      const maxXValues = getProfileDiamValues(fullData);
      const xScale = d3
        .scaleLinear()
        .domain([0, d3.max(maxXValues) || 0])
        .range([0, POCO_WIDTH]);

      const occupied: { top: number; bot: number }[] = [];

      const placeLabel = (d: WellCase | WellScreen, text: string) => {
        const clampedFrom = Math.max(d.from, depthFrom);
        const clampedTo = Math.min(d.to, depthTo);
        if (clampedFrom >= clampedTo) return;

        const midY = yScale((clampedFrom + clampedTo) / 2);
        const leftEdgeX = (POCO_CENTER - xScale(d.diameter)) / 2;
        const labelRightX = leftEdgeX - clc.xOffset;
        const estW = text.length * (clc.fontSize * 0.52) + 8;
        const labelH = clc.fontSize + 8;
        let labelY = midY - labelH / 2;

        for (const pos of occupied) {
          if (labelY < pos.bot && labelY + labelH > pos.top)
            labelY = pos.bot + 2;
        }
        occupied.push({ top: labelY, bot: labelY + labelH });

        constructionLabelsGroup
          .append('rect')
          .attr('x', labelRightX - estW)
          .attr('y', labelY)
          .attr('width', estW)
          .attr('height', labelH)
          .attr('rx', 2)
          .attr('fill', 'white')
          .attr('stroke', '#303030')
          .attr('stroke-width', 0.5);

        constructionLabelsGroup
          .append('text')
          .attr('x', labelRightX - 2)
          .attr('y', labelY + labelH / 2)
          .attr('dy', '.35em')
          .attr('font-size', clc.fontSize)
          .attr('text-anchor', 'end')
          .attr('fill', '#303030')
          .text(text);
      };

      let lastDiam = 0;
      data.well_case
        .filter(item => {
          if (item.diameter !== lastDiam) {
            lastDiam = item.diameter;
            return true;
          }
          return false;
        })
        .forEach(d =>
          placeLabel(
            d,
            `${clc.labels.wellCasePrefix} ${fmtD(d.diameter)}${dUnit} ${d.type}`,
          ),
        );

      lastDiam = 0;
      data.well_screen
        .filter(item => {
          if (item.diameter !== lastDiam) {
            lastDiam = item.diameter;
            return true;
          }
          return false;
        })
        .forEach((d: WellScreen) =>
          placeLabel(
            d,
            `${clc.labels.wellScreenPrefix} ${fmtD(d.diameter)}${dUnit} ${d.type} ${clc.labels.wellScreenSlotPrefix} ${fmtD((d as WellScreen).screen_slot_mm)}${dUnit}`,
          ),
        );
    };

    // ─────────────────────────────────────────────────────────────────────────
    // drawAnnotationLabels
    // ─────────────────────────────────────────────────────────────────────────

    const activeLabelsSet = (
      cfg: boolean | ('lithology' | 'fractures' | 'caves')[],
    ) => {
      if (cfg === false) return new Set<string>();
      if (cfg === true) return new Set(['lithology', 'fractures', 'caves']);
      return new Set(cfg as string[]);
    };

    const lithologySubSet = (
      cfg: boolean | ('depth' | 'description' | 'dividers')[] | undefined,
    ) => {
      if (cfg === false) return new Set<string>();
      if (!cfg || cfg === true)
        return new Set(['depth', 'description', 'dividers']);
      return new Set(cfg as string[]);
    };

    type AnnotationItem = {
      sortDepth: number;
      baseY: number;
      originX: number;
      originY: number;
      header: string;
      description: string;
    };

    const drawAnnotationLabels = (
      lithologyData: Lithology[],
      fractureData: Fracture[],
      caveData: Cave[],
      yScale: d3.ScaleLinear<number, number>,
    ) => {
      const active = activeLabelsSet(this.renderConfig.labels.active);
      const show = lithologySubSet(this.renderConfig.labels.lithology);
      const s = this.renderConfig.labels.style;

      lithologyLabelsGroup.selectAll('*').remove();

      // ── Depth tips ────────────────────────────────────────────────────────
      if (active.has('lithology') && show.has('depth')) {
        lithologyData
          .filter(d => d.to <= depthTo)
          .forEach(d => {
            const text = `${d.to}`;
            const approxW =
              text.length * (s.fontSize * 0.52) + s.depthTipPadX * 2;
            const y = yScale(d.to) - s.depthTipHeight / 2;

            lithologyLabelsGroup
              .append('foreignObject')
              .attr('class', this.classes.labels.lithology.depth)
              .attr('x', geoXLeft + 1)
              .attr('y', y)
              .attr('width', approxW)
              .attr('height', s.depthTipHeight)
              .append('xhtml:div')
              .attr('class', 'wp-lithology-depth-tip')
              .text(text);
          });
      }

      // ── Build unified annotation items ────────────────────────────────────
      const items: AnnotationItem[] = [];

      if (active.has('lithology')) {
        lithologyData
          .filter(d => d.from < depthTo)
          .forEach(d => {
            items.push({
              sortDepth: d.from,
              baseY: yScale(Math.max(d.from, depthFrom)),
              originX: geoXRight,
              originY: yScale(Math.max(d.from, depthFrom)),
              header: `${d.from}–${d.to} m`,
              description: d.description || '',
            });
          });
      }

      if (active.has('fractures')) {
        fractureData
          .filter(d => d.depth >= depthFrom && d.depth < depthTo)
          .forEach(d => {
            const typeLabel = d.water_intake ? 'fratura aberta' : 'fratura';
            items.push({
              sortDepth: d.depth,
              baseY: yScale(d.depth),
              originX: pocoCenterX,
              originY: yScale(d.depth),
              header: `${d.depth} m · ${typeLabel}`,
              description: d.description || '',
            });
          });
      }

      if (active.has('caves')) {
        caveData
          .filter(d => d.from < depthTo)
          .forEach(d => {
            const midDepth = (d.from + d.to) / 2;
            const typeLabel = d.water_intake ? 'caverna úmida' : 'caverna';
            items.push({
              sortDepth: d.from,
              baseY: yScale(Math.max(d.from, depthFrom)),
              originX: geoXRight,
              originY: yScale(Math.max(midDepth, depthFrom)),
              header: `${d.from}–${d.to} m · ${typeLabel}`,
              description: d.description || '',
            });
          });
      }

      items.sort((a, b) => a.sortDepth - b.sortDepth);

      // ── Stacking pass ─────────────────────────────────────────────────────
      type LabelPos = { item: AnnotationItem; yLabel: number; estH: number };
      const labelPositions: LabelPos[] = [];
      let currY = 0;
      const charsPerLine = Math.max(
        1,
        Math.floor(s.descriptionMaxWidth / (s.fontSize * 0.6)),
      );

      items.forEach(item => {
        const descLines = Math.ceil(
          (item.description.length || 1) / charsPerLine,
        );
        const estH = (1 + descLines) * s.stackingLineHeight + 4;
        const yLabel = Math.max(item.baseY, currY + s.stackingGap);
        currY = yLabel + estH;
        labelPositions.push({ item, yLabel, estH });
      });

      const labelX = geoXRight + s.descriptionXOffset;

      // ── Dividers ──────────────────────────────────────────────────────────
      if (show.has('dividers') && show.has('description')) {
        labelPositions.forEach(({ item, yLabel }) => {
          lithologyLabelsGroup
            .append('path')
            .attr('class', this.classes.labels.lithology.divider)
            .attr(
              'd',
              `M ${item.originX},${item.originY} L ${geoXRight + 3},${item.originY} L ${labelX},${yLabel}`,
            );
        });
      }

      // ── Labels ────────────────────────────────────────────────────────────
      if (show.has('description')) {
        labelPositions.forEach(({ item, yLabel, estH }) => {
          const fo = lithologyLabelsGroup
            .append('foreignObject')
            .attr('class', this.classes.labels.lithology.label)
            .attr('x', labelX)
            .attr('y', yLabel)
            .attr('width', s.descriptionMaxWidth)
            .attr('height', estH);

          const wrapper = fo
            .append('xhtml:div')
            .attr('class', 'wp-annotation-label');
          wrapper
            .append('xhtml:div')
            .attr('class', 'wp-annotation-header')
            .text(item.header);
          if (item.description) {
            wrapper
              .append('xhtml:div')
              .attr('class', 'wp-annotation-body')
              .text(item.description);
          }
        });
      }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // updatePoco
    // ─────────────────────────────────────────────────────────────────────────

    const drawConstructive = (
      data: Constructive,
      yScale,
      fullData: Constructive,
    ) => {
      const { getHeight, getYPos } = getYAxisFunctions(yScale, {
        from: depthFrom,
        to: depthTo,
      });

      const maxXValues = getProfileDiamValues(fullData);
      const maxXValueConstruction = d3.max(maxXValues) || 0;

      const xScale = d3
        .scaleLinear()
        .domain([0, maxXValueConstruction])
        .range([0, POCO_WIDTH]);

      const rcc = this.renderConfig.construction;

      constructionGroup.selectAll(`.${this.classes.cementPad.item}`).remove();

      if (data.cement_pad && data.cement_pad.thickness && depthFrom === 0) {
        const cementPad = cementPadGroup
          .selectAll('rect')
          .data([data.cement_pad]);

        cementPad.exit().remove();

        const newCementPad = cementPad
          .enter()
          .append('rect')
          .attr('class', this.classes.cementPad.item)
          .attr(
            'x',
            (d: CementPad) =>
              (POCO_CENTER -
                xScale((d.width * rcc.cementPad.widthMultiplier * 1000) / 2)) /
              2,
          )
          .attr('y', (d: CementPad) => {
            return (
              yScale(0) -
              yScale(d.thickness * rcc.cementPad.thicknessMultiplier)
            );
          })
          .attr('width', (d: CementPad) =>
            xScale((d.width * rcc.cementPad.widthMultiplier * 1000) / 2),
          )
          .attr('height', (d: CementPad) => {
            return yScale(d.thickness * rcc.cementPad.thicknessMultiplier);
          })
          .style('fill', () => DEFAULTS_TEXTURES.pad.url());

        newCementPad
          .on('mouseover', tooltips.cementPad.show)
          .on('mouseout', tooltips.cementPad.hide);
      }

      const hole = holeGroup
        .selectAll(`.${this.classes.boreHole.rect}`)
        .data(data.bore_hole);

      hole.exit().remove();

      const newHole = hole
        .enter()
        .append('rect')
        .attr('class', this.classes.boreHole.rect)
        .on('mouseover', tooltips.hole.show)
        .on('mouseout', tooltips.hole.hide);

      newHole
        // @ts-ignore
        .merge(hole)
        .attr('x', (d: BoreHole) => (POCO_CENTER - xScale(d.diameter)) / 2)
        .attr('width', (d: BoreHole) => xScale(d.diameter))
        // @ts-ignore
        .transition(transition)
        .attr('y', getYPos)
        .attr('height', getHeight);

      const surfaceCase = surfaceCaseGroup
        .selectAll(`.${this.classes.surfaceCase.rect}`)
        .data(data.surface_case);

      surfaceCase
        .exit()
        // @ts-ignore
        .transition(transition)
        .attr('height', 0)
        .remove();

      const newSurfaceCase = surfaceCase
        .enter()
        .append('rect')
        .attr('class', this.classes.surfaceCase.rect)
        .on('mouseover', tooltips.surfaceCase.show)
        .on('mouseout', tooltips.surfaceCase.hide);

      newSurfaceCase
        // @ts-ignore
        .merge(surfaceCase)
        .attr(
          'x',
          (d: SurfaceCase) =>
            (POCO_CENTER -
              xScale(
                d.diameter + d.diameter * rcc.surfaceCase.diameterPaddingRatio,
              )) /
            2,
        )
        .attr('width', (d: SurfaceCase) =>
          xScale(
            d.diameter + d.diameter * rcc.surfaceCase.diameterPaddingRatio,
          ),
        )
        // @ts-ignore
        .transition(transition)
        .attr('y', getYPos)
        .attr('height', getHeight);

      const holeFill = holeFillGroup
        .selectAll(`.${this.classes.holeFill.rect}`)
        .data(data.hole_fill);

      holeFill.exit().remove();

      const newHoleFill = holeFill
        .enter()
        .append('rect')
        .attr('class', this.classes.holeFill.rect)
        .on('mouseover', tooltips.holeFill.show)
        .on('mouseout', tooltips.holeFill.hide);

      newHoleFill
        // @ts-ignore
        .merge(holeFill)
        .attr('x', (d: HoleFill) => (POCO_CENTER - xScale(d.diameter)) / 2)
        .attr('width', (d: HoleFill) => xScale(d.diameter))
        // @ts-ignore
        .transition(transition)
        .attr('y', getYPos)
        .attr('height', getHeight)
        .style('fill', (d: HoleFill) => DEFAULTS_TEXTURES[d.type].url());

      const wellCase = wellCaseGroup
        .selectAll(`.${this.classes.wellCase.rect}`)
        .data(data.well_case);

      wellCase.exit().remove();

      const newWellCase = wellCase
        .enter()
        .append('rect')
        .attr('class', this.classes.wellCase.rect)
        .on('mouseover', tooltips.wellCase.show)
        .on('mouseout', tooltips.wellCase.hide);

      newWellCase
        // @ts-ignore
        .merge(wellCase)
        .attr('x', (d: WellCase) => (POCO_CENTER - xScale(d.diameter)) / 2)
        .attr('width', (d: WellCase) => xScale(d.diameter))
        // @ts-ignore
        .transition(transition)
        .attr('y', getYPos)
        .attr('height', getHeight);

      const wellScreen = wellScreenGroup
        .selectAll(`.${this.classes.wellScreen.rect}`)
        .data(data.well_screen);

      wellScreen.exit().remove();

      const newWellScreen = wellScreen
        .enter()
        .append('rect')
        .attr('class', this.classes.wellScreen.rect)
        .style('fill', () => DEFAULTS_TEXTURES.well_screen.url())
        .on('mouseover', tooltips.wellScreen.show)
        .on('mouseout', tooltips.wellScreen.hide);

      newWellScreen
        // @ts-ignore
        .merge(wellScreen)
        .attr('x', (d: WellScreen) => (POCO_CENTER - xScale(d.diameter)) / 2)
        .attr('width', (d: WellScreen) => xScale(d.diameter))
        // @ts-ignore
        .transition(transition)
        .attr('y', getYPos)
        .attr('height', getHeight);

      const conflictAreas: Conflict[] = [];
      conflictAreas.push(...getConflictAreas(data.well_case, data.well_screen));
      conflictAreas.push(...getConflictAreas(data.well_screen, data.well_case));

      const mergedConflicts = mergeConflicts(conflictAreas, 1);

      const conflict = conflictGroup
        .selectAll(`.${this.classes.conflict.rect}`)
        .data(mergedConflicts);

      conflict.exit().remove();

      const newConflict = conflict
        .enter()
        .append('rect')
        .attr('class', this.classes.conflict.rect)
        .style('fill', () => DEFAULTS_TEXTURES.conflict.url())
        .on('mouseover', tooltips.conflict.show)
        .on('mouseout', tooltips.conflict.hide);

      newConflict
        // @ts-ignore
        .merge(conflict)
        .attr('x', (d: Conflict) => (POCO_CENTER - xScale(d.diameter)) / 2)
        .attr('width', (d: Conflict) => xScale(d.diameter))
        // @ts-ignore
        .transition(transition)
        .attr('y', yScale(0))
        .attr('height', getHeight);
    };

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
      .tickFormat((d: any) => `${d}${getLengthUnit(this.units.length)}`);

    const gY = svg
      .select(`.${this.classes.yAxis}`)
      // @ts-ignore
      .call(yAxis);

    const spanY = d => {
      if (d.thickness) return yScaleLocal(0) - yScaleLocal(d.thickness);
      return yScaleLocal(Math.max(d.from, depthFrom));
    };

    const spanH = d => {
      if (d.thickness) return yScaleLocal(d.thickness) - yScaleLocal(0);
      return Math.max(
        0,
        yScaleLocal(Math.min(d.to, depthTo)) -
          yScaleLocal(Math.max(d.from, depthFrom)),
      );
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Zoom handler
    // ─────────────────────────────────────────────────────────────────────────

    const filterByDepth = (l: { from: number; to: number }) =>
      !(l.to <= depthFrom || l.from >= depthTo);

    const zooming = (e: any) => {
      const transform = e.transform;

      // @ts-ignore
      gY.call(yAxis.scale(transform.rescaleY(yScaleAxis)));

      pocoGroup
        .selectAll('rect')
        .attr('y', d => {
          if (!d) return null;
          return transform.applyY(spanY(d));
        })
        .attr('height', d => {
          if (!d) return null;
          return transform.k * spanH(d);
        });

      // Fractures: recompute transform so rotation pivot tracks the scaled depth
      fracturesGroup
        .selectAll(`g.${this.classes.fractures.item}`)
        .attr('transform', (d: any) => {
          if (!d) return null;
          const cx = pocoCenterX;
          const cy = transform.applyY(yScaleLocal(d.depth));
          return `translate(0,${cy}) rotate(${d.dip},${cx},0)`;
        });

      // Caves: full redraw with the rescaled yScale.
      // Path geometry is cheap and this keeps the zoom handler simple.
      if (geologicData.caves?.length) {
        drawCaves(
          geologicData.caves.filter(c => c.to > depthFrom && c.from < depthTo),
          transform.rescaleY(yScaleLocal),
        );
      }

      if (this.renderConfig.unitLabels.active && profile.lithology?.length) {
        drawUnitLabels(
          profile.lithology.filter(filterByDepth),
          transform.rescaleY(yScaleLocal),
        );
      }
      if (this.renderConfig.labels.active !== false) {
        drawAnnotationLabels(
          profile.lithology?.filter(filterByDepth) ?? [],
          profile.fractures?.filter(
            f => f.depth >= depthFrom && f.depth < depthTo,
          ) ?? [],
          profile.caves?.filter(c => c.to > depthFrom && c.from < depthTo) ??
            [],
          transform.rescaleY(yScaleLocal),
        );
      }
      if (this.renderConfig.constructionLabels.active && constructionData) {
        drawConstructionLabels(
          {
            well_case: constructionData.well_case.filter(filterByDepth),
            well_screen: constructionData.well_screen.filter(filterByDepth),
          },
          constructionData,
          transform.rescaleY(yScaleLocal),
        );
      }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Initial draw
    // ─────────────────────────────────────────────────────────────────────────

    const drawProfile = () => {
      if (profile.lithology)
        drawLithology(profile.lithology.filter(filterByDepth), yScaleLocal);
      if (this.renderConfig.unitLabels.active && profile.lithology?.length) {
        drawUnitLabels(profile.lithology.filter(filterByDepth), yScaleLocal);
      }
      if (this.renderConfig.labels.active !== false) {
        drawAnnotationLabels(
          profile.lithology?.filter(filterByDepth) ?? [],
          profile.fractures?.filter(
            f => f.depth >= depthFrom && f.depth < depthTo,
          ) ?? [],
          profile.caves?.filter(c => c.to > depthFrom && c.from < depthTo) ??
            [],
          yScaleLocal,
        );
      }
      if (profile.caves?.length) {
        drawCaves(
          profile.caves.filter(c => c.to > depthFrom && c.from < depthTo),
          yScaleLocal,
        );
      }
      if (profile.fractures) {
        drawFractures(
          profile.fractures.filter(
            f => f.depth >= depthFrom && f.depth <= depthTo,
          ),
          yScaleLocal,
        );
      }
      if (constructionData) {
        const filteredConstruction = {
          ...constructionData,
          bore_hole: constructionData.bore_hole.filter(filterByDepth),
          hole_fill: constructionData.hole_fill.filter(filterByDepth),
          surface_case: constructionData.surface_case.filter(filterByDepth),
          well_case: constructionData.well_case.filter(filterByDepth),
          well_screen: constructionData.well_screen.filter(filterByDepth),
          reduction: constructionData.reduction?.filter(filterByDepth) ?? [],
        };
        drawConstructive(filteredConstruction, yScaleLocal, constructionData);
        if (this.renderConfig.constructionLabels.active) {
          drawConstructionLabels(
            filteredConstruction,
            constructionData,
            yScaleLocal,
          );
        }
      }

      svg.select(`#${state.clipRectId}`).attr('y', 0).attr('height', svgHeight);
    };

    drawProfile();

    const { zoom: zoomEnabled, pan: panEnabled } = this.renderConfig;
    if (zoomEnabled || panEnabled) {
      // @ts-ignore
      const zoomNode = d3.zoom();
      if (zoomEnabled || panEnabled) zoomNode.on('zoom', zooming);
      if (!zoomEnabled) zoomNode.scaleExtent([1, 1]);
      if (!panEnabled)
        zoomNode.filter(
          (e: any) => e.type === 'wheel' || e.type === 'dblclick',
        );
      // @ts-ignore
      svg.call(zoomNode).node();
    }
  }
}

export default {
  WellRenderer,
};
