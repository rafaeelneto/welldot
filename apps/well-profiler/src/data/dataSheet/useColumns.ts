import { useMemo } from 'react';
import {
  textColumn,
  floatColumn,
  keyColumn,
  checkboxColumn,
  Column,
} from 'react-datasheet-grid';

import {
  colorPickerColumn,
  customSelectColumn,
  customSelectTextureColumn,
} from '@/src_old/utils/customColumns';
import { FGDC_TEXTURES_OPTIONS } from '@/src_old/utils/fgdcTextures';
import TextureHelper from '@/src_old/components/textureHelperColumn/textureHelper.component';

import {
  BoreHole,
  Cave,
  Fracture,
  HoleFill,
  Lithology,
  SurfaceCase,
  WellCase,
  WellScreen,
} from '@/src/types/profile.types';

import { useUIStore } from '@/src/store/ui.store';
import { inchesColumn, ftColumn } from './unitColumn';

const typedFloatColumn = floatColumn as Partial<Column<number, any, string>>;
const typedTextColumn = textColumn as Partial<Column<string, any, string>>;

export function useColumns() {
  const { diameter_units, length_units } = useUIStore(state => ({
    ...state,
  }));

  const diamLabel = diameter_units === 'inches' ? 'polegadas' : 'mm';
  const lenLabel = length_units === 'ft' ? 'ft' : 'm';

  const diamCol = diameter_units === 'inches' ? inchesColumn : typedFloatColumn;
  const lenCol = length_units === 'ft' ? ftColumn : typedFloatColumn;

  const lithologyColumns = useMemo(
    () => [
      {
        ...keyColumn<Lithology, 'from'>('from', lenCol as any),
        title: `De (${lenLabel})`,
        minWidth: 60,
        maxWidth: 80,
        continuousUpdates: false,
      },
      {
        ...keyColumn<Lithology, 'to'>('to', lenCol as any),
        title: `Até (${lenLabel})`,
        minWidth: 60,
        maxWidth: 80,
        continuousUpdates: false,
      },
      {
        ...keyColumn<Lithology, 'color'>(
          'color',
          colorPickerColumn() as Partial<Column<string, any, string>>,
        ),
        title: 'Cor',
        minWidth: 60,
        maxWidth: 60,
      },
      {
        ...keyColumn<Lithology, 'fgdc_texture'>(
          'fgdc_texture',
          customSelectTextureColumn({ options: FGDC_TEXTURES_OPTIONS }) as Partial<
            Column<string, any, string>
          >,
        ),
        title: TextureHelper(),
        minWidth: 70,
      },
      {
        ...keyColumn<Lithology, 'geologic_unit'>('geologic_unit', typedTextColumn),
        title: 'Unid. Geológica',
        grow: 1,
        minWidth: 100,
      },
      {
        ...keyColumn<Lithology, 'aquifer_unit'>('aquifer_unit', typedTextColumn),
        title: 'Unid. Aquífera',
        grow: 1,
        minWidth: 100,
      },
      {
        ...keyColumn<Lithology, 'description'>('description', typedTextColumn),
        title: 'Descrição',
        grow: 2,
        minWidth: 400,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lenCol, lenLabel],
  );

  const fractureColumns = useMemo(
    () => [
      {
        ...keyColumn<Fracture, 'depth'>('depth', lenCol as any),
        title: `Profundidade (${lenLabel})`,
        minWidth: 60,
        maxWidth: 80,
        continuousUpdates: false,
      },
      {
        ...keyColumn<Fracture, 'dip'>('dip', typedFloatColumn),
        title: 'Mergulho °',
        minWidth: 60,
        maxWidth: 80,
        continuousUpdates: false,
      },
      {
        ...keyColumn<Fracture, 'azimuth'>('azimuth', typedFloatColumn),
        title: 'Azimuth °',
        minWidth: 60,
        maxWidth: 80,
        continuousUpdates: false,
      },
      {
        ...keyColumn<Fracture, 'swarm'>('swarm', checkboxColumn),
        title: 'Enxame',
        minWidth: 60,
        maxWidth: 80,
      },
      {
        ...keyColumn<Fracture, 'water_intake'>('water_intake', checkboxColumn),
        title: `Entrada d'água`,
        minWidth: 60,
        maxWidth: 80,
      },
      {
        ...keyColumn<Fracture, 'description'>('description', typedTextColumn),
        title: 'Descrição',
        grow: 2,
        minWidth: 300,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lenCol, lenLabel],
  );

  const caveColumns = useMemo(
    () => [
      {
        ...keyColumn<Cave, 'from'>('from', lenCol as any),
        title: `De (${lenLabel})`,
        minWidth: 60,
        maxWidth: 80,
        continuousUpdates: false,
      },
      {
        ...keyColumn<Cave, 'to'>('to', lenCol as any),
        title: `Até (${lenLabel})`,
        minWidth: 60,
        maxWidth: 80,
        continuousUpdates: false,
      },
      {
        ...keyColumn<Cave, 'water_intake'>('water_intake', checkboxColumn),
        title: `Entrada d'água`,
        minWidth: 60,
        maxWidth: 80,
      },
      {
        ...keyColumn<Cave, 'description'>('description', typedTextColumn),
        title: 'Descrição',
        grow: 2,
        minWidth: 300,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lenCol, lenLabel],
  );

  const boreHoleColumns = useMemo(
    () => [
      {
        ...keyColumn<BoreHole, 'from'>('from', lenCol as any),
        title: `De (${lenLabel})`,
        minWidth: 60,
        maxWidth: 80,
        continuousUpdates: false,
      },
      {
        ...keyColumn<BoreHole, 'to'>('to', lenCol as any),
        title: `Até (${lenLabel})`,
        minWidth: 60,
        maxWidth: 80,
        continuousUpdates: false,
      },
      {
        ...keyColumn<BoreHole, 'diameter'>('diameter', diamCol as any),
        title: `Diâmetro (${diamLabel})`,
        minWidth: 60,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lenCol, lenLabel, diamCol, diamLabel],
  );

  const holeFillColumns = useMemo(
    () => [
      {
        ...keyColumn<HoleFill, 'from'>('from', lenCol as any),
        title: `De (${lenLabel})`,
        minWidth: 60,
        maxWidth: 80,
        continuousUpdates: false,
      },
      {
        ...keyColumn<HoleFill, 'to'>('to', lenCol as any),
        title: `Até (${lenLabel})`,
        minWidth: 60,
        maxWidth: 80,
        continuousUpdates: false,
      },
      {
        ...keyColumn<HoleFill, 'diameter'>('diameter', diamCol as any),
        title: `Diâmetro (${diamLabel})`,
        minWidth: 80,
        maxWidth: 80,
      },
      {
        ...keyColumn<HoleFill, 'type'>(
          'type',
          customSelectColumn({
            options: [
              { value: 'seal', label: 'Cimento' },
              { value: 'gravel_pack', label: 'Seixo' },
            ],
          }) as Column<'gravel_pack' | 'seal', any>,
        ),
        title: 'Tipo',
        minWidth: 120,
        maxWidth: 120,
      },
      {
        ...keyColumn<HoleFill, 'description'>('description', typedTextColumn),
        title: 'Descrição',
      //   // grow: 2,
        minWidth: 100,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lenCol, lenLabel, diamCol, diamLabel],
  );

  const surfaceCaseColumns = useMemo(
    () => [
      {
        ...keyColumn<SurfaceCase, 'from'>('from', lenCol as any),
        title: `De (${lenLabel})`,
        minWidth: 60,
        maxWidth: 80,
        continuousUpdates: false,
      },
      {
        ...keyColumn<SurfaceCase, 'to'>('to', lenCol as any),
        title: `Até (${lenLabel})`,
        minWidth: 60,
        maxWidth: 80,
        continuousUpdates: false,
      },
      {
        ...keyColumn<SurfaceCase, 'diameter'>('diameter', diamCol as any),
        title: `Diâmetro (${diamLabel})`,
        minWidth: 60,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lenCol, lenLabel, diamCol, diamLabel],
  );

  const wellCaseColumns = useMemo(
    () => [
      {
        ...keyColumn<WellCase, 'from'>('from', lenCol as any),
        title: `De (${lenLabel})`,
        minWidth: 60,
        maxWidth: 80,
        continuousUpdates: false,
      },
      {
        ...keyColumn<WellCase, 'to'>('to', lenCol as any),
        title: `Até (${lenLabel})`,
        minWidth: 60,
        maxWidth: 80,
        continuousUpdates: false,
      },
      {
        ...keyColumn<WellCase, 'diameter'>('diameter', diamCol as any),
        title: `Diâmetro (${diamLabel})`,
        minWidth: 60,
        maxWidth: 80,
      },
      {
        ...keyColumn<WellCase, 'type'>('type', typedTextColumn),
        title: 'Tipo',
        minWidth: 60,
        grow: 2,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lenCol, lenLabel, diamCol, diamLabel],
  );

  const wellScreenColumns = useMemo(
    () => [
      {
        ...keyColumn<WellScreen, 'from'>('from', lenCol as any),
        title: `De (${lenLabel})`,
        minWidth: 40,
        maxWidth: 80,
        continuousUpdates: false,
      },
      {
        ...keyColumn<WellScreen, 'to'>('to', lenCol as any),
        title: `Até (${lenLabel})`,
        minWidth: 40,
        maxWidth: 80,
        continuousUpdates: false,
      },
      {
        ...keyColumn<WellScreen, 'diameter'>('diameter', diamCol as any),
        title: `Diâmetro (${diamLabel})`,
        minWidth: 60,
        maxWidth: 80,
      },
      {
        ...keyColumn<WellScreen, 'screen_slot_mm'>('screen_slot_mm', typedFloatColumn),
        title: 'Ranhura (mm)',
        minWidth: 60,
        maxWidth: 80,
        continuousUpdates: false,
      },
      {
        ...keyColumn<WellScreen, 'type'>('type', typedTextColumn),
        title: 'Tipo',
        minWidth: 100,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lenCol, lenLabel, diamCol, diamLabel],
  );

  return {
    lithologyColumns,
    fractureColumns,
    caveColumns,
    boreHoleColumns,
    holeFillColumns,
    surfaceCaseColumns,
    wellCaseColumns,
    wellScreenColumns,
  };
}
