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
});

export const SpotMeasurementEventSchema = HydrodynamicEventBaseSchema.extend({
  type: z.literal('spot_measurement'),
  static_level: z.number(),
  static_level_precision: z.number().optional(),
  measurement_method: z.string().optional(),
});

export const ConstantRateEventSchema = HydrodynamicEventBaseSchema.extend({
  type: z.literal('constant_rate'),
  static_level: z.number().optional(),
  static_level_precision: z.number().optional(),
  steps: z.array(PumpingStepSchema).optional(),
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

export const AttachmentSchema = z.object({
  id: z.string(),
  uri: z.string().url(),
  media_type: z.string(),
  filename: z.string().optional(),
  description: z.string().optional(),
  sha256: z.string().optional(),
});

export const HistoryLogEntrySchema = z.object({
  id: z.string(),
  datetime: rfc3339(),
  updated_at: rfc3339().optional(),
  category: z.string(),
  description: z.string(),
  author: z.string().optional(),
  severity: z.string().optional(),
  attachments: z.array(AttachmentSchema).optional(),
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
  specific_capacity: z.number().optional(),
  transmissivity: z.number().optional(),
  storativity: z.number().nullable().optional(),
  hydraulic_conductivity: z.number().optional(),
  aquifer_thickness: z.number().optional(),
  jacob_b: z.number().optional(),
  jacob_c: z.number().optional(),
  well_efficiency_pct: z.number().optional(),
  notes: z.string().optional(),
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
    name: z.string().optional(),
    well_driller: z.string().optional(),
    construction_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'construction_date must be YYYY-MM-DD')
      .optional(),
    obs: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    elevation: z.number().optional(),
    bore_hole: z.array(BoreHoleSchema),
    well_case: z.array(WellCaseSchema),
    reduction: z.array(ReductionSchema),
    well_screen: z.array(WellScreenSchema),
    surface_case: z.array(SurfaceCaseSchema),
    hole_fill: z.array(HoleFillSchema),
    cement_pad: CementPadSchema.optional(),
    lithology: z.array(LithologySchema),
    fractures: z.array(FractureSchema),
    caves: z.array(CaveSchema),
    hydrodynamic_events: z.array(HydrodynamicEventSchema).optional(),
    aquifer_analysis: z.array(AquiferAnalysisSchema).optional(),
    history_logs: z.array(HistoryLogEntrySchema).optional(),
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
