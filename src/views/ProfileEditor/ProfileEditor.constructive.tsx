import React from 'react';

import { Collapse, NumberInput, TextInput, Checkbox } from '@mantine/core';

import DataSheet from '@/src/components/organisms/DataSheet/DataSheet.component';

import { useProfileStore } from '@/src/store/profile/profile.store';

import {
  BoreHole,
  HoleFill,
  SurfaceCase,
  WellCase,
  WellScreen,
} from '@/src/lib/@types/well.types';

import {
  EMPTY_PROFILE,
  BORE_HOLE_FEATURE_DEFAULT,
  HOLE_FILL_FEATURE_DEFAULT,
  WELL_SCREEN_FEATURE_DEFAULT,
  SURFACE_CASE_FEATURE_DEFAULT,
  WELL_CASE_FEATURE_DEFAULT,
} from '@/src/data/profile/profile.data';

import { useColumns } from '@/src/data/dataSheet/useColumns';

import styles from './profileEditor.module.scss';
import { useUIStore } from '@/src/store/ui.store';

export default function ProfileEditorConstructive() {
  const { profile, updateProfile, updateCementPad, getUpdateListingFeatures } =
    useProfileStore(state => ({
      ...state,
    }));

  const { length_units, diameter_units } = useUIStore(state => ({
        ...state,
      }));

  const toLen = (m: number) =>
    length_units === 'ft' ? parseFloat((m * 3.28084).toFixed(3)) : m;
  const fromLen = (v: number) =>
    length_units === 'ft' ? parseFloat((v / 3.28084).toFixed(4)) : v;
  const lenLabel = length_units === 'ft' ? 'ft' : 'm';

  const {
    boreHoleColumns,
    holeFillColumns,
    surfaceCaseColumns,
    wellCaseColumns,
    wellScreenColumns,
  } = useColumns();

  const checkCementPad = () => {
    if (profile.cement_pad && profile.cement_pad.thickness) {
      return true;
    }
    return false;
  };

  const key = `${length_units}-${diameter_units}`;

  return (
    <div>
      <div className="flex flex-col p-2.5">
        <span className="text-lg font-bold text-[#55575D] flex flex-row items-center mb-2">
          Laje de Proteção Sanitária
          <Checkbox
            className="ml-2"
            checked={checkCementPad()}
            onChange={event => {
              const { checked } = event.target;

              if (checked) {
                const newPerfilState = {
                  ...profile,
                  cement_pad: {
                    width: 3,
                    thickness: 0.25,
                    length: 3,
                    type: 'Cimento',
                  },
                };
                updateProfile(newPerfilState);
              } else {
                const newPerfilState = {
                  ...profile,
                  cement_pad: {
                    ...EMPTY_PROFILE.cement_pad,
                  },
                };
                updateProfile(newPerfilState);
              }
            }}
          />
        </span>

        <Collapse in={checkCementPad()}>
          <div key={length_units}>
            <TextInput
              className={`${styles.layerInput}`}
              id="standard-multiline-flexible"
              label="Tipo"
              value={profile.cement_pad.type || ''}
              onChange={event => {
                updateCementPad('type', event.currentTarget.value);
              }}
            />
            <div className={styles.layerRow}>
              <NumberInput
                className={styles.layerInput}
                id="standard-multiline-flexible"
                label={`Largura (${lenLabel})`}
                value={toLen(profile.cement_pad.width)}
                onChange={value => {
                  updateCementPad('width', String(fromLen(value as number)));
                }}
              />

              <NumberInput
                className={styles.layerInput}
                id="standard-multiline-flexible"
                label={`Comprimento (${lenLabel})`}
                value={toLen(profile.cement_pad.length)}
                onChange={value => {
                  updateCementPad('length', String(fromLen(value as number)));
                }}
              />
              <NumberInput
                className={styles.layerInput}
                id="standard-multiline-flexible"
                label={`Espessura (${lenLabel})`}
                value={toLen(profile.cement_pad.thickness)}
                onChange={value => {
                  updateCementPad('thickness', String(fromLen(value as number)));
                }}
              />
            </div>
          </div>
        </Collapse>
      </div>
      <section className="grid grid-cols-1 xl:grid-cols-[300px_auto]">
        <div className="flex flex-col p-2.5">
          <span className={styles.componentTitle}>Furo:</span>
          <DataSheet
            key={key}
            data={profile.bore_hole}
            onChangeValues={getUpdateListingFeatures<BoreHole>('bore_hole')}
            columns={boreHoleColumns}
            defaultValue={() => BORE_HOLE_FEATURE_DEFAULT}
          />
        </div>
        <div className="flex flex-col p-2.5">
          <span className={styles.componentTitle}>Espaço Anular:</span>
          <DataSheet
            key={key}
            data={profile.hole_fill}
            onChangeValues={getUpdateListingFeatures<HoleFill>('hole_fill')}
            columns={holeFillColumns}
            defaultValue={() => HOLE_FILL_FEATURE_DEFAULT}
          />
        </div>
      </section>
      <section className="grid grid-cols-1 xl:grid-cols-[300px_auto]">
        <div className="flex flex-col p-2.5">
          <span className={styles.componentTitle}>Tubo de Boca:</span>
          <DataSheet
            key={key}
            data={profile.surface_case}
            onChangeValues={getUpdateListingFeatures<SurfaceCase>(
              'surface_case',
            )}
            columns={surfaceCaseColumns}
            defaultValue={() => SURFACE_CASE_FEATURE_DEFAULT}
          />
        </div>
        <div className="flex flex-col p-2.5">
          <span className={styles.componentTitle}>Revestimento:</span>
          <DataSheet
            key={key}
            data={profile.well_case}
            onChangeValues={getUpdateListingFeatures<WellCase>('well_case')}
            columns={wellCaseColumns}
            defaultValue={() => WELL_CASE_FEATURE_DEFAULT}
          />
        </div>
      </section>
      <div className="flex flex-col p-2.5">
        <span className={styles.componentTitle}>Filtros:</span>
        <DataSheet
          key={key}
          data={profile.well_screen}
          onChangeValues={getUpdateListingFeatures<WellScreen>('well_screen')}
          columns={wellScreenColumns}
          defaultValue={() => WELL_SCREEN_FEATURE_DEFAULT}
        />
      </div>
    </div>
  );
}
