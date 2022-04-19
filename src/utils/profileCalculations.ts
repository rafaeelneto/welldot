import { PROFILE_TYPE } from '../types/profile.types';

export const numberFormater = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

export const numberFormaterInches = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 2,
});

export const calculateVolume = (diamPol: number, height: number) => {
  return Math.PI * (diamPol / 39.37 / 2) ** 2 * height;
};

export const calculateHoleFillVolume = (
  type: string,
  profile: PROFILE_TYPE
) => {
  let volume = 0;

  const { well_case: wellCase, well_screen: wellScreen } = profile.constructive;

  const holeFillType = profile.constructive.hole_fill.filter(
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
};
