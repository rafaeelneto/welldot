import { z } from 'zod';
import type { Well } from '../types/well.types';

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
  screen_slot_mm: z.number(),
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

export const LithologySchema = z.object({
  from: z.number(),
  to: z.number(),
  description: z.string(),
  color: z.string(),
  fgdc_texture: z.string(),
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
});

export const CaveSchema = z.object({
  from: z.number(),
  to: z.number(),
  water_intake: z.boolean(),
  description: z.string(),
});

export const WellSchema = z.object({
  well_type: z.string().optional(),
  name: z.string().optional(),
  well_driller: z.string().optional(),
  construction_date: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  elevation: z.number().optional(),
  obs: z.string().optional(),
  bore_hole: z.array(BoreHoleSchema),
  well_case: z.array(WellCaseSchema),
  reduction: z.array(ReductionSchema),
  well_screen: z.array(WellScreenSchema),
  surface_case: z.array(SurfaceCaseSchema),
  hole_fill: z.array(HoleFillSchema),
  cement_pad: CementPadSchema,
  lithology: z.array(LithologySchema),
  fractures: z.array(FractureSchema),
  caves: z.array(CaveSchema),
});

export function parseWell(json: string): Well {
  const raw = JSON.parse(json);
  return WellSchema.parse(raw) as Well;
}
