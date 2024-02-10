import React from 'react';

import DataSheet from '@/src/components/organisms/DataSheet/DataSheet.component';

import { useProfileStore } from '@/src/store/profile/profile.store';

import { Lithology } from '@/src/types/profile.types';

import { LITHOLOGY_FEATURE_DEFAULT } from '@/src/data/profile/profile.data';

import { geologyColumns } from '@/src/components/organisms/DataSheet/columns';

export default function ProfileEditorConstructive() {
  const { profile, getUpdateListingFeatures } = useProfileStore(state => ({
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
