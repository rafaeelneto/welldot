
import * as d3module from 'd3';
import d3tip from 'd3-tip';

// @ts-ignore
import textures from 'textures';

import wrap from '../../../src_old/utils/wrap';

// eslint-disable-next-line import/namespace
import { innerRenderPdf, printPdf, downloadPdf } from './pdfGenerate';

import fdgcTextures from '../../../src_old/utils/fgdcTextures';

import {
  getProfileLastItemsDepths,
  getProfileDiamValues,
  checkIfProfileIsEmpty,
} from '../../utils/profile.utils';
import { DiameterUnits, LengthUnits, CoordFormat } from '@/src/store/ui.store';

import { SvgInfo, infoType } from '../../../src_old/types/profile2Export.types';

import { getLithologicalFillList } from '../../../src_old/utils/profileD3.utils';
import {
  Cave,
  Constructive,
  Fracture,
  HoleFill,
  Lithology,
  Profile,
} from '@/src/types/profile.types';

const d3 = {
  ...d3module,
  tip: d3tip,
};

const DARK_GRAY = '#303030';

export const A4_SVG_HEIGHT = 480 * 1.33;

export function buildSvgProfiles(props: {
    profile: Profile;
    lengthUnits: LengthUnits,
    diameterUnits: DiameterUnits,
    breakPages?: boolean,
    zoomLevel?: number,
    firstPageAvailableHeight?: number,
}) {
    const {
        profile,
        lengthUnits = 'm',
        diameterUnits = 'mm',
        breakPages = false,
        zoomLevel = 1,
        firstPageAvailableHeight,
    } = props;
    const fmtDiam = (mm: number): string => diameterUnits === 'inches' ? (mm * 0.0393701).toFixed(2) : String(mm);
  const lenUnit = lengthUnits === 'ft' ? 'ft' : 'm';
  const diamUnit = diameterUnits === 'inches' ? '"' : 'mm';

  const MARGINS = { TOP: 15, RIGHT: 30, BOTTOM: 30, LEFT: 20 };

  const geologicData = profile.lithology;
  const constructionData = {
    cement_pad: profile.cement_pad,
    bore_hole: profile.bore_hole,
    hole_fill: profile.hole_fill,
    surface_case: profile.surface_case,
    well_case: profile.well_case,
    well_screen: profile.well_screen,
    reduction: profile.reduction,
  } as Constructive;

  // calculate max depth on the profile
  const depthValues = getProfileLastItemsDepths(profile);

  const maxYValues = d3.max(depthValues) || 0;

const WIDTH = 595.28 - 30 - 30 - MARGINS.LEFT - MARGINS.RIGHT; // 485.28pt
const POCO_CENTER = 350;
const GEOLOGY_X_POS = 35;
const GEOLOGY_WIDTH = 220;
const GEOLOGY_X_POS_DIV_1 = GEOLOGY_WIDTH + GEOLOGY_X_POS + 10; // 265
const GEOLOGY_X_POS_DIV_2 = GEOLOGY_X_POS_DIV_1 + 20;           // 285
const GEOLOGY_TIP_WIDTH = 200;

const POCO_WIDTH = 100;

  const maxDiamValues = getProfileDiamValues(profile);

  const maxXValues = d3.max(maxDiamValues) || 0;

  // define the height of the svg  viz based on the value of zoom level
  // * conversion rule pt -> px
  // * 1 pt = 1.33 px
  // * 1 px = 0.75 pt
  const svgTotalHeight = ((1 / zoomLevel) * maxYValues * 1000 * 72) / 25.4;
  const svgs: SvgInfo[] = [];

  

  const yScaleGlobal = d3
    .scaleLinear()
    .domain([0, maxYValues])
    .range([0, svgTotalHeight]);

  const xScale = d3
    .scaleLinear()
    .domain([0, maxXValues])
    .range([0, POCO_WIDTH]);

  if (breakPages) {
    // get the value the division and iterates to generate the array of svgs that will be draw
    let heightLeft = svgTotalHeight;
    let index = 1;

    while (heightLeft > 0) {
      const pageHeight = index === 1 && firstPageAvailableHeight != null
        ? Math.max(firstPageAvailableHeight, 50)
        : A4_SVG_HEIGHT;

      svgs.push({
        id: `svgCanvas${index}`,
        height: heightLeft > pageHeight ? pageHeight : heightLeft,
      });

      heightLeft -= pageHeight;
      index += 1;
    }
  } else {
    // add one svg container to the list
    svgs.push({
      id: `svgCanvas1`,
      height: svgTotalHeight,
    });
  }

  // iterates through the array of svgs to add it to the div container
  const divContainer = d3.select('#svgDraftContainer');
  divContainer.selectAll('svg').remove();

  svgs.forEach(svgInfo => {
    const svgEl = divContainer.append('svg');
    svgEl.attr('id', svgInfo.id);
  });

  let currentDepth = 0;

  const drawLog = (svgInfo: SvgInfo) => {
    const getTextLabelSelector = (from: number) => {
      return `text-${from * 1000}`;
    };

    const svg = d3.select(`#${svgInfo.id}`);

    svg.attr('height', svgInfo.height + MARGINS.TOP + MARGINS.BOTTOM);
    svg.attr('width', WIDTH + MARGINS.LEFT + MARGINS.RIGHT);

    svg.selectAll('*').remove();

    const pocoGroup = svg
      .append('g')
      .attr('class', 'poco-group')
      .attr('transform', `translate(${MARGINS.LEFT}, ${MARGINS.TOP})`);

    const litoligicalGroup = pocoGroup.append('g').attr('class', 'lito-group');

    const cavesGroup = pocoGroup.append('g').attr('class', 'caves-group');

    const constructionGroup = pocoGroup
      .append('g')
      .attr('class', 'const-group');

    const fracturesGroup = pocoGroup.append('g').attr('class', 'fractures-group');

    litoligicalGroup.append('g').attr('class', 'yAxis');

    const cementPadGroup = constructionGroup
      .append('g')
      .attr('class', 'cement-pad');
    const holeGroup = constructionGroup.append('g').attr('class', 'hole');
    const surfaceCaseGroup = constructionGroup
      .append('g')
      .attr('class', 'surface-case');
    const holeFillGroup = constructionGroup
      .append('g')
      .attr('class', 'hole-fill');
    const wellCaseGroup = constructionGroup
      .append('g')
      .attr('class', 'well-case');
    const wellScreenGroup = constructionGroup
      .append('g')
      .attr('class', 'well-screen');

    // define a new scale
    const maxSvgDepth = yScaleGlobal.invert(svgInfo.height) + currentDepth;

    const tickCount = svgInfo.height / 80;

    const yScaleLocal = d3
      .scaleLinear()
      .domain([currentDepth, maxSvgDepth])
      .range([0, svgInfo.height]);

    const depthFactor = lengthUnits === 'ft' ? 3.28084 : 1;
    const yScaleAxisLocal = d3
      .scaleLinear()
      .domain([currentDepth * depthFactor, maxSvgDepth * depthFactor])
      .range([0, svgInfo.height]);

    const yAxis = d3
      .axisLeft(yScaleAxisLocal)
      .tickFormat((d: any) => `${d}${lenUnit}`)
      .tickArguments([tickCount]);

    // @ts-ignore
    const gY = pocoGroup
      .append('g')
      .attr('class', `yAxis`)
      .call(yAxis)
      .attr('transform', `translate(10, 0)`)
      .attr('stroke', '#000000');

    gY.selectAll('text')
      .attr('stroke', 'none')
      .attr('fill', '#000000')
      .attr('font-size', 7.5);

    const profileTexture = {
      pad: textures.lines().heavier(10).thinner(1.5).background('#ffffff'),
      seal: textures.lines().thicker().background('#ffffff'),
      gravel_pack: textures.circles().complement().background('#ffffff'),
      well_screen: textures
        .paths()
        .d(s => `M ${s / 4} ${s / 4} l ${s / 2} 0 `)
        .size(40)
        .strokeWidth(2)
        .thicker(2)
        .background('#fff'),
      cave_dry: textures.lines().size(8).orientation('6/8').heavier(.3).thinner(.8).background('#ffffff').stroke('#333333'),
      cave_wet: textures.lines().size(8).orientation('6/8').heavier(.3).thinner(.8).background('#ffffff').stroke('#1a6fa8'),
    };

    const updateGeology = async (data: Lithology[], yScale) => {
      const litologicalFill = getLithologicalFillList(data);

      const layerGroup = litoligicalGroup.append('g');

      const layers = layerGroup.selectAll('rect').data(data);

      layers
        .enter()
        .append('rect')
        .attr('x', GEOLOGY_X_POS)
        .attr('width', GEOLOGY_WIDTH)
        .style('stroke', '#101010')
        .style('stroke-width', '1px')
        .attr('y', (d: Lithology, i) => {
          if (i === 0) {
            const depth = d.from < currentDepth ? currentDepth : d.from;
            return yScale(depth);
          }

          // const depth = d.from < currentDepth ? currentDepth : d.from;
          return yScale(data[i - 1].to);
        })
        .attr('height', (d: Lithology, i) => {
          const depth =
            (d.to < maxSvgDepth ? d.to : maxSvgDepth) -
            (d.from > currentDepth ? d.from : currentDepth);

          return yScale(depth + currentDepth);
        })
        .style('fill', (d: Lithology) => {
          if (!litologicalFill[`${d.fgdc_texture}.${d.from}`].url) {
            return litologicalFill[`${d.fgdc_texture}.${d.from}`];
          }
          svg.call(litologicalFill[`${d.fgdc_texture}.${d.from}`]);
          return litologicalFill[`${d.fgdc_texture}.${d.from}`].url();
        });


      const dividersGroup = litoligicalGroup.append('g');

      const dividers = dividersGroup.selectAll('g').data(data);

      let currYPos = 0;

      dividers
        .enter()
        .append('g')
        .append('path')
        .attr('class', 'lines')
        .attr('fill', 'none')
        .style('stroke', '#101010')
        .style('stroke-width', '1px')
        // eslint-disable-next-line no-unused-vars
        // @ts-ignore
        .attr('d', (d: Lithology, i) => {
          const yPos = yScale(d.from > currentDepth ? d.from : currentDepth);
          let curveCoordinates: any[] = [[WIDTH, yPos]];

          if (i > 0) {
            const lastTextHeight =
              // @ts-ignore
              (d3
                .select(`.${getTextLabelSelector(data[i - 1].from)}`)
                .node()
                // @ts-ignore
                .getBoundingClientRect().height || 0) +
              LABELS_MARGINS.top +
              LABELS_MARGINS.button;

            const calculatedY = currYPos + lastTextHeight;

            if (
              yPos + LABELS_MARGINS.top + LABELS_MARGINS.button <
              calculatedY
            ) {
              curveCoordinates = [
                [GEOLOGY_X_POS_DIV_2, calculatedY],
                [WIDTH, calculatedY],
              ];

              currYPos = calculatedY;
            } else {
              currYPos = yPos;
              curveCoordinates = [[WIDTH, yScale(d.from)]];
            }
          } else {
            currYPos = yPos;
          }

          return d3.line()([
            [GEOLOGY_X_POS + GEOLOGY_WIDTH, yPos],
            [GEOLOGY_X_POS_DIV_1, yPos],
            ...curveCoordinates,
          ]);
        });
    };

    const LABELS_MARGINS = { top: 4, button: 4 };

    const updateLithologyLabels = (data: Lithology[], yScale) => {

      const depthTipGroup = pocoGroup.append('g');

      const depthTip = depthTipGroup.selectAll('text').data(data);

      depthTip.exit().remove();

      let currYPos = 0;

      depthTipGroup
        .selectAll('rect.depth-tip-bg')
        .data(data.filter(d => d.to <= maxSvgDepth))
        .enter()
        .append('rect')
        .attr('class', 'depth-tip-bg')
        .attr('fill', 'white')
        .attr('stroke', DARK_GRAY)
        .attr('stroke-width', 0.5)
        .attr('x', GEOLOGY_X_POS)
        .attr('width', (d: Lithology) => `${d.to}`.length * (7.5 * 0.52) + 4)
        .attr('height', 11)
        .attr('y', (d: Lithology) => yScale(d.to) - 5.5)
        .attr('rx', 2);

      depthTip
        .enter()
        .append('text')
        .attr('class', d => `depthTip-${d.from}`)
        .attr('x', GEOLOGY_X_POS + 2)
        .attr('dy', '.35em')
        .attr('font-size', 7.5)
        .attr('text-anchor', 'start')
        .text(d => {
          if (d.to > maxSvgDepth) return null;
          return `${d.to}`;
        })
        .attr('y', (d: Lithology, i) => {
          currYPos = yScale(d.to);
          return yScale(d.to);
        });

      const labelGroup = pocoGroup.append('g');

      const labels = labelGroup.selectAll('text').data(data);

      labels.exit().remove();

      currYPos = 0;

      labels
        .enter()
        .append('text')
        .attr('class', d => `${getTextLabelSelector(d.from)}`)
        .attr('x', GEOLOGY_X_POS_DIV_2)
        .attr('dy', '.15em')
        .attr('font-size', 7.5)
        .text(d => {
          // if (d.from < currentDepth) return null;
          return d.description;
        })
        .call(wrap, GEOLOGY_TIP_WIDTH)
        .attr('y', (d: Lithology, i) => {
          if (i > 0) {
            const lastTextHeight =
              // @ts-ignore
              (d3
                .select(`.${getTextLabelSelector(data[i - 1].from)}`)
                .node()
                // @ts-ignore
                .getBoundingClientRect().height || 0) +
              LABELS_MARGINS.button +
              LABELS_MARGINS.top;

            const calculatedY = currYPos + lastTextHeight;

            if (
              yScale(d.from) + LABELS_MARGINS.top + LABELS_MARGINS.button <
              calculatedY
            ) {
              currYPos = calculatedY;

              return calculatedY + 7;
            }
          }

          const yPos = yScale(d.from > currentDepth ? d.from : currentDepth);

          currYPos = yPos;
          return yPos + 7;
        });
    }

    // ── Cave helpers ──────────────────────────────────────────────────────────

    const makeCavePrng = (seed: number) => {
      let s = Math.abs(seed * 6271) | 1;
      return () => {
        s = (s * 16807) % 2147483647;
        return (s - 1) / 2147483646;
      };
    };

    const wavyContact = (
      xLeft: number, xRight: number, baseY: number,
      amp: number, steps: number, rng: () => number,
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

    const ptsToSmoothPath = (pts: [number, number][]): string => {
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

    const updateCaves = (data: Cave[], yScale: d3module.ScaleLinear<number, number>) => {
      cavesGroup.selectAll('g.cave-group').remove();

      const xLeft  = GEOLOGY_X_POS;
      const xRight = GEOLOGY_X_POS + GEOLOGY_WIDTH;
      const steps  = 32;

      data.forEach(cave => {
        const fromClamped = Math.max(cave.from, currentDepth);
        const toClamped   = Math.min(cave.to,   maxSvgDepth);
        if (fromClamped >= toClamped) return;

        const seedTop = cave.from * 100 + cave.to;
        const seedBot = cave.to   * 100 + cave.from + 999;
        const rngTop  = makeCavePrng(seedTop);
        const rngBot  = makeCavePrng(seedBot);

        const yTop = yScale(fromClamped);
        const yBot = yScale(toClamped);
        const span = yBot - yTop;
        const amp  = Math.max(2, Math.min(span * 0.06, 5));

        const topPts = wavyContact(xLeft, xRight, yTop, amp, steps, rngTop);
        const botPts = wavyContact(xLeft, xRight, yBot, amp, steps, rngBot);

        const topPath    = ptsToSmoothPath(topPts);
        const botPath    = ptsToSmoothPath(botPts);
        const botReversed = ptsToSmoothPath([...botPts].reverse());
        const closedPath =
          topPath +
          ` L ${xRight.toFixed(1)},${botPts[botPts.length - 1][1].toFixed(1)}` +
          botReversed.replace(/^M [\d.-]+ [\d.-]+/, '') +
          ` L ${xLeft.toFixed(1)},${topPts[0][1].toFixed(1)} Z`;

        const caveTexture = cave.water_intake
          ? profileTexture.cave_wet
          : profileTexture.cave_dry;
        svg.call(caveTexture);

        const strokeColor = cave.water_intake ? '#1a6fa8' : '#333333';

        const g = cavesGroup.append('g').attr('class', 'cave-group');

        g.append('path')
          .attr('d', closedPath)
          .attr('fill', caveTexture.url())
          .attr('fill-opacity', 0.6)
          .attr('stroke', 'none');

        g.append('path')
          .attr('d', topPath)
          .attr('fill', 'none')
          .attr('stroke', strokeColor)
          .attr('stroke-width', 1.2)
          .attr('stroke-linecap', 'round')
          .attr('stroke-linejoin', 'round');

        g.append('path')
          .attr('d', botPath)
          .attr('fill', 'none')
          .attr('stroke', strokeColor)
          .attr('stroke-width', 1.2)
          .attr('stroke-linecap', 'round')
          .attr('stroke-linejoin', 'round');

        // Depth labels on the right inside edge of the cave band,
        // clear of the lithology "to" labels on the left (x = GEOLOGY_X_POS - 5).
        // A white background rect is rendered first so the label stays legible
        // over the cave texture and wavy contact lines.
        const labelRightEdge = GEOLOGY_X_POS + GEOLOGY_WIDTH - 3;
        const appendDepthLabel = (depth: number, anchorY: number) => {
          const labelW = `${depth}`.length * (7.5 * 0.52) + 4;
          g.append('rect')
            .attr('class', 'depth-tip-bg')
            .attr('fill', 'white')
            .attr('stroke', DARK_GRAY)
            .attr('stroke-width', 0.5)
            .attr('x', labelRightEdge - labelW)
            .attr('width', labelW)
            .attr('height', 11)
            .attr('y', anchorY - 5.5)
            .attr('rx', 2);
          g.append('text')
            .attr('x', labelRightEdge - 2)
            .attr('dy', '.35em')
            .attr('font-size', 7.5)
            .attr('text-anchor', 'end')
            .attr('y', anchorY)
            .text(`${depth}`);
        };

        if (fromClamped === cave.from) appendDepthLabel(cave.from, yTop);
        if (toClamped   === cave.to)   appendDepthLabel(cave.to,   yBot);
      });
    };

    const occupiedPositions: { from: number; to: number }[] = [];

    const updatePoco = (data: Constructive, yScale) => {
      constructionGroup.selectAll('.cement_pad').remove();

      if (data.cement_pad && data.cement_pad.thickness && currentDepth === 0) {
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
            (d: any) => (POCO_CENTER - xScale((d.width * 0.7 * 1000) / 2)) / 2,
          )
          .attr('y', (d: any) => {
            return yScale(0) - yScale(d.thickness * 0.7);
          })
          .attr('width', (d: any) => xScale((d.width * 0.7 * 1000) / 2))
          .attr('height', (d: any) => {
            return yScale(d.thickness * 0.7);
          })
          .style('fill', d => {
            svg.call(profileTexture.pad);
            return profileTexture.pad.url();
          })
          .style('stroke', DARK_GRAY)
          .style('stroke-width', '2px');
      }

      const getXPos = () => {
        return (d: any) => (POCO_CENTER - xScale(d.diameter)) / 2;
      };
      const getWidth = () => {
        return (d: any) => xScale(d.diameter);
      };

      const getYPos = dataInner => {
        return (d, i) => {
          if (i === 0) {
            const depth = d.from < currentDepth ? currentDepth : d.from;
            return yScale(depth);
          }

          // const depth = d.from < currentDepth ? currentDepth : d.from;
          return yScale(dataInner[i - 1].to);
        };
      };

      const getYPosUnconnected = dataInner => {
        return (d, i) => {
          const depth = d.from < currentDepth ? currentDepth : d.from;
          return yScale(depth);
        };
      };

      const getHeight = dataInner => {
        return (d, i) => {
          const depth =
            (d.to < maxSvgDepth ? d.to : maxSvgDepth) -
            (d.from > currentDepth ? d.from : currentDepth);

          return yScale(depth + currentDepth);
        };
      };

      const hole = holeGroup.selectAll('rect').data(data.bore_hole);

      hole.exit().remove();

      const newHole = hole
        .enter()
        .append('rect')
        .style('fill', '#fff')
        .style('fill-opacity', '0.6')
        .style('stroke', DARK_GRAY)
        .style('stroke-dasharray', '3, 3')
        .style('stroke-width', '1px');

      newHole
        // @ts-ignore
        .merge(hole)
        .attr('x', getXPos())
        .attr('width', getWidth())
        .attr('y', getYPos(data.bore_hole))
        .attr('height', getHeight(data.bore_hole));

      const surfaceCase = surfaceCaseGroup
        .selectAll('rect')
        .data(data.surface_case);

      surfaceCase.exit().attr('height', 0).style('fill', '#000').remove();

      const newSurfaceCase = surfaceCase
        .enter()
        .append('rect')
        .style('fill', '#000');

      newSurfaceCase
        // @ts-ignore
        .merge(surfaceCase)
        .attr(
          'x',
          (d: any) => (POCO_CENTER - xScale(d.diameter + d.diameter * 0.1)) / 2,
        )
        .attr('width', (d: any) => xScale(d.diameter + d.diameter * 0.1))
        .attr('y', getYPos(data.surface_case))
        .attr('height', (d: any) => {
          const depth =
            (d.to < maxSvgDepth ? d.to : maxSvgDepth) -
            (d.from > currentDepth ? d.from : currentDepth);

          return yScale(depth + currentDepth);
        });

      const holeFill = holeFillGroup.selectAll('rect').data(data.hole_fill);

      holeFill.exit().remove();

      const newHoleFill = holeFill
        .enter()
        .append('rect')
        .style('stroke', DARK_GRAY)
        .style('stroke-width', '2px');

      newHoleFill
        // @ts-ignore
        .merge(holeFill)
        .attr('x', (d: any) => (POCO_CENTER - xScale(d.diameter)) / 2)
        .attr('width', (d: any) => xScale(d.diameter))
        .attr('y', getYPos(data.hole_fill))
        .attr('height', (d: any) => {
          const depth =
            (d.to < maxSvgDepth ? d.to : maxSvgDepth) -
            (d.from > currentDepth ? d.from : currentDepth);

          return yScale(depth + currentDepth);
        })
        .style('fill', (d: HoleFill) => {
          svg.call(profileTexture[d.type]);
          return profileTexture[d.type].url();
        });

      const wellCase = wellCaseGroup.selectAll('rect').data(data.well_case);

      wellCase.exit().remove();

      const newWellCase = wellCase
        .enter()
        .append('rect')
        .style('fill', '#fff')
        .style('stroke', DARK_GRAY)
        .style('stroke-width', '2px');

      newWellCase
        // @ts-ignore
        .merge(wellCase)
        .attr('x', (d: any) => (POCO_CENTER - xScale(d.diameter)) / 2)
        .attr('width', (d: any) => xScale(d.diameter))
        .attr('y', getYPosUnconnected(data.well_case))
        .attr('height', getHeight(data.well_case));

      const wellScreen = wellScreenGroup
        .selectAll('rect')
        .data(data.well_screen);

      wellScreen.exit().remove();

      const newWellScreen = wellScreen
        .enter()
        .append('rect')
        .style('stroke', DARK_GRAY)
        .style('stroke-width', '2px')
        .style('fill', (d: any) => {
          svg.call(profileTexture.well_screen);
          return profileTexture.well_screen.url();
        });

      newWellScreen
        // @ts-ignore
        .merge(wellScreen)
        .attr('x', (d: any) => (POCO_CENTER - xScale(d.diameter)) / 2)
        .attr('width', (d: any) => xScale(d.diameter))
        .attr('y', getYPosUnconnected(data.well_screen))
        .attr('height', (d: any) => {
          const depth =
            (d.to < maxSvgDepth ? d.to : maxSvgDepth) -
            (d.from > currentDepth ? d.from : currentDepth);

          return yScale(depth + currentDepth);
        });

      // DRAW WELL CASE AND WELL SCREEN TIPS

      const MARGINS_TIP = { top: 4, botton: 4, right: 5, left: 5 };

      const getTipXPos = (margin: number, className) => {
        return d => {
          const yDepth = d.from < currentDepth ? currentDepth : d.from;

          const depth =
            (d.to < maxSvgDepth ? d.to : maxSvgDepth) -
            (d.from > currentDepth ? d.from : currentDepth);

          const textHeight =
            // @ts-ignore
            d3
              .select(`.${className}${parseInt(d.from)}`)
              .node()
              // @ts-ignore
              .getBoundingClientRect().height || 0;

          const yPos = yScale(depth / 2 + yDepth) + textHeight / 2;

          let xPos = getXPos()(d) - margin;

          occupiedPositions.forEach(pos => {
            if (
              (yPos < pos.to && yPos > pos.from) ||
              (yPos + textHeight < pos.to && yPos + textHeight > pos.from)
            )
              xPos -= 100;
          });
          return xPos;
        };
      };
      const getTipYpos = (dataInner, className, blockPos = true) => {
        return (d, i) => {
          const yDepth = d.from < currentDepth ? currentDepth : d.from;

          const textHeight =
            // @ts-ignore
            d3
              .select(`.${className}${parseInt(d.from)}`)
              .node()
              // @ts-ignore
              .getBoundingClientRect().height || 0;

          const depth =
            (d.to < maxSvgDepth ? d.to : maxSvgDepth) -
            (d.from > currentDepth ? d.from : currentDepth);

          const yPos = yScale(depth / 2 + yDepth) - textHeight / 2;

          if (blockPos)
            occupiedPositions.push({ from: yPos, to: yPos + textHeight });

          return yPos;
        };
      };

      const getRectXPos = (margin: number, className) => {
        return d => {
          const textXPos =
            // @ts-ignore
            parseFloat(
              d3.select(`.${className}${parseInt(d.from)}`).attr('x'),
            ) || 0;

          const textWidth =
            // @ts-ignore
            d3
              .select(`.${className}${parseInt(d.from)}`)
              .node()
              // @ts-ignore
              .getBoundingClientRect().width || 0;

          const xPos =
            textXPos - (textWidth + MARGINS_TIP.left + MARGINS_TIP.right / 2);

          // occupiedPositions.forEach((pos) => {
          //   if (
          //     (yPos < pos.to && yPos > pos.from) ||
          //     (yPos + textHeight < pos.to && yPos + textHeight > pos.from)
          //   )
          //     xPos -= 100;
          // });
          return xPos;
        };
      };

      const getRectHeight = className => {
        return (d, i) => {
          const textHeight =
            // @ts-ignore
            d3
              .select(`.${className}${parseInt(d.from)}`)
              .node()
              // @ts-ignore
              .getBoundingClientRect().height || 0;

          return textHeight + MARGINS_TIP.top + MARGINS_TIP.botton;
        };
      };

      const getRectWidth = className => {
        return (d, i) => {
          const textWidth =
            // @ts-ignore
            d3
              .select(`.${className}${parseInt(d.from)}`)
              .node()
              // @ts-ignore
              .getBoundingClientRect().width || 0;

          return textWidth + MARGINS_TIP.left + MARGINS_TIP.right;
        };
      };

      const getRectYpos = (dataInner, className) => {
        return (d, i) => {
          const yDepth = d.from < currentDepth ? currentDepth : d.from;

          const textHeight =
            // @ts-ignore
            d3
              .select(`.${className}${parseInt(d.from)}`)
              .node()
              // @ts-ignore
              .getBoundingClientRect().height || 0;

          const depth =
            (d.to < maxSvgDepth ? d.to : maxSvgDepth) -
            (d.from > currentDepth ? d.from : currentDepth);

          const yPos =
            yScale(depth / 2 + yDepth) -
            textHeight / 2 -
            MARGINS_TIP.botton -
            MARGINS_TIP.top;

          occupiedPositions.push({
            from: yPos,
            to: yPos + textHeight + MARGINS_TIP.botton + MARGINS_TIP.top,
          });

          return yPos;
        };
      };

      const WELL_CASE_TIP_CLASS_NAME = 'wellCaseTip-';

      const wellCaseTipGroup = constructionGroup.append('g');

      let lastDiam = 0;

      const wellCaseFiltered = data.well_case.filter(item => {
        if (item.diameter !== lastDiam) {
          lastDiam = item.diameter;
          return true;
        }
        return false;
      });

      lastDiam = 0;

      const wellScreenFiltered = data.well_screen.filter(item => {
        if (item.diameter !== lastDiam) {
          lastDiam = item.diameter;
          return true;
        }
        return false;
      });

      const wellCaseTip = wellCaseTipGroup
        .selectAll('text')
        .data(wellCaseFiltered);

      wellCaseTip.exit().remove();

      wellCaseTip
        .enter()
        .append('text')
        .attr(
          'class',
          // @ts-ignore
          d => `${WELL_CASE_TIP_CLASS_NAME}${parseInt(d.from)}`,
        )
        .attr('dy', '.35em')
        .attr('font-size', 7.5)
        .attr('fill', DARK_GRAY)

        .text(d => {
          // if (d.to > maxSvgDepth) return null;
          return `Revest. ${fmtDiam(d.diameter)}${diamUnit} ${d.type}`;
        })
        .attr('text-anchor', 'end')
        .attr('x', getTipXPos(10, WELL_CASE_TIP_CLASS_NAME))
        .call(wrap, 50)
        .attr('y', getTipYpos(wellCaseFiltered, WELL_CASE_TIP_CLASS_NAME));

      const wellCaseRect = wellCaseTipGroup
        .selectAll('rect')
        .data(wellCaseFiltered);

      wellCaseRect.exit().remove();

      wellCaseRect
        .enter()
        .append('rect')
        .lower()
        .attr('x', getRectXPos(10, WELL_CASE_TIP_CLASS_NAME))
        .attr('height', getRectHeight(WELL_CASE_TIP_CLASS_NAME))
        .attr('width', getRectWidth(WELL_CASE_TIP_CLASS_NAME))
        .attr('fill', 'white')
        .attr('rx', '5')
        .style('stroke', DARK_GRAY)
        .style('stroke-width', '1px')
        .attr('y', getRectYpos(wellCaseFiltered, WELL_CASE_TIP_CLASS_NAME));

      const WELL_SCREEN_TIP_CLASS_NAME = 'wellScreenTip-';

      const wellScreenTipGroup = constructionGroup.append('g');

      const wellScreenTip = wellScreenTipGroup
        .selectAll('text')
        .data(wellScreenFiltered);

      wellScreenTip.exit().remove();

      wellScreenTip
        .enter()
        .append('text')
        .attr(
          'class',
          // @ts-ignore
          d => `${WELL_SCREEN_TIP_CLASS_NAME}${parseInt(d.from)}`,
        )
        .attr('dy', '.35em')
        .attr('font-size', 7.5)
        .attr('fill', DARK_GRAY)
        .text(d => {
          // if (d.to > maxSvgDepth) return null;
          return `Filtro ${fmtDiam(d.diameter)}${diamUnit} ${d.type} \n Ranhura: ${fmtDiam(d.screen_slot_mm)}${diamUnit}`;
        })
        .attr('text-anchor', 'end')
        .attr('x', getTipXPos(10, WELL_SCREEN_TIP_CLASS_NAME))
        .call(wrap, 80)
        .attr('y', getTipYpos(wellScreenFiltered, WELL_SCREEN_TIP_CLASS_NAME));

      const wellScreenRect = wellScreenTipGroup
        .selectAll('rect')
        .data(wellScreenFiltered);

      wellScreenRect.exit().remove();

      wellScreenRect
        .enter()
        .append('rect')
        .lower()
        .attr('x', getRectXPos(10, WELL_SCREEN_TIP_CLASS_NAME))
        .attr('height', getRectHeight(WELL_SCREEN_TIP_CLASS_NAME))
        .attr('width', getRectWidth(WELL_SCREEN_TIP_CLASS_NAME))
        .attr('fill', 'white')
        .attr('rx', '5')
        .style('stroke', DARK_GRAY)
        .style('stroke-width', '1px')
        .attr('y', getRectYpos(wellScreenFiltered, WELL_SCREEN_TIP_CLASS_NAME));
    };

    const pocoCenterX = POCO_CENTER / 2;
    const halfWidth = (POCO_WIDTH * 1.2) / 2;
    const xa = pocoCenterX - halfWidth;
    const w = halfWidth * 2;

    const updateFractures = (data: Fracture[], yScale: d3module.ScaleLinear<number, number>) => {
      fracturesGroup.selectAll('g.fracture-group').remove();

      // Scale height-related fracture dimensions proportionally to the depth scale so
      // fractures don't visually "explode" at small map scales (high zoomLevel).
      // Reference: ~8 px per metre gives full-size symbols; clamp between 0.15 and 1.
      const pixelsPerMeter = yScale(1) - yScale(0);
      const fractureScale = Math.min(1, Math.max(0.15, pixelsPerMeter / 8));

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
          .attr('class', 'fracture-group')
          .attr('transform', `translate(0,${cy}) rotate(${fracture.dip},${pocoCenterX},0)`);

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
          const lineCount = 4 + Math.round(rng() * 2);
          const spread = 18 * fractureScale;
          const halfSpread = spread / 2;

          const bases = Array.from({ length: lineCount }, () => (rng() * 2 - 1) * halfSpread)
            .sort((a, b) => a - b);

          bases.forEach((base, idx) => {
            const isCentral = idx === Math.floor(lineCount / 2);
            const sw = isCentral ? 1.8 : 0.6 + rng() * 0.7;
            const steps = 6 + Math.round(rng() * 3);
            const jitter = (0.8 + rng() * 1.2) * fractureScale;
            const insetL = 0.04 + rng() * 0.12;
            const insetR = 0.04 + rng() * 0.12;
            appendPolyline(wavyLine(rng, steps, base, jitter, insetL, insetR), sw);
          });

          const bridgeCount = 2 + Math.round(rng() * 2);
          for (let b = 0; b < bridgeCount; b++) {
            const nx = 0.15 + rng() * 0.7;
            const pairIdx = Math.floor(rng() * (bases.length - 1));
            appendLine(xAt(nx), bases[pairIdx], xAt(nx + (rng() - 0.5) * 0.06), bases[pairIdx + 1], 0.6);
          }

          const primaryBase = bases[Math.floor(lineCount / 2)];
          for (let wc = 0; wc < 2; wc++) {
            const nx = 0.2 + rng() * 0.6;
            const len = (3 + rng() * 3) * fractureScale;
            const dir = rng() > 0.5 ? -1 : 1;
            appendLine(xAt(nx), primaryBase, xAt(nx + (rng() - 0.5) * 0.04), primaryBase + dir * len, 0.8);
          }
        } else {
          const steps = 7 + Math.round(rng() * 3);
          const insetL = 0.03 + rng() * 0.08;
          const insetR = 0.03 + rng() * 0.08;
          appendPolyline(wavyLine(rng, steps, 0, 2 * fractureScale, insetL, insetR), 1.8);

          const crackCount = 2 + Math.round(rng() * 2);
          for (let c = 0; c < crackCount; c++) {
            const nx = insetL + rng() * (1 - insetL - insetR);
            const len = (3.5 + rng() * 3.5) * fractureScale;
            const dir = rng() > 0.5 ? 1 : -1;
            appendLine(xAt(nx), (rng() * 2 - 1) * 1.5 * fractureScale, xAt(nx + (rng() - 0.5) * 0.03), dir * len, 0.9);
          }
        }

        // Tip label: depth · dip · azimuth — placed to the left of the fracture band
        const LABEL_FONT_SIZE = 6;
        const LABEL_PAD_X     = 3;
        const LABEL_PAD_Y     = 3;
        const LABEL_H         = LABEL_FONT_SIZE + LABEL_PAD_Y * 2;
        const tipColor        = fracture.water_intake ? '#1a6fa8' : '#444444';
        const depthLabel      = `${(fracture.depth * depthFactor).toFixed(1)}${lenUnit}`;
        const dipLabel        = fracture.dip     != null ? ` D:${fracture.dip}°`      : '';
        const azLabel         = fracture.azimuth != null ? ` Az:${fracture.azimuth}°` : '';
        const tipText         = `${depthLabel}${dipLabel}${azLabel}`;
        const estimatedW      = tipText.length * (LABEL_FONT_SIZE * 0.52) + LABEL_PAD_X * 2;
        const TIP_X_END       = xa - 6;
        const rectX           = TIP_X_END - estimatedW;

        const tipG = fracturesGroup.append('g').attr('class', 'fracture-tip');

        // Dot at well centre on the fracture depth
        tipG.append('circle')
          .attr('cx', pocoCenterX)
          .attr('cy', cy)
          .attr('r', 1.5)
          .attr('fill', tipColor)
          .attr('opacity', 0.65);

        // Dashed leader from centre to right edge of label
        tipG.append('line')
          .attr('x1', pocoCenterX - 2)
          .attr('y1', cy)
          .attr('x2', TIP_X_END)
          .attr('y2', cy)
          .attr('stroke', tipColor)
          .attr('stroke-width', 0.5)
          .attr('stroke-dasharray', '2,2')
          .attr('opacity', 0.65);

        // Background rect centred on the label
        tipG.append('rect')
          .attr('x', rectX)
          .attr('y', cy - LABEL_H / 2)
          .attr('width', estimatedW)
          .attr('height', LABEL_H)
          .attr('rx', 2)
          .attr('fill', 'white')
          .attr('stroke', tipColor)
          .attr('stroke-width', 0.4)
          .attr('opacity', 0.85);

        tipG.append('text')
          .attr('x', rectX + LABEL_PAD_X)
          .attr('y', cy)
          .attr('dy', '.35em')
          .attr('font-size', LABEL_FONT_SIZE)
          .attr('fill', tipColor)
          .attr('opacity', 0.9)
          .text(tipText);
      });
    };

    const drawUnitLabels = (data: Lithology[], yScale: d3module.ScaleLinear<number, number>) => {
      const STRIP_GEO_X = 15;
      const STRIP_AQ_X  = 25;
      const STRIP_W     = 10;
      const FONT_SIZE   = 5.5;
      const MIN_H_TEXT  = 8;

      const groupByField = (field: 'geologic_unit' | 'aquifer_unit') => {
        const groups: { unit: string; from: number; to: number }[] = [];
        for (const layer of data) {
          const unit = layer[field];
          if (!unit) continue;
          const from = Math.max(layer.from, currentDepth);
          const to   = Math.min(layer.to,   maxSvgDepth);
          if (from >= to) continue;
          const last = groups[groups.length - 1];
          if (last && last.unit === unit) {
            last.to = to;
          } else {
            groups.push({ unit, from, to });
          }
        }
        return groups;
      };

      const unitLabelGroup = litoligicalGroup.append('g').attr('class', 'unit-labels');

      const drawStrip = (
        groups: { unit: string; from: number; to: number }[],
        stripX: number,
        bgColor: string,
      ) => {
        groups.forEach((group, idx) => {
          const yTop   = yScale(group.from);
          const yBot   = yScale(group.to);
          const height = yBot - yTop;
          if (height < 1) return;

          const isFirst = idx === 0;
          const isLast  = idx === groups.length - 1;

          unitLabelGroup.append('rect')
            .attr('x', stripX)
            .attr('y', yTop)
            .attr('width', STRIP_W)
            .attr('height', height)
            .attr('fill', bgColor)
            .attr('stroke', DARK_GRAY)
            .attr('stroke-width', 0.4);

          const appendEdge = (y: number, sw: number) =>
            unitLabelGroup.append('line')
              .attr('x1', stripX).attr('x2', stripX + STRIP_W)
              .attr('y1', y).attr('y2', y)
              .attr('stroke', DARK_GRAY).attr('stroke-width', sw);

          appendEdge(yTop, isFirst ? 0.6 : 1.5);
          appendEdge(yBot, isLast  ? 0.6 : 1.5);

          if (height >= MIN_H_TEXT) {
            const maxChars = Math.floor(height / (FONT_SIZE * 0.55));
            const label = group.unit.length > maxChars
              ? group.unit.slice(0, maxChars - 1) + '…'
              : group.unit;

            unitLabelGroup.append('text')
              .attr('transform',
                `translate(${(stripX + STRIP_W / 2).toFixed(1)},${((yTop + yBot) / 2).toFixed(1)}) rotate(-90)`)
              .attr('text-anchor', 'middle')
              .attr('dominant-baseline', 'middle')
              .attr('font-size', FONT_SIZE)
              .attr('fill', DARK_GRAY)
              .text(label);
          }
        });
      };

      drawStrip(groupByField('geologic_unit'), STRIP_GEO_X, '#f0f0f0');
      drawStrip(groupByField('aquifer_unit'),  STRIP_AQ_X,  '#dff0ff');
    };

    // eslint-disable-next-line no-use-before-define
    drawProfile();

    function drawProfile() {
      const filterByDepth = l => {
        if (l.to < currentDepth && l.from < currentDepth) return false;

        if (l.to > maxSvgDepth && l.from > maxSvgDepth) return false;

        return true;
      };

      if (geologicData) {
        const filtered = geologicData.filter(filterByDepth);
        drawUnitLabels(filtered, yScaleLocal);
        updateLithologyLabels(filtered || [], yScaleLocal);
        updateGeology(filtered, yScaleLocal);
      }

      const caves: Cave[] = (profile.caves || []).filter(
        c => c.to >= currentDepth && c.from <= maxSvgDepth,
      );
      if (caves.length > 0) updateCaves(caves, yScaleLocal);

      const fractures: Fracture[] = (profile.fractures || []).filter(
        f => f.depth >= currentDepth && f.depth <= maxSvgDepth,
      );
      if (fractures.length > 0) updateFractures(fractures, yScaleLocal);

      const drawConstructionData: Constructive = {
        cement_pad: constructionData.cement_pad,
        bore_hole: constructionData.bore_hole.filter(filterByDepth),
        hole_fill: constructionData.hole_fill.filter(filterByDepth),
        surface_case: constructionData.surface_case.filter(filterByDepth),
        well_case: constructionData.well_case.filter(filterByDepth),
        well_screen: constructionData.well_screen.filter(filterByDepth),
        reduction: constructionData.reduction
          ? constructionData.reduction.filter(filterByDepth)
          : [],
      };

      if (constructionData) updatePoco(drawConstructionData, yScaleLocal);
    }
  };

  // iterates through the array to render the visualization
  svgs.forEach(svgInfo => {
    drawLog(svgInfo);
    currentDepth += yScaleGlobal.invert(svgInfo.height);
  });

  // Draw horizontal legend below all profile SVGs (fractures + caves)
  const LEGEND_SVG_ID = 'fractureLegendSvg';
  divContainer.select(`#${LEGEND_SVG_ID}`).remove();

  const profileFractures = profile.fractures || [];
  const profileCaves     = profile.caves     || [];

  const hasSimple   = profileFractures.some(f => !f.swarm && !f.water_intake);
  const hasSwarm    = profileFractures.some(f =>  f.swarm);
  const hasWaterFx  = profileFractures.some(f =>  f.water_intake);
  const hasCaveDry  = profileCaves.some(c => !c.water_intake);
  const hasCaveWet  = profileCaves.some(c =>  c.water_intake);

  const hasFractureLegend = hasSimple || hasSwarm || hasWaterFx;
  const hasCaveLegend     = hasCaveDry || hasCaveWet;

  if (hasFractureLegend || hasCaveLegend) {
    type FractureItem = { kind: 'fracture'; label: string; color: string; swarm: boolean };
    type CaveItem     = { kind: 'cave';     label: string; color: string; wet: boolean };
    type LegendItem   = FractureItem | CaveItem;

    const allLegendItems: LegendItem[] = [
      { kind: 'fracture', label: 'Fratura simples',    color: '#000000', swarm: false },
      { kind: 'fracture', label: 'Enxame de fraturas', color: '#000000', swarm: true  },
      { kind: 'fracture', label: "Entrada d'água",     color: '#1a6fa8', swarm: false },
      { kind: 'cave',     label: 'Caverna seca',       color: '#333333', wet: false   },
      { kind: 'cave',     label: "Caverna c/ água",    color: '#1a6fa8', wet: true    },
    ];
    const legendItems = allLegendItems.filter((_, i) =>
      [hasSimple, hasSwarm, hasWaterFx, hasCaveDry, hasCaveWet][i],
    );

    const svgTotalWidth = WIDTH + MARGINS.LEFT + MARGINS.RIGHT;
    const LEGEND_HEIGHT = 44;
    const RC = 'round' as const;

    const legendSvgEl = divContainer.append('svg')
      .attr('id', LEGEND_SVG_ID)
      .attr('width', svgTotalWidth)
      .attr('height', LEGEND_HEIGHT);

    const legendG = legendSvgEl.append('g').attr('transform', `translate(0, 2)`);

    legendG.append('rect')
      .attr('x', 0).attr('y', 0)
      .attr('width', WIDTH + MARGINS.RIGHT).attr('height', LEGEND_HEIGHT - 4)
      .attr('fill', 'white').attr('rx', 3)
      .style('stroke', DARK_GRAY).style('stroke-width', '0.8px');

    legendG.append('text')
      .attr('x', 6).attr('y', 11)
      .attr('font-size', 7).attr('font-weight', 'bold').attr('fill', DARK_GRAY)
      .text('LEGENDA:');

    const COL_ITEM_W = 110;

    legendItems.forEach((item, i) => {
      const cx   = 10 + i * COL_ITEM_W;
      const symY = (LEGEND_HEIGHT - 4) / 2;
      const symG = legendG.append('g');

      if (item.kind === 'fracture') {
        if (item.swarm) {
          ([-4, 0, 4] as number[]).forEach(offset => {
            symG.append('polyline')
              .attr('points', `${cx},${symY + offset} ${cx + 6},${symY + offset - 1} ${cx + 12},${symY + offset + 1} ${cx + 18},${symY + offset - 0.5} ${cx + 24},${symY + offset}`)
              .attr('stroke', item.color).attr('stroke-width', offset === 0 ? 1.5 : 0.8)
              .attr('fill', 'none').attr('stroke-linecap', RC).attr('stroke-linejoin', RC);
          });
        } else {
          symG.append('polyline')
            .attr('points', `${cx},${symY} ${cx + 5},${symY - 1.5} ${cx + 11},${symY + 1} ${cx + 17},${symY - 0.5} ${cx + 24},${symY}`)
            .attr('stroke', item.color).attr('stroke-width', 1.5)
            .attr('fill', 'none').attr('stroke-linecap', RC).attr('stroke-linejoin', RC);
        }
      } else {
        // Cave symbol: small rect with the corresponding texture
        const caveTexture = item.wet
          ? textures.lines().size(8).orientation('6/8').heavier(.3).thinner(.8).background('#ffffff').stroke(item.color)
          : textures.lines().size(8).orientation('6/8').heavier(.3).thinner(.8).background('#ffffff').stroke(item.color);
        legendSvgEl.call(caveTexture);

        const rw = 24; const rh = 12;
        symG.append('rect')
          .attr('x', cx).attr('y', symY - rh / 2)
          .attr('width', rw).attr('height', rh)
          .attr('fill', caveTexture.url())
          .attr('stroke', item.color).attr('stroke-width', 0.8);
      }

      legendG.append('text')
        .attr('x', cx + 28).attr('y', symY + 3)
        .attr('font-size', 7).attr('fill', DARK_GRAY)
        .text(item.label);
    });
  }
  return svgs;
}