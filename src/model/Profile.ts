import {
  GEOLOGIC_COMPONENT_TYPE,
  INFO_TYPE,
  CONSTRUCTIVE_COMPONENT_TYPE,
  PROFILE_TYPE,
} from '../types/profile.types';

export default class Profile {
  name?: string;

  geologic: GEOLOGIC_COMPONENT_TYPE[] = [];

  construtive: CONSTRUCTIVE_COMPONENT_TYPE = {
    hole_fill: [],
    bole_hole: [],
    cement_pad: {
      length: 0,
      thickness: 0,
      type: '',
      width: 0,
    },
    surface_case: [],
    well_case: [],
    well_screen: [],
  };

  info?: { headingInfo?: INFO_TYPE[]; endInfo?: INFO_TYPE[] };

  constructor(profile?: PROFILE_TYPE) {
    if (profile) {
      this.name = profile.name;
      this.geologic = profile.geologic;
      this.construtive = profile.constructive;
      this.info = profile.info;
    }
  }

  get componentsFinalDepth() {
    return [
      this.geologic.length === 0
        ? 0
        : this.geologic[this.geologic.length - 1].to,
      this.construtive.bole_hole.length === 0
        ? 0
        : this.construtive.bole_hole[this.construtive.bole_hole.length - 1].to,
      this.construtive.hole_fill.length === 0
        ? 0
        : this.construtive.hole_fill[this.construtive.hole_fill.length - 1].to,
      this.construtive.well_case.length === 0
        ? 0
        : this.construtive.well_case[this.construtive.well_case.length - 1].to,
      this.construtive.well_screen.length === 0
        ? 0
        : this.construtive.well_screen[this.construtive.well_screen.length - 1]
            .to,
    ];
  }
}
