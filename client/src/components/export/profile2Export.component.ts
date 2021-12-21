import * as d3module from 'd3';
import d3tip from 'd3-tip';

// @ts-ignore
import textures from 'textures';

import wrap from '../../utils/wrap';

// eslint-disable-next-line import/namespace
import { innerRenderPdf, printPdf, downloadPdf } from './pdfGenerate';

import fdgcTextures from '../../utils/fgdcTextures';

import {
  GEOLOGIC_COMPONENT_TYPE,
  BORE_HOLE_COMPONENT_TYPE,
  CEMENT_PAD_COMPONENT_TYPE,
  HOLE_FILL_COMPONENT_TYPE,
  PROFILE_TYPE,
  SURFACE_CASE_COMPONENT_TYPE,
  WELL_CASE_COMPONENT_TYPE,
  WELL_SCREEN_COMPONENT_TYPE,
  CONSTRUCTIVE_COMPONENT_TYPE,
} from '../../types/profile.types';

import { SvgInfo, infoType } from '../../types/profile2Export.types';

const d3 = {
  ...d3module,
  tip: d3tip,
};

const DARK_GRAY = '#303030';

const getLithologicalFill = (data) => {
  const profileTextures: (number | string)[] = [];
  data.forEach((element) => {
    const texture: number | string = element.fgdc_texture;
    if (profileTextures.indexOf(texture) < 0) {
      profileTextures.push(texture);
    }
  });

  const litologicalFill = {};
  const texturesLoaded = {};

  profileTextures.forEach((textureCode) => {
    if (fdgcTextures[textureCode]) {
      texturesLoaded[textureCode] = fdgcTextures[textureCode];
    }
  });

  data.forEach((d) => {
    litologicalFill[`${d.fgdc_texture}.${d.from}`] = textures
      .paths()
      .d((s) => texturesLoaded[d.fgdc_texture])
      .size(150)
      .strokeWidth(0.8)
      .stroke(DARK_GRAY)
      .background(d.color);
  });
  return litologicalFill;
};

const profile2Export = (
  header: string,
  headingInfo: infoType[],
  endInfo: infoType[],
  profile: PROFILE_TYPE,
  breakPages: boolean,
  zoomLevel: number,
  iframeId?: string,
  print?: boolean
) => {
  // check if profile is empty
  if (!profile.constructive || !profile.geologic) return;

  const noPerfil =
    profile.geologic.length === 0 &&
    profile.constructive.bole_hole.length === 0 &&
    profile.constructive.hole_fill.length === 0 &&
    profile.constructive.well_case.length === 0 &&
    profile.constructive.well_screen.length === 0;

  if (noPerfil) return;

  const MARGINS = { TOP: 15, RIGHT: 30, BOTTOM: 30, LEFT: 20 };

  const geologicData = profile.geologic;
  const constructionData = profile.constructive;

  // calculate max depth on the profile
  const depthValues = [
    geologicData.length === 0 ? 0 : geologicData[geologicData.length - 1].to,
    constructionData.bole_hole.length === 0
      ? 0
      : constructionData.bole_hole[constructionData.bole_hole.length - 1].to,
    constructionData.hole_fill.length === 0
      ? 0
      : constructionData.hole_fill[constructionData.hole_fill.length - 1].to,
    constructionData.well_case.length === 0
      ? 0
      : constructionData.well_case[constructionData.well_case.length - 1].to,
    constructionData.well_screen.length === 0
      ? 0
      : constructionData.well_screen[constructionData.well_screen.length - 1]
          .to,
  ];

  const maxYValues = d3.max(depthValues) || 0;

  const POCO_WIDTH = 100;
  const POCO_CENTER = 350;
  const GEOLOGY_X_POS = 35;
  const GEOLOGY_WIDTH = 220;
  const GEOLOGY_X_POS_DIV_1 = GEOLOGY_WIDTH + GEOLOGY_X_POS + 10;
  const GEOLOGY_X_POS_DIV_2 = GEOLOGY_X_POS_DIV_1 + 20;
  const GEOLOGY_TIP_WIDTH = 200;

  const maxDiamValues = [
    ...constructionData.bole_hole.map(
      (d: BORE_HOLE_COMPONENT_TYPE) =>
        // divide by 1 to convert text to number
        // eslint-disable-next-line implicit-arrow-linebreak
        // @ts-ignore
        parseFloat(d.diam_pol)
      // eslint-disable-next-line function-paren-newline
    ),
    ...constructionData.hole_fill.map((d: HOLE_FILL_COMPONENT_TYPE) =>
      // @ts-ignore
      parseFloat(d.diam_pol)
    ),
    ...constructionData.well_screen.map((d: WELL_SCREEN_COMPONENT_TYPE) =>
      // @ts-ignore
      parseFloat(d.diam_pol)
    ),
    ...constructionData.well_case.map((d: WELL_CASE_COMPONENT_TYPE) =>
      // @ts-ignore
      parseFloat(d.diam_pol)
    ),
  ];

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

  svgs.forEach((svgInfo) => {
    const svgEl = divContainer.append('svg');
    svgEl.attr('id', svgInfo.id);
  });

  let currentDepth = 0;

  const drawLog = (svgInfo: SvgInfo) => {
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
        .d((s) => `M ${s / 4} ${s / 4} l ${s / 2} 0 `)
        .size(40)
        .strokeWidth(2)
        .thicker(2)
        .background('#fff'),
    };

    const updateGeology = async (data: GEOLOGIC_COMPONENT_TYPE[], yScale) => {
      const litologicalFill = getLithologicalFill(data);

      const layerGroup = litoligicalGroup.append('g');

      const layers = layerGroup.selectAll('rect').data(data);

      layers
        .enter()
        .append('rect')
        .attr('x', GEOLOGY_X_POS)
        .attr('width', GEOLOGY_WIDTH)
        .style('stroke', '#101010')
        .style('stroke-width', '1px')
        .attr('y', (d: GEOLOGIC_COMPONENT_TYPE, i) => {
          if (i === 0) {
            const depth = d.from < currentDepth ? currentDepth : d.from;
            return yScale(depth);
          }

          // const depth = d.from < currentDepth ? currentDepth : d.from;
          return yScale(data[i - 1].to);
        })
        .attr('height', (d: GEOLOGIC_COMPONENT_TYPE, i) => {
          const depth =
            (d.to < maxSvgDepth ? d.to : maxSvgDepth) -
            (d.from > currentDepth ? d.from : currentDepth);

          return yScale(depth + currentDepth);
        })
        .style('fill', (d: GEOLOGIC_COMPONENT_TYPE) => {
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
        .attr('class', (d) => `depthTip-${d.from}`)
        .attr('x', GEOLOGY_X_POS - 5)
        .attr('dy', '.35em')
        .attr('font-size', 7.5)
        .attr('text-anchor', 'end')
        .text((d) => {
          if (d.to > maxSvgDepth) return null;
          return `${d.to}`;
        })
        .attr('y', (d: GEOLOGIC_COMPONENT_TYPE, i) => {
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
        .attr('class', (d) => `text-${d.from}`)
        .attr('x', GEOLOGY_X_POS_DIV_2)
        .attr('dy', '.15em')
        .attr('font-size', 7.5)
        .text((d) => {
          // if (d.from < currentDepth) return null;
          return d.description;
        })
        .call(wrap, GEOLOGY_TIP_WIDTH)
        .attr('y', (d: GEOLOGIC_COMPONENT_TYPE, i) => {
          if (i > 0) {
            const lastTextHeight =
              // @ts-ignore
              (d3
                .select(`.text-${data[i - 1].from}`)
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
        .attr('d', (d: GEOLOGIC_COMPONENT_TYPE, i) => {
          const yPos = yScale(d.from > currentDepth ? d.from : currentDepth);
          let curveCoordinates: any[] = [[WIDTH, yPos]];

          if (i > 0) {
            const lastTextHeight =
              // @ts-ignore
              (d3
                .select(`.text-${data[i - 1].from}`)
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

    const updatePoco = (data: CONSTRUCTIVE_COMPONENT_TYPE, yScale) => {
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
            (d: any) => (POCO_CENTER - xScale((d.width / 2) * 39.37)) / 2
          )
          .attr('y', (d: any) => {
            return yScale(0) - yScale(d.thickness);
          })
          .attr('width', (d: any) => xScale((d.width / 2) * 39.37))
          .attr('height', (d: any) => {
            return yScale(d.thickness);
          })
          .style('fill', (d) => {
            svg.call(profileTexture.pad);
            return profileTexture.pad.url();
          })
          .style('stroke', DARK_GRAY)
          .style('stroke-width', '2px');
      }

      const getXPos = () => {
        return (d: any) => (POCO_CENTER - xScale(d.diam_pol)) / 2;
      };
      const getWidth = () => {
        return (d: any) => xScale(d.diam_pol);
      };

      const getYPos = (dataInner) => {
        return (d, i) => {
          if (i === 0) {
            const depth = d.from < currentDepth ? currentDepth : d.from;
            return yScale(depth);
          }

          // const depth = d.from < currentDepth ? currentDepth : d.from;
          return yScale(dataInner[i - 1].to);
        };
      };

      const getYPosUnconnected = (dataInner) => {
        return (d, i) => {
          const depth = d.from < currentDepth ? currentDepth : d.from;
          return yScale(depth);
        };
      };

      const getHeight = (dataInner) => {
        return (d, i) => {
          const depth =
            (d.to < maxSvgDepth ? d.to : maxSvgDepth) -
            (d.from > currentDepth ? d.from : currentDepth);

          return yScale(depth + currentDepth);
        };
      };

      const hole = holeGroup.selectAll('rect').data(data.bole_hole);

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
        .attr('y', getYPos(data.bole_hole))
        .attr('height', getHeight(data.bole_hole));

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
          (d: any) => (POCO_CENTER - xScale(d.diam_pol + d.diam_pol * 0.1)) / 2
        )
        .attr('width', (d: any) => xScale(d.diam_pol + d.diam_pol * 0.1))
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
        .attr('x', (d: any) => (POCO_CENTER - xScale(d.diam_pol)) / 2)
        .attr('width', (d: any) => xScale(d.diam_pol))
        .attr('y', getYPos(data.hole_fill))
        .attr('height', (d: any) => {
          const depth =
            (d.to < maxSvgDepth ? d.to : maxSvgDepth) -
            (d.from > currentDepth ? d.from : currentDepth);

          return yScale(depth + currentDepth);
        })
        .style('fill', (d: HOLE_FILL_COMPONENT_TYPE) => {
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
        .attr('x', (d: any) => (POCO_CENTER - xScale(d.diam_pol)) / 2)
        .attr('width', (d: any) => xScale(d.diam_pol))
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
        .attr('x', (d: any) => (POCO_CENTER - xScale(d.diam_pol)) / 2)
        .attr('width', (d: any) => xScale(d.diam_pol))
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
        return (d) => {
          const yDepth = d.from < currentDepth ? currentDepth : d.from;

          const depth =
            (d.to < maxSvgDepth ? d.to : maxSvgDepth) -
            (d.from > currentDepth ? d.from : currentDepth);

          const textHeight =
            // @ts-ignore
            d3
              .select(`.${className}${parseInt(d.from, 10)}`)
              .node()
              // @ts-ignore
              .getBoundingClientRect().height || 0;

          const yPos = yScale(depth / 2 + yDepth) + textHeight / 2;

          let xPos = getXPos()(d) - margin;

          occupiedPositions.forEach((pos) => {
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
              .select(`.${className}${parseInt(d.from, 10)}`)
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
        return (d) => {
          const textXPos =
            // @ts-ignore
            parseFloat(
              d3.select(`.${className}${parseInt(d.from, 10)}`).attr('x')
            ) || 0;

          const textWidth =
            // @ts-ignore
            d3
              .select(`.${className}${parseInt(d.from, 10)}`)
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

      const getRectHeight = (className) => {
        return (d, i) => {
          const textHeight =
            // @ts-ignore
            d3
              .select(`.${className}${parseInt(d.from, 10)}`)
              .node()
              // @ts-ignore
              .getBoundingClientRect().height || 0;

          return textHeight + MARGINS_TIP.top + MARGINS_TIP.botton;
        };
      };

      const getRectWidth = (className) => {
        return (d, i) => {
          const textWidth =
            // @ts-ignore
            d3
              .select(`.${className}${parseInt(d.from, 10)}`)
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
              .select(`.${className}${parseInt(d.from, 10)}`)
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

      const wellCaseFiltered = data.well_case.filter((item) => {
        if (item.diam_pol !== lastDiam) {
          lastDiam = item.diam_pol;
          return true;
        }
        return false;
      });

      lastDiam = 0;

      const wellScreenFiltered = data.well_screen.filter((item) => {
        if (item.diam_pol !== lastDiam) {
          lastDiam = item.diam_pol;
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
          (d) => `${WELL_CASE_TIP_CLASS_NAME}${parseInt(d.from, 10)}`
        )
        .attr('dy', '.35em')
        .attr('font-size', 7.5)
        .attr('fill', DARK_GRAY)

        .text((d) => {
          // if (d.to > maxSvgDepth) return null;
          return `Revest. ${d.diam_pol}" ${d.type}`;
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
          (d) => `${WELL_SCREEN_TIP_CLASS_NAME}${parseInt(d.from, 10)}`
        )
        .attr('dy', '.35em')
        .attr('font-size', 7.5)
        .attr('fill', DARK_GRAY)
        .text((d) => {
          // if (d.to > maxSvgDepth) return null;
          return `Filtro ${d.diam_pol}" ${d.type} \n Ranhura: ${d.screen_slot_mm}mm`;
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

    drawProfile();

    function drawProfile() {
      const filterByDepth = (l) => {
        if (l.to < currentDepth && l.from < currentDepth) return false;

        if (l.to > maxSvgDepth && l.from > maxSvgDepth) return false;

        return true;
      };

      if (geologicData) {
        updateGeology(geologicData.filter(filterByDepth), yScaleLocal);
      }

      const drawConstructionData: CONSTRUCTIVE_COMPONENT_TYPE = {
        cement_pad: constructionData.cement_pad,
        bole_hole: constructionData.bole_hole.filter(filterByDepth),
        hole_fill: constructionData.hole_fill.filter(filterByDepth),
        surface_case: constructionData.surface_case.filter(filterByDepth),
        well_case: constructionData.well_case.filter(filterByDepth),
        well_screen: constructionData.well_screen.filter(filterByDepth),
      };

      if (constructionData) updatePoco(drawConstructionData, yScaleLocal);
    }
  };

  // iterates through the array to render the visualization
  svgs.forEach((svgInfo) => {
    drawLog(svgInfo);
    currentDepth += yScaleGlobal.invert(svgInfo.height);
  });

  if (iframeId) {
    innerRenderPdf(
      header,
      profile,
      headingInfo,
      endInfo,
      svgs,
      breakPages,
      iframeId
    );
  } else if (print) {
    printPdf(header, profile, headingInfo, endInfo, svgs, breakPages);
  } else {
    downloadPdf(header, profile, headingInfo, endInfo, svgs, breakPages);
  }
};

export default profile2Export;
