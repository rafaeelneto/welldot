export type BoreHole = {
  from: number | null;
  to: number | null;
  diameter: number | null;
  drilling_method?: string | null;
};

export type WellCase = {
  from: number | null;
  to: number | null;
  type: string | null;
  diameter: number | null;
};

export type Reduction = {
  from: number | null;
  to: number | null;
  diam_from: number | null;
  diam_to: number | null;
  type: string | null;
};

export type WellScreen = {
  from: number | null;
  to: number | null;
  type: string | null;
  diameter: number | null;
  screen_slot_mm: number | null;
};

export type HoleFill = {
  from: number | null;
  to: number | null;
  type: 'gravel_pack' | 'seal';
  diameter: number | null;
  description: string | null;
};

export type SurfaceCase = {
  from: number | null;
  to: number | null;
  diameter: number | null;
};

export type CementPad = {
  type: string | null;
  width: number | null;
  thickness: number | null;
  length: number | null;
};

export type Lithology = {
  from: number | null;
  to: number | null;
  description: string | null;
  color: string | null;
  fgdc_texture: string | null;
  geologic_unit: string | null;
};

export type Fracture = {
  depth: number | null;
  water_intake: boolean | null;
  description?: string | null;
  swarm?: boolean | null;
  azimuth?: number | null;
  dip?: number | null;
};

export type Cave = {
  from: number | null;
  to: number | null;
  water_intake: boolean | null;
  description?: string | null;
};

export type Profile = {
  name?: string | null;
  well_driller?: string | null;
  construction_date?: string | null;
  lat?: number | null;
  lng?: number | null;
  elevation?: number | null;
  obs?: string | null;

  // Constructive
  bore_hole: BoreHole[];
  well_case: WellCase[];
  reduction: Reduction[];
  well_screen: WellScreen[];
  surface_case: SurfaceCase[];
  hole_fill: HoleFill[];
  cement_pad: CementPad;

  // Geologic
  lithology: Lithology[];
  fractures: Fracture[];
  caves: Cave[];
};

export type Geologic = {
  lithology: Lithology[];
  fractures: Fracture[];
  caves: Cave[];
};

export type Constructive = {
  bore_hole: BoreHole[];
  well_case: WellCase[];
  reduction: Reduction[];
  well_screen: WellScreen[];
  surface_case: SurfaceCase[];
  hole_fill: HoleFill[];
  cement_pad: CementPad;
};
