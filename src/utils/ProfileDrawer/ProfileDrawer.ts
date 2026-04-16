import * as d3module from 'd3';
import d3tip from 'd3-tip';
import textures from 'textures';

import Fractures from '@/public/fractures.svg?url';

import {
  Profile,
  Geologic,
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
} from '@/src/types/profile.types';
import {
  checkIfProfileIsEmpty,
  getProfileDiamValues,
  getProfileLastItemsDepths,
} from '@/src/utils/profile.utils';
import {
  getConflictAreas,
  mergeConflicts,
  responsivefy,
  getLithologyFiller,
  getYAxisFunctions,
} from '@/src/utils/ProfileDrawer/ProfileDrawer.utils';

const d3 = {
  ...d3module,
  tip: d3tip,
};

type ComponentsClassNames = {
  tooltip: string;
  tooltipTitle: string;
  tooltipPrimaryInfo: string;
  tooltipSecondaryInfo: string;
  yAxis: string;
  wellGroup: string;
  geologicGroup: string;
  lithologyGroup: string;
  fracturesGroup: string;
  cavesGroup: string;
  constructionGroup: string;
  cementPadGroup: string;
  holeGroup: string;
  surfaceCaseGroup: string;
  holeFillGroup: string;
  wellCaseGroup: string;
  wellScreenGroup: string;
  conflictGroup: string;
};

type Conflict = { from: number; to: number; diameter: number };

const DEFAULT_COMPONENTS_CLASS_NAMES: ComponentsClassNames = {
  tooltip: 'tooltip',
  tooltipTitle: 'tittle',
  tooltipPrimaryInfo: 'primaryInfo',
  tooltipSecondaryInfo: 'secondaryInfo',
  yAxis: 'yAxis',
  wellGroup: 'poco-group',
  geologicGroup: 'geologic-group',
  lithologyGroup: 'litho-group',
  fracturesGroup: 'fractures-group',
  cavesGroup: 'caves-group',
  constructionGroup: 'const-group',
  cementPadGroup: 'cement-pad',
  holeGroup: 'hole',
  surfaceCaseGroup: 'surface-case',
  holeFillGroup: 'hole-fill',
  wellCaseGroup: 'well-case',
  wellScreenGroup: 'well-screen',
  conflictGroup: 'conflict',
};


const DEFAULTS_TEXTURES = {
  pad: textures.lines().heavier(10).thinner(1.5).background('#ffffff'),
  conflict: textures.lines().heavier().stroke('#E52117'),
  cave_dry: textures.lines().size(8).orientation('6/8').heavier(.3).thinner(.8).background('#ffffff').stroke('#333333'),
  cave_wet: textures.lines().size(8).orientation('6/8').heavier(.3).thinner(.8).background('#ffffff').stroke('#1a6fa8'),
  seal: textures.lines().thicker().background('#ffffff'),
  gravel_pack: textures.circles().complement().background('#ffffff'),
  well_screen: textures
    .paths()
    .d(s => `M ${s / 4} ${s / 4} l ${s / 2} 0 `)
    .size(40)
    .strokeWidth(2)
    .thicker(2)
    .background('#fff'),
};

export class DinamicDrawer {
  private svg: d3module.Selection<d3module.BaseType, unknown, HTMLElement, any>;

  customClassNames = DEFAULT_COMPONENTS_CLASS_NAMES;

  constructor(
    svgClassName: string,
    public HEIGHT: number,
    public WIDTH: number,
    public MARGINS: {
      LEFT: number;
      RIGHT: number;
      TOP: number;
      BOTTOM: number;
    },
    customClassNames?: Partial<ComponentsClassNames>,
  ) {
    if (customClassNames) {
      this.customClassNames = {
        ...DEFAULT_COMPONENTS_CLASS_NAMES,
        ...customClassNames,
      };
    }
    this.svg = d3.select(svgClassName);
  }

  public async prepareSvg() {
    this.svg.selectAll('*').remove();

    const defs = this.svg.append('defs');

    defs.append('clipPath')
      .attr('id', 'fractures-clip')
      .append('rect')
      .attr('id', 'fractures-clip-rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 100000)
      .attr('height', 10000);

    const pocoGroup = this.svg
      .append('g')
      .attr('class', this.customClassNames.wellGroup);

    const geologicGroup = pocoGroup
      .append('g')
      .attr('class', this.customClassNames.geologicGroup);

    geologicGroup.append('g').attr('class', this.customClassNames.yAxis);

    geologicGroup
      .append('g')
      .attr('class', this.customClassNames.lithologyGroup);

    // Caves render on top of the lithology rects, below fractures
    geologicGroup
      .append('g')
      .attr('class', this.customClassNames.cavesGroup);

    const constructionGroup = pocoGroup
      .append('g')
      .attr('class', this.customClassNames.constructionGroup);

    pocoGroup.append('g').attr('class', this.customClassNames.fracturesGroup);

    constructionGroup
      .append('g')
      .attr('class', this.customClassNames.cementPadGroup);
    constructionGroup
      .append('g')
      .attr('class', this.customClassNames.holeGroup);
    constructionGroup
      .append('g')
      .attr('class', this.customClassNames.surfaceCaseGroup);
    constructionGroup
      .append('g')
      .attr('class', this.customClassNames.holeFillGroup);
    constructionGroup
      .append('g')
      .attr('class', this.customClassNames.wellCaseGroup);
    constructionGroup
      .append('g')
      .attr('class', this.customClassNames.wellScreenGroup);
    constructionGroup
      .append('g')
      .attr('class', this.customClassNames.conflictGroup);
  }

  populateTooltips() {
    const tipsText = {
      geology: (_, d: Lithology) => `
        <span class="${this.customClassNames.tooltipTitle}">Litologia</span>
        <span class="${this.customClassNames.tooltipPrimaryInfo}">De ${d.from} m até ${d.to} m</span>
        <span class="${this.customClassNames.tooltipSecondaryInfo}"><strong>Descrição:</strong> ${d.description}</span>
      `,
      hole: (_, d: HoleFill) => {
        return `
        <span class="${this.customClassNames.tooltipTitle}">FURO</span>
        <span class="${this.customClassNames.tooltipPrimaryInfo}">De ${d.from} m até ${d.to} m</span>
        <span class="${this.customClassNames.tooltipSecondaryInfo}"><strong>Diâmetro:</strong>${d.diameter} mm</span>
        `;
      },
      surfaceCase: (_, d: SurfaceCase) => {
        return `
            <span class="${this.customClassNames.tooltipTitle}">TUBO DE BOCA</span>
            <span class="${this.customClassNames.tooltipPrimaryInfo}">De ${d.from} m até ${d.to} m</span>
            <span class="${this.customClassNames.tooltipSecondaryInfo}"><strong>Diâmetro:</strong>${d.diameter} mm</span>
          `;
      },
      holeFill: (_, d: HoleFill) => {
        return `
          <span class="${this.customClassNames.tooltipTitle}">ESP. ANULAR</span>
          <span class="${this.customClassNames.tooltipPrimaryInfo}">De ${d.from} m até ${d.to} m</span>
          <span class="${this.customClassNames.tooltipSecondaryInfo}"><strong>Diâmetro:</strong>${d.diameter} mm</span>
          <span class="${this.customClassNames.tooltipSecondaryInfo}">
            <strong>Descrição:</strong> ${d.description}
          </span>
          `;
      },
      wellCase: (_, d: WellCase) => {
        return `
          <span class="${this.customClassNames.tooltipTitle}">REVESTIMENTO</span>
              <span class="${this.customClassNames.tooltipPrimaryInfo}">De ${d.from} m até ${d.to} m</span>
              <span class="${this.customClassNames.tooltipSecondaryInfo}">
                <strong>Diâmetro:</strong> ${d.diameter} mm
              </span>
              <span class="${this.customClassNames.tooltipSecondaryInfo}"><strong>Tipo:</strong> ${d.type}</span>
          `;
      },
      wellScreen: (_, d: WellScreen) => {
        return `
          <span class="${this.customClassNames.tooltipTitle}">FILTROS</span>
              <span class="${this.customClassNames.tooltipPrimaryInfo}">De ${d.from} m até ${d.to} m</span>
              <span class="${this.customClassNames.tooltipSecondaryInfo}">
                <strong>Diâmetro:</strong> ${d.diameter} mm</span>
              <span class="${this.customClassNames.tooltipSecondaryInfo}"><strong>Tipo:</strong> ${d.type}</span>
              <span class="${this.customClassNames.tooltipSecondaryInfo}">
                <strong>Ranhura:</strong> ${d.screen_slot_mm}mm
              </span>
          `;
      },
      conflict: (_, d: any) => {
        return `
          <span class="${this.customClassNames.tooltipTitle}">FILTROS</span>
              <span class="${this.customClassNames.tooltipPrimaryInfo}">De ${d.from} m até ${d.to} m</span>
              <span class="${this.customClassNames.tooltipSecondaryInfo}">
                <strong>Diâmetro:</strong> ${d.diameter} mm</span>
              <span class="${this.customClassNames.tooltipSecondaryInfo}"><strong>Tipo:</strong> ${d.type}</span>
              <span class="${this.customClassNames.tooltipSecondaryInfo}">
                <strong>Ranhura:</strong> ${d.screen_slot_mm}mm
              </span>
          `;
      },
      fracture: (_event: unknown, d: Fracture) => {
        const title = d.swarm ? 'ENXAME DE FRATURAS' : 'FRATURA';
        return `
          <span class="${this.customClassNames.tooltipTitle}">${title}</span>
          <span class="${this.customClassNames.tooltipPrimaryInfo}"><strong>Profundidade:</strong> ${d.depth} m</span>
          ${d.water_intake ? `<span class="${this.customClassNames.tooltipSecondaryInfo}"><strong>Entrada d'água:</strong> ${d.depth} m</span>` : ''}
          <span class="${this.customClassNames.tooltipSecondaryInfo}"><strong>Mergulho:</strong> ${d.dip}°</span>
          <span class="${this.customClassNames.tooltipSecondaryInfo}"><strong>Azimute:</strong> ${d.azimuth}°</span>
          ${d.description ? `<span class="${this.customClassNames.tooltipSecondaryInfo}"><strong>Descrição:</strong> ${d.description}</span>` : ''}
        `;
      },
      cave: (_event: unknown, d: Cave) => {
        return `
          <span class="${this.customClassNames.tooltipTitle}">CAVERNA</span>
          <span class="${this.customClassNames.tooltipPrimaryInfo}">De ${d.from} m até ${d.to} m</span>
          ${d.water_intake ? `<span class="${this.customClassNames.tooltipSecondaryInfo}"><strong>Entrada d'água</strong></span>` : ''}
          ${d.description ? `<span class="${this.customClassNames.tooltipSecondaryInfo}"><strong>Descrição:</strong> ${d.description}</span>` : ''}
        `;
      },
    };

    const tooltips: any = {};

    Object.getOwnPropertyNames(tipsText).forEach(tipTextKey => {
      tooltips[tipTextKey] = d3
        // @ts-ignore
        .tip()
        .attr('class', this.customClassNames.tooltip)
        .direction('e')
        .html(tipsText[tipTextKey]);

      this.svg.call(tooltips[tipTextKey]);
    });

    return tooltips;
  }

  drawLog(profile: Profile) {
    if (!this.svg) return;

    if (checkIfProfileIsEmpty(profile)) return;

    const svg = this.svg
      .attr('height', this.HEIGHT + this.MARGINS.TOP + this.MARGINS.BOTTOM)
      .attr('width', this.WIDTH + this.MARGINS.LEFT + this.MARGINS.RIGHT)
      .call(responsivefy);

    const pocoGroup = svg.select(`.${this.customClassNames.wellGroup}`);

    const geologicGroup = svg
      .select(`.${this.customClassNames.geologicGroup}`)
      .attr(
        'transform',
        `translate(${this.MARGINS.LEFT}, ${this.MARGINS.TOP})`,
      );

    const lithologyGroup = geologicGroup.select(`.${this.customClassNames.lithologyGroup}`);

    const fracturesGroup = svg
      .select(`.${this.customClassNames.fracturesGroup}`)
      .attr(
        'transform',
        `translate(${this.MARGINS.LEFT}, ${this.MARGINS.TOP})`,
      )
      .attr('clip-path', 'url(#fractures-clip)');

    // cavesGroup is a child of geologicGroup so it already inherits the
    // translate(MARGINS.LEFT, MARGINS.TOP) transform — no extra transform here.
    const cavesGroup = svg
      .select(`.${this.customClassNames.cavesGroup}`)
      .attr('clip-path', 'url(#fractures-clip)');

    const constructionGroup = svg
      .select(`.${this.customClassNames.constructionGroup}`)
      .attr(
        'transform',
        `translate(${this.MARGINS.LEFT + this.WIDTH / 2}, ${this.MARGINS.TOP})`,
      );

    const cementPadGroup = constructionGroup.select('.cement-pad');
    const holeGroup = constructionGroup.select('.hole');
    const surfaceCaseGroup = constructionGroup.select('.surface-case');
    const holeFillGroup = constructionGroup.select('.hole-fill');
    const wellCaseGroup = constructionGroup.select('.well-case');
    const wellScreenGroup = constructionGroup.select('.well-screen');
    const conflictGroup = constructionGroup.select('.conflict');

    const svgWidth: any = svg.attr('width');
    const svgHeight: any = svg.attr('height');

    const POCO_WIDTH = svgWidth / 4;
    const POCO_CENTER = (svgWidth * 3) / 4;

    const transition = d3.transition().duration(750).ease(d3.easeCubic);

    const tooltips = this.populateTooltips();

    // ─────────────────────────────────────────────────────────────────────────
    // Cave helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Seeded PRNG — deterministic so every zoom/redraw produces identical shapes.
     */
    const makeCavePrng = (seed: number) => {
      let s = Math.abs(seed * 6271) | 1;
      return () => {
        s = (s * 16807) % 2147483647;
        return (s - 1) / 2147483646;
      };
    };

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
    const wavyContact = (
      xLeft: number,
      xRight: number,
      baseY: number,
      amp: number,
      steps: number,
      rng: () => number,
    ): [number, number][] => {
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
    const ptsToSmoothPath = (pts: [number, number][]): string => {
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

    // ─────────────────────────────────────────────────────────────────────────
    // updateGeology
    // ─────────────────────────────────────────────────────────────────────────

    const updateGeology = async (
      data: Lithology[],
      yScale,
    ) => {
      const { getHeight, getYPos } = getYAxisFunctions(yScale);
      const getLithologyFill = getLithologyFiller(data, svg);

      const rects = lithologyGroup.selectAll('rect').data(data);

      rects.exit().remove();

      const newLayers = rects
        .enter()
        .append('rect')
        .attr('x', 10)
        .attr('width', svgWidth - 100)
        .style('stroke', '#101010')
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
        .style('fill', getLithologyFill);
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
    const updateCaves = (data: Cave[], yScale) => {
      cavesGroup.selectAll('g.cave-group').remove();

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

        // Register the texture before reading its url() — same pattern as
        // conflict, pad, and every other texture in this file.
        const caveTexture = cave.water_intake
          ? DEFAULTS_TEXTURES.cave_wet
          : DEFAULTS_TEXTURES.cave_dry;
        svg.call(caveTexture);

        const strokeColor = cave.water_intake ? '#1a6fa8' : '#333333';

        const g = cavesGroup
          .append('g')
          .attr('class', 'cave-group')
          .datum(cave)
          .style('cursor', 'pointer')
          .on('mouseover', tooltips.cave.show)
          .on('mouseout', tooltips.cave.hide);

        // Filled band — covers the lithology fill in this depth interval
        g.append('path')
          .attr('d', closedPath)
          .attr('fill', caveTexture.url())
          .attr('stroke', 'none');

        // Top contact line — rendered above the fill so it's always visible
        g.append('path')
          .attr('d', topPath)
          .attr('fill', 'none')
          .attr('stroke', strokeColor)
          .attr('stroke-width', 1.2)
          .attr('stroke-linecap', 'round')
          .attr('stroke-linejoin', 'round');

        // Bottom contact line
        g.append('path')
          .attr('d', botPath)
          .attr('fill', 'none')
          .attr('stroke', strokeColor)
          .attr('stroke-width', 1.2)
          .attr('stroke-linecap', 'round')
          .attr('stroke-linejoin', 'round');
      });
    };

    // ─────────────────────────────────────────────────────────────────────────
    // updateFractures
    // ─────────────────────────────────────────────────────────────────────────

    const updateFractures = (data: Fracture[], yScale) => {
      fracturesGroup.selectAll('g.fracture-group').remove();

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
          .attr('class', 'fracture-group')
          .datum(fracture)
          .attr('transform',
            `translate(0,${cy}) rotate(${fracture.dip},${pocoCenterInGroup},0)`)
          .on('mouseover', tooltips.fracture.show)
          .on('mouseout', tooltips.fracture.hide)
          .style('cursor', 'pointer');

        const hitBuffer = fracture.swarm ? 14 : 8;
        g.append('rect')
          .attr('x', xa)
          .attr('y', -hitBuffer)
          .attr('width', w)
          .attr('height', hitBuffer * 2)
          .attr('fill', 'transparent')
          .style('pointer-events', 'all');

        const strokeColor = fracture.water_intake ? '#1a6fa8' : '#000000';

        const appendLine = (x1: number, y1: number, x2: number, y2: number, sw: number) =>
          g.append('line')
            .attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2)
            .attr('stroke', strokeColor).attr('stroke-width', sw).attr('stroke-linecap', RC);

        const appendPolyline = (pts: [number, number][], sw: number) =>
          g.append('polyline')
            .attr('points', pts.map(([nx, dy]) => `${xAt(nx)},${dy}`).join(' '))
            .attr('stroke', strokeColor).attr('stroke-width', sw)
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

    const updatePoco = (
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

      constructionGroup.selectAll('.cement_pad').remove();

      if (data.cement_pad && data.cement_pad.thickness) {
        const tipCP = d3
          // @ts-ignore
          .tip()
          .attr('class', this.customClassNames.tooltip)
          .direction('e')
          .html((element, d: CementPad) => {
            return `
              <span class="${this.customClassNames.tooltipTitle}">LAJE DE PROTEÇÃO</span>
              <span class="${this.customClassNames.tooltipPrimaryInfo}">${data.cement_pad.type}</span>
              <span class="${this.customClassNames.tooltipSecondaryInfo}"><strong>Espessura:</strong> 
              ${data.cement_pad.thickness} m</span>
              <span class="${this.customClassNames.tooltipSecondaryInfo}">
                <strong>Largura:</strong> ${data.cement_pad.width} m
              </span>
              <span class="${this.customClassNames.tooltipSecondaryInfo}">
                <strong>Comprimento:</strong> ${data.cement_pad.length} m
              </span>
            `;
          });

        svg.call(tipCP);

        const cementPad = cementPadGroup
          .selectAll('rect')
          .data([data.cement_pad]);

        cementPad.exit().remove();

        const newCementPad = cementPad
          .enter()
          .append('rect')
          .attr('class', 'cement_pad')
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
          .style('fill', d => {
            svg.call(DEFAULTS_TEXTURES.pad);
            return DEFAULTS_TEXTURES.pad.url();
          })
          .style('stroke', '#303030')
          .style('stroke-width', '2px');

        newCementPad.on('mouseover', tipCP.show).on('mouseout', tipCP.hide);
      }

      const hole = holeGroup.selectAll('rect').data(data.bore_hole);

      hole.exit().remove();

      const newHole = hole
        .enter()
        .append('rect')
        .style('fill', '#fff')
        .style('opacity', '0.6')
        .style('stroke', '#303030')
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
        .selectAll('rect')
        .data(data.surface_case);

      surfaceCase
        .exit()
        // @ts-ignore
        .transition(transition)
        .attr('height', 0)
        .style('fill', '#000')
        .remove();

      const newSurfaceCase = surfaceCase
        .enter()
        .append('rect')
        .style('fill', '#000')
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

      const holeFill = holeFillGroup.selectAll('rect').data(data.hole_fill);

      holeFill.exit().remove();

      const newHoleFill = holeFill
        .enter()
        .append('rect')
        .style('stroke', '#303030')
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
        .style('fill', (d: HoleFill) => {
          svg.call(DEFAULTS_TEXTURES[d.type]);
          return DEFAULTS_TEXTURES[d.type].url();
        });

      const wellCase = wellCaseGroup.selectAll('rect').data(data.well_case);

      wellCase.exit().remove();

      const newWellCase = wellCase
        .enter()
        .append('rect')
        .style('fill', '#fff')
        .style('stroke', '#303030')
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
        .selectAll('rect')
        .data(data.well_screen);

      wellScreen.exit().remove();

      const newWellScreen = wellScreen
        .enter()
        .append('rect')
        .style('stroke', '#303030')
        .style('stroke-width', '2px')
        .style('fill', () => {
          svg.call(DEFAULTS_TEXTURES.well_screen);
          return DEFAULTS_TEXTURES.well_screen.url();
        })
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

      const tipConflict = d3
        // @ts-ignore
        .tip()
        .attr('class', `${this.customClassNames.tooltip} conflic`)
        .direction('e')
        .html((_, d) => {
          return `
        <span class="${this.customClassNames.tooltipTitle}">CONFLITO</span>
            <span class="${this.customClassNames.tooltipPrimaryInfo}">De ${d.from} m até ${d.to} m</span>
        `;
        });

      svg.call(tipConflict);

      const conflict = conflictGroup.selectAll('rect').data(mergedConflicts);

      conflict.exit().remove();

      const newConflict = conflict
        .enter()
        .append('rect')
        .style('stroke', '#E52117')
        .style('stroke-width', '4px')
        .style('fill', () => {
          svg.call(DEFAULTS_TEXTURES.conflict);
          return DEFAULTS_TEXTURES.conflict.url();
        })
        .on('mouseover', tipConflict.show)
        .on('mouseout', tipConflict.hide);

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
      .range([0, svgHeight - this.MARGINS.TOP - this.MARGINS.BOTTOM]);

    const yZero = yScaleGlobal(0);

    const yAxis = d3.axisLeft(yScaleGlobal).tickFormat((d: any) => `${d} m`);

    const gY = geologicGroup
      .select(`.${this.customClassNames.yAxis}`)
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
      gY.call(yAxis.scale(transform.rescaleY(yScaleGlobal)));

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
        .selectAll('g.fracture-group')
        .attr('transform', (d: any) => {
          if (!d) return null;
          const cx = pocoCenterInGroup;
          const cy = transform.applyY(yScaleGlobal(d.depth));
          return `translate(0,${cy}) rotate(${d.dip},${cx},0)`;
        });

      // Caves: full redraw with the rescaled yScale.
      // Path geometry is cheap and this keeps the zoom handler simple.
      if (geologicData.caves?.length) {
        updateCaves(geologicData.caves, transform.rescaleY(yScaleGlobal));
      }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Initial draw
    // ─────────────────────────────────────────────────────────────────────────

    const drawProfile = () => {
      if (geologicData.lithology) updateGeology(geologicData.lithology, yScaleGlobal);
      if (geologicData.caves?.length) updateCaves(geologicData.caves, yScaleGlobal);
      if (geologicData.fractures) updateFractures(geologicData.fractures, yScaleGlobal);
      if (constructionData) updatePoco(constructionData, yScaleGlobal);

      this.svg.select('#fractures-clip-rect')
        .attr('y', yZero)
        .attr('height', svgHeight);
    };

    // @ts-ignore
    const zoomNode = d3.zoom().on('zoom', zooming);

    drawProfile();
    // @ts-ignore
    this.svg.call(zoomNode).node();
  }
}

export default {
  DinamicDrawer,
};