import { create } from 'zustand';

import { getEmptyProfile } from '@/data/profile/profile.data';
import {
  BoreHole,
  Cave,
  Constructive,
  Fracture,
  Geologic,
  HoleFill,
  Lithology,
  Profile,
  Reduction,
  SurfaceCase,
  WellCase,
  WellScreen,
} from '@/types/profile.types';

// TODO move this function to utils
function reorderComponentsDepth<T>(
  newGeologicLayers: { to: number; from: number }[],
): T[] {
  const newLayers: any[] = [];
  let currentDepth: number = 0;
  for (let index = 0; index < newGeologicLayers.length; index++) {
    const newLayer = newGeologicLayers[index];
    const layerThickness = newLayer.to - newLayer.from;
    const newFrom = index === 0 ? 0 : currentDepth;
    const newTo = newFrom + layerThickness;
    currentDepth += layerThickness;
    newLayers.push({ ...newLayer, from: newFrom, to: newTo });
  }
  return newLayers;
}

interface IProfileState {
  profile: Profile;
  mutationCount: number;
  updateProfile: (newProfile: Profile) => void;
  getUpdateListingFeatures: <T extends ListingTypes>(
    property: ListingKeys,
  ) => (newFeatures: T[]) => void;
  clear: () => void;
}

type EnforceToExtendProfileKeys<T> = T extends keyof Profile ? T : never;

type ListingKeys = EnforceToExtendProfileKeys<
  | 'bore_hole'
  | 'well_case'
  | 'reduction'
  | 'well_screen'
  | 'surface_case'
  | 'hole_fill'
  | 'cement_pad'
  | 'lithology'
  | 'fractures'
  | 'caves'
>;
type ChainingKeys = EnforceToExtendProfileKeys<
  'bore_hole' | 'surface_case' | 'hole_fill' | 'lithology'
>;

type ListingTypes =
  | BoreHole
  | WellCase
  | Reduction
  | WellScreen
  | SurfaceCase
  | HoleFill
  | Lithology
  | Fracture
  | Cave;

type ChainingTypes = BoreHole | SurfaceCase | HoleFill | Lithology;

type ListingFeatures = Pick<Profile, ListingKeys>;
type ChainingFeatures = Pick<Profile, ChainingKeys>;

const CHAING_TYPES = new Set<ChainingKeys>([
  'bore_hole',
  'surface_case',
  'hole_fill',
  'lithology',
]);

// TODO implement persistence in localstorage
export const useProfileStore = create<IProfileState>((set, get) => ({
  profile: getEmptyProfile(),
  mutationCount: 0,
  clear: () => {
    set(() => ({ profile: getEmptyProfile() }));
  },
  updateProfile: (newProfileState: Profile) => {
    const counterUpdated = get().mutationCount + 1;
    set(() => ({
      profile: { ...newProfileState },
      mutationCount: counterUpdated,
    }));
  },
  getUpdateListingFeatures: <T extends ListingTypes>(property: ListingKeys) => {
    function reorderConstructive(newFeatures: T[]) {
      const newProfileState = { ...get().profile };

      newProfileState[property] = newFeatures as any;

      if (CHAING_TYPES.has(property as ChainingKeys)) {
        newProfileState[property] = reorderComponentsDepth<T>(
          newFeatures as ChainingTypes[],
        ) as any;
      }

      get().updateProfile(newProfileState);
    }

    return reorderConstructive;
  },
}));
