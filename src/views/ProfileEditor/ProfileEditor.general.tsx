import React from 'react';

import { Collapse, NumberInput, TextInput, Checkbox, Textarea } from '@mantine/core';

import { useProfileStore } from '@/src/store/profile/profile.store';

import { EMPTY_PROFILE } from '@/src/data/profile/profile.data';

import { useUIStore } from '@/src/store/ui.store';

import styles from './profileEditor.module.scss';

export default function ProfileEditorGeneral() {
  const { profile, updateProfile, updateCementPad } = useProfileStore(state => ({
    ...state,
  }));

  const { length_units } = useUIStore(state => ({ ...state }));

  const toLen = (m: number) =>
    length_units === 'ft' ? parseFloat((m * 3.28084).toFixed(3)) : m;
  const fromLen = (v: number) =>
    length_units === 'ft' ? parseFloat((v / 3.28084).toFixed(4)) : v;
  const lenLabel = length_units === 'ft' ? 'ft' : 'm';

  const checkCementPad = () => {
    if (profile.cement_pad && profile.cement_pad.thickness) {
      return true;
    }
    return false;
  };

  const updateField = (field: string, value: string | number) => {
    updateProfile({ ...profile, [field]: value });
  };

  return (
    <div>
      <div className="flex flex-col p-2.5 gap-2">
        <span className="text-lg font-bold text-[#55575D]">Informações Gerais</span>

        <TextInput
          className={styles.layerInput}
          label="Nome"
          value={profile.name || ''}
          onChange={e => updateField('name', e.currentTarget.value)}
        />

        <TextInput
          className={styles.layerInput}
          label="Perfurador"
          value={profile.well_driller || ''}
          onChange={e => updateField('well_driller', e.currentTarget.value)}
        />

        <TextInput
          className={styles.layerInput}
          label="Data de Construção"
          placeholder="YYYY-MM-DD"
          value={profile.construction_date || ''}
          onChange={e => updateField('construction_date', e.currentTarget.value)}
        />

        <div className={styles.layerRow}>
          <NumberInput
            className={styles.layerInput}
            label="Latitude"
            decimalScale={6}
            value={profile.lat ?? ''}
            onChange={value => updateField('lat', value as number)}
          />

          <NumberInput
            className={styles.layerInput}
            label="Longitude"
            decimalScale={6}
            value={profile.lng ?? ''}
            onChange={value => updateField('lng', value as number)}
          />

          <NumberInput
            className={styles.layerInput}
            label={`Elevação (${lenLabel})`}
            decimalScale={3}
            value={profile.elevation != null ? toLen(profile.elevation) : ''}
            onChange={value => updateField('elevation', fromLen(value as number))}
          />
        </div>

        <Textarea
          className={styles.layerInput}
          label="Observações"
          value={profile.obs || ''}
          onChange={e => updateField('obs', e.currentTarget.value)}
          autosize
          minRows={2}
        />
      </div>
    </div>
  );
}
