import React, { useState, useEffect } from 'react';

import { NumberInput, TextInput, Textarea, SegmentedControl, Text } from '@mantine/core';
import { DateInput } from '@mantine/dates';

import { useProfileStore } from '@/src/store/profile/profile.store';

import { EMPTY_PROFILE } from '@/src/data/profile/profile.data';

import { useUIStore } from '@/src/store/ui.store';
import { formatCoord, parseToDd } from '@/src/utils/coords.utils';

import styles from './profileEditor.module.scss';

function CoordInput({
  label,
  dd,
  isLat,
  onChange,
}: {
  label: string;
  dd: number | undefined;
  isLat: boolean;
  onChange: (dd: number) => void;
}) {
  const { coord_format, setCoordFormat } = useUIStore();
  const [raw, setRaw] = useState('');

  useEffect(() => {
    if (dd != null && !isNaN(dd)) {
      setRaw(formatCoord(dd, coord_format, isLat));
    }
  }, [coord_format, dd]);

  const commit = () => {
    const parsed = parseToDd(raw);
    if (!isNaN(parsed)) {
      onChange(parsed);
      setRaw(formatCoord(parsed, coord_format, isLat));
    } else if (dd != null && !isNaN(dd)) {
      setRaw(formatCoord(dd, coord_format, isLat));
    }
  };

  return (
    <TextInput
      className={styles.layerInput}
      label={label}
      value={raw}
      onChange={e => setRaw(e.currentTarget.value)}
      onBlur={commit}
      placeholder={coord_format === 'dms' ? `ex: 23°30'45.12"S` : 'ex: -23.512533'}
    />
  );
}

export default function ProfileEditorGeneral() {
  const { profile, updateProfile } = useProfileStore(state => ({ ...state }));
  const { length_units, coord_format, setCoordFormat } = useUIStore();

  const toLen = (m: number) =>
    length_units === 'ft' ? parseFloat((m * 3.28084).toFixed(3)) : m;
  const fromLen = (v: number) =>
    length_units === 'ft' ? parseFloat((v / 3.28084).toFixed(4)) : v;
  const lenLabel = length_units === 'ft' ? 'ft' : 'm';

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

        <DateInput
          className={styles.layerInput}
          label="Data de Construção"
          valueFormat="DD/MM/YYYY"
          value={profile.construction_date ? new Date(profile.construction_date) : null}
          onChange={date => updateField('construction_date', date ? date.toISOString() : '')}
        />

        <div className="flex flex-row items-center gap-2">
          <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>Coordenadas</Text>
          <SegmentedControl
            size="xs"
            value={coord_format}
            onChange={v => setCoordFormat(v as 'dd' | 'dms')}
            data={[
              { label: 'DD', value: 'dd' },
              { label: 'DMS', value: 'dms' },
            ]}
          />
        </div>

        <div className={styles.layerRow}>
          <CoordInput
            label="Latitude"
            dd={profile.lat}
            isLat={true}
            onChange={v => updateField('lat', v)}
          />

          <CoordInput
            label="Longitude"
            dd={profile.lng}
            isLat={false}
            onChange={v => updateField('lng', v)}
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
