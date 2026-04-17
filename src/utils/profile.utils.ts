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
  Lithology,
} from '@/src/types/profile.types';
import { getEmptyProfile } from '../data/profile/profile.data';

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

export const calculateCilindricVolume = (diameter: number, height: number) => {
  return Math.PI * (diameter / 1000 / 2) ** 2 * height;
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
 * Profile conversion — backwards-compatibility with legacy JSON formats
 */
const INCHES_TO_MM = 25.4;

function inchesToMM(items: any[]): any[] {
  if (!items?.length) return items ?? [];
  if (!items.some(item => item.diam_pol !== undefined)) return items;

  return items.map(({ diam_pol, ...rest }) => ({
    ...rest,
    diameter: diam_pol * INCHES_TO_MM,
  }));
}

function normalizeLithology(items: any[]): Lithology[] {
  return items.map(item => ({ aquifer_unit: '', ...item }));
}

function normalizeConstructive(src: any): Partial<Constructive> {
  // Handle "bole_hole" typo present in some old exports
  const boreHoleData = src.bole_hole ?? src.bore_hole ?? [];

  return {
    bore_hole: inchesToMM(boreHoleData),
    hole_fill: inchesToMM(src.hole_fill ?? []),
    surface_case: inchesToMM(src.surface_case ?? []),
    well_case: inchesToMM(src.well_case ?? []),
    well_screen: inchesToMM(src.well_screen ?? []),
    reduction: src.reduction ?? [],
    ...(src.cement_pad && { cement_pad: src.cement_pad }),
  };
}

function normalizeGeologic(raw: any): Geologic {
  // Old format stores lithology as `geologic[]`; new format uses `lithology[]`
  const lithologySource: any[] = raw.lithology ?? raw.geologic ?? [];

  return {
    lithology: normalizeLithology(lithologySource),
    fractures: raw.fractures ?? [],
    caves: raw.caves ?? [],
  };
}

export function convertProfileFromJSON(jsonString: string): Profile | null {
  let raw: any;
  try {
    raw = JSON.parse(jsonString);
  } catch {
    throw new Error('Invalid profile format');
  }

  if (checkIfProfileIsEmpty(raw)) return null;

  // Old format wraps constructive fields inside a `constructive` object;
  // new format has them at the top level.
  const constructiveSource = raw.constructive ?? raw;

  const {
    // Strip legacy wrapper keys and metadata-only fields
    constructive: _c,
    geologic: _g,
    info: _i,
    units: _u,
    // Carry forward recognised top-level fields
    name,
    well_driller,
    construction_date,
    lat,
    lng,
    elevation,
    obs,
  } = raw;

  const topLevelFields = {
    ...(name !== undefined && { name }),
    ...(well_driller !== undefined && { well_driller }),
    ...(construction_date !== undefined && { construction_date }),
    ...(lat !== undefined && { lat }),
    ...(lng !== undefined && { lng }),
    ...(elevation !== undefined && { elevation }),
    ...(obs !== undefined && { obs }),
  };

  return {
    ...getEmptyProfile(),
    ...topLevelFields,
    ...normalizeConstructive(constructiveSource),
    ...normalizeGeologic(raw),
  };
}
