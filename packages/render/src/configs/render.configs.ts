import { easeCubic } from 'd3';
import {
  RenderConfig,
  RenderLabelPack,
  RenderLocalizedText,
  TooltipLabels,
  WellTheme,
} from '~/types/render.types';
import { resolveRenderLabel } from '~/utils/format.utils';

/**
 * Canonical, paired-locale source for every string `@welldot/render` draws
 * (construction-label prefixes, legend entries, tooltip titles/fields,
 * fracture/cave type words). `pt` values must match the literals historically
 * hardcoded in `tooltips.utils.ts`/`annotation-labels.renderer.ts` exactly —
 * this is the single source of truth `applyRenderLocale()` resolves from.
 */
export const RENDER_LABELS: RenderLabelPack = {
  constructionLabels: {
    wellCasePrefix: { pt: 'Revest.', en: 'Casing' },
    wellScreenPrefix: { pt: 'Filtro', en: 'Screen' },
    wellScreenSlotPrefix: { pt: 'Ranhura:', en: 'Slot:' },
  },
  legend: {
    title: { pt: 'LEGENDA', en: 'LEGEND' },
    labels: {
      fractureSingle: { pt: 'Fratura simples', en: 'Single fracture' },
      fractureSwarm: { pt: 'Enxame de fraturas', en: 'Fracture swarm' },
      fractureWater: { pt: "Entrada d'água", en: 'Water intake' },
      caveDry: { pt: 'Caverna seca', en: 'Dry cave' },
      caveWet: { pt: 'Caverna c/ água', en: 'Wet cave' },
      boreHole: { pt: 'Perfuração', en: 'Borehole' },
      surfaceCase: { pt: 'Tubo guia', en: 'Surface casing' },
      holeFillGravel: { pt: 'Pré-filtro', en: 'Gravel pack' },
      holeFillSeal: { pt: 'Vedação', en: 'Seal' },
      wellCase: { pt: 'Revestimento', en: 'Casing' },
      wellScreen: { pt: 'Filtro', en: 'Screen' },
      reduction: { pt: 'Redução', en: 'Reduction' },
      centralizer: { pt: 'Centralizador', en: 'Centralizer' },
      cementPad: { pt: 'Laje de cimento', en: 'Cement pad' },
      conflict: { pt: 'Conflito', en: 'Conflict' },
    },
  },
  tooltipLabels: {
    common: {
      from: { pt: 'De', en: 'From' },
      to: { pt: 'até', en: 'to' },
      description: { pt: 'Descrição:', en: 'Description:' },
      diameter: { pt: 'Diâmetro:', en: 'Diameter:' },
      type: { pt: 'Tipo:', en: 'Type:' },
    },
    geology: {
      title: { pt: 'Litologia', en: 'Lithology' },
      geologicUnit: { pt: 'Unidade geológica:', en: 'Geologic unit:' },
      aquiferUnit: { pt: 'Unidade aquífera:', en: 'Aquifer unit:' },
    },
    hole: { title: { pt: 'FURO', en: 'BOREHOLE' } },
    surfaceCase: { title: { pt: 'TUBO DE BOCA', en: 'SURFACE CASING' } },
    holeFill: { title: { pt: 'ESP. ANULAR', en: 'ANNULAR SPACE' } },
    wellCase: { title: { pt: 'REVESTIMENTO', en: 'CASING' } },
    wellScreen: {
      title: { pt: 'FILTROS', en: 'SCREENS' },
      slot: { pt: 'Ranhura:', en: 'Slot:' },
    },
    reduction: { title: { pt: 'REDUÇÃO', en: 'REDUCTION' } },
    centralizer: {
      title: { pt: 'CENTRALIZADOR', en: 'CENTRALIZER' },
      depth: { pt: 'Profundidade:', en: 'Depth:' },
      spacing: { pt: 'Espaçamento:', en: 'Spacing:' },
    },
    conflict: { title: { pt: 'CONFLITO', en: 'CONFLICT' } },
    fracture: {
      title: { pt: 'FRATURA', en: 'FRACTURE' },
      titleSwarm: { pt: 'ENXAME DE FRATURAS', en: 'FRACTURE SWARM' },
      depth: { pt: 'Profundidade:', en: 'Depth:' },
      waterIntake: { pt: "Entrada d'água:", en: 'Water intake:' },
      dip: { pt: 'Mergulho:', en: 'Dip:' },
      azimuth: { pt: 'Azimute:', en: 'Azimuth:' },
    },
    cementPad: {
      title: { pt: 'LAJE DE PROTEÇÃO', en: 'PROTECTION SLAB' },
      thickness: { pt: 'Espessura:', en: 'Thickness:' },
      width: { pt: 'Largura:', en: 'Width:' },
      length: { pt: 'Comprimento:', en: 'Length:' },
    },
    cave: {
      title: { pt: 'CAVERNA', en: 'CAVE' },
      waterIntake: { pt: "Entrada d'água", en: 'Water intake' },
    },
  },
  typeLabels: {
    fracture: { pt: 'fratura', en: 'fracture' },
    fractureWater: { pt: 'fratura aberta', en: 'open fracture' },
    cave: { pt: 'caverna', en: 'cave' },
    caveWater: { pt: 'caverna úmida', en: 'wet cave' },
  },
};

/** Resolves every `RenderLocalizedText` leaf of a flat group to a plain string for `locale`. */
function resolveGroup<G extends Record<string, RenderLocalizedText>>(
  group: G,
  locale: 'en' | 'pt',
): { [K in keyof G]: string } {
  const result = {} as { [K in keyof G]: string };
  for (const key in group) {
    result[key] = resolveRenderLabel(group[key], locale);
  }
  return result;
}

/** Resolves `RENDER_LABELS.tooltipLabels` to the plain-string shape `RenderConfig.tooltipLabels` expects. */
function resolveTooltipLabels(locale: 'en' | 'pt'): TooltipLabels {
  const t = RENDER_LABELS.tooltipLabels;
  return {
    common: resolveGroup(t.common, locale),
    geology: resolveGroup(t.geology, locale),
    hole: resolveGroup(t.hole, locale),
    surfaceCase: resolveGroup(t.surfaceCase, locale),
    holeFill: resolveGroup(t.holeFill, locale),
    wellCase: resolveGroup(t.wellCase, locale),
    wellScreen: resolveGroup(t.wellScreen, locale),
    reduction: resolveGroup(t.reduction, locale),
    centralizer: resolveGroup(t.centralizer, locale),
    conflict: resolveGroup(t.conflict, locale),
    fracture: resolveGroup(t.fracture, locale),
    cementPad: resolveGroup(t.cementPad, locale),
    cave: resolveGroup(t.cave, locale),
  };
}

/**
 * Returns a copy of `config` with `constructionLabels.labels`, `legend.labels`,
 * `tooltipLabels`, and `labels.typeLabels` resolved from `RENDER_LABELS` for
 * `locale`. Every other field of `config` is preserved unchanged.
 */
export function applyRenderLocale(
  config: RenderConfig,
  locale: 'en' | 'pt',
): RenderConfig {
  return {
    ...config,
    constructionLabels: {
      ...config.constructionLabels,
      labels: resolveGroup(RENDER_LABELS.constructionLabels, locale),
    },
    legend: {
      ...config.legend,
      title: resolveRenderLabel(RENDER_LABELS.legend.title, locale),
      labels: resolveGroup(RENDER_LABELS.legend.labels, locale),
    },
    tooltipLabels: resolveTooltipLabels(locale),
    labels: {
      ...config.labels,
      typeLabels: resolveGroup(RENDER_LABELS.typeLabels, locale),
    },
  };
}

export const DEFAULT_WELL_THEME: WellTheme = {
  lithology: { stroke: '#101010', strokeWidth: 1 },
  lithologyTexture: { size: 150, strokeWidth: 0.8, stroke: '#303030' },
  cave: {
    dryStroke: '#333333',
    wetStroke: '#1a6fa8',
    fillOpacity: 0.6,
    contactStrokeWidth: 1.2,
  },
  fracture: {
    dryStroke: '#000000',
    wetStroke: '#1a6fa8',
    swarm: {
      centralStrokeWidth: 1.2,
      sideStrokeWidthBase: 0.6,
      sideStrokeWidthVariance: 0.6,
    },
    single: {
      mainStrokeWidth: 1.8,
      crackStrokeWidth: 0.7,
    },
  },
  cementPad: { stroke: '#303030', strokeWidth: 2 },
  boreHole: {
    fill: '#ffffff',
    stroke: '#191919',
    strokeDasharray: '4, 3',
    opacity: 0.7,
    strokeWidth: 1.2,
  },
  surfaceCase: { stroke: '#000000', strokeWidth: 4 },
  holeFill: { stroke: '#303030', strokeWidth: 2 },
  wellCase: { fill: '#ffffff', stroke: '#303030', strokeWidth: 2 },
  wellScreen: { stroke: '#303030', strokeWidth: 2 },
  reduction: { fill: '#ffffff', stroke: '#303030', strokeWidth: 2 },
  centralizer: { fill: 'none', stroke: '#303030', strokeWidth: 1.4 },
  conflict: { stroke: '#e52117', strokeWidth: 4 },
  unitLabels: {
    geologicFill: '#f0f0f0',
    aquiferFill: '#dff0ff',
    stroke: '#303030',
    strokeWidth: 0.4,
    fontSize: 5.5,
    fontFamily: 'sans-serif',
    fontWeight: 400,
  },
  constructionLabels: {
    fontSize: 7.5,
    labelFill: '#ffffff',
    labelColor: '#303030',
    fontFamily: 'sans-serif',
    fontWeight: 400,
  },
  labels: {
    dividerStroke: '#888888',
    dividerStrokeWidth: 0.5,
    dividerStrokeDasharray: '2, 2',
    fontSize: 7,
    color: '#333',
    headerFont: 'monospace',
    bodyColor: '#555',
    bodyFont: 'sans-serif',
    scaleFont: 'monospace',
    depthTipFill: '#ffffff',
    depthTipRadius: 2,
    annotationBg: '#ffffff',
    annotationBgOpacity: 0.85,
    annotationRadius: 2,
    headerFontWeight: 600,
    bodyFontWeight: 400,
  },
  legend: {
    borderStrokeWidth: 0.8,
    fractureStrokeWidth: 1.5,
    fractureSideStrokeWidth: 0.8,
    itemStrokeWidth: 0.8,
    fontSize: 7,
    fontFamily: 'sans-serif',
    titleFontWeight: 'bold',
    labelFontWeight: 400,
  },
};

const DEFAULT_HIGHLIGHT_CONFIG = {
  stroke: '#e52117',
  strokeWidth: 2,
  fill: 'none',
  fillOpacity: 0,
  padding: 2,
  strokeDasharray: undefined,
  labelFontSize: 7,
  labelPadding: 3,
  labelBackground: '#e52117',
  labelColor: '#ffffff',
  labelRadius: 2,
} as const;

export const STATIC_RENDER_CONFIG: RenderConfig = {
  zoom: true,
  pan: true,
  zoomLevel: 1,
  maxZoomScale: 150,
  minZoomScale: 0,
  animation: { duration: 600, ease: easeCubic },
  geologic: { xLeft: 20, xRightInset: 300 },
  layout: {
    pocoWidthRatio: 0.21, // construction column occupies 21% of total SVG width
    pocoCenterRatio: -0.39, // construction center x-offset (negative = shift left of SVG centre)
  },
  caves: {
    pathSteps: 40,
    amplitude: {
      ratio: 0.12, // cave contact waviness: 12% of the cave band pixel height
      min: 1,
      max: 5.5,
    },
  },
  fractures: {
    widthMultiplier: 1.2,
    hitBuffer: { single: 8, swarm: 15 },
    swarm: {
      lineCountBase: 3,
      lineCountVariance: 11,
      spread: 18,
    },
  },
  construction: {
    cementPad: { widthMultiplier: 0.9, thicknessMultiplier: 1.3 },
    surfaceCase: { diameterPaddingRatio: 0.1 },
    centralizer: { markerHalfHeight: 4 },
  },
  tooltipLabels: resolveTooltipLabels('pt'),
  labels: {
    active: true,
    typeLabels: resolveGroup(RENDER_LABELS.typeLabels, 'pt'),
    depthTipHeight: 11,
    depthTipPadX: 2,
    descriptionXOffset: 20,
    descriptionMaxWidth: 250,
    stackingLineHeight: 10,
    stackingGap: 0,
    fractureLabelLeaderGap: 5,
    lithology: true,
  },
  unitLabels: {
    active: true,
    xOffset: 2,
    stripWidth: 8,
    minHeightForText: 8,
    innerDividerWidth: 1.5,
    outerEdgeWidth: 0.6,
  },
  constructionLabels: {
    active: true,
    xOffset: -12,
    labelRadius: 2,
    labelMaxWidth: 90,
    labels: {
      wellCasePrefix: 'Revest.',
      wellScreenPrefix: 'Filtro',
      wellScreenSlotPrefix: 'Ranhura:',
    },
  },
  textures: {
    pad: { background: '#ffffff', stroke: '#303030' },
    conflict: { stroke: '#E52117' },
    cave_dry: { size: 8, stroke: '#333333', background: '#ffffff' },
    cave_wet: { size: 8, stroke: '#1a6fa8', background: '#ffffff' },
    seal: { background: '#ffffff' },
    gravel_pack: { background: '#ffffff' },
    well_screen: { size: 40, strokeWidth: 2, background: '#ffffff' },
    surface_case: {
      orientation: ['vertical', 'horizontal'],
      size: 4,
      strokeWidth: 1,
      shapeRendering: 'crispEdges',
      stroke: '#303030',
      background: '#fff',
    },
  },
  legend: {
    title: 'LEGENDA',
    itemWidth: 110,
    height: 44,
    padding: 4,
    maxWidth: 700,
    borderRadius: 3,
    labels: {
      fractureSingle: 'Fratura simples',
      fractureSwarm: 'Enxame de fraturas',
      fractureWater: "Entrada d'água",
      caveDry: 'Caverna seca',
      caveWet: 'Caverna c/ água',
      boreHole: 'Perfuração',
      surfaceCase: 'Tubo guia',
      holeFillGravel: 'Pré-filtro',
      holeFillSeal: 'Vedação',
      wellCase: 'Revestimento',
      wellScreen: 'Filtro',
      reduction: 'Redução',
      centralizer: 'Centralizador',
      cementPad: 'Laje de cimento',
      conflict: 'Conflito',
    },
  },
  highlights: DEFAULT_HIGHLIGHT_CONFIG,
};

export const INTERACTIVE_RENDER_CONFIG: RenderConfig = {
  zoom: true,
  pan: true,
  zoomLevel: 1,
  maxZoomScale: 150,
  minZoomScale: 0,
  animation: { duration: 600, ease: easeCubic },
  geologic: { xLeft: 6, xRightInset: 56 },
  layout: {
    pocoWidthRatio: 0.25, // construction column occupies 25% of total SVG width
    pocoCenterRatio: 0.11, // construction center x-offset (positive = shift right of SVG centre)
  },
  caves: {
    pathSteps: 40,
    amplitude: {
      ratio: 0.12, // cave contact waviness: 12% of the cave band pixel height
      min: 1,
      max: 5.5,
    },
  },
  fractures: {
    widthMultiplier: 1.2,
    hitBuffer: { single: 8, swarm: 15 },
    swarm: {
      lineCountBase: 3,
      lineCountVariance: 11,
      spread: 18,
    },
  },
  construction: {
    cementPad: { widthMultiplier: 0.9, thicknessMultiplier: 1.3 },
    surfaceCase: { diameterPaddingRatio: 0.1 },
    centralizer: { markerHalfHeight: 4 },
  },
  tooltipLabels: resolveTooltipLabels('pt'),
  labels: {
    active: false,
    typeLabels: resolveGroup(RENDER_LABELS.typeLabels, 'pt'),
    depthTipHeight: 11,
    depthTipPadX: 2,
    descriptionXOffset: 78,
    descriptionMaxWidth: 226,
    stackingLineHeight: 11,
    stackingGap: 0,
  },
  unitLabels: {
    active: false,
    xOffset: 0,
    stripWidth: 8,
    minHeightForText: 8,
    innerDividerWidth: 1.5,
    outerEdgeWidth: 0.6,
  },
  constructionLabels: {
    active: false,
    xOffset: 10,
    labelRadius: 2,
    labels: {
      wellCasePrefix: 'Revest.',
      wellScreenPrefix: 'Filtro',
      wellScreenSlotPrefix: 'Ranhura:',
    },
  },
  textures: {
    pad: { background: '#ffffff', stroke: '#303030' },
    conflict: { stroke: '#E52117' },
    cave_dry: { size: 8, stroke: '#333333', background: '#ffffff' },
    cave_wet: { size: 8, stroke: '#1a6fa8', background: '#ffffff' },
    seal: { background: '#ffffff' },
    gravel_pack: { background: '#ffffff' },
    well_screen: { size: 40, strokeWidth: 2, background: '#ffffff' },
    surface_case: {
      orientation: ['vertical', 'horizontal'],
      size: 4,
      strokeWidth: 1,
      shapeRendering: 'crispEdges',
      stroke: '#303030',
      background: '#fff',
    },
  },
  legend: {
    title: 'LEGENDA',
    itemWidth: 110,
    height: 44,
    padding: 4,
    maxWidth: 700,
    borderRadius: 3,
    labels: {
      fractureSingle: 'Fratura simples',
      fractureSwarm: 'Enxame de fraturas',
      fractureWater: "Entrada d'água",
      caveDry: 'Caverna seca',
      caveWet: 'Caverna c/ água',
      boreHole: 'Perfuração',
      surfaceCase: 'Tubo guia',
      holeFillGravel: 'Pré-filtro',
      holeFillSeal: 'Vedação',
      wellCase: 'Revestimento',
      wellScreen: 'Filtro',
      reduction: 'Redução',
      centralizer: 'Centralizador',
      cementPad: 'Laje de cimento',
      conflict: 'Conflito',
    },
  },
  highlights: DEFAULT_HIGHLIGHT_CONFIG,
};
