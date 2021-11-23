import {
  PROFILE_TYPE,
  GEOLOGIC_COMPONENT_TYPE,
  BORE_HOLE_COMPONENT_TYPE,
  WELL_CASE_COMPONENT_TYPE,
  WELL_SCREEN_COMPONENT_TYPE,
  SURFACE_CASE_COMPONENT_TYPE,
  HOLE_FILL_COMPONENT_TYPE,
} from '../types/profile.types';

export const PROFILE_DEFAULT: PROFILE_TYPE = {
  geologic: [],
  constructive: {
    bole_hole: [],
    well_screen: [],
    surface_case: [],
    well_case: [],
    hole_fill: [],
    cement_pad: {
      type: '',
      width: 0,
      thickness: 0,
      length: 0,
    },
  },
};

export const GEOLOGIC_COMPONENT_DEFAULT: GEOLOGIC_COMPONENT_TYPE = {
  from: 0,
  to: 10,
  description: '',
  color: '#ff0000',
  fgdc_texture: '',
  geologic_unit: '',
};

export const BORE_HOLE_COMPONENT_DEFAULT: BORE_HOLE_COMPONENT_TYPE = {
  from: 0,
  to: 10,
  diam_pol: 10,
};
export const WELL_CASE_COMPONENT_DEFAULT: WELL_CASE_COMPONENT_TYPE = {
  from: 0,
  to: 10,
  type: '',
  diam_pol: 10,
};

export const WELL_SCREEN_COMPONENT_DEFAULT: WELL_SCREEN_COMPONENT_TYPE = {
  from: 0,
  to: 10,
  type: '',
  diam_pol: 10,
  screen_slot_mm: 0.75,
};
export const HOLE_FILL_COMPONENT_DEFAULT: HOLE_FILL_COMPONENT_TYPE = {
  from: 0,
  to: 10,
  type: 'seal',
  diam_pol: 10,
  description: '',
};
export const SURFACE_CASE_COMPONENT_DEFAULT: SURFACE_CASE_COMPONENT_TYPE = {
  from: 0,
  to: 20,
  diam_pol: 10,
};

export default PROFILE_DEFAULT;
