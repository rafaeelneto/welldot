import * as d3 from 'd3';
import { DrawerRenderConfig } from '@/src/lib/@types/drawer.types';

export const INTERACTIVE_RENDER_CONFIG: DrawerRenderConfig = {
  zoom:        true,
  pan:         true,
  animation:   { duration: 600, ease: d3.easeCubic },
  geologic:    { xLeft: 6, xRightInset: 56 },
  layout:      { pocoWidthRatio: 0.25, pocoCenterRatio: 0.11 },
  caves: {
    pathSteps: 40,
    amplitude: { ratio: 0.12, min: 1, max: 5.5 },
  },
  fractures: {
    widthMultiplier: 1.2,
    hitBuffer: { single: 8, swarm: 15 },
    swarm: {
      lineCountBase: 3, lineCountVariance: 11,
      spread: 18,
      centralStrokeWidth: 1.2,
      sideStrokeWidthBase: 0.6, sideStrokeWidthVariance: 0.6,
    },
    single: { mainStrokeWidth: 1.8, crackStrokeWidth: 0.7 },
  },
  construction: {
    cementPad:   { widthMultiplier: 0.9, thicknessMultiplier: 1.3 },
    surfaceCase: { diameterPaddingRatio: 0.1 },
  },
  labels: {
    active:     false,
    typeLabels: { fracture: 'fratura', cave: 'caverna' },
    style: {
      fontSize:            10.5,
      depthTipHeight:      11,
      depthTipPadX:        2,
      descriptionXOffset:  78,
      descriptionMaxWidth: 226,
      stackingLineHeight:  11,
      stackingGap:         0,
    },
  },
  unitLabels: {
    active:            false,
    xOffset:           0,
    stripWidth:        8,
    fontSize:          5.5,
    minHeightForText:  8,
    innerDividerWidth: 1.5,
    outerEdgeWidth:    0.6,
  },
  legend: {
    title:     'LEGENDA',
    fontSize:  7,
    itemWidth: 110,
    height:    44,
    padding:   4,
    labels: {
      fractureSingle: 'Fratura simples',
      fractureSwarm:  'Enxame de fraturas',
      fractureWater:  "Entrada d'água",
      caveDry:        'Caverna seca',
      caveWet:        "Caverna c/ água",
    },
  },
};
