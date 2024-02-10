import {
  Profile,
  Constructive,
  HoleFill,
  BoreHole,
  WellCase,
  WellScreen,
  Reduction,
  Geologic,
  SurfaceCase,
} from '@/src/types/profile.types';

type PointItem = {
  depth: number;
};

type ExtensionItem = {
  to: number;
};

function getLowestPointFromList(data: (PointItem | ExtensionItem)[]): number {
  if (data.length === 0) return 0;

  const lastItem = data[data.length - 1];

  if ((lastItem as PointItem).depth) {
    return (lastItem as PointItem).depth;
  }

  return (lastItem as ExtensionItem).to;
}

export const getProfileLastItemsDepths = (profile: Profile): number[] => {
  return [
    getLowestPointFromList(profile.lithology),
    getLowestPointFromList(profile.fractures),
    getLowestPointFromList(profile.caves),
    getLowestPointFromList(profile.bore_hole),
    getLowestPointFromList(profile.hole_fill),
    getLowestPointFromList(profile.reduction),
    getLowestPointFromList(profile.surface_case),
    getLowestPointFromList(profile.well_case),
    getLowestPointFromList(profile.well_screen),
  ];
};

export const getProfileDiamValues = (
  constructionData: Constructive,
): number[] => [
  ...constructionData.bore_hole.map((d: BoreHole) => d.diameter),
  ...constructionData.hole_fill.map((d: HoleFill) => d.diameter),
  ...constructionData.surface_case.map((d: SurfaceCase) => d.diameter),
  ...constructionData.well_screen.map((d: WellScreen) => d.diameter),
  ...constructionData.well_case.map((d: WellCase) => d.diameter),
  ...constructionData.reduction.reduce((acc: number[], cur: Reduction) => {
    return acc.concat([cur.diam_from, cur.diam_to]);
  }, []),
];

export function getConstructivePropertySummary<T>(
  constructionData: any,
  property: string,
): T[] {
  return [
    ...(constructionData?.bore_hole?.map((d: BoreHole | any) => d[property]) ||
      []),
    ...(constructionData?.hole_fill?.map((d: HoleFill | any) => d[property]) ||
      []),
    ...(constructionData?.surface_case?.map(
      (d: SurfaceCase | any) => d[property],
    ) || []),
    ...(constructionData?.well_screen?.map(
      (d: WellScreen | any) => d[property],
    ) || []),
    ...(constructionData?.well_case?.map((d: WellCase | any) => d[property]) ||
      []),
    ...(constructionData?.reduction?.map((d: WellCase | any) => d[property]) ||
      []),
  ];
}

export const checkIfProfileIsEmpty = (profile: any): boolean => {
  if (!profile) return true;

  if (profile.constructive || profile.geologic) {
    return false;
  }

  const noComponent =
    profile.lithology?.length === 0 &&
    profile.fractures?.length === 0 &&
    profile.caves?.length === 0 &&
    profile.bore_hole?.length === 0 &&
    profile.hole_fill?.length === 0 &&
    profile.well_case?.length === 0 &&
    profile.well_screen?.length === 0;

  return noComponent;
};

export const numberFormater = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

// TODO: remove this
export const numberFormaterInches = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 2,
});

export const calculateCilindricVolume = (diameter: number, height: number) => {
  return Math.PI * ((diameter * 1000) / 2) ** 2 * height;
};

export const calculateHoleFillVolume = (type: string, profile: Profile) => {
  let volume = 0;

  const { well_case: wellCase, well_screen: wellScreen } = profile;

  const holeFillType = profile.hole_fill.filter(el => el.type === type);

  holeFillType.forEach(el => {
    // CALCULATE THE OUTER VOLUME
    let outerVolume = calculateCilindricVolume(el.diameter, el.to - el.from);

    // SUBTRACT THE OUTER VOLUME FROM THE VOLUME OF EACH WELL CASE SECTION
    for (let i = 0; i < wellCase.length; i++) {
      const wC = wellCase[i];

      if (!(wC.from > el.to || wC.to < el.from)) {
        let { from, to } = el;
        if (wC.from > el.from) from = wC.from;
        if (wC.to < el.to) to = wC.to;

        const wellSectionVolume = calculateCilindricVolume(
          wC.diameter,
          to - from,
        );

        outerVolume -= wellSectionVolume;
      }
    }

    // SUBTRACT THE OUTER VOLUME FROM THE VOLUME OF EACH WELL SCREEN SECTION
    for (let i = 0; i < wellScreen.length; i++) {
      const wS = wellScreen[i];

      if (!(wS.from > el.to || wS.to < el.from)) {
        let { from, to } = el;
        if (wS.from > el.from) from = wS.from;
        if (wS.to < el.to) to = wS.to;

        const wellSectionVolume = calculateCilindricVolume(
          wS.diameter,
          to - from,
        );

        outerVolume -= wellSectionVolume;
      }
    }

    volume += outerVolume;
  });

  return volume;
};

/**
 * Convertion Section
 */
const INCHES_TO_MM_CONVERSION_RATIO = 25.4;
const OLD_DIAM_PROP_NAME = 'diam_pol';

function convertBoleHole(importedProfile: any): any {
  if (!importedProfile.constructive) return importedProfile;

  const profile = { ...importedProfile };

  if (importedProfile.constructive.bole_hole) {
    profile.constructive = {
      ...profile.constructive,
      bore_hole: [...profile.constructive.bole_hole],
    };

    delete profile.constructive.bole_hole;
  }

  return profile;
}

function checkIfDiameterIsImperial(importedProfile: any): any {
  const profile = { ...importedProfile };

  if (!profile.constructive) return false;

  const diamPolValues = getConstructivePropertySummary<number>(
    profile.constructive,
    OLD_DIAM_PROP_NAME,
  );

  const isOnImperial = diamPolValues.filter(i => i !== undefined).length > 0;

  return isOnImperial;
}

function replaceImperialDiamenter<T>(data: any[]): T[] {
  if (!data) return [];

  return data.map((d: any) => {
    const item = { ...d };
    const diamMM = d.diam_pol * INCHES_TO_MM_CONVERSION_RATIO;

    delete item.diam_pol;

    return {
      ...item,
      diameter: diamMM,
    };
  });
}

function convertImperialDiameters(importedProfile: any): any {
  const isOnImperial = checkIfDiameterIsImperial(importedProfile);
  if (!isOnImperial) return importedProfile;

  const profile = { ...importedProfile };

  profile.constructive.bore_hole = replaceImperialDiamenter<BoreHole>(
    profile.constructive.bore_hole,
  );
  profile.constructive.hole_fill = replaceImperialDiamenter<HoleFill>(
    profile.constructive.hole_fill,
  );
  profile.constructive.surface_case = replaceImperialDiamenter<WellCase>(
    profile.constructive.surface_case,
  );
  profile.constructive.well_screen = replaceImperialDiamenter<WellScreen>(
    profile.constructive.well_screen,
  );
  profile.constructive.well_case = replaceImperialDiamenter<WellCase>(
    profile.constructive.well_case,
  );

  return profile;
}

function convertConstructiveData(importedProfile: any) {
  if (!importedProfile.constructive) {
    return importedProfile;
  }

  let transformedProfile = { ...importedProfile };
  transformedProfile = convertBoleHole(transformedProfile);
  transformedProfile = convertImperialDiameters(transformedProfile);

  const constructive: Constructive = {
    ...transformedProfile.constructive,
  };

  return {
    ...transformedProfile,
    ...constructive,
  };
}

function convertGeologicData(importedProfile: any) {
  if (!importedProfile.geologic || !importedProfile.geologic[0]) {
    return importedProfile;
  }

  const geologic: Geologic = {
    lithology: [...importedProfile.geologic],
    fractures: [],
    caves: [],
  };

  return {
    ...importedProfile,
    ...geologic,
  };
}

function clearOldProperties(importedProfile: any) {
  if (importedProfile.geologic) {
    delete importedProfile.geologic;
  }

  if (importedProfile.constructive) {
    delete importedProfile.constructive;
  }

  if (importedProfile.info) {
    delete importedProfile.info;
  }

  if (importedProfile.units) {
    delete importedProfile.units;
  }

  return {
    ...importedProfile,
  };
}

export function convertProfileFromJSON(jsonString: string): Profile | null {
  try {
    let importedProfile = JSON.parse(jsonString);

    const noProfile = checkIfProfileIsEmpty(importedProfile);
    if (noProfile) {
      return null;
    }

    importedProfile = convertConstructiveData(importedProfile);
    importedProfile = convertGeologicData(importedProfile);
    importedProfile = clearOldProperties(importedProfile);

    const profile = JSON.parse(JSON.stringify(importedProfile)) as Profile;
    console.log(profile);

    return profile;
  } catch (e) {
    throw new Error('Invalid profile format');
  }
}
