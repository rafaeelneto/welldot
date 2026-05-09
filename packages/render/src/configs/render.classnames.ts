import { ComponentsClassNames } from '~/types/render.types';

export const DEFAULT_COMPONENTS_CLASS_NAMES: ComponentsClassNames = {
  tooltip: {
    root: 'wp-tooltip',
    title: 'wp-tooltip-title',
    primaryInfo: 'wp-tooltip-primary',
    secondaryInfo: 'wp-tooltip-secondary',
  },
  yAxis: 'wp-y-axis',
  wellGroup: 'wp-well-group',
  geologicGroup: 'wp-geologic-group',
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
  constructionLabels: {
    group: 'construction-labels-group',
  },
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
  unitLabels: {
    group: 'unit-labels-group',
    geoRect: 'unit-geo-rect',
    aqRect: 'unit-aq-rect',
    text: 'unit-label-text',
  },
  labels: {
    lithology: {
      group: 'lithology-labels-group',
      depth: 'lithology-depth-tip',
      label: 'lithology-label',
      divider: 'lithology-label-divider',
    },
  },
  legend: {
    border: 'wp-legend-border',
    title: 'wp-legend-title',
    item: 'wp-legend-item',
    label: 'wp-legend-label',
    fracturePoly: 'fracture-poly',
    caveFill: 'cave-fill',
    constructionRect: 'construction-rect',
  },
  highlights: {
    geologicGroup: 'wp-highlights-geologic',
    constructionGroup: 'wp-highlights-construction',
    fracturesGroup: 'wp-highlights-fractures',
    item: 'wp-highlight-item',
    rect: 'wp-highlight-rect',
    label: 'wp-highlight-label',
    labelBg: 'wp-highlight-label-bg',
  },
};
