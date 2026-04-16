import React, { useEffect } from 'react';

import DataSheet from '@/src/components/organisms/DataSheet/DataSheet.component';

import { useProfileStore } from '@/src/store/profile/profile.store';

import { Cave, Fracture, Lithology } from '@/src/types/profile.types';

import {
  CAVE_FEATURE_DEFAULT,
  FRACTURE_FEATURE_DEFAULT,
  LITHOLOGY_FEATURE_DEFAULT,
} from '@/src/data/profile/profile.data';

import {
  fractureColumns,
  caveColumns,
  lithologyColumns,
} from '@/src/data/dataSheet/columns';

import styles from './profileEditor.module.scss';

export default function ProfileEditorConstructive() {
  const { profile, getUpdateListingFeatures } = useProfileStore(state => ({
    ...state,
  }));

  return (
    <>
      <div className="flex flex-col p-2.5">
        <span className={styles.componentTitle}>Litologia:</span>
        <DataSheet
          data={profile.lithology}
          onChangeValues={getUpdateListingFeatures<Lithology>('lithology')}
          columns={lithologyColumns}
          defaultValue={() => LITHOLOGY_FEATURE_DEFAULT}
        />
      </div>
      <section className="grid grid-cols-1 xl:grid-cols-[700px_auto]">
        <div className="flex flex-col p-2.5">
          <span className={styles.componentTitle}>Fraturas:</span>
          <DataSheet
            data={profile.fractures}
            onChangeValues={getUpdateListingFeatures<Fracture>('fractures')}
            columns={fractureColumns}
            defaultValue={() => FRACTURE_FEATURE_DEFAULT}
          />
        </div>
        <div className="flex flex-col p-2.5"></div>
      </section>
      <section className="grid grid-cols-1 xl:grid-cols-[700px_auto]">
        <div className="flex flex-col p-2.5">
          <span className={styles.componentTitle}>Cavernas:</span>
          <DataSheet
            data={profile.caves}
            onChangeValues={getUpdateListingFeatures<Cave>('caves')}
            columns={caveColumns}
            defaultValue={() => CAVE_FEATURE_DEFAULT}
          />
        </div>
        <div className="flex flex-col p-2.5"></div>
      </section>
    </>
  );
}
