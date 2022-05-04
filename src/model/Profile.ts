import {
  GEOLOGIC_COMPONENT_TYPE,
  INFO_TYPE,
  CONSTRUCTIVE_COMPONENT_TYPE,
  PROFILE_TYPE,
  HOLE_FILL_COMPONENT_TYPE,
  BORE_HOLE_COMPONENT_TYPE,
  CEMENT_PAD_COMPONENT_TYPE,
  SURFACE_CASE_COMPONENT_TYPE,
  WELL_CASE_COMPONENT_TYPE,
  WELL_SCREEN_COMPONENT_TYPE,
} from '../types/profile.types';

import { calculateVolume } from '../utils/profile.utils';

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
          parseFloat(d.diam_pol)
        // eslint-disable-next-line function-paren-newline
      ),
      ...this.constructive.hole_fill.map((d: HOLE_FILL_COMPONENT_TYPE) =>
        // @ts-ignore
        parseFloat(d.diam_pol)
      ),
      ...this.constructive.well_screen.map((d: WELL_SCREEN_COMPONENT_TYPE) =>
        // @ts-ignore
        parseFloat(d.diam_pol)
      ),
      ...this.constructive.well_case.map((d: WELL_CASE_COMPONENT_TYPE) =>
        // @ts-ignore
        parseFloat(d.diam_pol)
      ),
    ];
  }

  calculateHoleFillVolume(type: string): number {
    let volume = 0;

    const { well_case: wellCase, well_screen: wellScreen } = this.constructive;

    const holeFillType = this.constructive.hole_fill.filter(
      (el) => el.type === type
    );

    holeFillType.forEach((el) => {
      // CALCULATE THE OUTER VOLUME
      let outerVolume = calculateVolume(el.diam_pol, el.to - el.from);

      // SUBTRACT THE OUTER VOLUME FROM THE VOLUME OF EACH WELL CASE SECTION
      for (let i = 0; i < wellCase.length; i++) {
        const wC = wellCase[i];

        if (wC.from > el.to || wC.to < el.from) {
          // eslint-disable-next-line no-continue
          continue;
        }

        // eslint-disable-next-line prefer-destructuring
        let { from, to } = el;
        if (wC.from > el.from) from = wC.from;
        if (wC.to < el.to) to = wC.to;

        const wellSectionVolume = calculateVolume(wC.diam_pol, to - from);

        outerVolume -= wellSectionVolume;
      }

      // SUBTRACT THE OUTER VOLUME FROM THE VOLUME OF EACH WELL SCREEN SECTION
      for (let i = 0; i < wellScreen.length; i++) {
        const wS = wellScreen[i];

        if (wS.from > el.to || wS.to < el.from) {
          // eslint-disable-next-line no-continue
          continue;
        }

        // eslint-disable-next-line prefer-destructuring
        let { from, to } = el;
        if (wS.from > el.from) from = wS.from;
        if (wS.to < el.to) to = wS.to;

        const wellSectionVolume = calculateVolume(wS.diam_pol, to - from);

        outerVolume -= wellSectionVolume;
      }

      // console.log(outerVolume);
      volume += outerVolume;
    });

    return volume;
  }
}
