import type {
  BoreHole,
  Cave,
  Constructive,
  Fracture,
  HoleFill,
  LanguageText,
  Lithology,
  Reduction,
  SurfaceCase,
  Units,
  Well,
  WellCase,
  WellScreen,
} from '@welldot/core';
import {
  type BaseType,
  type ScaleLinear,
  type Selection,
  type Transition,
  type ZoomBehavior,
} from 'd3';
import type { TexturesConfig, WellTextures } from '~/configs/render.textures';

/** Recursively makes all properties of T optional — used for deep-mergeable option objects. */
export type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

export type Conflict = { from: number; to: number; diameter: number };

/** A single highlight overlay item. Use `from`+`to` for depth-range highlights, `depth` for point highlights. */
export type HighlightItem = {
  label?: string;
  from?: number;
  to?: number;
  depth?: number;
  diameter?: number;
};

/** Highlight overlay configuration passed to `draw()`. Each key targets a specific well component. */
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
  reduction?: HighlightItem[];
};

export type SvgSelection = Selection<BaseType, unknown, HTMLElement, unknown>;

export type InstanceState = {
  svg: SvgSelection;
  height: number;
  width: number;
  margins: { left: number; right: number; top: number; bottom: number };
  clipId: string;
  clipRectId: string;
  /** Explicit depth window of the panel (see `SvgInstance.depthRange`). */
  depthRange?: [number, number];
  /** Bottom of the band repeated from the previous panel (see `SvgInstance.repeatedTo`). */
  repeatedTo?: number;
  /** The d3-zoom behavior bound to this panel's `<svg>`, when zoom or pan is enabled. */
  zoomNode?: ZoomBehavior<SVGSVGElement, unknown>;
};

export type LithologyTheme = { stroke: string; strokeWidth: number };
export type LithologyTextureTheme = {
  size: number;
  strokeWidth: number;
  stroke: string;
};
export type CaveTheme = {
  dryStroke: string;
  wetStroke: string;
  fillOpacity: number;
  contactStrokeWidth: number;
};
export type FractureTheme = {
  dryStroke: string;
  wetStroke: string;
  swarm: {
    centralStrokeWidth: number;
    sideStrokeWidthBase: number;
    sideStrokeWidthVariance: number;
  };
  single: { mainStrokeWidth: number; crackStrokeWidth: number };
};
export type ConstructionTheme = {
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
  wellScreen: {
    stroke: string;
    strokeWidth: number;
    /** Width of the dashed line at each screen's top and base. */
    endStrokeWidth: number;
    endDasharray: string;
  };
  reduction: { fill: string; stroke: string; strokeWidth: number };
  centralizer: { fill: string; stroke: string; strokeWidth: number };
  /** Current pump body and its riser pipe (`.well` v2.3 `pump_installations`). */
  pump: {
    fill: string;
    stroke: string;
    strokeWidth: number;
    /** Riser interior: a tone between the casing's and the body's, so the riser reads as part of the pump, not as a casing. */
    riserFill: string;
    riserStroke: string;
    riserStrokeWidth: number;
  };
  conflict: { stroke: string; strokeWidth: number };
};
export type LabelsTheme = {
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
};
/** Mini-map drawn by `RenderConfig.overview`. */
export type OverviewTheme = {
  stroke: string;
  strokeWidth: number;
  /** Fill of layers without a `color`. */
  emptyFill: string;
  /** Outline of the window marking the panel's depth range. */
  windowStroke: string;
  windowStrokeWidth: number;
};
/** Column titles drawn by `RenderConfig.columnHeaders`. */
export type ColumnHeadersTheme = {
  fontSize: number;
  color: string;
  fontFamily?: string;
  fontWeight?: string | number;
  ruleStroke: string;
  ruleStrokeWidth: number;
};
/** Layer and fracture markers drawn by `RenderConfig.markers`. */
export type MarkersTheme = {
  fill: string;
  stroke: string;
  strokeWidth: number;
  color: string;
  fontSize: number;
  fontFamily?: string;
  fontWeight?: string | number;
};
/** Hatched band drawn over the depths a panel repeats from the previous one. */
export type OverlapTheme = {
  stroke: string;
  strokeWidth: number;
  /** Spacing of the hatch lines in pixels. */
  size: number;
  ruleStroke: string;
  labelColor: string;
  fontSize: number;
  fontFamily?: string;
};
export type LegendTheme = {
  borderStrokeWidth: number;
  fractureStrokeWidth: number;
  fractureSideStrokeWidth: number;
  itemStrokeWidth: number;
  fontSize: number;
  fontFamily?: string;
  titleFontWeight?: string | number;
  labelFontWeight?: string | number;
};

/** Visual styling theme for all well components. Use `DEFAULT_WELL_THEME` as a base and pass `DeepPartial<WellTheme>` overrides. */
export type WellTheme = {
  lithology: LithologyTheme;
  lithologyTexture: LithologyTextureTheme;
  cave: CaveTheme;
  fracture: FractureTheme;
} & ConstructionTheme &
  LabelsTheme & {
    legend: LegendTheme;
    overview: OverviewTheme;
    columnHeaders: ColumnHeadersTheme;
    markers: MarkersTheme;
    overlap: OverlapTheme;
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
  reduction: {
    group: string;
    item: string;
  };
  centralizer: {
    group: string;
    item: string;
  };
  pump: {
    group: string;
    item: string;
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
  overview: {
    group: string;
    item: string;
    window: string;
  };
  columnHeaders: {
    group: string;
    text: string;
    rule: string;
  };
  markers: {
    group: string;
    lithology: string;
    fracture: string;
  };
  overlap: {
    group: string;
    band: string;
    label: string;
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

/** Keys identifying which tooltip types are active. Pass to `RenderConfig.tooltips` to control visibility. */
export type TooltipKey =
  | 'geology'
  | 'hole'
  | 'surfaceCase'
  | 'holeFill'
  | 'wellCase'
  | 'wellScreen'
  | 'reduction'
  | 'centralizer'
  | 'pump'
  | 'conflict'
  | 'fracture'
  | 'cementPad'
  | 'cave';

/**
 * Renderer-drawn text: a core `LanguageText` with `pt` required (the fallback
 * locale; `en` and any other tag optional), or a bare string when the value
 * doesn't vary by locale. Resolve via `resolveRenderLabel()` — never read a
 * tag directly, since the value may be a plain string.
 */
export type RenderLocalizedText = LanguageText<'pt'> | string;

/**
 * Shape shared by `RenderConfig.tooltipLabels` (resolved, `T = string`) and
 * `RenderLabelPack.tooltipLabels` (authoring, `T = RenderLocalizedText`) —
 * defined once via the generic so the two shapes can't drift apart.
 */
export type TooltipLabels<T = string> = {
  common: {
    from: T;
    to: T;
    description: T;
    diameter: T;
    type: T;
  };
  geology: { title: T; geologicUnit: T; aquiferUnit: T };
  hole: { title: T };
  surfaceCase: { title: T };
  holeFill: { title: T };
  wellCase: { title: T };
  wellScreen: { title: T; slot: T; material: T; slotType: T };
  reduction: { title: T };
  centralizer: { title: T; depth: T; spacing: T };
  pump: {
    title: T;
    intakeDepth: T;
    model: T;
    power: T;
    riser: T;
    type_submersible: T;
    type_vertical_turbine: T;
    type_jet: T;
    type_progressive_cavity: T;
    type_hand_pump: T;
    type_compressor_airlift: T;
  };
  conflict: { title: T };
  fracture: {
    title: T;
    titleSwarm: T;
    depth: T;
    waterIntake: T;
    dip: T;
    azimuth: T;
  };
  cementPad: { title: T; thickness: T; width: T; length: T };
  cave: { title: T; waterIntake: T };
};

/**
 * Canonical, paired-locale source for every string `@welldot/render` draws.
 * `RENDER_LABELS` (in `configs/render.configs.ts`) is the sole instance;
 * `applyRenderLocale()` resolves it down to a plain-string `DeepPartial<RenderConfig>`.
 */
export type RenderLabelPack = {
  constructionLabels: {
    wellCasePrefix: RenderLocalizedText;
    wellScreenPrefix: RenderLocalizedText;
    wellScreenSlotPrefix: RenderLocalizedText;
  };
  legend: {
    title: RenderLocalizedText;
    labels: Record<keyof LegendRenderConfig['labels'], RenderLocalizedText>;
  };
  tooltipLabels: TooltipLabels<RenderLocalizedText>;
  typeLabels: {
    fracture: RenderLocalizedText;
    fractureWater: RenderLocalizedText;
    cave: RenderLocalizedText;
    caveWater: RenderLocalizedText;
  };
  columnHeaders: Record<
    keyof RenderConfig['columnHeaders']['labels'],
    RenderLocalizedText
  >;
  continuation: { prefix: RenderLocalizedText };
  overlap: { label: RenderLocalizedText };
};

/** Sub-items of the lithology annotations (`RenderConfig.labels.lithology`). */
export type LithologyLabelItem =
  | 'depth'
  | 'description'
  | 'dividers'
  /** Bold `geologic_unit` line and italic `aquifer_unit` line. */
  | 'units'
  /** Square of the layer's fill before the depth range. */
  | 'swatch'
  /** Rule above each annotation, as wide as the annotation. */
  | 'rules';

/** Full rendering behaviour configuration. Use `INTERACTIVE_RENDER_CONFIG` or `STATIC_RENDER_CONFIG` as a starting point. */
export type RenderConfig = {
  zoom: boolean;
  pan: boolean;
  /** Initial zoom scale applied on first render (1 = fit all, 2 = start 2× zoomed in). */
  zoomLevel?: number;
  /** Upper bound for zoom scale, enforced for wheel/drag and `zoomBy`/`resetZoom` alike (default 150 = 15000%). */
  maxZoomScale?: number;
  /** Lower bound for zoom scale, enforced for wheel/drag and `zoomBy`/`resetZoom` alike (default 0 = 0%). */
  minZoomScale?: number;
  /** undefined = show all; false or [] = show none; array = show only listed keys */
  tooltips?: TooltipKey[] | false;
  /** Resolved (plain-string) tooltip titles/field labels — see `TooltipLabels`. */
  tooltipLabels: TooltipLabels;
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
    /**
     * Fixed-size pad drawn above the surface as two slabs around the
     * outermost pipe, with break lines at the outer ends (not to scale). The
     * profile's `cement_pad` width and thickness don't change it (they only
     * show in the tooltip).
     */
    cementPad: {
      /** Pad width as a ratio of the construction column width; widened when the pipe opening needs it. */
      widthRatio: number;
      /** Pad height in pixels (constant regardless of zoom). */
      height: number;
    };
    /**
     * Casing shoe: a filled triangle outside each wall where the casing /
     * screen string really ends (not at panel cuts or joints).
     */
    casingShoe: {
      active: boolean;
      /** Triangle leg in pixels (constant regardless of zoom). */
      size: number;
    };
    /**
     * Screen ends: a dashed line across the pipe at the top and base of
     * every screen (not at panel cuts). Styled by `theme.wellScreen`
     * `endStrokeWidth` / `endDasharray`.
     */
    screenEnds: {
      active: boolean;
    };
    surfaceCase: {
      diameterPaddingRatio: number;
    };
    centralizer: {
      /** Half the marker height in pixels (constant regardless of zoom). */
      markerHalfHeight: number;
    };
    /** Current pump + riser layer (`.well` v2.3 `pump_installations`). */
    pump: {
      /** Whether the current pump is drawn. */
      active: boolean;
      /** Pump body height in pixels (constant regardless of zoom); the body ends at `intake_depth`. */
      bodyHeight: number;
      /** Pump body width as a fraction of the casing/screen diameter at the intake. */
      bodyWidthRatio: number;
      /** Riser width as a fraction of the casing diameter, used when `riser_diameter` is absent. */
      riserWidthRatio: number;
    };
  };
  textures?: TexturesConfig;
  constructionLabels: {
    active: boolean;
    /**
     * `left` (default): each label ends `xOffset` px left of its own casing
     * wall. `right`: labels start `xOffset` px right of the construction
     * column, in one aligned column.
     */
    side?: 'left' | 'right';
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
    /** Fine-grained lithology sub-item control; `true` = depth, description and dividers */
    lithology?: boolean | LithologyLabelItem[];
    /**
     * Marks layers and construction items that start above the panel (they
     * continue from the previous one): `↑ {prefix} · from–to` on lithology
     * annotations, a leading `↑` on construction labels.
     */
    continuation: {
      active: boolean;
      prefix: string;
    };
    typeLabels?: {
      fracture?: string;
      fractureWater?: string;
      cave?: string;
      caveWater?: string;
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
  /**
   * Mini-map: the whole well's lithology drawn as a thin column in the
   * panel's left margin, with a window outlining the panel's depth range.
   */
  overview: {
    active: boolean;
    /** Left edge in SVG coordinates. */
    x: number;
    width: number;
    /** Height in pixels; capped at the panel's drawing height. */
    height: number;
  };
  /**
   * Column titles drawn in the panel's top margin, over a rule that sits
   * `construction.cementPad.height` px above the drawing area (clear of the
   * pad). The top margin must hold `height` plus that.
   */
  columnHeaders: {
    active: boolean;
    /** Height of the header row, taken from the top margin. */
    height: number;
    labels: {
      depth: string;
      lithology: string;
      construction: string;
      /** Shown only when lithology annotations are drawn. */
      description: string;
    };
  };
  /** Circled 1-based index on each lithology layer, `F{n}` next to each fracture. */
  markers: {
    lithology: boolean;
    fractures: boolean;
    radius: number;
  };
  /** Band over the depths a panel repeats (`SvgInstance.repeatedTo`). */
  overlap: {
    /** `{range}` is replaced by the repeated depth range, e.g. `116–124 m`. */
    label: string;
  };
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
    reduction: string;
    centralizer: string;
    pump: string;
    cementPad: string;
    conflict: string;
  };
};

/**
 * Descriptor for a single SVG panel managed by `WellRenderer`.
 * @param selector - CSS selector for the `<svg>` element (e.g. `"#well-panel-1"`).
 * @param height - Inner drawing height in pixels (excludes margins).
 * @param width - Inner drawing width in pixels (excludes margins).
 * @param margins - Space reserved around the drawing area for axes and labels.
 */
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
  /**
   * Depth window `[from, to]` (m) drawn in this panel. When every panel has
   * one, `draw()` uses them instead of splitting the depth in proportion to
   * the panel heights, so panels may overlap or skip depths.
   */
  depthRange?: [number, number];
  /**
   * Depth (m) down to which the panel repeats the bottom of the previous
   * one. The repeated band `[depthRange[0], repeatedTo]` is hatched and
   * labelled with `RenderConfig.overlap.label`.
   */
  repeatedTo?: number;
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
  reductionGroup: SvgSelection;
  centralizerGroup: SvgSelection;
  pumpGroup: SvgSelection;
  conflictGroup: SvgSelection;
  highlightsGeologicGroup: SvgSelection;
  highlightsConstructionGroup: SvgSelection;
  highlightsFracturesGroup: SvgSelection;
  overviewGroup: SvgSelection;
  columnHeadersGroup: SvgSelection;
  markersGroup: SvgSelection;
  overlapGroup: SvgSelection;
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
  /** Deepest depth of the whole profile (m); the overview's domain. */
  totalDepth: number;
  /** Bottom of the band repeated from the previous panel, if any. */
  repeatedTo?: number;
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
  locale: 'en' | 'pt';
  /** Full (unfiltered) construction profile — for x-scale domain. */
  constructionData: Constructive;
  groups: DrawGroups;
};

/**
 * Attaches an optional stable render identity to any feature type.
 *
 * **`key` is runtime-only.** It exists solely in memory while the renderer is
 * running and must never be written to a `.well` file. It is not part of the
 * `.well` v2 spec — persisting it would produce a non-conformant file.
 */
export type WithKey<T> = T & { key?: string | number };

/**
 * A `Well` profile where every feature array element may carry an optional `key`.
 *
 * When `key` is present the renderer uses it as the D3 data-join key,
 * giving fully stable DOM identity regardless of depth edits or array reordering.
 * When absent the renderer falls back to coordinate-based keys (`from:to` or
 * `depth:index`).
 *
 * **`key` is runtime-only** — generate it once per feature (e.g.
 * `crypto.randomUUID()`) and keep it in memory across edits, but always strip
 * it before serializing to a `.well` file.
 */
export type RenderableWell = Omit<
  Well,
  | 'lithology'
  | 'fractures'
  | 'caves'
  | 'bore_hole'
  | 'well_case'
  | 'well_screen'
  | 'hole_fill'
  | 'surface_case'
  | 'reduction'
> & {
  lithology: WithKey<Lithology>[];
  fractures: WithKey<Fracture>[];
  caves: WithKey<Cave>[];
  bore_hole: WithKey<BoreHole>[];
  well_case: WithKey<WellCase>[];
  well_screen: WithKey<WellScreen>[];
  hole_fill: WithKey<HoleFill>[];
  surface_case: WithKey<SurfaceCase>[];
  reduction: WithKey<Reduction>[];
};
