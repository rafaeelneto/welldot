import { type BaseType, type Selection } from 'd3';
import type { TexturesConfig } from '~/configs/render.textures';

export type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

export type Conflict = { from: number; to: number; diameter: number };

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
  cave: { dryStroke: string; wetStroke: string; fillOpacity: number; contactStrokeWidth: number };
  fracture: { dryStroke: string; wetStroke: string };
  cementPad: { stroke: string; strokeWidth: number };
  boreHole: { fill: string; stroke: string; strokeDasharray: string; opacity: number; strokeWidth: number };
  surfaceCase: { stroke: string; strokeWidth: number };
  holeFill: { stroke: string; strokeWidth: number };
  wellCase: { fill: string; stroke: string; strokeWidth: number };
  wellScreen: { stroke: string; strokeWidth: number };
  conflict: { stroke: string; strokeWidth: number };
  unitLabels: { geologicFill: string; aquiferFill: string; stroke: string; strokeWidth: number };
  labels: {
    dividerStroke: string;
    dividerStrokeWidth: number;
    dividerStrokeDasharray: string;
    fontSize: number;
    color: string;
    headerFont: string;
    bodyColor: string;
  };
  legend: {
    borderStrokeWidth: number;
    fractureStrokeWidth: number;
    fractureSideStrokeWidth: number;
    itemStrokeWidth: number;
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
      centralStrokeWidth: number;
      sideStrokeWidthBase: number;
      sideStrokeWidthVariance: number;
    };
    single: {
      mainStrokeWidth: number;
      crackStrokeWidth: number;
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
    fontSize: number;
    xOffset: number;
    labelRadius: number;
    labelMaxWidth?: number;
    labelFill?: string;
    labelColor?: string;
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
    style: {
      fontSize: number;
      depthTipHeight: number;
      depthTipPadX: number;
      descriptionXOffset: number;
      descriptionMaxWidth: number;
      stackingLineHeight: number;
      stackingGap: number;
      fractureLabelLeaderGap?: number;
      fractureLabelFontSize?: number;
      fractureLabelPadX?: number;
      fractureLabelPadY?: number;
      caveLabelFontSize?: number;
      caveLabelHeight?: number;
      caveLabelPadX?: number;
      depthTipFill?: string;
      depthTipRadius?: number;
      annotationBg?: string;
      annotationBgOpacity?: number;
      annotationBorderColor?: string;
      annotationRadius?: number;
      fontFamily?: string;
      headerFontWeight?: string | number;
      bodyFontWeight?: string | number;
    };
  };
  unitLabels: {
    /** Show geologic_unit and aquifer_unit strips to the left of the lithology column */
    active: boolean;
    /** X position of the first (leftmost) strip in geologic group coordinates */
    xOffset: number;
    stripWidth: number;
    fontSize: number;
    minHeightForText: number;
    /** Stroke width of divider lines between adjacent segments of different units */
    innerDividerWidth: number;
    /** Stroke width of the top/bottom boundary (and page-clip edges in multi-SVG rendering) */
    outerEdgeWidth: number;
  };
  legend: LegendRenderConfig;
};

export type LegendRenderConfig = {
  title: string;
  fontSize: number;
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
