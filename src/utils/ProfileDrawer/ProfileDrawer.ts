/* eslint-disable max-classes-per-file */
// ! FIX THIS MAX CLASS LINT

import * as d3module from 'd3';
import d3tip from 'd3-tip';

// @ts-ignore
import textures from 'textures';

import {
  PROFILE_TYPE,
  GEOLOGIC_COMPONENT_TYPE,
  CONSTRUCTIVE_COMPONENT_TYPE,
  HOLE_FILL_COMPONENT_TYPE,
} from '../types/profile.types';

import {
  isProfileEmpty,
  getProfileDiamValues,
  getProfileLastItemsDepths,
} from './profile.utils';
import {
  responsivefy,
  getLithologicalFillList,
} from '../../../src_old/utils/profileD3.utils';

const d3 = {
  ...d3module,
  tip: d3tip,
};

type componentsClassNames = {
  tooltip?: string;
  tooltipTitle?: string;
  tooltipPrimaryInfo?: string;
  tooltipSecondaryInfo?: string;
  yAxis?: string;
  wellGroup?: string;
  lithologyGroup?: string;
  constructionGroup?: string;
  cementPadGroup?: string;
  holeGroup?: string;
  surfaceCaseGroup?: string;
  holeFillGroup?: string;
  wellCaseGroup?: string;
  wellScreenGroup?: string;
  conflictGroup?: string;
};

const DEFAULT_COMPONENTS_CLASS_NAMES = {
  tooltip: 'tooltip',
  tooltipTitle: 'tittle',
  tooltipPrimaryInfo: 'primaryInfo',
  tooltipSecondaryInfo: 'secondaryInfo',
  yAxis: 'yAxis',
  wellGroup: 'poco-group',
  lithologyGroup: 'lito-group',
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

const getConflictAreas = (array1: any[], array2: any[]) => {
  const conflicts: { from: number; to: number; diam: number }[] = [];
  array1.forEach(item1 => {
    array2.forEach(item2 => {
      if (
        (item2.from >= item1.from && item2.from < item1.to) ||
        (item2.to <= item1.to && item2.to > item1.from)
      ) {
        // calculate ends of conflicts areas
        const a = Math.max(item2.from, item1.from);
        const b = Math.min(item2.to, item1.to);

        conflicts.push({
          from: a,
          to: b,
          diam: Math.max(item1.diam_pol, item2.diam_pol),
        });
      }
    });
  });
  return conflicts;
};

const mergeConflicts = (
  conflicts: { from: number; to: number; diam: number }[],
  buffer: number,
) => {
  // SORT ARRAY BY THE FROM PROPERTY
  const sortedConflicts = conflicts.sort(
    // @ts-ignore
    (a, b) => parseFloat(a.from) - parseFloat(b.from),
  );

  const mergedConflicts: { from: number; to: number; diam: number }[] = [];

  let index = 0;
  while (index < sortedConflicts.length) {
    const conflict = sortedConflicts[index];

    const { from, diam } = conflict;
    let { to } = conflict;

    let jumpTo = index + 1;

    for (let i = index + 1; i < sortedConflicts.length; i++) {
      const nextConflict = sortedConflicts[i];
      // if (nextConflict.to < conflict.to) {
      //   // eslint-disable-next-line no-continue
      //   continue;
      // }

      if (nextConflict.from > conflict.to + buffer) {
        jumpTo = i;
        break;
      }

      if (nextConflict.to > conflict.to && nextConflict.from >= conflict.from) {
        to = nextConflict.to;
      }
    }

    const nextConflict = sortedConflicts[index + 1];
    if (
      nextConflict &&
      nextConflict.to === conflict.to &&
      nextConflict.from === conflict.from
    ) {
      // eslint-disable-next-line no-plusplus
      jumpTo++;
    }

    mergedConflicts.push({ from, to, diam });

    index = jumpTo;
  }
  return mergedConflicts;
};

const getYAxisFunctions = (yScale: any) => {
  return {
    getHeight: ({ from, to }: { from: number; to: number }) => {
      return yScale(to - from);
    },
    getYPos: ({ from }: { from: number }) => {
      return yScale(from);
    },
  };
};

const getLithologyFiller = (geologyData: GEOLOGIC_COMPONENT_TYPE[], svg) => {
  const litologicalFill = getLithologicalFillList(geologyData);
  return (d: GEOLOGIC_COMPONENT_TYPE) => {
    if (!litologicalFill[`${d.fgdc_texture}.${d.from}`].url) {
      return litologicalFill[`${d.fgdc_texture}.${d.from}`];
    }
    svg.call(litologicalFill[`${d.fgdc_texture}.${d.from}`]);
    return litologicalFill[`${d.fgdc_texture}.${d.from}`].url();
  };
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
    customClassNames?: componentsClassNames,
  ) {
    if (customClassNames) {
      this.customClassNames = {
        ...DEFAULT_COMPONENTS_CLASS_NAMES,
        ...customClassNames,
      };
    }
    this.svg = d3.select(svgClassName);
  }

  public prepareSvg() {
    this.svg.selectAll('*').remove();

    const pocoGroup = this.svg
      .append('g')
      .attr('class', this.customClassNames.wellGroup);

    const litoligicalGroup = pocoGroup
      .append('g')
      .attr('class', this.customClassNames.lithologyGroup);

    const constructionGroup = pocoGroup
      .append('g')
      .attr('class', this.customClassNames.constructionGroup);

    litoligicalGroup.append('g').attr('class', this.customClassNames.yAxis);

    const cementPadGroup = constructionGroup
      .append('g')
      .attr('class', this.customClassNames.cementPadGroup);
    const holeGroup = constructionGroup
      .append('g')
      .attr('class', this.customClassNames.holeGroup);
    const surfaceCaseGroup = constructionGroup
      .append('g')
      .attr('class', this.customClassNames.surfaceCaseGroup);
    const holeFillGroup = constructionGroup
      .append('g')
      .attr('class', this.customClassNames.holeFillGroup);
    const wellCaseGroup = constructionGroup
      .append('g')
      .attr('class', this.customClassNames.wellCaseGroup);
    const wellScreenGroup = constructionGroup
      .append('g')
      .attr('class', this.customClassNames.wellScreenGroup);
    const conflictGroup = constructionGroup
      .append('g')
      .attr('class', this.customClassNames.conflictGroup);
  }

  populateTooltips() {
    const tipsText = {
      geology: (element, d) => `
        <span class="${this.customClassNames.tooltipTitle}">Litologia</span>
        <span class="${this.customClassNames.tooltipPrimaryInfo}">De ${d.from} m até ${d.to} m</span>
        <span class="${this.customClassNames.tooltipSecondaryInfo}"><strong>Descrição:</strong> ${d.description}</span>
      `,
      hole: (element, d) => {
        return `
        <span class="${this.customClassNames.tooltipTitle}">FURO</span>
        <span class="${this.customClassNames.tooltipPrimaryInfo}">De ${d.from} m até ${d.to} m</span>
        <span class="${this.customClassNames.tooltipSecondaryInfo}"><strong>Diâmetro:</strong>${d.diam_pol}"</span>
        `;
      },
      surfaceCase: (element, d) => {
        return `
            <span class="${this.customClassNames.tooltipTitle}">TUBO DE BOCA</span>
            <span class="${this.customClassNames.tooltipPrimaryInfo}">De ${d.from} m até ${d.to} m</span>
            <span class="${this.customClassNames.tooltipSecondaryInfo}"><strong>Diâmetro:</strong>${d.diam_pol}"</span>
          `;
      },
      holeFill: (element, d) => {
        return `
          <span class="${this.customClassNames.tooltipTitle}">ESP. ANELAR</span>
          <span class="${this.customClassNames.tooltipPrimaryInfo}">De ${d.from} m até ${d.to} m</span>
          <span class="${this.customClassNames.tooltipSecondaryInfo}"><strong>Diâmetro:</strong>${d.diam_pol}"</span>
          <span class="${this.customClassNames.tooltipSecondaryInfo}">
            <strong>Descrição:</strong> ${d.description}
          </span>
          `;
      },
      wellCase: (element, d) => {
        return `
          <span class="${this.customClassNames.tooltipTitle}">REVESTIMENTO</span>
              <span class="${this.customClassNames.tooltipPrimaryInfo}">De ${d.from} m até ${d.to} m</span>
              <span class="${this.customClassNames.tooltipSecondaryInfo}">
                <strong>Diâmetro:</strong> ${d.diam_pol}"
              </span>
              <span class="${this.customClassNames.tooltipSecondaryInfo}"><strong>Tipo:</strong> ${d.type}</span>
          `;
      },
      wellScreen: (element, d) => {
        return `
          <span class="${this.customClassNames.tooltipTitle}">FILTROS</span>
              <span class="${this.customClassNames.tooltipPrimaryInfo}">De ${d.from} m até ${d.to} m</span>
              <span class="${this.customClassNames.tooltipSecondaryInfo}">
                <strong>Diâmetro:</strong> ${d.diam_pol}"</span>
              <span class="${this.customClassNames.tooltipSecondaryInfo}"><strong>Tipo:</strong> ${d.type}</span>
              <span class="${this.customClassNames.tooltipSecondaryInfo}">
                <strong>Ranhura:</strong> ${d.screen_slot_mm}mm
              </span>
          `;
      },
      conflict: (element, d) => {
        return `
          <span class="${this.customClassNames.tooltipTitle}">FILTROS</span>
              <span class="${this.customClassNames.tooltipPrimaryInfo}">De ${d.from} m até ${d.to} m</span>
              <span class="${this.customClassNames.tooltipSecondaryInfo}">
                <strong>Diâmetro:</strong> ${d.diam_pol}"</span>
              <span class="${this.customClassNames.tooltipSecondaryInfo}"><strong>Tipo:</strong> ${d.type}</span>
              <span class="${this.customClassNames.tooltipSecondaryInfo}">
                <strong>Ranhura:</strong> ${d.screen_slot_mm}mm
              </span>
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

  drawLog(profile: PROFILE_TYPE) {
    if (!this.svg) return;

    if (isProfileEmpty(profile)) return;

    const svg = this.svg
      .attr('height', this.HEIGHT + this.MARGINS.TOP + this.MARGINS.BOTTOM)
      .attr('width', this.WIDTH + this.MARGINS.LEFT + this.MARGINS.RIGHT)
      .call(responsivefy);

    const pocoGroup = svg.select(`.${this.customClassNames.wellGroup}`);

    const litoligicalGroup = svg
      .select(`.${this.customClassNames.lithologyGroup}`)
      .attr(
        'transform',
        `translate(${this.MARGINS.LEFT}, ${this.MARGINS.TOP})`,
      );

    const constructionGroup = svg
      .select('.const-group')
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

    const updateGeology = async (data: GEOLOGIC_COMPONENT_TYPE[], yScale) => {
      const { getHeight, getYPos } = getYAxisFunctions(yScale);
      const getLithologyFill = getLithologyFiller(data, svg);

      const rects = litoligicalGroup.selectAll('rect').data(data);

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

    const updatePoco = (data: CONSTRUCTIVE_COMPONENT_TYPE, yScale) => {
      const { getHeight, getYPos } = getYAxisFunctions(yScale);

      const maxXValues = getProfileDiamValues(data);

      const maxValues = d3.max(maxXValues) || 0;

      const xScale = d3
        .scaleLinear()
        .domain([0, maxValues])
        .range([0, POCO_WIDTH]);

      constructionGroup.selectAll('.cement_pad').remove();

      if (data.cement_pad && data.cement_pad.thickness) {
        const tipCP = d3
          // @ts-ignore
          .tip()
          .attr('class', this.customClassNames.tooltip)
          .direction('e')
          .html((element, d) => {
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
            (d: any) => (POCO_CENTER - xScale((d.width / 2) * 39.37)) / 2,
          )
          .attr('y', (d: any) => {
            return yScale(0) - yScale(parseFloat(d.thickness));
          })
          .attr('width', (d: any) => xScale((d.width / 2) * 39.37))
          .attr('height', (d: any) => {
            return yScale(parseFloat(d.thickness));
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
        .attr('x', (d: any) => (POCO_CENTER - xScale(d.diam_pol)) / 2)
        .attr('width', (d: any) => xScale(d.diam_pol))
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
          (d: any) => (POCO_CENTER - xScale(d.diam_pol + d.diam_pol * 0.1)) / 2,
        )
        .attr('width', (d: any) => xScale(d.diam_pol + d.diam_pol * 0.1))
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
        .attr('x', (d: any) => (POCO_CENTER - xScale(d.diam_pol)) / 2)
        .attr('width', (d: any) => xScale(d.diam_pol))
        // @ts-ignore
        .transition(transition)
        .attr('y', getYPos)
        .attr('height', getHeight)
        .style('fill', (d: HOLE_FILL_COMPONENT_TYPE) => {
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
        .attr('x', (d: any) => (POCO_CENTER - xScale(d.diam_pol)) / 2)
        .attr('width', (d: any) => xScale(d.diam_pol))
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
        .style('fill', (d: any) => {
          svg.call(DEFAULTS_TEXTURES.well_screen);
          return DEFAULTS_TEXTURES.well_screen.url();
        })
        .on('mouseover', tooltips.wellScreen.show)
        .on('mouseout', tooltips.wellScreen.hide);

      newWellScreen
        // @ts-ignore
        .merge(wellScreen)
        .attr('x', (d: any) => (POCO_CENTER - xScale(d.diam_pol)) / 2)
        .attr('width', (d: any) => xScale(d.diam_pol))
        // @ts-ignore
        .transition(transition)
        .attr('y', getYPos)
        .attr('height', getHeight);

      // GET THE ARRAY FROM CONFLICT DETECTION
      const conflictAreas: { from: number; to: number; diam: number }[] = [];

      // 1. ARRAY THROUGH WELL CASE OR WELL SCREEN
      conflictAreas.push(...getConflictAreas(data.well_case, data.well_screen));
      conflictAreas.push(...getConflictAreas(data.well_screen, data.well_case));

      // 2. ADD SOME BUFFER AND MERGE TWO CLOSES AREAS
      const mergedConflicts = mergeConflicts(conflictAreas, 1);

      const tipConflict = d3
        // @ts-ignore
        .tip()
        // ! CHANGE
        .attr('class', `${this.customClassNames.tooltip} conflic`)
        .direction('e')
        .html((element, d) => {
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
        .style('fill', (d: any) => {
          svg.call(DEFAULTS_TEXTURES.conflict);
          return DEFAULTS_TEXTURES.conflict.url();
        })
        .on('mouseover', tipConflict.show)
        .on('mouseout', tipConflict.hide);

      newConflict
        // @ts-ignore
        .merge(conflict)
        .attr('x', (d: any) => (POCO_CENTER - xScale(d.diam)) / 2)
        .attr('width', (d: any) => xScale(d.diam))
        // @ts-ignore
        .transition(transition)
        .attr('y', getYPos)
        .attr('height', getHeight);
    };

    const geologicData = profile.geologic;
    const constructionData = profile.constructive;

    const maxValues = getProfileLastItemsDepths(profile);

    const maxYValues = d3.max(maxValues) || 0;

    const yScaleGlobal = d3
      .scaleLinear()
      .domain([0, maxYValues])
      .range([0, svgHeight - this.MARGINS.TOP - this.MARGINS.BOTTOM]);

    const yAxis = d3.axisLeft(yScaleGlobal).tickFormat((d: any) => `${d} m`);

    const gY = litoligicalGroup
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

    function zooming(e: any) {
      // eslint-disable-next-line prefer-destructuring
      const transform = e.transform;

      // @ts-ignore
      gY.call(yAxis.scale(transform.rescaleY(yScaleGlobal)));
      pocoGroup
        .selectAll('rect')
        .attr('y', (d: any) => {
          if (!d) return null;
          return transform.applyY(spanY(d));
        })
        .attr('height', d => {
          if (!d) return null;
          return transform.k * spanH(d);
        });
    }

    function drawProfile() {
      if (geologicData) updateGeology(geologicData, yScaleGlobal);
      if (constructionData) updatePoco(constructionData, yScaleGlobal);
    }

    // @ts-ignore
    const zoomNode = d3.zoom().on('zoom', zooming);
    // const zoom = d3.zoom().scaleExtent([0.2, 15]).on('zoom', zooming);

    drawProfile();
    // @ts-ignore
    this.svg.call(zoomNode).node();
    // @ts-ignore
    // svg.on('wheel', wheeled).call(zoom);
  }
}

export class StaticDrawer {}

export default {
  DinamicDrawer,
};
