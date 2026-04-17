import { create, type StateCreator } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { notifications } from '@mantine/notifications';

import { getEmptyProfile } from '@/src/data/profile/profile.data';
import {
  BoreHole,
  Cave,
  CementPad,
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
} from '@/src/types/profile.types';
import { convertProfileFromJSON } from '@/src/utils/profile.utils';

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
  updateProfileFromJSON: (jsonProfile: string) => void;
  updateCementPad: (property: keyof CementPad, value: string | number) => void;
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

const state: StateCreator<IProfileState> = (set, get) => ({
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
      const currProfile = { ...get().profile };

      currProfile[property] = newFeatures as any;

      if (CHAING_TYPES.has(property as ChainingKeys)) {
        currProfile[property] = reorderComponentsDepth<T>(
          newFeatures as ChainingTypes[],
        ) as any;
      }

      if (currProfile[property][0]?.hasOwnProperty('depth')) {
        currProfile[property] = newFeatures.sort((a, b) => {
          if ('depth' in a && 'depth' in b) {
            return a.depth - b.depth;
          }
          if ('from' in a && 'from' in b) {
            return a.from - b.from;
          }
          return 0;
        }).map((feature) => ({ ...feature, depth: feature['depth'] >= 0 ? feature['depth'] : 0 })) as any;
      }

      get().updateProfile(currProfile);
    }

    return reorderConstructive;
  },
  updateCementPad: (property: keyof CementPad, value: string | number) => {
    const currProfile = get().profile;
    const newCementPad = { ...currProfile.cement_pad };

    if (property === 'type') {
      newCementPad.type = value as string;
    } else {
      newCementPad[property] = value as number;
    }
    const newPerfilState = {
      ...currProfile,
      cement_pad: newCementPad,
    };
    get().updateProfile(newPerfilState);
  },
  updateProfileFromJSON: (jsonProfile: string) => {
    try {
      const importedWell = convertProfileFromJSON(jsonProfile);
      if (!importedWell) return;
      get().updateProfile(importedWell);
    } catch (error) {
      console.log(error);
      notifications.show({
        title: `Importing Error`,
        message: `Ops, we couldn't import this profile. The format is invalid or incompatible. Please try to another file or contact us`,
        color: 'red',
      });
    }
  },
});

export const useProfileStore = create<IProfileState>()(
  persist(state, {
    name: 'profile-storage',
    storage: createJSONStorage(() => localStorage),
  }),
);
