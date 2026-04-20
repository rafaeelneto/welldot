export type CssVarsConfig = {
  // Strokes & fills
  lithologyStroke?: string;
  caveDryStroke?: string;
  caveWetStroke?: string;
  fractureDryStroke?: string;
  fractureWetStroke?: string;
  cementPadStroke?: string;
  boreHoleFill?: string;
  boreHoleStroke?: string;
  surfaceCaseFill?: string;
  holeFillStroke?: string;
  wellCaseFill?: string;
  wellCaseStroke?: string;
  wellScreenStroke?: string;
  conflictStroke?: string;
  // Widths & opacities
  lithologyStrokeWidth?: string;
  caveFillOpacity?: string;
  caveContactStrokeWidth?: string;
  cementPadStrokeWidth?: string;
  boreHoleOpacity?: string;
  boreHoleStrokeWidth?: string;
  surfaceCaseStrokeWidth?: string;
  holeFillStrokeWidth?: string;
  wellCaseStrokeWidth?: string;
  wellScreenStrokeWidth?: string;
  conflictStrokeWidth?: string;
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
      group:   string;
      depth:   string;
      label:   string;
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

export type DrawerRenderConfig = {
  zoom: boolean;
  pan: boolean;
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
      fontSize:                  number;
      depthTipHeight:            number;
      depthTipPadX:              number;
      descriptionXOffset:        number;
      descriptionMaxWidth:       number;
      stackingLineHeight:        number;
      stackingGap:               number;
      fractureLabelLeaderGap?:   number;
      fractureLabelFontSize?:    number;
      fractureLabelPadX?:        number;
      fractureLabelPadY?:        number;
      caveLabelFontSize?:        number;
      caveLabelHeight?:          number;
      caveLabelPadX?:            number;
    };
  };
  cssVars?: CssVarsConfig;
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
