/* eslint-disable camelcase */
export type GEOLOGIC_COMPONENT_TYPE = {
  from: number;
  to: number;
  description: string;
  color: string;
  fgdc_texture: string | number;
  geologic_unit: string;
};

export type BORE_HOLE_COMPONENT_TYPE = {
  from: number;
  to: number;
  diam_pol: number;
};

export type WELL_CASE_COMPONENT_TYPE = {
  from: number;
  to: number;
  type: string;
  diam_pol: number;
};

export type REDUCTION_COMPONENT_TYPE = {
  from: number;
  to: number;
  diam_from: number;
  diam_to: number;
  type: string;
};

export type WELL_SCREEN_COMPONENT_TYPE = {
  from: number;
  to: number;
  type: string;
  diam_pol: number;
  screen_slot_mm: number;
};

export type HOLE_FILL_COMPONENT_TYPE = {
  from: number;
  to: number;
  type: 'gravel_pack' | 'seal';
  diam_pol: number;
  description: string;
};

export type SURFACE_CASE_COMPONENT_TYPE = {
  from: number;
  to: number;
  // depth: number;
  diam_pol: number;
};

export type CEMENT_PAD_COMPONENT_TYPE = {
  type: string;
  width: number;
  thickness: number;
  length: number;
};

export type CONSTRUCTIVE_COMPONENT_TYPE = {
  bore_hole: BORE_HOLE_COMPONENT_TYPE[];
  well_case: WELL_CASE_COMPONENT_TYPE[];
  reduction: REDUCTION_COMPONENT_TYPE[];
  well_screen: WELL_SCREEN_COMPONENT_TYPE[];
  surface_case: SURFACE_CASE_COMPONENT_TYPE[];
  hole_fill: HOLE_FILL_COMPONENT_TYPE[];
  cement_pad: CEMENT_PAD_COMPONENT_TYPE;
  intake_depth?: number;
};

export type INFO_TYPE = { label: string; value: string };

export type DRILLING_METHOD = {
  from: number;
  to: number;
  drilling_method: string;
};

export type PROFILE_TYPE = {
  name?: string;
  units: {
    diam_unit: 'metric' | 'imperial';
    depth_unit: 'metric' | 'imperial';
  };
  info?: {
    headingInfo?: INFO_TYPE[];
    endInfo?: INFO_TYPE[];
  };
  geologic: GEOLOGIC_COMPONENT_TYPE[];
  constructive: CONSTRUCTIVE_COMPONENT_TYPE;
};

export type PROFILE_TYPE_1 = {
  name?: string;
  well_driller?: string;
  construction_date?: string; // * stored in ISO format
  drilling_method?: DRILLING_METHOD[];
  lat?: number;
  lng?: number;
  elevation?: number;
  units: {
    diam_unit: 'metric' | 'imperial';
    depth_unit: 'metric' | 'imperial';
  };
  info?: {
    headingInfo?: INFO_TYPE[];
    endInfo?: INFO_TYPE[];
  };
  geologic: GEOLOGIC_COMPONENT_TYPE[];
  constructive: CONSTRUCTIVE_COMPONENT_TYPE;
};
