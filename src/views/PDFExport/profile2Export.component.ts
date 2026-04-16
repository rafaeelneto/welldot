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

import { SvgInfo, infoType } from '../../../src_old/types/profile2Export.types';

import { getLithologicalFillList } from '../../../src_old/utils/profileD3.utils';
import {
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

const profile2Export = (
  header: string,
  headingInfo: infoType[],
  endInfo: infoType[],
  profile: Profile,
  breakPages: boolean,
  zoomLevel: number,
  iframeId?: string,
  print?: boolean,
) => {
  if (checkIfProfileIsEmpty(profile)) return;

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

  const POCO_WIDTH = 100;
  const POCO_CENTER = 350;
  const GEOLOGY_X_POS = 35;
  const GEOLOGY_WIDTH = 220;
  const GEOLOGY_X_POS_DIV_1 = GEOLOGY_WIDTH + GEOLOGY_X_POS + 10;
  const GEOLOGY_X_POS_DIV_2 = GEOLOGY_X_POS_DIV_1 + 20;
  const GEOLOGY_TIP_WIDTH = 200;

  const maxDiamValues = getProfileDiamValues(profile);

  const maxXValues = d3.max(maxDiamValues) || 0;

  // define the height of the svg  viz based on the value of zoom level
  // * conversion rule pt -> px
  // * 1 pt = 1.33 px
  // * 1 px = 0.75 pt
  const svgTotalHeight = ((1 / zoomLevel) * maxYValues * 1000 * 72) / 25.4;
  const svgs: SvgInfo[] = [];

  const A4_SVG_HEIGHT = 480 * 1.33;

  const WIDTH = 521.8 * 1.33 - MARGINS.LEFT - MARGINS.RIGHT;

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
      svgs.push({
        id: `svgCanvas${index}`,
        height: heightLeft > A4_SVG_HEIGHT ? A4_SVG_HEIGHT : heightLeft,
      });

      heightLeft -= A4_SVG_HEIGHT;
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

    const yAxis = d3
      .axisLeft(yScaleLocal)
      .tickFormat((d: any) => `${d} m`)
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

      const LABELS_MARGINS = { top: 2, button: 2 };

      const depthTipGroup = litoligicalGroup.append('g');

      const depthTip = depthTipGroup.selectAll('text').data(data);

      depthTip.exit().remove();

      let currYPos = 0;

      depthTip
        .enter()
        .append('text')
        .attr('class', d => `depthTip-${d.from}`)
        .attr('x', GEOLOGY_X_POS - 5)
        .attr('dy', '.35em')
        .attr('font-size', 7.5)
        .attr('text-anchor', 'end')
        .text(d => {
          if (d.to > maxSvgDepth) return null;
          return `${d.to}`;
        })
        .attr('y', (d: Lithology, i) => {
          currYPos = yScale(d.to);
          return yScale(d.to);
        });

      const labelGroup = litoligicalGroup.append('g');

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

      const dividersGroup = litoligicalGroup.append('g');

      const dividers = dividersGroup.selectAll('g').data(data);

      currYPos = 0;

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
          return `Revest. ${d.diameter}" ${d.type}`;
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
          return `Filtro ${d.diameter}" ${d.type} \n Ranhura: ${d.screen_slot_mm}mm`;
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
      });
    };

    const drawLegend = () => {
      // Place legend in the empty right area of the SVG (beyond the geology labels).
      const LX = WIDTH - 155; // x in pocoGroup coords
      const LY = 8;
      const ROW_H = 16;
      const SYM_W = 30; // symbol column width
      const BOX_W = 155;
      const BOX_H = ROW_H * 3 + 22;
      const RC = 'round' as const;

      const legendGroup = pocoGroup.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${LX},${LY})`);

      // Background box
      legendGroup.append('rect')
        .attr('x', 0).attr('y', 0)
        .attr('width', BOX_W).attr('height', BOX_H)
        .attr('fill', 'white').attr('rx', 3)
        .style('stroke', DARK_GRAY).style('stroke-width', '0.8px');

      // Title
      legendGroup.append('text')
        .attr('x', BOX_W / 2).attr('y', 12)
        .attr('text-anchor', 'middle')
        .attr('font-size', 7).attr('font-weight', 'bold')
        .attr('fill', DARK_GRAY)
        .text('LEGENDA');

      const rows: { label: string; color: string; swarm: boolean }[] = [
        { label: 'Fratura simples',          color: '#000000', swarm: false },
        { label: 'Enxame de fraturas',        color: '#000000', swarm: true  },
        { label: "Entrada d'água",            color: '#1a6fa8', swarm: false },
      ];

      rows.forEach(({ label, color, swarm }, i) => {
        const ry = 20 + i * ROW_H;
        const symY  = ry + ROW_H / 2;

        const symG = legendGroup.append('g');

        if (swarm) {
          // Three short parallel wavy lines
          [-4, 0, 4].forEach(offset => {
            symG.append('polyline')
              .attr('points', `4,${symY + offset} 10,${symY + offset - 1} 16,${symY + offset + 1} 22,${symY + offset - 0.5} 28,${symY + offset}`)
              .attr('stroke', color).attr('stroke-width', offset === 0 ? 1.5 : 0.8)
              .attr('fill', 'none').attr('stroke-linecap', RC).attr('stroke-linejoin', RC);
          });
        } else {
          // One wavy line
          symG.append('polyline')
            .attr('points', `4,${symY} 9,${symY - 1.5} 15,${symY + 1} 21,${symY - 0.5} 28,${symY}`)
            .attr('stroke', color).attr('stroke-width', 1.5)
            .attr('fill', 'none').attr('stroke-linecap', RC).attr('stroke-linejoin', RC);
        }

        // Label
        legendGroup.append('text')
          .attr('x', SYM_W + 4).attr('y', symY + 3)
          .attr('font-size', 6.5).attr('fill', DARK_GRAY)
          .text(label);
      });
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
        updateGeology(geologicData.filter(filterByDepth), yScaleLocal);
      }

      const fractures: Fracture[] = (profile.fractures || []).filter(
        f => f.depth >= currentDepth && f.depth <= maxSvgDepth,
      );
      if (fractures.length > 0) updateFractures(fractures, yScaleLocal);

      if (currentDepth === 0) drawLegend();

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

  if (iframeId) {
    innerRenderPdf(
      profile,
      headingInfo,
      endInfo,
      svgs,
      breakPages,
      iframeId,
      header,
    );
  } else if (print) {
    printPdf(profile, headingInfo, endInfo, svgs, breakPages, header);
  } else {
    downloadPdf(profile, headingInfo, endInfo, svgs, breakPages, header);
  }
};

export default profile2Export;
