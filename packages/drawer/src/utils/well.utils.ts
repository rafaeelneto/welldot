import {
  BoreHole,
  Constructive,
  HoleFill,
  Reduction,
  SurfaceCase,
  Well,
  WellCase,
  WellScreen,
} from '@welldot/core';

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
    let outerVolume = calculateCilindricVolume(el.diameter, el.to - el.from);

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
