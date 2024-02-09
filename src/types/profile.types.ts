export type BoreHole = {
  from: number;
  to: number;
  diameter: number;
  drilling_method?: string;
};

export type WellCase = {
  from: number;
  to: number;
  type: string;
  diameter: number;
};

export type Reduction = {
  from: number;
  to: number;
  diam_from: number;
  diam_to: number;
  type: string;
};

export type WellScreen = {
  from: number;
  to: number;
  type: string;
  diameter: number;
  screen_slot_mm: number;
};

export type HoleFill = {
  from: number;
  to: number;
  type: 'gravel_pack' | 'seal';
  diameter: number;
  description: string;
};

export type SurfaceCase = {
  from: number;
  to: number;
  diameter: number;
};

export type CementPad = {
  type: string;
  width: number;
  thickness: number;
  length: number;
};

export type Lithology = {
  from: number;
  to: number;
  description: string;
  color: string;
  fgdc_texture: string | number;
  geologic_unit: string;
};

export type Fracture = {
  depth: number;
  water_intake: boolean;
  description?: string;
  swarm?: boolean;
  azimuth?: number;
  dip?: number;
};

export type Cave = {
  from: number;
  to: number;
  water_intake: boolean;
  description?: string;
};

export type Profile = {
  name?: string;
  well_driller?: string;
  construction_date?: string;
  lat?: number;
  lng?: number;
  elevation?: number;
  obs?: string;

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
