import { createDefu } from 'defu';
import { z } from 'zod';
import type { Well } from '../types/well.types';

// ─── defu custom merger ───────────────────────────────────────────────────────
// In createDefu callbacks: obj = defaults object, key = key, value = source value.
// When source has an array, assign it back to obj[key] so defu uses it as-is
// (prevents defu's default array-concatenation behavior).
export const mergeWell = createDefu((obj, key, value) => {
  if (Array.isArray(value)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (obj as any)[key] = value;
    return true;
  }
});

// ─── Datetime helper ──────────────────────────────────────────────────────────
const RFC3339_WITH_OFFSET =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const rfc3339 = () =>
  z
    .string()
    .regex(RFC3339_WITH_OFFSET, 'datetime must be RFC 3339 with UTC offset');

// Calendar date (YYYY-MM-DD): the local civil date at the well site.
const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;
const calendarDate = () =>
  z.string().regex(CALENDAR_DATE, 'date must be YYYY-MM-DD');

// ISO 8601 duration restricted to date components (`PnYnMnWnD`); time
// components (`T…`) are malformed.
const DATE_DURATION = /^P(?=\d)(\d+Y)?(\d+M)?(\d+W)?(\d+D)?$/;
const dateDuration = () =>
  z.string().regex(DATE_DURATION, 'duration must be an ISO 8601 date duration');

// ─── Common schemas ───────────────────────────────────────────────────────────

export const AttachmentSchema = z.object({
  id: z.string(),
  uri: z.string().url(),
  media_type: z.string(),
  document_type: z.string().optional(),
  filename: z.string().optional(),
  description: z.string().optional(),
  sha256: z.string().optional(),
});

// ─── Location schemas ─────────────────────────────────────────────────────────

export const WellIdSchema = z.object({
  authority: z.string(),
  id: z.string(),
  primary: z.boolean().optional(),
});

export const LocationPropertiesSchema = z.object({
  elevation_datum: z.string().optional(),
  crs: z.string().optional(),
  lat_precision: z.number().optional(),
  lng_precision: z.number().optional(),
  elevation_precision: z.number().optional(),
  original_crs: z.string().optional(),
});

export const LocationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  elevation: z.number().optional(),
  properties: LocationPropertiesSchema.optional(),
});

// ─── Constructive schemas ─────────────────────────────────────────────────────

export const BoreHoleSchema = z.object({
  from: z.number(),
  to: z.number(),
  diameter: z.number(),
  drilling_method: z.string().optional(),
});

export const WellCaseSchema = z.object({
  from: z.number(),
  to: z.number(),
  type: z.string(),
  diameter: z.number(),
});

export const ReductionSchema = z.object({
  from: z.number(),
  to: z.number(),
  diam_from: z.number(),
  diam_to: z.number(),
  type: z.string(),
});

export const WellScreenSchema = z.object({
  from: z.number(),
  to: z.number(),
  type: z.string(),
  diameter: z.number(),
  screen_slot: z.number(),
});

export const HoleFillSchema = z.object({
  from: z.number(),
  to: z.number(),
  type: z.enum(['gravel_pack', 'seal']),
  diameter: z.number(),
  description: z.string(),
});

export const SurfaceCaseSchema = z.object({
  from: z.number(),
  to: z.number(),
  diameter: z.number(),
});

export const CentralizerSchema = z.object({
  from: z.number(),
  to: z.number(),
  spacing: z.number().positive().optional(),
  type: z.string(),
  diameter: z.number().optional(),
  description: z.string().optional(),
});

export const CementPadSchema = z.object({
  type: z.string(),
  width: z.number(),
  thickness: z.number(),
  length: z.number(),
});

// ─── Geologic schemas ─────────────────────────────────────────────────────────

export const TextureSchema = z.object({
  code: z.union([z.string(), z.number()]),
  vocabulary: z.string().optional(),
});

export const LithologySchema = z.object({
  from: z.number(),
  to: z.number(),
  description: z.string(),
  color: z.string(),
  texture: TextureSchema,
  geologic_unit: z.string(),
  aquifer_unit: z.string(),
});

export const FractureSchema = z.object({
  depth: z.number(),
  water_intake: z.boolean(),
  description: z.string(),
  swarm: z.boolean(),
  azimuth: z.number(),
  dip: z.number(),
  depth_precision: z.number().optional(),
});

export const CaveSchema = z.object({
  from: z.number(),
  to: z.number(),
  water_intake: z.boolean(),
  description: z.string(),
});

// ─── Hydrodynamic event schemas ───────────────────────────────────────────────

export const LevelReadingSchema = z.object({
  elapsed: z.number(),
  depth: z.number(),
  depth_precision: z.number().optional(),
  pressure: z.number().optional(),
});

export const RecoveryPhaseSchema = z.object({
  readings: z.array(LevelReadingSchema),
});

export const PumpingStepSchema = z.object({
  rate: z.number(),
  rate_precision: z.number().optional(),
  duration: z.number().optional(),
  readings: z.array(LevelReadingSchema).optional(),
});

export const HydrodynamicEventBaseSchema = z.object({
  id: z.string(),
  type: z.string(),
  datetime: rfc3339(),
  sequence: z.number().int().optional(),
  operator: z.string().optional(),
  equipment: z.string().optional(),
  notes: z.string().optional(),
  corrects: z.string().optional(),
  attachments: z.array(AttachmentSchema).optional(),
});

export const SpotMeasurementEventSchema = HydrodynamicEventBaseSchema.extend({
  type: z.literal('spot_measurement'),
  static_level: z.number(),
  static_level_precision: z.number().optional(),
  measurement_method: z.string().optional(),
  steps: z.array(PumpingStepSchema).max(1).optional(),
  recovery: RecoveryPhaseSchema.optional(),
});

export const ConstantRateEventSchema = HydrodynamicEventBaseSchema.extend({
  type: z.literal('constant_rate'),
  static_level: z.number().optional(),
  static_level_precision: z.number().optional(),
  steps: z.tuple([PumpingStepSchema]).optional(),
  recovery: RecoveryPhaseSchema.optional(),
});

export const StepDrawdownEventSchema = HydrodynamicEventBaseSchema.extend({
  type: z.literal('step_drawdown'),
  static_level: z.number().optional(),
  static_level_precision: z.number().optional(),
  steps: z.array(PumpingStepSchema),
  recovery: RecoveryPhaseSchema.optional(),
});

export const AirliftEventSchema = HydrodynamicEventBaseSchema.extend({
  type: z.literal('airlift'),
  steps: z.array(PumpingStepSchema),
  recovery: RecoveryPhaseSchema.optional(),
});

export const RecoveryOnlyEventSchema = HydrodynamicEventBaseSchema.extend({
  type: z.literal('recovery_only'),
  pumping_rate: z.number().optional(),
  pumping_duration: z.number().optional(),
  recovery: RecoveryPhaseSchema,
});

export const HydrodynamicEventSchema = z
  .discriminatedUnion('type', [
    SpotMeasurementEventSchema,
    ConstantRateEventSchema,
    StepDrawdownEventSchema,
    AirliftEventSchema,
    RecoveryOnlyEventSchema,
  ])
  .or(HydrodynamicEventBaseSchema.passthrough());

// ─── Aquifer analysis + history log schemas ───────────────────────────────────

export const WellStatusSchema = z.enum([
  'active',
  'maintenance',
  'inactive',
  'decommissioned',
  'abandoned',
]);

export const HistoryLogEntrySchema = z.object({
  id: z.string(),
  datetime: rfc3339(),
  updated_at: rfc3339().optional(),
  category: z.string(),
  description: z.string(),
  author: z.string().optional(),
  severity: z.string().optional(),
  attachments: z.array(AttachmentSchema).optional(),
  maintenance_type: z.string().optional(),
  pump_installation_id: z.string().optional(),
  meter_id: z.string().optional(),
  status: WellStatusSchema.optional(),
  event_id: z.string().optional(),
  sample_id: z.string().optional(),
});

export const AquiferAnalysisSchema = z.object({
  id: z.string(),
  datetime: rfc3339(),
  analyst: z.string().optional(),
  source_event_ids: z.array(z.string()),
  method: z.string().optional(),
  static_level: z.number().optional(),
  static_level_precision: z.number().optional(),
  static_level_source_id: z.string().optional(),
  dynamic_level: z.number().optional(),
  dynamic_level_precision: z.number().optional(),
  flow_rate: z.number().optional(),
  flow_rate_precision: z.number().optional(),
  max_flow_rate: z.number().optional(),
  max_flow_rate_precision: z.number().optional(),
  max_flow_rate_basis: z.string().optional(),
  specific_capacity: z.number().optional(),
  transmissivity: z.number().optional(),
  storativity: z.number().nullable().optional(),
  hydraulic_conductivity: z.number().optional(),
  aquifer_thickness: z.number().optional(),
  jacob_b: z.number().optional(),
  jacob_c: z.number().optional(),
  well_efficiency_pct: z.number().optional(),
  notes: z.string().optional(),
  attachments: z.array(AttachmentSchema).optional(),
});

// ─── Operational schemas ──────────────────────────────────────────────────────

export const PumpElectricalSchema = z.object({
  voltage: z.number().nonnegative().optional(),
  phases: z.union([z.literal(1), z.literal(3)]).optional(),
  cable_section: z.number().nonnegative().optional(),
  cable_length: z.number().nonnegative().optional(),
});

export const PumpInstallationSchema = z.object({
  id: z.string(),
  installed_at: rfc3339(),
  removed_at: rfc3339().optional(),
  installed_by: z.string().optional(),
  removed_by: z.string().optional(),
  type: z.string(),
  power_source: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serial: z.string().optional(),
  intake_depth: z.number().nonnegative().optional(),
  rated_flow_rate: z.number().nonnegative().optional(),
  rated_head: z.number().nonnegative().optional(),
  rated_power: z.number().nonnegative().optional(),
  stages: z.number().int().positive().optional(),
  riser_diameter: z.number().nonnegative().optional(),
  riser_material: z.string().optional(),
  check_valve: z.boolean().optional(),
  electrical: PumpElectricalSchema.optional(),
  notes: z.string().optional(),
  updated_at: rfc3339().optional(),
  attachments: z.array(AttachmentSchema).optional(),
});

export const VolumeLimitSchema = z.object({
  period: z.enum(['daily', 'monthly', 'annual']),
  volume: z.number().nonnegative(),
});

export const MonthlyGrantSchema = z.object({
  month: z.number().int().min(1).max(12),
  flow_rate: z.number().nonnegative().optional(),
  daily_operating_time: z.number().nonnegative().optional(),
  days: z.number().int().min(0).max(31).optional(),
});

export const ConditionFulfillmentSchema = z.object({
  id: z.string(),
  datetime: rfc3339(),
  due_date: calendarDate().optional(),
  description: z.string().optional(),
  author: z.string().optional(),
  event_id: z.string().optional(),
  sample_id: z.string().optional(),
  updated_at: rfc3339().optional(),
  attachments: z.array(AttachmentSchema).optional(),
});

export const PermitConditionSchema = z.object({
  id: z.string(),
  description: z.string(),
  category: z.string().optional(),
  first_due: calendarDate().optional(),
  due_after: dateDuration().optional(),
  recurrence: dateDuration().optional(),
  last_due: calendarDate().optional(),
  occurrences: z.number().int().positive().optional(),
  responsible: z.string().optional(),
  fulfillments: z.array(ConditionFulfillmentSchema).optional(),
});

export const PermitAdministrativeStatusSchema = z.enum([
  'requested',
  'granted',
  'suspended',
  'revoked',
  'denied',
  'withdrawn',
]);

export const PermitHistoryEntrySchema = z.object({
  id: z.string(),
  date: calendarDate(),
  type: z.string().optional(),
  description: z.string(),
  done: z.boolean().optional(),
  due_date: calendarDate().optional(),
  updated_at: rfc3339().optional(),
  attachments: z.array(AttachmentSchema).optional(),
});

export const PermitSchema = z.object({
  id: z.string(),
  type: z.string(),
  authority: z.string(),
  identifier: z.string().optional(),
  request_identifier: z.string().optional(),
  status: PermitAdministrativeStatusSchema.optional(),
  issued_at: calendarDate().optional(),
  valid_from: calendarDate().optional(),
  valid_until: calendarDate().optional(),
  renewal_requested_at: calendarDate().optional(),
  water_use: z.array(z.string()).optional(),
  flow_rate: z.number().nonnegative().optional(),
  daily_operating_time: z.number().nonnegative().optional(),
  volume_limits: z.array(VolumeLimitSchema).optional(),
  monthly_schedule: z.array(MonthlyGrantSchema).optional(),
  conditions: z.array(PermitConditionSchema).optional(),
  history: z.array(PermitHistoryEntrySchema).optional(),
  supersedes: z.string().optional(),
  notes: z.string().optional(),
  updated_at: rfc3339().optional(),
  attachments: z.array(AttachmentSchema).optional(),
});

export const MeterSchema = z.object({
  id: z.string(),
  installed_at: rfc3339(),
  removed_at: rfc3339().optional(),
  installed_by: z.string().optional(),
  removed_by: z.string().optional(),
  type: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serial: z.string().optional(),
  nominal_diameter: z.number().nonnegative().optional(),
  max_reading: z.number().positive().optional(),
  notes: z.string().optional(),
  updated_at: rfc3339().optional(),
  attachments: z.array(AttachmentSchema).optional(),
});

export const ProductionEntryBaseSchema = z.object({
  id: z.string(),
  type: z.string(),
  corrects: z.string().optional(),
  sequence: z.number().int().optional(),
  notes: z.string().optional(),
});

export const MeterReadingSchema = ProductionEntryBaseSchema.extend({
  type: z.literal('meter_reading'),
  datetime: rfc3339(),
  meter_id: z.string(),
  reading: z.number().nonnegative(),
  source: z.string().optional(),
});

export const DeclaredVolumeSchema = ProductionEntryBaseSchema.extend({
  type: z.literal('declared_volume'),
  period_start: rfc3339(),
  period_end: rfc3339(),
  volume: z.number().nonnegative(),
  method: z.string().optional(),
});

const PRODUCTION_TYPES = ['meter_reading', 'declared_volume'];

// Unknown (`x-`) entry types fall back to the base schema with passthrough;
// known types must satisfy their own schema.
export const ProductionEntrySchema = z
  .discriminatedUnion('type', [MeterReadingSchema, DeclaredVolumeSchema])
  .or(
    ProductionEntryBaseSchema.passthrough().refine(
      e => !PRODUCTION_TYPES.includes(e.type),
      { message: 'malformed production entry' },
    ),
  );

export const OperatingRegimeSchema = z.object({
  id: z.string(),
  effective_from: rfc3339(),
  flow_rate: z.number().nonnegative().optional(),
  daily_operating_time: z.number().min(0).max(24).optional(),
  days_per_week: z.number().int().min(1).max(7).optional(),
  notes: z.string().optional(),
  updated_at: rfc3339().optional(),
});

// ─── Water quality schemas (since v2.3) ───────────────────────────────────────

// `welldot`, `cas` or a custom `x-…` vocabulary.
const PARAMETER_VOCABULARY = /^(welldot|cas|x-.+)$/;

export const ParameterSchema = z.object({
  code: z.string().min(1),
  vocabulary: z
    .string()
    .regex(PARAMETER_VOCABULARY, 'vocabulary must be welldot, cas or x-…'),
});

export const TimeResolutionSchema = z.literal('day');

export const SamplingPointSchema = z
  .object({
    type: z.string(),
    depth: z.number().nonnegative().optional(),
    depth_precision: z.number().nonnegative().optional(),
    from: z.number().nonnegative().optional(),
    to: z.number().nonnegative().optional(),
    device: z.string().optional(),
    pump_installation_id: z.string().optional(),
  })
  .refine(
    p =>
      !(p.depth !== undefined && (p.from !== undefined || p.to !== undefined)),
    { message: 'depth and from/to are mutually exclusive' },
  );

export const PurgeReadingSchema = z.object({
  elapsed: z.number().nonnegative(),
  parameter: ParameterSchema,
  value: z.number(),
});

export const PurgeSchema = z.object({
  duration: z.number().nonnegative().optional(),
  volume: z.number().nonnegative().optional(),
  flow_rate: z.number().nonnegative().optional(),
  stabilized: z.boolean().optional(),
  readings: z.array(PurgeReadingSchema).optional(),
});

export const LaboratorySchema = z.object({
  name: z.string(),
  accreditation: z.string().optional(),
  report_number: z.string().optional(),
  batch_id: z.string().optional(),
  sample_id: z.string().optional(),
  received_at: rfc3339().optional(),
  received_at_resolution: TimeResolutionSchema.optional(),
  received_temperature: z.number().optional(),
});

export const FiltrationSchema = z.object({
  pore_size: z.number().positive().optional(),
  location: z.enum(['field', 'lab']).optional(),
});

export const ResultValidationSchema = z.object({
  status: z.enum(['unvalidated', 'validated', 'qualified', 'rejected']),
  qualifier: z.string().optional(),
  guideline: z.string().optional(),
  validated_by: z.string().optional(),
  validated_at: rfc3339().optional(),
});

export const ResultQualifierSchema = z.enum([
  '<',
  '>',
  'not_detected',
  'estimated',
]);

export const WaterQualityResultSchema = z
  .object({
    parameter: ParameterSchema,
    value: z.number().optional(),
    presence: z.boolean().optional(),
    text: z.string().optional(),
    qualifier: ResultQualifierSchema.optional(),
    unit: z.string().min(1).optional(),
    detection_limit: z.number().nonnegative().optional(),
    quantification_limit: z.number().nonnegative().optional(),
    value_precision: z.number().nonnegative().optional(),
    fraction: z.enum(['total', 'dissolved', 'suspended']).optional(),
    filtration: FiltrationSchema.optional(),
    measured_in: z.enum(['field', 'lab']).optional(),
    method: z.string().optional(),
    analyzed_at: rfc3339().optional(),
    analyzed_at_resolution: TimeResolutionSchema.optional(),
    lab_flags: z.array(z.string()).optional(),
    validation: ResultValidationSchema.optional(),
    notes: z.string().optional(),
  })
  .superRefine((r, ctx) => {
    const forms = [r.value, r.presence, r.text].filter(
      v => v !== undefined,
    ).length;
    if (r.qualifier === 'not_detected') {
      if (forms !== 0)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'not_detected results carry no value form',
        });
    } else if (forms !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'result must have exactly one of value, presence or text',
      });
    } else if (r.qualifier !== undefined && r.value === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `qualifier ${r.qualifier} requires a numeric value`,
      });
    }
    const custom = r.parameter.vocabulary.startsWith('x-');
    if (custom && r.unit === undefined)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['unit'],
        message: 'unit is required for x- vocabularies',
      });
    if (!custom && r.unit !== undefined)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['unit'],
        message: 'unit is forbidden for welldot and cas parameters',
      });
  });

export const WaterSampleSchema = z.object({
  id: z.string(),
  datetime: rfc3339(),
  sample_type: z.string(),
  parent_sample_id: z.string().optional(),
  sequence: z.number().int().optional(),
  campaign: z.string().optional(),
  sampling_method: z.string().optional(),
  sampling_point: SamplingPointSchema.optional(),
  purge: PurgeSchema.optional(),
  static_level_event_id: z.string().optional(),
  collected_by: z.string().optional(),
  preservation: z.string().optional(),
  chain_of_custody: z.string().optional(),
  laboratory: LaboratorySchema.optional(),
  corrects: z.string().optional(),
  notes: z.string().optional(),
  attachments: z.array(AttachmentSchema).optional(),
  results: z.array(WaterQualityResultSchema).min(1),
});

// ─── Well schema ──────────────────────────────────────────────────────────────

export const WellSchema = z
  .object({
    version: z.number().int(),
    '@context': z
      .union([z.string(), z.array(z.unknown()), z.record(z.unknown())])
      .optional(),
    well_id: z.array(WellIdSchema).optional(),
    location: LocationSchema.optional(),
    profiles: z
      .array(
        z
          .string()
          .url()
          .refine(u => u.startsWith('https://'), {
            message: 'profiles must be HTTPS URLs',
          }),
      )
      .optional(),
    well_type: z.string().optional(),
    well_purpose: z.array(z.string()).optional(),
    name: z.string().optional(),
    well_driller: z.string().optional(),
    construction_date: z
      .string()
      .regex(CALENDAR_DATE, 'construction_date must be YYYY-MM-DD')
      .optional(),
    obs: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    elevation: z.number().optional(),
    well_depth: z.number().optional(),
    bore_hole: z.array(BoreHoleSchema),
    well_case: z.array(WellCaseSchema),
    reduction: z.array(ReductionSchema),
    well_screen: z.array(WellScreenSchema),
    surface_case: z.array(SurfaceCaseSchema),
    hole_fill: z.array(HoleFillSchema),
    centralizers: z.array(CentralizerSchema).optional(),
    cement_pad: CementPadSchema.optional(),
    lithology: z.array(LithologySchema),
    fractures: z.array(FractureSchema),
    caves: z.array(CaveSchema),
    hydrodynamic_events: z.array(HydrodynamicEventSchema).optional(),
    aquifer_analysis: z.array(AquiferAnalysisSchema).optional(),
    history_logs: z.array(HistoryLogEntrySchema).optional(),
    attachments: z.array(AttachmentSchema).optional(),
    pump_installations: z.array(PumpInstallationSchema).optional(),
    permits: z.array(PermitSchema).optional(),
    meters: z.array(MeterSchema).optional(),
    production: z.array(ProductionEntrySchema).optional(),
    operating_regime: z.array(OperatingRegimeSchema).optional(),
    water_samples: z.array(WaterSampleSchema).optional(),
  })
  .passthrough();

// ─── parseWell ────────────────────────────────────────────────────────────────

function normalizeV1Fields(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...raw };

  // v1 is treated as v2-equivalent after normalization
  out.version = 2;

  // bole_hole → bore_hole (v1 typo compatibility)
  if ('bole_hole' in out && !('bore_hole' in out)) {
    out.bore_hole = out.bole_hole;
    delete out.bole_hole;
  }

  // lat/lng/elevation → location object
  if (!('location' in out)) {
    const lat = out.lat as number | undefined;
    const lng = out.lng as number | undefined;
    const elevation = out.elevation as number | undefined;
    if (lat !== undefined && lng !== undefined) {
      out.location = {
        lat,
        lng,
        ...(elevation !== undefined && { elevation }),
      };
    }
  }

  // diam_pol (inches) → diameter (mm) on constructive arrays
  for (const key of [
    'bore_hole',
    'well_case',
    'well_screen',
    'surface_case',
    'hole_fill',
  ]) {
    const items = out[key];
    if (Array.isArray(items)) {
      const hasDiamPol = (items as Record<string, unknown>[]).some(
        item => 'diam_pol' in item,
      );
      if (hasDiamPol) {
        out[key] = (items as Record<string, unknown>[]).map(item => {
          const { diam_pol, ...rest } = item;
          return { ...rest, diameter: ((diam_pol as number) || 0) * 25.4 };
        });
      }
    }
  }

  // fgdc_texture → texture on each lithology entry
  if (Array.isArray(out.lithology)) {
    out.lithology = (out.lithology as Record<string, unknown>[]).map(item => {
      if ('fgdc_texture' in item && !('texture' in item)) {
        const { fgdc_texture, ...rest } = item;
        return { ...rest, texture: { code: fgdc_texture, vocabulary: 'fgdc' } };
      }
      return item;
    });
  }

  // screen_slot_mm → screen_slot on each well_screen entry
  if (Array.isArray(out.well_screen)) {
    out.well_screen = (out.well_screen as Record<string, unknown>[]).map(
      item => {
        if ('screen_slot_mm' in item && !('screen_slot' in item)) {
          const { screen_slot_mm, ...rest } = item;
          return { ...rest, screen_slot: screen_slot_mm };
        }
        return item;
      },
    );
  }

  return out;
}

export function parseWell(json: string): Well {
  const raw = JSON.parse(json) as Record<string, unknown>;
  const version = raw.version;

  if (version !== undefined && typeof version === 'number') {
    if (version !== 1 && version !== 2) {
      throw new Error(`Unsupported .well format version: ${version}`);
    }
    if (version === 1) {
      const normalized = normalizeV1Fields(raw);
      return mergeWell(
        WellSchema.parse(normalized) as Well,
        normalized,
      ) as Well;
    }
  } else if (version !== undefined) {
    throw new Error(`Unsupported .well format version: ${String(version)}`);
  } else {
    // version absent — normalize to v2
    raw.version = 2;
  }

  // version === 2 (explicit or normalized from absent)
  return mergeWell(WellSchema.parse(raw) as Well, raw) as Well;
}
