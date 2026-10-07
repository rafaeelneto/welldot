import type { AttachmentDocumentType } from '../vocab/attachment.vocab';
import type {
  CementPadType,
  CentralizerType,
  ConstructionMaterial,
  DrillingMethod,
} from '../vocab/construction.vocab';
import type { WellPurpose, WellType } from '../vocab/general.vocab';
import type {
  HistoryLogCategory,
  HistoryLogSeverity,
} from '../vocab/history.vocab';
import type {
  AquiferAnalysisMethod,
  MeasurementMethod,
} from '../vocab/hydrodynamic.vocab';
import type {
  DeclaredMethod,
  MaintenanceType,
  MeterType,
  PowerSource,
  PumpType,
  ReadingSource,
} from '../vocab/operation.vocab';
import type {
  ConditionCategory,
  PermitHistoryType,
  PermitType,
  WaterUse,
} from '../vocab/permit.vocab';
import type { OpenVocab } from '../vocab/vocab';
import type {
  SampleType,
  SamplingDevice,
  SamplingMethod,
  SamplingPointType,
} from '../vocab/waterSample.vocab';

// ─── Common types ─────────────────────────────────────────────────────────────

/**
 * A document attached to the well or to one of its records. Since v2.3 it is
 * a common type, allowed at the root (`attachments`) and on `history_logs`,
 * `permits` (and their `history` and condition `fulfillments`),
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
   * What the document is. Since v2.3. Recommended values:
   * {@link DOCUMENT_TYPES}. Non-canonical values SHOULD use the `x-` prefix.
   */
  document_type?: OpenVocab<AttachmentDocumentType>;
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
  /** Drilling method. Recommended values: {@link DRILLING_METHODS}. */
  drilling_method?: OpenVocab<DrillingMethod>;
};

/** Steel or plastic casing installed inside the borehole. */
export type WellCase = {
  /** Start depth in meters from ground level. */
  from: number;
  /** End depth in meters from ground level. */
  to: number;
  /** Casing material. Recommended values: {@link CONSTRUCTION_MATERIALS}. */
  type: OpenVocab<ConstructionMaterial>;
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
  /** Reducer material. Recommended values: {@link CONSTRUCTION_MATERIALS}. */
  type: OpenVocab<ConstructionMaterial>;
};

/** Slotted or wire-wound screen section that allows water to enter the well. */
export type WellScreen = {
  /** Start depth in meters from ground level. */
  from: number;
  /** End depth in meters from ground level. */
  to: number;
  /** Screen material. Recommended values: {@link CONSTRUCTION_MATERIALS}. */
  type: OpenVocab<ConstructionMaterial>;
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
  /** Centralizer type. Recommended values: {@link CENTRALIZER_TYPES}. */
  type: OpenVocab<CentralizerType>;
  /** As-built outer diameter in millimeters. */
  diameter?: number;
  /** Free-text description. */
  description?: string;
};

/** Concrete pad installed at ground level (depth 0) around the wellhead. All dimensions in **meters**. */
export type CementPad = {
  /** Pad material. Recommended values: {@link CEMENT_PAD_TYPES}; other free text (e.g. a shape) is allowed. */
  type: OpenVocab<CementPadType>;
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
  /** Recommended values: {@link MEASUREMENT_METHODS}. */
  measurement_method?: OpenVocab<MeasurementMethod>;
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
  /** Recommended values: {@link AQUIFER_ANALYSIS_METHODS}. */
  method?: OpenVocab<AquiferAnalysisMethod>;
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
  /** Person or company that installed the pump. */
  installed_by?: string;
  /** Person or company that removed the pump. Only meaningful with `removed_at`. */
  removed_by?: string;
  /** Pump type. Recommended values: {@link PUMP_TYPES}. */
  type: OpenVocab<PumpType>;
  /** Power source. Recommended values: {@link POWER_SOURCES}. */
  power_source?: OpenVocab<PowerSource>;
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
  /** Riser pipe material. Recommended values: {@link CONSTRUCTION_MATERIALS}. */
  riser_material?: OpenVocab<ConstructionMaterial>;
  check_valve?: boolean;
  electrical?: PumpElectrical;
  notes?: string;
  /** RFC 3339 instant of the last edit of this record. */
  updated_at?: string;
  /** Pump curves, invoices, photos. */
  attachments?: Attachment[];
};

/** A volume stated in a permit for one period. Since v2.3. */
export type VolumeLimit = {
  /** `daily`, `monthly` or `annual`. Each period appears at most once per permit. */
  period: 'daily' | 'monthly' | 'annual';
  /** Granted volume in m³. Only volumes stated in the document — never derived ones. */
  volume: number;
};

/**
 * Month-by-month grant of a permit. When `monthly_schedule` is present, a
 * month absent from it has no abstraction granted. Since v2.3.
 */
export type MonthlyGrant = {
  /** Month number, 1–12, unique within the schedule. */
  month: number;
  /** Granted flow in m³/h. */
  flow_rate?: number;
  /** Granted daily operating time in hours, 0–24. */
  daily_operating_time?: number;
  /** Days of operation granted in the month. */
  days?: number;
};

/**
 * The record of one condition deadline being met. `due_date` names the
 * deadline fulfilled (absent for an undated condition); fulfillment is late
 * when the local date of `datetime` is after it. Since v2.3.
 */
export type ConditionFulfillment = {
  /** Unique within the condition's `fulfillments` array. UUID v4 recommended. */
  id: string;
  /** RFC 3339 instant the obligation was met. Its local date is compared to `due_date`. */
  datetime: string;
  /** Calendar date (YYYY-MM-DD) of the deadline fulfilled. Absent for undated conditions. */
  due_date?: string;
  description?: string;
  /** Who fulfilled the obligation. */
  author?: string;
  /** `hydrodynamic_events[].id` holding the data that satisfied the obligation. */
  event_id?: string;
  /** `water_samples[].id` that satisfied the obligation (e.g. a water-quality `monitoring` condition). */
  sample_id?: string;
  /** RFC 3339 instant of the last edit of this record. */
  updated_at?: string;
  /** Protocols, reports, receipts. */
  attachments?: Attachment[];
};

/**
 * An obligation (condicionante) of a permit. Deadlines are derived from
 * `first_due` or `due_after`, `recurrence`, `last_due` and `occurrences`;
 * each deadline met is recorded in `fulfillments`. Since v2.3.
 */
export type PermitCondition = {
  /** Unique within the permit's `conditions` array. */
  id: string;
  /** Text of the condition as written in the document. */
  description: string;
  /**
   * Recommended values: {@link CONDITION_CATEGORIES}. Non-canonical values
   * SHOULD use the `x-` prefix.
   */
  category?: OpenVocab<ConditionCategory>;
  /** Calendar date (YYYY-MM-DD) of the first deadline. Mutually exclusive with `due_after`. */
  first_due?: string;
  /** ISO 8601 date duration (e.g. `P90D`) from the permit's start date to the first deadline. */
  due_after?: string;
  /** ISO 8601 date duration between deadlines (e.g. `P6M`). Absent means one-time. */
  recurrence?: string;
  /** Calendar date (YYYY-MM-DD); no deadline is generated after it. */
  last_due?: string;
  /** Maximum number of deadlines, counting the first. */
  occurrences?: number;
  /** Person or team accountable for meeting the obligation. */
  responsible?: string;
  /** Deadlines met, at most one per `due_date`. */
  fulfillments?: ConditionFulfillment[];
};

/**
 * Administrative situation of a permit, as set by the issuing body. Closed
 * vocabulary: `requested` (filed, awaiting decision), `granted` (issued; the
 * date-based status applies), `suspended` (temporarily halted by the
 * authority), `revoked` (cancelled by the authority), `denied` (request
 * refused), `withdrawn` (request or permit given up by the holder). Absent
 * means `granted`. Since v2.3.
 */
export type PermitAdministrativeStatus =
  | 'requested'
  | 'granted'
  | 'suspended'
  | 'revoked'
  | 'denied'
  | 'withdrawn';

/**
 * One step in the administrative life of a permit: filing, process
 * movements, notifications, fees, inspections, decisions. A mutable record.
 * Since v2.3.
 */
export type PermitHistoryEntry = {
  /** Unique within the permit's `history` array. UUID v4 recommended. */
  id: string;
  /** Calendar date (YYYY-MM-DD) the step happened. */
  date: string;
  /**
   * Recommended values: {@link PERMIT_HISTORY_TYPES}. Non-canonical values
   * SHOULD use the `x-` prefix.
   */
  type?: OpenVocab<PermitHistoryType>;
  description: string;
  /** For actionable steps (fee paid, notification answered). Absent means informational. */
  done?: boolean;
  /** Calendar date (YYYY-MM-DD) by which an actionable step must be done. */
  due_date?: string;
  /** RFC 3339 instant of the last edit of this record. */
  updated_at?: string;
  /** Notices, receipts, protocols. */
  attachments?: Attachment[];
};

/**
 * One legal instrument governing abstraction from the well (outorga,
 * dispensa, cadastro), from its request on. A mutable record: the attached
 * document is authoritative. The administrative `status` is stored; the
 * validity status and condition deadlines are derived. A renewal is a new
 * permit whose `supersedes` points to the previous one. Since v2.3.
 */
export type Permit = {
  /** Unique within `permits`. UUID v4 recommended. */
  id: string;
  /**
   * Recommended values: {@link PERMIT_TYPES}. Non-canonical values SHOULD use
   * the `x-` prefix.
   */
  type: OpenVocab<PermitType>;
  /** Issuing body, e.g. `ANA`, `SEMAS-PA`. Same semantics as `well_id.authority`. */
  authority: string;
  /**
   * Identifier of the granted instrument (portaria, license code), preserved
   * verbatim. Absent while the permit is only requested.
   */
  identifier?: string;
  /** Identifier of the request or administrative process (protocolo), preserved verbatim. */
  request_identifier?: string;
  /** Administrative situation. Closed vocabulary. Absent means `granted`. */
  status?: PermitAdministrativeStatus;
  /** Calendar date (YYYY-MM-DD) of issuance. */
  issued_at?: string;
  /** Calendar date (YYYY-MM-DD). Absent means valid from `issued_at`. */
  valid_from?: string;
  /** Calendar date (YYYY-MM-DD). Absent means no fixed expiry. */
  valid_until?: string;
  /** Calendar date (YYYY-MM-DD) a renewal request was filed. */
  renewal_requested_at?: string;
  /** What the abstracted water is for. Recommended values: {@link WATER_USES}. */
  water_use?: OpenVocab<WaterUse>[];
  /** Maximum granted flow in m³/h. */
  flow_rate?: number;
  /** Maximum granted daily operating time in hours, 0–24. */
  daily_operating_time?: number;
  /** Volumes stated in the document. */
  volume_limits?: VolumeLimit[];
  /** Month-by-month grant. */
  monthly_schedule?: MonthlyGrant[];
  /** Obligations (condicionantes). */
  conditions?: PermitCondition[];
  /** Administrative steps (process, notifications, fees). */
  history?: PermitHistoryEntry[];
  /** `permits[].id` of the instrument this one legally replaces. */
  supersedes?: string;
  notes?: string;
  /** RFC 3339 instant of the last edit of this record. */
  updated_at?: string;
  /** The legal document. */
  attachments?: Attachment[];
};

/**
 * One installation of a totalizer (hidrômetro) in the well (installation
 * pattern). Holds device facts only: every register value, including the
 * installation and removal readings, lives in `production`. Since v2.3.
 */
export type Meter = {
  /** Unique within `meters`. UUID v4 recommended. */
  id: string;
  /** RFC 3339 instant when the meter entered service in this well. */
  installed_at: string;
  /** RFC 3339 instant when it left. Absent means currently installed. */
  removed_at?: string;
  /** Person or company that installed the meter. */
  installed_by?: string;
  /** Person or company that removed the meter. Only meaningful with `removed_at`. */
  removed_by?: string;
  /** Meter type. Recommended values: {@link METER_TYPES}. */
  type?: OpenVocab<MeterType>;
  manufacturer?: string;
  model?: string;
  /** Serial number. Links reinstallations of the same unit. */
  serial?: string;
  /** Nominal diameter (DN) in millimeters. */
  nominal_diameter?: number;
  /** Register capacity in m³, used to detect rollover. */
  max_reading?: number;
  notes?: string;
  /** RFC 3339 instant of the last edit of this record. */
  updated_at?: string;
  /** Installation photos, invoices, certificates. */
  attachments?: Attachment[];
};

/** Fields shared by every `production` ledger entry. Since v2.3. */
export type ProductionEntryBase = {
  /** Unique within `production`. UUID v4 recommended. */
  id: string;
  /** `meter_reading` or `declared_volume`. */
  type: string;
  /** `production[].id` of the entry this one retracts (ledger correction). */
  corrects?: string;
  /** Tie-breaker for identical instants, lower first. */
  sequence?: number;
  notes?: string;
};

/** A totalizer register value. Since v2.3. */
export type MeterReading = ProductionEntryBase & {
  type: 'meter_reading';
  /** RFC 3339 instant of the reading. */
  datetime: string;
  /** `meters[].id` of the meter read. */
  meter_id: string;
  /** Register value in m³. Meters reading in liters are converted on input. */
  reading: number;
  /** Recommended values: {@link READING_SOURCES}. */
  source?: OpenVocab<ReadingSource>;
};

/** A volume declared for a period, without a meter. Since v2.3. */
export type DeclaredVolume = ProductionEntryBase & {
  type: 'declared_volume';
  /** RFC 3339 instant the period starts. */
  period_start: string;
  /** RFC 3339 instant the period ends. Later than `period_start`. */
  period_end: string;
  /** Volume in m³. */
  volume: number;
  /**
   * `estimated` (e.g. flow × time; counts only where no meter covers) or
   * `reported` (as declared to a regulator; never added to totals). Absent
   * means `estimated`. Recommended values: {@link DECLARED_METHODS}.
   */
  method?: OpenVocab<DeclaredMethod>;
};

/**
 * One entry of the append-only `production` ledger, discriminated by `type`.
 * Corrected with `corrects`, never edited in place. Since v2.3.
 */
export type ProductionEntry = MeterReading | DeclaredVolume;

/**
 * How the well is intended to run from `effective_from` on. A mutable record;
 * a change of regime is a new entry. An absent field means unknown, never
 * zero. Since v2.3.
 */
export type OperatingRegime = {
  /** Unique within `operating_regime`. UUID v4 recommended. */
  id: string;
  /** RFC 3339 instant the regime takes effect. Unique within the block. */
  effective_from: string;
  /** Flow in m³/h. */
  flow_rate?: number;
  /** Daily operating time in hours, 0–24. */
  daily_operating_time?: number;
  /** Days of operation per week, 1–7. */
  days_per_week?: number;
  notes?: string;
  /** RFC 3339 instant of the last edit of this record. */
  updated_at?: string;
};

/**
 * Operational situation of the well, set by `status_change` history logs.
 * Closed vocabulary: `active` (normal operation), `maintenance` (temporarily
 * out of service for work), `inactive` (out of service, recoverable),
 * `decommissioned` (permanently closed and properly sealed), `abandoned`
 * (left without proper sealing). Since v2.3.
 */
export type WellStatus =
  | 'active'
  | 'maintenance'
  | 'inactive'
  | 'decommissioned'
  | 'abandoned';

// ─── History log objects ──────────────────────────────────────────────────────

export type HistoryLogEntry = {
  id: string;
  /** RFC 3339 datetime with mandatory UTC offset. When the logged event occurred. */
  datetime: string;
  /** RFC 3339 datetime with mandatory UTC offset. When this entry was most recently created or edited. */
  updated_at?: string;
  /** Recommended values: {@link HISTORY_LOG_CATEGORIES}. */
  category: OpenVocab<HistoryLogCategory>;
  description: string;
  author?: string;
  /** Recommended values: {@link HISTORY_LOG_SEVERITIES}. */
  severity?: OpenVocab<HistoryLogSeverity>;
  attachments?: Attachment[];

  // Category-specific fields (since v2.3). MUST be absent on entries of
  // other categories.

  // `maintenance`
  /** Recommended values: {@link MAINTENANCE_TYPES}. */
  maintenance_type?: OpenVocab<MaintenanceType>;
  /** `pump_installations[].id` the task concerns. */
  pump_installation_id?: string;
  /** `meters[].id` the task concerns. */
  meter_id?: string;
  /** `hydrodynamic_events[].id` holding the data produced by the task. */
  event_id?: string;
  /**
   * `water_samples[].id` collected by the task (`maintenance_type:
   * "water_sampling"`).
   */
  sample_id?: string;

  // `status_change`
  /** The well's situation from this entry on. Closed vocabulary. */
  status?: WellStatus;
};

// ─── Water quality objects (since v2.3) ───────────────────────────────────────

/**
 * Instant resolution marker. `day` means only the date is known: the instant
 * is recorded at 00:00 local time and consumers MUST ignore the time of day.
 */
export type TimeResolution = 'day';

/**
 * Identity of a measured parameter. `vocabulary` is `welldot` (the core
 * parameter vocabulary), `cas` (a CAS Registry Number, always the substance
 * itself in mg/L) or an `x-…` custom vocabulary (which then requires `unit`).
 */
export type Parameter = {
  code: string;
  vocabulary: string;
};

/** Where and how a sample was taken. Depths in meters from ground level. */
export type SamplingPoint = {
  /** Recommended values: {@link SAMPLING_POINT_TYPES}. `x-` for others. */
  type: OpenVocab<SamplingPointType>;
  /** Point depth of the sampler intake (m). Mutually exclusive with `from`/`to`. */
  depth?: number;
  /** One-sigma uncertainty of `depth` (m). */
  depth_precision?: number;
  /** Top of the isolated interval (m). */
  from?: number;
  /** Bottom of the isolated interval (m). */
  to?: number;
  /** Recommended values: {@link SAMPLING_DEVICES}. `x-` for others. */
  device?: OpenVocab<SamplingDevice>;
  /** `pump_installations[].id` when sampled at the production pump. */
  pump_installation_id?: string;
};

/** One stabilization reading taken during purging. */
export type PurgeReading = {
  /** Minutes since purge start. */
  elapsed: number;
  parameter: Parameter;
  /** Value in the parameter's canonical unit. */
  value: number;
};

/** Purge performed before sample collection. */
export type Purge = {
  /** Purge duration in minutes. */
  duration?: number;
  /** Purged volume in m³. */
  volume?: number;
  /** Purge flow rate in m³/h. */
  flow_rate?: number;
  /** Field parameters were stabilized before collection. */
  stabilized?: boolean;
  readings?: PurgeReading[];
};

/** Laboratory that received and analyzed the sample. */
export type Laboratory = {
  name: string;
  /** ISO/IEC 17025 (or equivalent) accreditation identifier. */
  accreditation?: string;
  /** Lab report number, preserved as issued. */
  report_number?: string;
  /** Lab batch or work order. */
  batch_id?: string;
  /** The lab's own sample identifier. */
  sample_id?: string;
  /** RFC 3339 instant the sample was received. */
  received_at?: string;
  received_at_resolution?: TimeResolution;
  /** Sample temperature on receipt, °C. */
  received_temperature?: number;
};

/** Filtration applied before analysis. */
export type Filtration = {
  /** Filter pore size in µm (e.g. 0.45). */
  pore_size?: number;
  location?: 'field' | 'lab';
};

/** Data validation by a reviewer. Absent equals `unvalidated`. */
export type ResultValidation = {
  status: 'unvalidated' | 'validated' | 'qualified' | 'rejected';
  /** Code from the validation guideline applied (e.g. `J`, `UJ`, `R`). */
  qualifier?: string;
  /** Guideline used, free text. */
  guideline?: string;
  validated_by?: string;
  /** RFC 3339 instant. */
  validated_at?: string;
};

/** Censoring / estimation qualifier of a result. */
export type ResultQualifier = '<' | '>' | 'not_detected' | 'estimated';

/**
 * One measured result. Exactly one value form (`value`, `presence` or
 * `text`) is present, except `qualifier: "not_detected"` which has none.
 * Numeric fields are in the parameter's canonical unit (the vocabulary unit,
 * or `unit` for `x-` vocabularies).
 */
export type WaterQualityResult = {
  parameter: Parameter;
  value?: number;
  presence?: boolean;
  text?: string;
  qualifier?: ResultQualifier;
  /** UCUM unit. Required for `x-` vocabularies, forbidden otherwise. */
  unit?: string;
  detection_limit?: number;
  quantification_limit?: number;
  /** One-sigma uncertainty. */
  value_precision?: number;
  fraction?: 'total' | 'dissolved' | 'suspended';
  filtration?: Filtration;
  measured_in?: 'field' | 'lab';
  /** Analytical method, e.g. `ISO 7027`, `US EPA 200.8`. */
  method?: string;
  /** RFC 3339 instant of analysis. */
  analyzed_at?: string;
  analyzed_at_resolution?: TimeResolution;
  /** Lab flags as issued, uninterpreted. */
  lab_flags?: string[];
  validation?: ResultValidation;
  notes?: string;
};

/**
 * One water sample and its results. `water_samples` is a ledger: corrected
 * reports and data revalidation are new samples with `corrects`. Since v2.3.
 */
export type WaterSample = {
  id: string;
  /** RFC 3339 instant of collection. */
  datetime: string;
  /** Recommended values: {@link SAMPLE_TYPES}. `x-` for others. */
  sample_type: OpenVocab<SampleType>;
  /** Original sample of a `field_duplicate` or `split_sample`. */
  parent_sample_id?: string;
  /** Tie-break among samples at the same instant. */
  sequence?: number;
  /** Free sampling campaign identifier. */
  campaign?: string;
  /** Recommended values: {@link SAMPLING_METHODS}. */
  sampling_method?: OpenVocab<SamplingMethod>;
  sampling_point?: SamplingPoint;
  purge?: Purge;
  /** `hydrodynamic_events[].id` with the level measured at collection. */
  static_level_event_id?: string;
  collected_by?: string;
  /** Preservation and packaging, free text. */
  preservation?: string;
  /** Chain of custody number. */
  chain_of_custody?: string;
  laboratory?: Laboratory;
  /** `water_samples[].id` of the record this one corrects. */
  corrects?: string;
  notes?: string;
  /** Lab report with `document_type: "lab_report"`. */
  attachments?: Attachment[];
  /** At least one. */
  results: WaterQualityResult[];
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
  /** Construction method of the well. Recommended values: {@link WELL_TYPES} (`artesian` is deprecated since v2.1). */
  well_type?: OpenVocab<WellType>;
  /** Intended use(s) of the well. Recommended values: {@link WELL_PURPOSES}. Since v2.1. */
  well_purpose?: OpenVocab<WellPurpose>[];
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
  /** Legal instruments governing abstraction (outorgas). Since v2.3. */
  permits?: Permit[];
  /** Totalizer (hidrômetro) installation history. Since v2.3. */
  meters?: Meter[];
  /** Append-only ledger of produced water. Since v2.3. */
  production?: ProductionEntry[];
  /** Declared operating regimes, each in force from `effective_from`. Since v2.3. */
  operating_regime?: OperatingRegime[];
  /** Ledger of water samples and their field/lab results. Since v2.3. */
  water_samples?: WaterSample[];
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
  | 'operation'
  | 'water_quality';

/** Per-section visibility, keyed by `SectionKey`. `true` = included. */
export type SectionVisibility = Record<SectionKey, boolean>;
