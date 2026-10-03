// ─── Common types ─────────────────────────────────────────────────────────────

/**
 * A document attached to the well or to one of its records. Since v2.3 it is
 * a common type, allowed at the root (`attachments`) and on `history_logs`,
 * `pump_installations`, `hydrodynamic_events` and `aquifer_analysis` entries.
 */
export type Attachment = {
  /** Unique within its owning `attachments` array. UUID v4 recommended. */
  id: string;
  /** Full HTTPS URL. Relative paths are not permitted. */
  uri: string;
  /** MIME type (e.g. `application/pdf`, `image/jpeg`). */
  media_type: string;
  /**
   * What the document is. Since v2.3. Recommended: `drilling_report`,
   * `as_built_drawing`, `registry_record`, `photo`, `permit_document`,
   * `condition_evidence`, `pump_curve`, `field_sheet`, `test_report`,
   * `lab_report`, `invoice`. Non-canonical values SHOULD use the `x-` prefix.
   */
  document_type?: string;
  /** Original filename for display. */
  filename?: string;
  /** Caption or content description. */
  description?: string;
  /** SHA-256 of the file, lowercase hex. */
  sha256?: string;
};

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

/**
 * Centralizers clamped to a casing or screen string over a depth interval.
 * `from === to` denotes a single centralizer. Positions are derived from
 * `spacing`; the count is never stored.
 */
export type Centralizer = {
  /** Start depth in meters from ground level. */
  from: number;
  /** End depth in meters from ground level. */
  to: number;
  /** Spacing between consecutive centralizers in meters. May be omitted when unknown. */
  spacing?: number;
  /** Centralizer type. Recommended: `spring_bow`, `rigid`, `semi_rigid`, `polymer`. Can be free-text. */
  type: string;
  /** As-built outer diameter in millimeters. */
  diameter?: number;
  /** Free-text description. */
  description?: string;
};

/** Concrete pad installed at ground level (depth 0) around the wellhead. All dimensions in **meters**. */
export type CementPad = {
  /** Free text description of the pad, typically its material (e.g. `concrete`) but may also describe its shape (e.g. `circular`) or both. */
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
  /**
   * `hydrodynamic_events[].id` of the event this one retracts. Since v2.3.
   * A retracted event stays in the file but is excluded from every derivation.
   */
  corrects?: string;
  /** Field sheets, logger exports. Since v2.3. */
  attachments?: Attachment[];
};

export type SpotMeasurementEvent = HydrodynamicEventBase & {
  type: 'spot_measurement';
  /** Depth to water surface from ground level, in meters. */
  static_level: number;
  static_level_precision?: number;
  measurement_method?: string;
  /** At most one step — an informal brief pump observation, not a controlled test. */
  steps?: PumpingStep[];
  recovery?: RecoveryPhase;
};

export type ConstantRateEvent = HydrodynamicEventBase & {
  type: 'constant_rate';
  static_level?: number;
  static_level_precision?: number;
  /** Exactly one entry if present. A second step would make this a step_drawdown. */
  steps?: [PumpingStep];
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
  recovery?: RecoveryPhase;
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
  max_flow_rate?: number;
  max_flow_rate_precision?: number;
  max_flow_rate_basis?: string;
  specific_capacity?: number;
  transmissivity?: number;
  storativity?: number | null;
  hydraulic_conductivity?: number;
  aquifer_thickness?: number;
  jacob_b?: number;
  jacob_c?: number;
  well_efficiency_pct?: number;
  notes?: string;
  /** Interpretation reports. Since v2.3. */
  attachments?: Attachment[];
};

// ─── Operational objects ──────────────────────────────────────────────────────

/** Electrical data of a pump installation. All fields optional. Since v2.3. */
export type PumpElectrical = {
  /** Supply voltage in volts. */
  voltage?: number;
  /** Number of phases: `1` or `3`. */
  phases?: 1 | 3;
  /** Power cable cross-section in mm². */
  cable_section?: number;
  /** Power cable length in meters. */
  cable_length?: number;
};

/**
 * One installation of a pump in the well (installation pattern). A unit pulled
 * and reinstalled gets a new entry with the same `serial`. The current pump is
 * the entry without `removed_at`. Since v2.3.
 */
export type PumpInstallation = {
  /** Unique within `pump_installations`. UUID v4 recommended. */
  id: string;
  /** RFC 3339 instant when the pump entered service in this well. */
  installed_at: string;
  /** RFC 3339 instant when it left. Absent means currently installed. */
  removed_at?: string;
  /** Pump type. Recommended: `submersible`, `vertical_turbine`, `jet`, `progressive_cavity`, `hand_pump`, `compressor_airlift`. */
  type: string;
  /** Power source. Recommended: `grid`, `solar`, `diesel`, `hybrid`. */
  power_source?: string;
  manufacturer?: string;
  model?: string;
  /** Serial number. Links reinstallations of the same unit. */
  serial?: string;
  /** Depth of the pump intake in meters from ground level. */
  intake_depth?: number;
  /** Nameplate duty-point flow in m³/h. */
  rated_flow_rate?: number;
  /** Nameplate duty-point head in meters. */
  rated_head?: number;
  /** Motor power in kW. */
  rated_power?: number;
  /** Number of stages. */
  stages?: number;
  /** Riser pipe as-built outer diameter in millimeters. */
  riser_diameter?: number;
  /** Riser pipe material. Same vocabulary as `well_case.type`. */
  riser_material?: string;
  check_valve?: boolean;
  electrical?: PumpElectrical;
  notes?: string;
  /** RFC 3339 instant of the last edit of this record. */
  updated_at?: string;
  /** Pump curves, invoices, photos. */
  attachments?: Attachment[];
};

// ─── History log objects ──────────────────────────────────────────────────────

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
  /** Construction method of the well (e.g. `tubular`, `hand_dug`, `horizontal`). `artesian` is deprecated since v2.1. */
  well_type?: string;
  /** Intended use(s) of the well (e.g. `production`, `monitoring`, `piezometer`). Since v2.1. */
  well_purpose?: string[];
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
  /** The well's current usable depth in meters from ground level, as measured or reported. May be less than the deepest constructive element (see `bore_hole`) due to siltation, debris, or partial backfill. */
  well_depth?: number;
  bore_hole: BoreHole[];
  well_case: WellCase[];
  reduction: Reduction[];
  well_screen: WellScreen[];
  surface_case: SurfaceCase[];
  hole_fill: HoleFill[];
  /** Since v2.1. */
  centralizers?: Centralizer[];
  cement_pad?: CementPad;

  // Geologic
  lithology: Lithology[];
  fractures: Fracture[];
  caves: Cave[];

  // v2 event and analysis blocks
  hydrodynamic_events?: HydrodynamicEvent[];
  aquifer_analysis?: AquiferAnalysis[];
  history_logs?: HistoryLogEntry[];

  // v2.3 operational blocks
  /** Documents about the well as a whole, not tied to any record. Since v2.3. */
  attachments?: Attachment[];
  /** Pump installation history. Since v2.3. */
  pump_installations?: PumpInstallation[];
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
  centralizers?: Centralizer[];
  cement_pad?: CementPad;
};

/** Top-level grouping of a well's fields, used to selectively redact sections when sharing/exporting. */
export type SectionKey =
  | 'general'
  | 'constructive'
  | 'geology'
  | 'hydrodynamic'
  | 'history'
  | 'operation';

/** Per-section visibility, keyed by `SectionKey`. `true` = included. */
export type SectionVisibility = Record<SectionKey, boolean>;
