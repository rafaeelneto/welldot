import {
  Well,
  Constructive,
  HoleFill,
  BoreHole,
  WellCase,
  WellScreen,
  Reduction,
  Geologic,
  SurfaceCase,
  Lithology,
} from '@/src/lib/@types/well.types';
import { getEmptyProfile } from '../../data/profile/profile.data';

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

export const getProfileLastItemsDepths = (profile: Well): number[] => {
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

export const calculateHoleFillVolume = (type: string, profile: Well) => {
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

// ─── .well format (compact keys) ────────────────────────────────────────────

const WELL_FORMAT_VERSION = 1;

export function profileToWell(profile: Well): string {
  const well: Record<string, unknown> = {
    version: WELL_FORMAT_VERSION,
    ...(profile.well_type !== undefined && { well_type: profile.well_type }),
    ...(profile.name !== undefined && { name: profile.name }),
    ...(profile.well_driller !== undefined && { well_driller: profile.well_driller }),
    ...(profile.construction_date !== undefined && { construction_date: profile.construction_date }),
    ...(profile.lat !== undefined && { lat: profile.lat }),
    ...(profile.lng !== undefined && { lng: profile.lng }),
    ...(profile.elevation !== undefined && { elevation: profile.elevation }),
    ...(profile.obs !== undefined && { obs: profile.obs }),
    bore_hole: profile.bore_hole,
    well_case: profile.well_case,
    reduction: profile.reduction,
    well_screen: profile.well_screen,
    surface_case: profile.surface_case,
    hole_fill: profile.hole_fill,
    ...(profile.cement_pad && { cement_pad: profile.cement_pad }),
    lithology: profile.lithology,
    fractures: profile.fractures,
    caves: profile.caves,
  };

  return JSON.stringify(well);
}

function decodeWell(raw: any): Well {
  return {
    ...getEmptyProfile(),
    ...(raw.well_type !== undefined && { well_type: raw.well_type }),
    ...(raw.name !== undefined && { name: raw.name }),
    ...(raw.well_driller !== undefined && { well_driller: raw.well_driller }),
    ...(raw.construction_date !== undefined && { construction_date: raw.construction_date }),
    ...(raw.lat !== undefined && { lat: raw.lat }),
    ...(raw.lng !== undefined && { lng: raw.lng }),
    ...(raw.elevation !== undefined && { elevation: raw.elevation }),
    ...(raw.obs !== undefined && { obs: raw.obs }),
    bore_hole: raw.bore_hole ?? [],
    well_case: raw.well_case ?? [],
    reduction: raw.reduction ?? [],
    well_screen: raw.well_screen ?? [],
    surface_case: raw.surface_case ?? [],
    hole_fill: raw.hole_fill ?? [],
    ...(raw.cement_pad && { cement_pad: raw.cement_pad }),
    lithology: raw.lithology ?? [],
    fractures: raw.fractures ?? [],
    caves: raw.caves ?? [],
  };
}

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

export function convertProfileFromJSON(jsonString: string): Well | null {
  let raw: any;
  try {
    raw = JSON.parse(jsonString);
  } catch {
    throw new Error('Invalid profile format');
  }

  // .well compact format — detected by presence of version field `v`
  if (raw && typeof raw.version === 'number') {
    if (raw.version !== 1) throw new Error(`Unsupported .well format version: ${raw.version}`);
    return decodeWell(raw);
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
    well_type,
    name,
    well_driller,
    construction_date,
    lat,
    lng,
    elevation,
    obs,
  } = raw;

  const topLevelFields = {
    ...(well_type !== undefined && { well_type }),
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
