// ─── Location objects ─────────────────────────────────────────────────────────

export type WellId = {
  authority: string;
  id: string;
  primary?: boolean;
};

export type LocationProperties = {
  elevation_datum?: string;
  crs?: string;
  lat_precision?: number;
  lng_precision?: number;
  elevation_precision?: number;
  original_crs?: string;
};

export type Location = {
  lat: number;
  lng: number;
  elevation?: number;
  properties?: LocationProperties;
};

// ─── Constructive objects ─────────────────────────────────────────────────────

/** A drilled interval of the borehole. Multiple entries describe a telescoping borehole. */
export type BoreHole = {
  /** Start depth in meters from ground level (0 = surface). */
  from: number;
  /** End depth in meters from ground level. */
  to: number;
  /** Borehole diameter in millimeters. */
  diameter: number;
  /** Free text description of the drilling method used (e.g. `rotary`, `percussion`, `cable_tool`). */
  drilling_method?: string;
};

/** Steel or plastic casing installed inside the borehole. */
export type WellCase = {
  /** Start depth in meters from ground level. */
  from: number;
  /** End depth in meters from ground level. */
  to: number;
  /** Casing material. Recommended: `steel`, `pvc`, `hdpe`, `fiberglass`. Can be free-text. */
  type: string;
  /** Casing outer diameter in millimeters. */
  diameter: number;
};

/** Transition piece connecting two casing or screen sections of different diameters. */
export type Reduction = {
  /** Start depth in meters from ground level. */
  from: number;
  /** End depth in meters from ground level. */
  to: number;
  /** Diameter at the top of the reducer in millimeters. */
  diam_from: number;
  /** Diameter at the bottom of the reducer in millimeters. */
  diam_to: number;
  /** Reducer shape (e.g. `conical`, `stepped`). Can be free-text. */
  type: string;
};

/** Slotted or wire-wound screen section that allows water to enter the well. */
export type WellScreen = {
  /** Start depth in meters from ground level. */
  from: number;
  /** End depth in meters from ground level. */
  to: number;
  /** Screen type. Recommended: `wire_wound`, `bridge_slot`, `louvered`, `pvc_slotted`. Can be free-text. */
  type: string;
  /** Screen outer diameter in millimeters. */
  diameter: number;
  /** Slot opening size in millimeters. */
  screen_slot: number;
};

/** Material placed in the annular space between the casing and the borehole wall. */
export type HoleFill = {
  /** Start depth in meters from ground level. */
  from: number;
  /** End depth in meters from ground level. */
  to: number;
  /** Fill category: `gravel_pack` for filter gravel, `seal` for cement or bentonite. */
  type: 'gravel_pack' | 'seal';
  /** Outer diameter of the filled annulus in millimeters. */
  diameter: number;
  /** Material description (e.g. grain size, material name). */
  description: string;
};

/** Outer protective casing installed near the surface to prevent contamination. */
export type SurfaceCase = {
  /** Start depth in meters from ground level. */
  from: number;
  /** End depth in meters from ground level. */
  to: number;
  /** Casing outer diameter in millimeters. */
  diameter: number;
};

/** Concrete pad installed at ground level (depth 0) around the wellhead. All dimensions in **meters**. */
export type CementPad = {
  /** Pad shape (e.g. `square`, `rectangular`, `circular`). */
  type: string;
  /** Width in meters. */
  width: number;
  /** Thickness in meters. */
  thickness: number;
  /** Length in meters. */
  length: number;
};

// ─── Geologic objects ─────────────────────────────────────────────────────────

/** Lithology texture reference. */
export type Texture = {
  /** The texture code within the declared vocabulary. */
  code: string | number;
  /** Short canonical token or HTTPS URI identifying the vocabulary. Default: `fgdc`. */
  vocabulary?: string;
};

/** Geological description of a depth interval. */
export type Lithology = {
  /** Start depth in meters from ground level. */
  from: number;
  /** End depth in meters from ground level. */
  to: number;
  /** Free-text geological description. */
  description: string;
  /** Representative color as a CSS hex value (e.g. `#f5deb3`). */
  color: string;
  /** Lithology pattern reference. */
  texture: Texture;
  /** Name of the stratigraphic or geologic unit. */
  geologic_unit: string;
  /** Aquifer unit name (e.g. `Pirabas Aquifer`). */
  aquifer_unit: string;
};

/** A discrete fracture or fracture zone intersected by the borehole. */
export type Fracture = {
  /** Depth of the fracture in meters from ground level. */
  depth: number;
  /** Whether the fracture produces water. */
  water_intake: boolean;
  /** Free-text description. */
  description: string;
  /** Whether this fracture belongs to a swarm (closely spaced set of fractures). */
  swarm: boolean;
  /** Azimuth in degrees from geographic north (0–360). */
  azimuth: number;
  /** Dip angle in degrees from horizontal (0–90). */
  dip: number;
  /** One-sigma precision of `depth` in meters. */
  depth_precision?: number;
};

/** A cavity or void zone intersected by the borehole. */
export type Cave = {
  /** Start depth in meters from ground level. */
  from: number;
  /** End depth in meters from ground level. */
  to: number;
  /** Whether the cave produces water. */
  water_intake: boolean;
  /** Free-text description. */
  description: string;
};

// ─── Hydrodynamic event objects ───────────────────────────────────────────────

export type LevelReading = {
  /** Time since step start (or pump shutdown for recovery) in minutes. */
  elapsed: number;
  /** Depth to water surface from ground level in meters. */
  depth: number;
  /** One-sigma precision of `depth`. */
  depth_precision?: number;
  /** Pressure transducer reading in kPa. */
  pressure?: number;
};

export type RecoveryPhase = {
  /** Time-series after pump shutdown. `elapsed` measured from shutdown. */
  readings: LevelReading[];
};

export type PumpingStep = {
  /** Pumping rate in m³/h. */
  rate: number;
  /** One-sigma precision of `rate`. */
  rate_precision?: number;
  /** Duration in minutes. */
  duration?: number;
  /** Time-series during this step. */
  readings?: LevelReading[];
};

export type HydrodynamicEventBase = {
  /** Unique within `hydrodynamic_events`. UUID v4 recommended. */
  id: string;
  /** Event type. */
  type: string;
  /** RFC 3339 datetime with mandatory UTC offset. */
  datetime: string;
  /** Tiebreaker for events sharing the same instant. */
  sequence?: number;
  /** Person or company conducting the measurement or test. */
  operator?: string;
  /** Equipment description. */
  equipment?: string;
  /** Free-text observations. */
  notes?: string;
};

export type SpotMeasurementEvent = HydrodynamicEventBase & {
  type: 'spot_measurement';
  /** Depth to water surface from ground level, in meters. */
  static_level: number;
  static_level_precision?: number;
  measurement_method?: string;
};

export type ConstantRateEvent = HydrodynamicEventBase & {
  type: 'constant_rate';
  static_level?: number;
  static_level_precision?: number;
  steps?: PumpingStep[];
  recovery?: RecoveryPhase;
};

export type StepDrawdownEvent = HydrodynamicEventBase & {
  type: 'step_drawdown';
  static_level?: number;
  static_level_precision?: number;
  steps: PumpingStep[];
  recovery?: RecoveryPhase;
};

export type AirliftEvent = HydrodynamicEventBase & {
  type: 'airlift';
  steps: PumpingStep[];
};

export type RecoveryOnlyEvent = HydrodynamicEventBase & {
  type: 'recovery_only';
  pumping_rate?: number;
  pumping_duration?: number;
  recovery: RecoveryPhase;
};

export type HydrodynamicEvent =
  | SpotMeasurementEvent
  | ConstantRateEvent
  | StepDrawdownEvent
  | AirliftEvent
  | RecoveryOnlyEvent
  | (HydrodynamicEventBase & Record<string, unknown>);

// ─── Aquifer analysis ─────────────────────────────────────────────────────────

export type AquiferAnalysis = {
  id: string;
  datetime: string;
  analyst?: string;
  source_event_ids: string[];
  method?: string;
  static_level?: number;
  static_level_precision?: number;
  static_level_source_id?: string;
  dynamic_level?: number;
  dynamic_level_precision?: number;
  flow_rate?: number;
  flow_rate_precision?: number;
  specific_capacity?: number;
  transmissivity?: number;
  storativity?: number | null;
  hydraulic_conductivity?: number;
  aquifer_thickness?: number;
  jacob_b?: number;
  jacob_c?: number;
  well_efficiency_pct?: number;
  notes?: string;
};

// ─── History log objects ──────────────────────────────────────────────────────

export type Attachment = {
  id: string;
  /** Full HTTPS URL. Relative paths are not permitted. */
  uri: string;
  media_type: string;
  filename?: string;
  description?: string;
  sha256?: string;
};

export type HistoryLogEntry = {
  id: string;
  /** RFC 3339 datetime with mandatory UTC offset. When the logged event occurred. */
  datetime: string;
  /** RFC 3339 datetime with mandatory UTC offset. When this entry was most recently created or edited. */
  updated_at?: string;
  category: string;
  description: string;
  author?: string;
  severity?: string;
  attachments?: Attachment[];
};

// ─── Well root ────────────────────────────────────────────────────────────────

/** Complete static record of a water well. All depths in meters, all diameters in millimeters. */
export type Well = {
  version: number;

  // v2 identity
  '@context'?: string | unknown[] | Record<string, unknown>;
  well_id?: WellId[];
  location?: Location;
  profiles?: string[];

  // Metadata
  /** Classification of the well (e.g. `tubular`, `artesian`, `hand_dug`). */
  well_type?: string;
  /** Well name or local identifier. */
  name?: string;
  /** Name of the drilling company or individual. */
  well_driller?: string;
  /** ISO 8601 date of well completion (YYYY-MM-DD). */
  construction_date?: string;
  /** Free-text observations about the well. */
  obs?: string;

  // v1 deprecated flat coordinates (kept for round-trip compat when reading v1 files)
  /** @deprecated Use location.lat */
  lat?: number;
  /** @deprecated Use location.lng */
  lng?: number;
  /** @deprecated Use location.elevation */
  elevation?: number;

  // Constructive
  bore_hole: BoreHole[];
  well_case: WellCase[];
  reduction: Reduction[];
  well_screen: WellScreen[];
  surface_case: SurfaceCase[];
  hole_fill: HoleFill[];
  cement_pad?: CementPad;

  // Geologic
  lithology: Lithology[];
  fractures: Fracture[];
  caves: Cave[];

  // v2 event and analysis blocks
  hydrodynamic_events?: HydrodynamicEvent[];
  aquifer_analysis?: AquiferAnalysis[];
  history_logs?: HistoryLogEntry[];
};

/** Geologic section of a well (lithology, fractures, caves). */
export type Geologic = {
  lithology: Lithology[];
  fractures: Fracture[];
  caves: Cave[];
};

/** Constructive section of a well (borehole geometry, casings, screens, fills). */
export type Constructive = {
  bore_hole: BoreHole[];
  well_case: WellCase[];
  reduction: Reduction[];
  well_screen: WellScreen[];
  surface_case: SurfaceCase[];
  hole_fill: HoleFill[];
  cement_pad?: CementPad;
};
