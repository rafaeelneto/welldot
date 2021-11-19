import * as d3module from 'd3';
import d3tip from 'd3-tip';

// @ts-ignore
import textures from 'textures';

import { exportPdfProfile } from './print.component';

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
} from '../../types/perfil.types';

import { SvgInfo, infoType } from '../../types/profile2Export.types';

const d3 = {
  ...d3module,
  tip: d3tip,
};

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
      .stroke('#303030')
      .background(d.color);
  });
  return litologicalFill;
};

const profile2Export = (
  headingInfo: infoType[],
  endInfo: infoType[],
  profile: PROFILE_TYPE,
  breakPages: boolean,
  zoomLevel: number,
  iframeId?: string
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

  const MARGINS = { TOP: 30, RIGHT: 30, BOTTOM: 30, LEFT: 50 };

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

  const yScaleGlobal = d3
    .scaleLinear()
    .domain([0, maxYValues])
    .range([0, 8 * maxYValues]);

  const POCO_WIDTH = 120;
  const POCO_CENTER = 550;

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

  const xScale = d3
    .scaleLinear()
    .domain([0, maxXValues])
    .range([0, POCO_WIDTH]);

  // define the height of the svg  viz based on the value of zoom level
  // ! find conversion ration
  const svgTotalHeight = 10 * maxYValues;
  const svgs: SvgInfo[] = [];

  const A4_SVG_HEIGHT = 700;

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

  const WIDTH = 950 - MARGINS.LEFT - MARGINS.RIGHT;

  let currentDepth = 0;

  function wrap(textSet, width) {
    textSet.each(function (textEl) {
      // @ts-ignore
      // eslint-disable-next-line no-shadow
      const text = d3.select(this);
      const words = text.text().split(/\s+/).reverse();
      let word: any | never = '';
      let line: any[] = [];
      let lineNumber = 0;
      const lineHeight = 1.1; // ems
      const x = text.attr('x');
      const y = text.attr('y');
      const dy = parseFloat(text.attr('dy'));
      let tspan = text
        .text(null)
        .append('tspan')
        .attr('x', x)
        .attr('y', y)
        .attr('dy', `${dy}em`);

      // eslint-disable-next-line no-cond-assign
      while ((word = words.pop())) {
        line.push(word);
        tspan.text(line.join(' '));

        if (tspan!.node!()!.getComputedTextLength() > width) {
          line.pop();
          tspan.text(line.join(' '));
          line = [word];
          tspan = text
            .append('tspan')
            .attr('x', x)
            .attr('y', y)
            .attr('dy', `${++lineNumber * lineHeight + dy}em`)
            .text(word);
        }
      }
    });
  }

  const drawLog = (svgInfo: SvgInfo) => {
    const svg = d3.select(`#${svgInfo.id}`);

    svg.attr('height', svgInfo.height + MARGINS.TOP + MARGINS.BOTTOM);
    svg.attr('width', WIDTH);

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

    const yScaleLocal = d3
      .scaleLinear()
      .domain([currentDepth, maxSvgDepth])
      .range([0, svgInfo.height]);

    const yAxis = d3.axisLeft(yScaleLocal).tickFormat((d: any) => `${d} m`);

    // @ts-ignore
    const gY = pocoGroup
      .append('g')
      .attr('class', `yAxis`)
      .call(yAxis)
      .attr('transform', `translate(20, 0)`)
      .attr('stroke', '#000000');

    gY.selectAll('text').attr('stroke', 'none').attr('fill', '#000000');

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
        .attr('x', 50)
        .attr('width', 100)
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

      const LABELS_MARGINS = { top: 7, button: 5 };

      const labelGroup = litoligicalGroup.append('g');

      const labels = labelGroup.selectAll('text').data(data);

      labels.exit().remove();

      let currYPosLabel = 0;

      labels
        .enter()
        .append('text')
        .attr('class', (d) => `text-${d.from}`)
        .attr('x', 390)
        .attr('dy', '.35em')
        .attr('font-size', 10)
        .text((d) => {
          return d.description;
        })
        .call(wrap, 300)
        .attr('y', (d: GEOLOGIC_COMPONENT_TYPE, i) => {
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

            const calculatedY = currYPosLabel + lastTextHeight;

            if (
              yScale(d.from) + LABELS_MARGINS.top + LABELS_MARGINS.button <
              calculatedY
            ) {
              currYPosLabel = calculatedY;

              return calculatedY;
            }
          }

          currYPosLabel = yScale(d.from) + LABELS_MARGINS.top;
          return yScale(d.from) + LABELS_MARGINS.top;
        });

      const dividersGroup = litoligicalGroup.append('g');

      const dividers = dividersGroup.selectAll('g').data(data);

      let currYPosDiv = 0;

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
          let curveCoordinates: any[] = [[700, yScale(d.from)]];

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

            const calculatedY = currYPosDiv + lastTextHeight;

            if (
              yScale(d.from) + LABELS_MARGINS.top + LABELS_MARGINS.button <
              calculatedY
            ) {
              curveCoordinates = [
                [395, calculatedY],
                [700, calculatedY],
              ];

              currYPosDiv = calculatedY;
            } else {
              currYPosDiv = yScale(d.from);
              curveCoordinates = [[700, yScale(d.from)]];
            }
          } else {
            currYPosDiv = yScale(d.from);
          }

          return d3.line()([
            [50, yScale(d.from)],
            [380, yScale(d.from)],
            ...curveCoordinates,
          ]);
        });
    };

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
          .attr('x', (POCO_CENTER - (POCO_WIDTH + 40)) / 2)
          .attr('y', (d: any) => {
            return yScale(0) - yScale(d.thickness * 4);
          })
          .attr('width', POCO_WIDTH + 40)
          .attr('height', (d: any) => {
            return yScale(d.thickness * 4);
          })
          .style('fill', (d) => {
            svg.call(profileTexture.pad);
            return profileTexture.pad.url();
          })
          .style('stroke', '#303030')
          .style('stroke-width', '2px');
      }

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

      const hole = holeGroup.selectAll('rect').data(data.bole_hole);

      hole.exit().remove();

      const newHole = hole
        .enter()
        .append('rect')
        .style('fill', '#fff')
        .style('opacity', '0.6')
        .style('stroke', '#303030')
        .style('stroke-width', '1px');

      newHole
        // @ts-ignore
        .merge(hole)
        .attr('x', (d: any) => (POCO_CENTER - xScale(d.diam_pol)) / 2)
        .attr('width', (d: any) => xScale(d.diam_pol))
        .attr('y', getYPos(data.bole_hole))
        .attr('height', (d: any) => {
          const depth =
            (d.to < maxSvgDepth ? d.to : maxSvgDepth) -
            (d.from > currentDepth ? d.from : currentDepth);

          return yScale(depth + currentDepth);
        });

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
        .attr('x', (d: any) => (POCO_CENTER - xScale(d.diam_pol)) / 2)
        .attr('width', (d: any) => xScale(d.diam_pol))
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
        .style('stroke', '#303030')
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
        .style('stroke', '#303030')
        .style('stroke-width', '2px');

      newWellCase
        // @ts-ignore
        .merge(wellCase)
        .attr('x', (d: any) => (POCO_CENTER - xScale(d.diam_pol)) / 2)
        .attr('width', (d: any) => xScale(d.diam_pol))
        .attr('y', getYPos(data.well_case))
        .attr('height', (d: any, i) => {
          const depth =
            (d.to < maxSvgDepth ? d.to : maxSvgDepth) -
            (d.from > currentDepth ? d.from : currentDepth);

          return yScale(depth + currentDepth);
        });

      const wellScreen = wellScreenGroup
        .selectAll('rect')
        .data(data.well_screen);

      wellScreen.exit().remove();

      const newWellScreen = wellScreen
        .enter()
        .append('rect')
        .style('stroke', '#303030')
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
        .attr('y', getYPos(data.well_screen))
        .attr('height', (d: any) => {
          const depth =
            (d.to < maxSvgDepth ? d.to : maxSvgDepth) -
            (d.from > currentDepth ? d.from : currentDepth);

          return yScale(depth + currentDepth);
        });
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

  exportPdfProfile(headingInfo, endInfo, svgs, iframeId);
};

export default profile2Export;
