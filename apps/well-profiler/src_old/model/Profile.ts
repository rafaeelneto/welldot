import {
  BORE_HOLE_COMPONENT_TYPE,
  CONSTRUCTIVE_COMPONENT_TYPE,
  GEOLOGIC_COMPONENT_TYPE,
  HOLE_FILL_COMPONENT_TYPE,
  INFO_TYPE,
  PROFILE_TYPE,
  WELL_CASE_COMPONENT_TYPE,
  WELL_SCREEN_COMPONENT_TYPE,
} from '../types/profile.types';

export default class Profile {
  name?: string;

  geologic: GEOLOGIC_COMPONENT_TYPE[] = [];

  constructive: CONSTRUCTIVE_COMPONENT_TYPE = {
    hole_fill: [],
    bore_hole: [],
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
      this.constructive = { ...profile.constructive };
      this.info = { ...profile.info };
    }
  }

  getLastItemsDepths(): number[] {
    return [
      this.geologic.length === 0
        ? 0
        : this.geologic[this.geologic.length - 1].to,
      this.constructive.bore_hole.length === 0
        ? 0
        : this.constructive.bore_hole[this.constructive.bore_hole.length - 1]
            .to,
      this.constructive.hole_fill.length === 0
        ? 0
        : this.constructive.hole_fill[this.constructive.hole_fill.length - 1]
            .to,
      this.constructive.well_case.length === 0
        ? 0
        : this.constructive.well_case[this.constructive.well_case.length - 1]
            .to,
      this.constructive.well_screen.length === 0
        ? 0
        : this.constructive.well_screen[
            this.constructive.well_screen.length - 1
          ].to,
    ];
  }

  isProfileEmpty(): boolean {
    if (!this.constructive && !this.geologic) return true;

    const noComponent =
      this.geologic.length === 0 &&
      this.constructive.bore_hole.length === 0 &&
      this.constructive.hole_fill.length === 0 &&
      this.constructive.well_case.length === 0 &&
      this.constructive.well_screen.length === 0;

    return noComponent;
  }

  getDiamValues(): number[] {
    return [
      ...this.constructive.bore_hole.map(
        (d: BORE_HOLE_COMPONENT_TYPE) =>
          // divide by 1 to convert text to number
          // eslint-disable-next-line implicit-arrow-linebreak
          // @ts-ignore
          parseFloat(d.diam_pol),
        // eslint-disable-next-line function-paren-newline
      ),
      ...this.constructive.hole_fill.map((d: HOLE_FILL_COMPONENT_TYPE) =>
        // @ts-ignore
        parseFloat(d.diam_pol),
      ),
      ...this.constructive.well_screen.map((d: WELL_SCREEN_COMPONENT_TYPE) =>
        // @ts-ignore
        parseFloat(d.diam_pol),
      ),
      ...this.constructive.well_case.map((d: WELL_CASE_COMPONENT_TYPE) =>
        // @ts-ignore
        parseFloat(d.diam_pol),
      ),
    ];
  }
}
