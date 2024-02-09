import React from 'react';

import DataSheet from '@/src/components/dataSheetComponent/dataSheet.component';

import { useProfileStore } from '@/store/profile/profile.store';

import {
  Lithology,
} from '@/types/profile.types';

import {
  LITHOLOGY_FEATURE_DEFAULT,
} from '@/data/profile/profile.data';

import {
  geologyColumns,
} from '@/src/components/dataSheetComponent/columns';


export default function ProfileEditorConstructive() {
  const { profile, getUpdateListingFeatures } =
    useProfileStore(state => ({
      ...state,
    }));

  return (
    <div className="flex flex-col p-2.5">
      <DataSheet
        data={profile.lithology}
        onChangeValues={getUpdateListingFeatures<Lithology>('lithology')}
        columns={geologyColumns}
        defaultValue={() => LITHOLOGY_FEATURE_DEFAULT}
      />
    </div>
  );
}
