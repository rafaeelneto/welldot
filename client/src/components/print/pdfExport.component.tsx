/* eslint-disable one-var */
import React, { useEffect, useRef } from 'react';

import { Button } from '@mui/material';

import { FileText } from 'react-feather';

import * as d3module from 'd3';
import d3tip from 'd3-tip';

// @ts-ignore
import textures from 'textures';

import { pdfExportProfile } from './print.component';
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

import styles from './pdfExport.module.scss';

const d3 = {
  ...d3module,
  tip: d3tip,
};

type PDProps = {
  profile: PROFILE_TYPE;
  render: boolean;
  onRenderFinish: () => void;
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

const PDFExport = ({ profile, render, onRenderFinish }: PDProps) => {
  const svgContainer = useRef(null);

  const pdfGenerate = pdfExportProfile();

  const MARGINS = { TOP: 30, RIGHT: 30, BOTTOM: 15, LEFT: 50 };
  const HEIGHT = 800 - MARGINS.TOP - MARGINS.BOTTOM;
  const WIDTH = 950 - MARGINS.LEFT - MARGINS.RIGHT;

  const setSVGContainer = () => {
    if (!svgContainer.current) return;

    const svg = d3.select(svgContainer.current);

    svg.selectAll('*').remove();

    const pocoGroup = svg.append('g').attr('class', 'poco-group');

    const litoligicalGroup = pocoGroup.append('g').attr('class', 'lito-group');

    const constructionGroup = pocoGroup
      .append('g')
      .attr('class', 'const-group');

    litoligicalGroup.append('g').attr('class', styles.yAxis);

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

    drawLog();
  };

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

  const drawLog = () => {
    // if (!svgContainer.current) return;
    if (!profile.constructive || !profile.geologic) return;

    const noPerfil =
      profile.geologic.length === 0 &&
      profile.constructive.bole_hole.length === 0 &&
      profile.constructive.hole_fill.length === 0 &&
      profile.constructive.well_case.length === 0 &&
      profile.constructive.well_screen.length === 0;

    if (noPerfil) return;

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

    const svg = d3.select('#svgCanvas2Export');

    console.log(d3.select('#svgCanvas2Export').attr('id'));
    console.log('fadsfa');

    svg
      .attr('height', HEIGHT + MARGINS.TOP + MARGINS.BOTTOM)
      .attr('width', WIDTH + MARGINS.LEFT + MARGINS.RIGHT);

    const pocoGroup = svg.select('.poco-group');

    const litoligicalGroup = svg
      .select('.lito-group')
      .attr('transform', `translate(${MARGINS.LEFT}, ${MARGINS.TOP})`);

    const constructionGroup = svg
      .select('.const-group')
      .attr('transform', `translate(${MARGINS.LEFT}, ${MARGINS.TOP})`);

    const cementPadGroup = constructionGroup.select('.cement-pad');
    const holeGroup = constructionGroup.select('.hole');
    const surfaceCaseGroup = constructionGroup.select('.surface-case');
    const holeFillGroup = constructionGroup.select('.hole-fill');
    const wellCaseGroup = constructionGroup.select('.well-case');
    const wellScreenGroup = constructionGroup.select('.well-screen');

    const svgHeight: any = svg.attr('height');

    const POCO_WIDTH = 120;
    const POCO_CENTER = 550;

    const updateGeology = async (data: GEOLOGIC_COMPONENT_TYPE[], yScale) => {
      const litologicalFill = getLithologicalFill(data);

      const layerGroup = litoligicalGroup.append('g');

      const layers = layerGroup.selectAll('rect').data(data);

      layers
        .enter()
        .append('rect')
        .attr('x', 10)
        .attr('width', 150)
        .style('stroke', '#101010')
        .style('stroke-width', '1px')
        .attr('y', (d: GEOLOGIC_COMPONENT_TYPE, i) => {
          if (i === 0) return yScale(d.from);
          return yScale(data[i - 1].to);
        })
        .attr('height', (d: GEOLOGIC_COMPONENT_TYPE, i) => {
          return yScale(d.to - d.from);
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
        .attr('x', 400)
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
            [10, yScale(d.from)],
            [380, yScale(d.from)],
            ...curveCoordinates,
          ]);
        });
    };

    const updatePoco = (data: CONSTRUCTIVE_COMPONENT_TYPE, yScale) => {
      const maxXValues = [
        ...data.bole_hole.map(
          (d: BORE_HOLE_COMPONENT_TYPE) =>
            // divide by 1 to convert text to number
            // eslint-disable-next-line implicit-arrow-linebreak
            d.diam_pol
          // eslint-disable-next-line function-paren-newline
        ),
        ...data.hole_fill.map((d: HOLE_FILL_COMPONENT_TYPE) => d.diam_pol),
        ...data.well_screen.map((d: WELL_SCREEN_COMPONENT_TYPE) => d.diam_pol),
        ...data.well_case.map((d: WELL_CASE_COMPONENT_TYPE) => d.diam_pol),
      ];

      const maxValues = d3.max(maxXValues) || 0;

      const xScale = d3
        .scaleLinear()
        .domain([0, maxValues])
        .range([0, POCO_WIDTH]);

      constructionGroup.selectAll('.cement_pad').remove();

      if (data.cement_pad && data.cement_pad.thickness) {
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
        .attr('y', (d: any, i) => {
          if (i === 0) return yScale(d.from);
          return yScale(data.bole_hole[i - 1].to);
        })
        .attr('height', (d: any) => yScale(d.to - d.from));

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
        .attr('y', (d: any, i) => {
          if (i === 0) return yScale(d.from);
          return yScale(data.surface_case[i - 1].to);
        })
        .attr('height', (d: any) => yScale(d.to - d.from));

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
        .attr('y', (d: any, i) => {
          if (i === 0) return yScale(d.from);
          return yScale(data.hole_fill[i - 1].to);
        })
        .attr('height', (d: any) => yScale(d.to - d.from))
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
        .attr('y', (d: any, i) => {
          if (i === 0) return yScale(d.from);
          return yScale(d.from);
        })
        .attr('height', (d: any, i) => {
          if (i === 0) return yScale(d.to - d.from);
          return yScale(d.to - d.from);
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
        .attr('y', (d: any, i) => {
          return yScale(d.from);
        })
        .attr('height', (d: any) => yScale(d.to - d.from));
    };

    const geologicData = profile.geologic;
    const constructionData = profile.constructive;

    const maxValues = [
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

    const maxYValues = d3.max(maxValues) || 0;

    const yScaleGlobal = d3
      .scaleLinear()
      .domain([0, maxYValues])
      .range([0, 8 * maxYValues]);

    svg.attr('height', 10 * maxYValues + MARGINS.TOP + MARGINS.BOTTOM);

    const yAxis = d3.axisLeft(yScaleGlobal).tickFormat((d: any) => `${d} m`);

    // @ts-ignore
    const gY = pocoGroup
      .append('g')
      .attr('class', `${styles.yAxis}`)
      .call(yAxis)
      .attr('transform', `translate(${MARGINS.LEFT}, ${MARGINS.TOP})`)
      .attr('stroke', '#000000');

    gY.selectAll('text').attr('stroke', 'none').attr('fill', '#000000');

    drawProfile();

    // @ts-ignore
    // svg.call(zoom);

    function drawProfile() {
      if (geologicData) updateGeology(geologicData, yScaleGlobal);
      if (constructionData) updatePoco(constructionData, yScaleGlobal);
    }
  };

  useEffect(() => {
    setSVGContainer();
  }, [svgContainer.current]);

  useEffect(() => {
    drawLog();

    if (svgContainer && svgContainer.current && render) {
      pdfGenerate(document.getElementById('svgCanvas2Export'));
      onRenderFinish();
    }
  }, [profile, render]);

  let noPerfil = true;
  if (profile.geologic && profile.constructive) {
    noPerfil =
      profile.geologic.length === 0 &&
      profile.constructive.bole_hole.length === 0 &&
      profile.constructive.hole_fill.length === 0 &&
      profile.constructive.well_case.length === 0 &&
      profile.constructive.well_screen.length === 0;
  }

  return (
    <div style={{ visibility: 'hidden' }}>
      <>
        {noPerfil ? (
          <span className={styles.noFilesMsg}>Perfil não configurado</span>
        ) : (
          ''
        )}

        {render ? (
          <svg className={`${styles.svgContainer}`} ref={svgContainer} />
        ) : (
          ''
        )}
      </>
    </div>
  );
};

export default PDFExport;
