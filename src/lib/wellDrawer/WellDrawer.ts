import * as d3module from 'd3';
import d3tip from 'd3-tip';
import { defu } from 'defu';
import { createWellTextures } from './drawer.textures';

import {
  Well,
  Constructive,
  Lithology,
  HoleFill,
  CementPad,
  BoreHole,
  SurfaceCase,
  WellCase,
  WellScreen,
  Fracture,
  Cave,
} from '@/src/lib/@types/well.types';
import {
  checkIfProfileIsEmpty,
  getProfileDiamValues,
  getProfileLastItemsDepths,
} from '@/src/lib/utils/well.utils';
import {
  getConflictAreas,
  mergeConflicts,
  responsivefy,
  getLithologyFill,
  getYAxisFunctions,
  makeCavePrng,
  wavyContact,
  ptsToSmoothPath,
  populateTooltips,
} from '@/src/lib/wellDrawer/drawer.utils';
import { Units } from '@/src/lib/@types/units.types';
import { getLengthUnit } from '@/src/lib/utils/format.utils';
import { SvgInstance, ComponentsClassNames } from '@/src/lib/@types/drawer.types';
import { DeepPartial } from '../@types/generic.types';

const d3 = {
  ...d3module,
  tip: d3tip,
};

type Conflict = { from: number; to: number; diameter: number };

type InstanceState = {
  svg: d3module.Selection<d3module.BaseType, unknown, HTMLElement, any>;
  height: number;
  width: number;
  margins: { left: number; right: number; top: number; bottom: number };
  clipId: string;
  clipRectId: string;
};

const DEFAULT_COMPONENTS_CLASS_NAMES: ComponentsClassNames = {
  tooltip: {
    root: 'tooltip',
    title: 'title',
    primaryInfo: 'primaryInfo',
    secondaryInfo: 'secondaryInfo',
  },
  yAxis: 'yAxis',
  wellGroup: 'well-group',
  geologicGroup: 'geologic-group',
  lithology: {
    group: 'lithology-group',
    rect: 'lithology-rect',
  },
  fractures: {
    group: 'fractures-group',
    item: 'fracture-group',
    hitArea: 'fracture-hit',
    line: 'fracture-line',
    polyline: 'fracture-poly',
  },
  caves: {
    group: 'caves-group',
    item: 'cave-group',
    fill: 'cave-fill',
    contact: 'cave-contact',
  },
  constructionGroup: 'construction-group',
  cementPad: {
    group: 'cement-pad',
    item: 'cement-pad-rect',
  },
  boreHole: {
    group: 'hole',
    rect: 'bore-hole-rect',
  },
  surfaceCase: {
    group: 'surface-case',
    rect: 'surface-case-rect',
  },
  holeFill: {
    group: 'hole-fill',
    rect: 'hole-fill-rect',
  },
  wellCase: {
    group: 'well-case',
    rect: 'well-case-rect',
  },
  wellScreen: {
    group: 'well-screen',
    rect: 'well-screen-rect',
  },
  conflict: {
    group: 'conflict',
    rect: 'conflict-rect',
  },
};


const DEFAULTS_TEXTURES = createWellTextures();
export class WellDrawer {
  private svgInstances: SvgInstance[] = [];
  private instanceStates: InstanceState[] = [];
  private svgWidth!: number;
  private svgHeight!: number;
  private pocoWidth!: number;
  private pocoCenter!: number;

  classes = DEFAULT_COMPONENTS_CLASS_NAMES;
  private units: Units = {
    length: 'm',
    diameter: 'mm'
  }

  get WIDTH(): number  { return this.instanceStates[0]?.width  ?? 0; }

  constructor(svgs: SvgInstance[], options: { classNames?: DeepPartial<ComponentsClassNames>, units?: Units } = { }) {
    if (svgs.length === 0) return;
    this.svgInstances = svgs;

    if (options.classNames) {
      this.classes = defu(options.classNames, DEFAULT_COMPONENTS_CLASS_NAMES) as ComponentsClassNames;
    }

    if (options.units) {
      this.units = {...this.units, ...options.units}
    }
  }

  private initInstanceSvg(inst: SvgInstance, index: number): InstanceState {
    const clipId     = `fractures-clip-${index}`;
    const clipRectId = `fractures-clip-rect-${index}`;
    const { selector, height, width, margins } = inst;
    const svgWidth  = width  + margins.left + margins.right;
    const svgHeight = height + margins.top  + margins.bottom;

    const svg = d3.select(selector) as d3module.Selection<d3module.BaseType, unknown, HTMLElement, any>;
    svg.selectAll('*').remove();

    svg
      .attr('height', svgHeight)
      .attr('width',  svgWidth)
      .call(responsivefy);

    const defs = svg.append('defs');
    defs.append('clipPath')
      .attr('id', clipId)
      .append('rect')
      .attr('id', clipRectId)
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 100000)
      .attr('height', 10000);

    const poco = svg
      .append('g')
      .attr('class', this.classes.wellGroup);

    const geologic = poco
      .append('g')
      .attr('class', this.classes.geologicGroup)
      .attr('transform', `translate(${margins.left}, ${margins.top})`);

    geologic.append('g').attr('class', this.classes.yAxis);
    geologic.append('g').attr('class', this.classes.lithology.group);
    geologic.append('g').attr('class', this.classes.caves.group).attr('clip-path', `url(#${clipId})`);

    const construction = poco
      .append('g')
      .attr('class', this.classes.constructionGroup)
      .attr('transform', `translate(${margins.left + width / 2}, ${margins.top})`);

    poco
      .append('g')
      .attr('class', this.classes.fractures.group)
      .attr('transform', `translate(${margins.left}, ${margins.top})`)
      .attr('clip-path', `url(#${clipId})`);

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
    this.instanceStates = this.svgInstances.map((inst, i) => this.initInstanceSvg(inst, i));
    const { height, width, margins } = this.instanceStates[0];
    this.svgWidth  = width  + margins.left + margins.right;
    this.svgHeight = height + margins.top  + margins.bottom;
    this.pocoWidth  = this.svgWidth / 4;
    this.pocoCenter = (this.svgWidth * 3) / 4;
  }

  drawLog(profile: Well, options: { units?: Units } = { }) {
    if (checkIfProfileIsEmpty(profile)) return;
    this.units = { ...this.units, ...options.units };
    for (const state of this.instanceStates) {
      this.drawLogToInstance(state, profile);
    }
  }

  private drawLogToInstance(state: InstanceState, profile: Well) {
    const svg = state.svg;
    const cn  = this.classes;

    const pocoGroup         = svg.select(`.${cn.wellGroup}`);
    const lithologyGroup    = svg.select(`.${cn.lithology.group}`);
    const fracturesGroup    = svg.select(`.${cn.fractures.group}`);
    const cavesGroup        = svg.select(`.${cn.caves.group}`);
    const constructionGroup = svg.select(`.${cn.constructionGroup}`);
    const cementPadGroup    = svg.select(`.${cn.cementPad.group}`);
    const holeGroup         = svg.select(`.${cn.boreHole.group}`);
    const surfaceCaseGroup  = svg.select(`.${cn.surfaceCase.group}`);
    const holeFillGroup     = svg.select(`.${cn.holeFill.group}`);
    const wellCaseGroup     = svg.select(`.${cn.wellCase.group}`);
    const wellScreenGroup   = svg.select(`.${cn.wellScreen.group}`);
    const conflictGroup     = svg.select(`.${cn.conflict.group}`);

    const svgWidth  = this.svgWidth;
    const svgHeight = this.svgHeight;
    const POCO_WIDTH  = this.pocoWidth;
    const POCO_CENTER = this.pocoCenter;

    const transition = d3.transition().duration(750).ease(d3.easeCubic);

    const tooltips = populateTooltips(svg, this.classes, this.units);

    // ─────────────────────────────────────────────────────────────────────────
    // updateGeology
    // ─────────────────────────────────────────────────────────────────────────

    const drawLithology = async (
      data: Lithology[],
      yScale,
    ) => {
      const { getHeight, getYPos } = getYAxisFunctions(yScale);

      const rects = lithologyGroup.selectAll(`.${cn.lithology.rect}`).data(data);

      rects.exit().remove();

      const newLayers = rects
        .enter()
        .append('rect')
        .attr('class', cn.lithology.rect)
        .attr('x', 10)
        .attr('width', svgWidth - 100)
        .style('stroke-width', '1px')
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

      // x-extents match the lithology rect geometry exactly
      const xLeft  = 10;
      const xRight = svgWidth - 90;
      const steps  = 32; // enough points for smooth Bézier curves

      data.forEach(cave => {
        // Two different seeds so top and bottom contacts are visually independent
        const seedTop = cave.from * 100 + cave.to;
        const seedBot = cave.to  * 100 + cave.from + 999;
        const rngTop  = makeCavePrng(seedTop);
        const rngBot  = makeCavePrng(seedBot);

        const yTop = yScale(cave.from);
        const yBot = yScale(cave.to);
        const span = yBot - yTop; // pixel height of the cave band

        // Amplitude proportional to band height, clamped for readability
        const amp = Math.max(2, Math.min(span * 0.06, 5));

        const topPts = wavyContact(xLeft, xRight, yTop, amp, steps, rngTop);
        const botPts = wavyContact(xLeft, xRight, yBot, amp, steps, rngBot);

        // Smooth path strings for each contact
        const topPath = ptsToSmoothPath(topPts);
        const botPath = ptsToSmoothPath(botPts);

        // Closed filled region:
        //   top contact L→R  +  right vertical edge down
        //   +  bottom contact R→L (reversed)  +  left vertical edge up  +  Z
        const botReversed = ptsToSmoothPath([...botPts].reverse());
        const closedPath =
          topPath +
          ` L ${xRight.toFixed(1)},${botPts[botPts.length - 1][1].toFixed(1)}` +
          // Strip the leading 'M x,y' from the reversed bottom path so the
          // concatenated path stays as one continuous sub-path.
          botReversed.replace(/^M [\d.-]+ [\d.-]+/, '') +
          ` L ${xLeft.toFixed(1)},${topPts[0][1].toFixed(1)} Z`;

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
          .attr('fill-opacity', 0.6)
          .attr('stroke', 'none');

        g.append('path')
          .attr('class', this.classes.caves.contact)
          .attr('data-wet', String(!!cave.water_intake))
          .attr('d', topPath)
          .attr('fill', 'none')
          .attr('stroke-width', 1.2)
          .attr('stroke-linecap', 'round')
          .attr('stroke-linejoin', 'round');

        g.append('path')
          .attr('class', this.classes.caves.contact)
          .attr('data-wet', String(!!cave.water_intake))
          .attr('d', botPath)
          .attr('fill', 'none')
          .attr('stroke-width', 1.2)
          .attr('stroke-linecap', 'round')
          .attr('stroke-linejoin', 'round');
      });
    };

    // ─────────────────────────────────────────────────────────────────────────
    // updateFractures
    // ─────────────────────────────────────────────────────────────────────────

    const drawFractures = (data: Fracture[], yScale) => {
      fracturesGroup.selectAll(`g.${this.classes.fractures.item}`).remove();

      const halfWidth = (POCO_WIDTH * 1.2) / 2;
      const pocoCenterInGroup = this.WIDTH / 2 + POCO_CENTER / 2;
      const xa = pocoCenterInGroup - halfWidth;
      const w  = halfWidth * 2;

      const xAt = (nx: number) => xa + nx * w;
      const RC  = 'round' as const;

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
          const t  = i / (steps - 1);
          const nx = startInset + t * (1 - startInset - endInset);
          const dy = baseY + (rng() * 2 - 1) * jitter;
          pts.push([nx, dy]);
        }
        return pts;
      };

      data.forEach(fracture => {
        const rng = makePrng(fracture.depth);
        const cy  = yScale(fracture.depth);

        const g = fracturesGroup
          .append('g')
          .attr('class', this.classes.fractures.item)
          .datum(fracture)
          .attr('transform',
            `translate(0,${cy}) rotate(${fracture.dip},${pocoCenterInGroup},0)`)
          .on('mouseover', tooltips.fracture.show)
          .on('mouseout', tooltips.fracture.hide)
          .style('cursor', 'pointer');

        const hitBuffer = fracture.swarm ? 14 : 8;
        g.append('rect')
          .attr('class', this.classes.fractures.hitArea)
          .attr('x', xa)
          .attr('y', -hitBuffer)
          .attr('width', w)
          .attr('height', hitBuffer * 2)
          .attr('fill', 'transparent')
          .style('pointer-events', 'all');

        const isWet = String(!!fracture.water_intake);

        const appendLine = (x1: number, y1: number, x2: number, y2: number, sw: number) =>
          g.append('line')
            .attr('class', this.classes.fractures.line)
            .attr('data-wet', isWet)
            .attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2)
            .attr('stroke-width', sw).attr('stroke-linecap', RC);

        const appendPolyline = (pts: [number, number][], sw: number) =>
          g.append('polyline')
            .attr('class', this.classes.fractures.polyline)
            .attr('data-wet', isWet)
            .attr('points', pts.map(([nx, dy]) => `${xAt(nx)},${dy}`).join(' '))
            .attr('stroke-width', sw)
            .attr('fill', 'none').attr('stroke-linecap', RC).attr('stroke-linejoin', RC);

        if (fracture.swarm) {
          const lineCount  = 4 + Math.round(rng() * 2);
          const spread     = 18;
          const halfSpread = spread / 2;

          const bases = Array.from({ length: lineCount }, () => (rng() * 2 - 1) * halfSpread)
            .sort((a, b) => a - b);

          bases.forEach((base, idx) => {
            const isCentral = idx === Math.floor(lineCount / 2);
            const sw        = isCentral ? 1.8 : 0.6 + rng() * 0.7;
            const steps     = 6 + Math.round(rng() * 3);
            const jitter    = 0.8 + rng() * 1.2;
            const insetL    = 0.04 + rng() * 0.12;
            const insetR    = 0.04 + rng() * 0.12;
            appendPolyline(wavyLine(rng, steps, base, jitter, insetL, insetR), sw);
          });

          const bridgeCount = 2 + Math.round(rng() * 2);
          for (let b = 0; b < bridgeCount; b++) {
            const nx      = 0.15 + rng() * 0.7;
            const pairIdx = Math.floor(rng() * (bases.length - 1));
            appendLine(xAt(nx), bases[pairIdx], xAt(nx + (rng() - 0.5) * 0.06), bases[pairIdx + 1], 0.6);
          }

          const primaryBase = bases[Math.floor(lineCount / 2)];
          for (let wc = 0; wc < 2; wc++) {
            const nx  = 0.2 + rng() * 0.6;
            const len = 3 + rng() * 3;
            const dir = rng() > 0.5 ? -1 : 1;
            appendLine(xAt(nx), primaryBase, xAt(nx + (rng() - 0.5) * 0.04), primaryBase + dir * len, 0.8);
          }

        } else {
          const steps  = 7 + Math.round(rng() * 3);
          const insetL = 0.03 + rng() * 0.08;
          const insetR = 0.03 + rng() * 0.08;
          appendPolyline(wavyLine(rng, steps, 0, 2, insetL, insetR), 1.8);

          const crackCount = 2 + Math.round(rng() * 2);
          for (let c = 0; c < crackCount; c++) {
            const nx  = insetL + rng() * (1 - insetL - insetR);
            const len = 3.5 + rng() * 3.5;
            const dir = rng() > 0.5 ? 1 : -1;
            appendLine(xAt(nx), (rng() * 2 - 1) * 1.5, xAt(nx + (rng() - 0.5) * 0.03), dir * len, 0.9);
          }
        }
      });
    };

    // ─────────────────────────────────────────────────────────────────────────
    // updatePoco
    // ─────────────────────────────────────────────────────────────────────────

    const drawWellConstructive = (
      data: Constructive & { fractures: Fracture[] },
      yScale,
    ) => {
      const { getHeight, getYPos } = getYAxisFunctions(yScale);

      const maxXValues = getProfileDiamValues(data);
      const maxXValueConstruction = d3.max(maxXValues) || 0;

      const xScale = d3
        .scaleLinear()
        .domain([0, maxXValueConstruction])
        .range([0, POCO_WIDTH]);

      constructionGroup.selectAll(`.${this.classes.cementPad.item}`).remove();

      if (data.cement_pad && data.cement_pad.thickness) {
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
              (POCO_CENTER - xScale((d.width * 0.7 * 1000) / 2)) / 2,
          )
          .attr('y', (d: CementPad) => {
            return yScale(0) - yScale(d.thickness * 0.7);
          })
          .attr('width', (d: CementPad) => xScale((d.width * 0.7 * 1000) / 2))
          .attr('height', (d: CementPad) => {
            return yScale(d.thickness * 0.7);
          })
          .style('fill', () => DEFAULTS_TEXTURES.pad.url())
          .style('stroke-width', '2px');

        newCementPad.on('mouseover', tooltips.cementPad.show).on('mouseout', tooltips.cementPad.hide);
      }

      const hole = holeGroup.selectAll(`.${cn.boreHole.rect}`).data(data.bore_hole);

      hole.exit().remove();

      const newHole = hole
        .enter()
        .append('rect')
        .attr('class', cn.boreHole.rect)
        .style('opacity', '0.6')
        .style('stroke-width', '1px')
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
        .selectAll(`.${cn.surfaceCase.rect}`)
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
        .attr('class', cn.surfaceCase.rect)
        .on('mouseover', tooltips.surfaceCase.show)
        .on('mouseout', tooltips.surfaceCase.hide);

      newSurfaceCase
        // @ts-ignore
        .merge(surfaceCase)
        .attr(
          'x',
          (d: SurfaceCase) =>
            (POCO_CENTER - xScale(d.diameter + d.diameter * 0.1)) / 2,
        )
        .attr('width', (d: SurfaceCase) =>
          xScale(d.diameter + d.diameter * 0.1),
        )
        // @ts-ignore
        .transition(transition)
        .attr('y', getYPos)
        .attr('height', getHeight);

      const holeFill = holeFillGroup.selectAll(`.${cn.holeFill.rect}`).data(data.hole_fill);

      holeFill.exit().remove();

      const newHoleFill = holeFill
        .enter()
        .append('rect')
        .attr('class', cn.holeFill.rect)
        .style('stroke-width', '2px')
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

      const wellCase = wellCaseGroup.selectAll(`.${cn.wellCase.rect}`).data(data.well_case);

      wellCase.exit().remove();

      const newWellCase = wellCase
        .enter()
        .append('rect')
        .attr('class', cn.wellCase.rect)
        .style('stroke-width', '2px')
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
        .selectAll(`.${cn.wellScreen.rect}`)
        .data(data.well_screen);

      wellScreen.exit().remove();

      const newWellScreen = wellScreen
        .enter()
        .append('rect')
        .attr('class', cn.wellScreen.rect)
        .style('stroke-width', '2px')
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

      const conflict = conflictGroup.selectAll(`.${cn.conflict.rect}`).data(mergedConflicts);

      conflict.exit().remove();

      const newConflict = conflict
        .enter()
        .append('rect')
        .attr('class', cn.conflict.rect)
        .style('stroke-width', '4px')
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
      caves:     profile.caves,
    };
    const constructionData = {
      cement_pad:   profile.cement_pad,
      bore_hole:    profile.bore_hole,
      hole_fill:    profile.hole_fill,
      surface_case: profile.surface_case,
      well_case:    profile.well_case,
      well_screen:  profile.well_screen,
      reduction:    profile.reduction,
      fractures:    profile.fractures,
    } as Constructive & { fractures: Fracture[] };

    const maxValues = getProfileLastItemsDepths(profile);
    const maxYValues = d3.max(maxValues) || 0;

    const yScaleGlobal = d3
      .scaleLinear()
      .domain([0, maxYValues])
      .range([0, svgHeight - state.margins.top - state.margins.bottom]);

    const yZero = yScaleGlobal(0);

    const maxYDisplay = this.units.length === 'ft' ? maxYValues * 3.28084 : maxYValues;
    const yScaleAxis = d3
      .scaleLinear()
      .domain([0, maxYDisplay])
      .range([0, svgHeight - state.margins.top - state.margins.bottom]);

    const yAxis = d3.axisLeft(yScaleAxis).tickFormat((d: any) => `${d}${getLengthUnit(this.units.length)}`);

    const gY = svg.select(`.${cn.yAxis}`)
      // @ts-ignore
      .call(yAxis);

    const spanY = d => {
      if (d.thickness) return yScaleGlobal(0) - yScaleGlobal(d.thickness);
      return yScaleGlobal(d.from);
    };

    const spanH = d => {
      if (d.thickness) return yScaleGlobal(d.thickness);
      return yScaleGlobal(d.to - d.from);
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Zoom handler
    // ─────────────────────────────────────────────────────────────────────────

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

      const pocoCenterInGroup = this.WIDTH / 2 + POCO_CENTER / 2;

      // Fractures: recompute transform so rotation pivot tracks the scaled depth
      fracturesGroup
        .selectAll(`g.${this.classes.fractures.item}`)
        .attr('transform', (d: any) => {
          if (!d) return null;
          const cx = pocoCenterInGroup;
          const cy = transform.applyY(yScaleGlobal(d.depth));
          return `translate(0,${cy}) rotate(${d.dip},${cx},0)`;
        });

      // Caves: full redraw with the rescaled yScale.
      // Path geometry is cheap and this keeps the zoom handler simple.
      if (geologicData.caves?.length) {
        drawCaves(geologicData.caves, transform.rescaleY(yScaleGlobal));
      }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Initial draw
    // ─────────────────────────────────────────────────────────────────────────

    const drawProfile = () => {
      if (geologicData.lithology) drawLithology(geologicData.lithology, yScaleGlobal);
      if (geologicData.caves?.length) drawCaves(geologicData.caves, yScaleGlobal);
      if (geologicData.fractures) drawFractures(geologicData.fractures, yScaleGlobal);
      if (constructionData) drawWellConstructive(constructionData, yScaleGlobal);

      svg.select(`#${state.clipRectId}`)
        .attr('y', yZero)
        .attr('height', svgHeight);
    };

    // @ts-ignore
    const zoomNode = d3.zoom().on('zoom', zooming);

    drawProfile();
    // @ts-ignore
    svg.call(zoomNode).node();
  }
}

export default {
  WellDrawer,
};
