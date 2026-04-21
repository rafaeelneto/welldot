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
  screen_slot_mm: number;
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
  /** Texture code per the FGDC Digital Cartographic Standard for Geologic Map Symbolization. */
  fgdc_texture: string;
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

/** Complete static record of a water well. All depths in meters, all diameters in millimeters. */
export type Well = {
  // Metadata
  /** Classification of the well (e.g. `tubular`, `artesian`, `hand_dug`). */
  well_type?: string;
  /** Well name or local identifier. */
  name?: string;
  /** Name of the drilling company or individual. */
  well_driller?: string;
  /** ISO 8601 date of well completion (YYYY-MM-DD). */
  construction_date?: string;
  /** Latitude in decimal degrees (WGS84). */
  lat?: number;
  /** Longitude in decimal degrees (WGS84). */
  lng?: number;
  /** Ground elevation above sea level in meters. */
  elevation?: number;
  /** Free-text observations about the well. */
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
  cement_pad: CementPad;
};
