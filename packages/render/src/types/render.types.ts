import type {
  Cave,
  Constructive,
  Fracture,
  Lithology,
  Units,
} from '@welldot/core';
import {
  type BaseType,
  type ScaleLinear,
  type Selection,
  type Transition,
} from 'd3';
import type { TexturesConfig, WellTextures } from '~/configs/render.textures';

export type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

export type Conflict = { from: number; to: number; diameter: number };

export type HighlightItem = {
  label?: string;
  from?: number;
  to?: number;
  depth?: number;
  diameter?: number;
};

export type Highlights = {
  lithology?: HighlightItem[];
  caves?: HighlightItem[];
  fractures?: HighlightItem[];
  cement_pad?: HighlightItem;
  bore_hole?: HighlightItem[];
  surface_case?: HighlightItem[];
  hole_fill?: HighlightItem[];
  well_case?: HighlightItem[];
  well_screen?: HighlightItem[];
};

export type SvgSelection = Selection<BaseType, unknown, HTMLElement, unknown>;

export type InstanceState = {
  svg: SvgSelection;
  height: number;
  width: number;
  margins: { left: number; right: number; top: number; bottom: number };
  clipId: string;
  clipRectId: string;
};

export type WellTheme = {
  lithology: { stroke: string; strokeWidth: number };
  lithologyTexture: { size: number; strokeWidth: number; stroke: string };
  cave: {
    dryStroke: string;
    wetStroke: string;
    fillOpacity: number;
    contactStrokeWidth: number;
  };
  fracture: {
    dryStroke: string;
    wetStroke: string;
    swarm: {
      centralStrokeWidth: number;
      sideStrokeWidthBase: number;
      sideStrokeWidthVariance: number;
    };
    single: {
      mainStrokeWidth: number;
      crackStrokeWidth: number;
    };
  };
  cementPad: { stroke: string; strokeWidth: number };
  boreHole: {
    fill: string;
    stroke: string;
    strokeDasharray: string;
    opacity: number;
    strokeWidth: number;
  };
  surfaceCase: { stroke: string; strokeWidth: number };
  holeFill: { stroke: string; strokeWidth: number };
  wellCase: { fill: string; stroke: string; strokeWidth: number };
  wellScreen: { stroke: string; strokeWidth: number };
  conflict: { stroke: string; strokeWidth: number };
  unitLabels: {
    geologicFill: string;
    aquiferFill: string;
    stroke: string;
    strokeWidth: number;
    fontSize: number;
    fontFamily?: string;
    fontWeight?: string | number;
  };
  constructionLabels: {
    fontSize: number;
    labelFill: string;
    labelColor: string;
    fontFamily?: string;
    fontWeight?: string | number;
  };
  labels: {
    dividerStroke: string;
    dividerStrokeWidth: number;
    dividerStrokeDasharray: string;
    fontSize: number;
    scaleFontSize?: number;
    color: string;
    headerFont: string;
    bodyColor: string;
    bodyFont?: string;
    scaleFont?: string;
    depthTipFill?: string;
    depthTipRadius?: number;
    annotationBg?: string;
    annotationBgOpacity?: number;
    annotationBorderColor?: string;
    annotationRadius?: number;
    headerFontWeight?: string | number;
    bodyFontWeight?: string | number;
    fractureLabelFontSize?: number;
    caveLabelFontSize?: number;
  };
  legend: {
    borderStrokeWidth: number;
    fractureStrokeWidth: number;
    fractureSideStrokeWidth: number;
    itemStrokeWidth: number;
    fontSize: number;
    fontFamily?: string;
    titleFontWeight?: string | number;
    labelFontWeight?: string | number;
  };
};

export type ComponentsClassNames = {
  tooltip: {
    root: string;
    title: string;
    primaryInfo: string;
    secondaryInfo: string;
  };
  yAxis: string;
  wellGroup: string;
  geologicGroup: string;
  lithology: {
    group: string;
    rect: string;
  };
  labels: {
    lithology: {
      group: string;
      depth: string;
      label: string;
      divider: string;
    };
  };
  fractures: {
    group: string;
    item: string;
    hitArea: string;
    line: string;
    polyline: string;
  };
  caves: {
    group: string;
    item: string;
    fill: string;
    contact: string;
  };
  constructionGroup: string;
  constructionLabels: {
    group: string;
  };
  cementPad: {
    group: string;
    item: string;
  };
  boreHole: {
    group: string;
    rect: string;
  };
  surfaceCase: {
    group: string;
    rect: string;
  };
  holeFill: {
    group: string;
    rect: string;
  };
  wellCase: {
    group: string;
    rect: string;
  };
  wellScreen: {
    group: string;
    rect: string;
  };
  conflict: {
    group: string;
    rect: string;
  };
  unitLabels: {
    group: string;
    geoRect: string;
    aqRect: string;
    text: string;
  };
  legend: {
    border: string;
    title: string;
    item: string;
    label: string;
    fracturePoly: string;
    caveFill: string;
    constructionRect: string;
  };
  highlights: {
    geologicGroup: string;
    constructionGroup: string;
    fracturesGroup: string;
    item: string;
    rect: string;
    label: string;
    labelBg: string;
  };
};

export type TooltipKey =
  | 'geology'
  | 'hole'
  | 'surfaceCase'
  | 'holeFill'
  | 'wellCase'
  | 'wellScreen'
  | 'conflict'
  | 'fracture'
  | 'cementPad'
  | 'cave';

export type RenderConfig = {
  zoom: boolean;
  pan: boolean;
  /** Initial zoom scale applied on first render (1 = fit all, 2 = start 2× zoomed in). */
  zoomLevel?: number;
  /** undefined = show all; false or [] = show none; array = show only listed keys */
  tooltips?: TooltipKey[] | false;
  animation: {
    duration: number;
    ease: (t: number) => number;
  };
  geologic: {
    xLeft: number;
    xRightInset: number;
  };
  layout: {
    pocoWidthRatio: number;
    pocoCenterRatio: number;
  };
  caves: {
    pathSteps: number;
    amplitude: {
      ratio: number;
      min: number;
      max: number;
    };
  };
  fractures: {
    widthMultiplier: number;
    hitBuffer: {
      single: number;
      swarm: number;
    };
    swarm: {
      lineCountBase: number;
      lineCountVariance: number;
      spread: number;
    };
  };
  construction: {
    cementPad: {
      widthMultiplier: number;
      thicknessMultiplier: number;
    };
    surfaceCase: {
      diameterPaddingRatio: number;
    };
  };
  textures?: TexturesConfig;
  constructionLabels: {
    active: boolean;
    xOffset: number;
    labelRadius: number;
    labelMaxWidth?: number;
    labels: {
      wellCasePrefix: string;
      wellScreenPrefix: string;
      wellScreenSlotPrefix: string;
    };
  };
  labels: {
    /** false = hide all; true = show all; array = show only listed types */
    active: boolean | ('lithology' | 'fractures' | 'caves')[];
    /** Fine-grained lithology sub-item control; defaults to true when lithology is active */
    lithology?: boolean | ('depth' | 'description' | 'dividers')[];
    typeLabels?: {
      fracture?: string;
      cave?: string;
    };
    depthTipHeight: number;
    depthTipPadX: number;
    descriptionXOffset: number;
    descriptionMaxWidth: number;
    stackingLineHeight: number;
    stackingGap: number;
    fractureLabelLeaderGap?: number;
    fractureLabelPadX?: number;
    fractureLabelPadY?: number;
    caveLabelHeight?: number;
    caveLabelPadX?: number;
  };
  unitLabels: {
    /** Show geologic_unit and aquifer_unit strips to the left of the lithology column */
    active: boolean;
    /** X position of the first (leftmost) strip in geologic group coordinates */
    xOffset: number;
    stripWidth: number;
    minHeightForText: number;
    /** Stroke width of divider lines between adjacent segments of different units */
    innerDividerWidth: number;
    /** Stroke width of the top/bottom boundary (and page-clip edges in multi-SVG rendering) */
    outerEdgeWidth: number;
  };
  legend: LegendRenderConfig;
  highlights: {
    stroke: string;
    strokeWidth: number;
    fill: string;
    fillOpacity: number;
    padding: number;
    strokeDasharray?: string;
    labelFontSize: number;
    labelPadding: number;
    labelBackground: string;
    labelColor: string;
    labelRadius: number;
  };
};

export type LegendRenderConfig = {
  title: string;
  itemWidth: number;
  height: number;
  padding: number;
  maxWidth?: number;
  borderRadius: number;
  labels: {
    fractureSingle: string;
    fractureSwarm: string;
    fractureWater: string;
    caveDry: string;
    caveWet: string;
    boreHole: string;
    surfaceCase: string;
    holeFillGravel: string;
    holeFillSeal: string;
    wellCase: string;
    wellScreen: string;
    cementPad: string;
    conflict: string;
  };
};

export type SvgInstance = {
  selector: string;
  height: number;
  width: number;
  margins: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
};

/** All SVG group selections created in initInstanceSvg. */
export type DrawGroups = {
  lithologyGroup: SvgSelection;
  unitLabelsGroup: SvgSelection;
  cavesGroup: SvgSelection;
  fracturesGroup: SvgSelection;
  lithologyLabelsGroup: SvgSelection;
  constructionGroup: SvgSelection;
  constructionLabelsGroup: SvgSelection;
  cementPadGroup: SvgSelection;
  holeGroup: SvgSelection;
  surfaceCaseGroup: SvgSelection;
  holeFillGroup: SvgSelection;
  wellCaseGroup: SvgSelection;
  wellScreenGroup: SvgSelection;
  conflictGroup: SvgSelection;
  highlightsGeologicGroup: SvgSelection;
  highlightsConstructionGroup: SvgSelection;
  highlightsFracturesGroup: SvgSelection;
};

/**
 * Grouped geological data for the annotation-labels renderer.
 * All arrays are pre-filtered to the active depth window by the caller.
 */
export type AnnotationData = {
  lithology: Lithology[];
  fractures: Fracture[];
  caves: Cave[];
};

/**
 * Shared context passed to every draw* renderer function.
 *
 * Replaces all closed-over variables from drawLogToInstance so renderers
 * can live in separate files without prop-drilling or closure capture.
 *
 * - `yScale` changes on every zoom event — callers create a new context
 *   (`{ ...ctx, yScale: rescaled }`) rather than mutating this object.
 * - `constructionData` is the full (unfiltered) construction profile, used
 *   for x-scale domain computation. The `data` argument to each renderer
 *   carries only the depth-filtered subset for the current panel.
 */
export type DrawContext = {
  svg: SvgSelection;
  state: InstanceState;
  svgWidth: number;
  svgHeight: number;
  POCO_WIDTH: number;
  POCO_CENTER: number;
  pocoCenterX: number;
  geoXLeft: number;
  geoXRight: number;
  depthFrom: number;
  depthTo: number;
  /** Active depth→pixel scale; replaced (not mutated) on each zoom event. */
  yScale: ScaleLinear<number, number>;
  transition: Transition<BaseType, unknown, null, undefined>;
  tooltips: Record<
    string,
    { show: (...a: unknown[]) => void; hide: (...a: unknown[]) => void }
  >;
  renderConfig: RenderConfig;
  theme: WellTheme;
  classes: ComponentsClassNames;
  textures: WellTextures;
  units: Units;
  /** Full (unfiltered) construction profile — for x-scale domain. */
  constructionData: Constructive;
  groups: DrawGroups;
};
