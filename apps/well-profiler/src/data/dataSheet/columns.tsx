import {
  checkboxColumn,
  Column,
  floatColumn,
  keyColumn,
  textColumn,
} from 'react-datasheet-grid';

import 'react-datasheet-grid/dist/style.css';

import {
  colorPickerColumn,
  customSelectColumn,
} from '@/src_old/utils/customColumns';

import { FGDC_TEXTURES_OPTIONS } from '@welldot/core';

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
import TextureHelper from '@/src_old/components/textureHelperColumn/textureHelper.component';

const typedFloatColumn = floatColumn as Partial<Column<number, any, string>>;
const typedTextColumn = textColumn as Partial<Column<string, any, string>>;

export const lithologyColumns = [
  {
    ...keyColumn<Lithology, 'from'>('from', typedFloatColumn),
    title: 'De (m)',
    minWidth: 60,
    maxWidth: 80,
    continuousUpdates: false,
  },
  {
    ...keyColumn<Lithology, 'to'>('to', typedFloatColumn),
    title: 'Até (m)',
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
      customSelectColumn({ options: FGDC_TEXTURES_OPTIONS }) as Partial<
        Column<string, any, string>
      >,
    ),
    title: TextureHelper(),
    minWidth: 90,
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
];

export const fractureColumns = [
  {
    ...keyColumn<Fracture, 'depth'>('depth', typedFloatColumn),
    title: 'Profundidade (m)',
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
];

export const caveColumns = [
  {
    ...keyColumn<Cave, 'from'>('from', typedFloatColumn),
    title: 'De (m)',
    minWidth: 60,
    maxWidth: 80,
    continuousUpdates: false,
  },
  {
    ...keyColumn<Cave, 'to'>('to', typedFloatColumn),
    title: 'Até (m)',
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
];

export const boreHoleColumns = [
  {
    ...keyColumn<BoreHole, 'from'>('from', typedFloatColumn),
    title: 'De (m)',
    minWidth: 60,
    maxWidth: 80,
    continuousUpdates: false,
  },
  {
    ...keyColumn<BoreHole, 'to'>('to', typedFloatColumn),
    title: 'Até (m)',
    minWidth: 60,
    maxWidth: 80,
    continuousUpdates: false,
  },
  {
    ...keyColumn<BoreHole, 'diameter'>('diameter', typedFloatColumn),
    title: 'Diâmetro',
    minWidth: 60,
  },
];

export const holeFillColumns = [
  {
    ...keyColumn<HoleFill, 'from'>('from', typedFloatColumn),
    title: 'De (m)',
    minWidth: 60,
    maxWidth: 80,
    continuousUpdates: false,
  },
  {
    ...keyColumn<HoleFill, 'to'>('to', typedFloatColumn),
    title: 'Até (m)',
    minWidth: 60,
    maxWidth: 80,
    continuousUpdates: false,
  },
  {
    ...keyColumn<HoleFill, 'diameter'>('diameter', typedFloatColumn),
    title: 'Diâmetro (mm)',
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
    grow: 2,
    minWidth: 300,
  },
];

export const surfaceCaseColumns = [
  {
    ...keyColumn<SurfaceCase, 'from'>('from', typedFloatColumn),
    title: 'De (m)',
    minWidth: 60,
    maxWidth: 80,
    continuousUpdates: false,
  },
  {
    ...keyColumn<SurfaceCase, 'to'>('to', typedFloatColumn),
    title: 'Até (m)',
    minWidth: 60,
    maxWidth: 80,
    continuousUpdates: false,
  },
  {
    ...keyColumn<SurfaceCase, 'diameter'>('diameter', typedFloatColumn),
    title: 'Diâmetro (mm)',
    minWidth: 60,
  },
];

export const wellCaseColumns = [
  {
    ...keyColumn<WellCase, 'from'>('from', typedFloatColumn),
    title: 'De (m)',
    minWidth: 60,
    maxWidth: 80,
    continuousUpdates: false,
  },
  {
    ...keyColumn<WellCase, 'to'>('to', typedFloatColumn),
    title: 'Até (m)',
    minWidth: 60,
    maxWidth: 80,
    continuousUpdates: false,
  },
  {
    ...keyColumn<WellCase, 'diameter'>('diameter', typedFloatColumn),
    title: 'Diâmetro (mm)',
    minWidth: 60,
    maxWidth: 80,
  },
  {
    ...keyColumn<WellCase, 'type'>('type', typedTextColumn),
    title: 'Tipo',
    minWidth: 60,
    grow: 2,
  },
];

export const wellScreenColumns = [
  {
    ...keyColumn<WellScreen, 'from'>('from', typedFloatColumn),
    title: 'De (m)',
    minWidth: 40,
    maxWidth: 80,
    continuousUpdates: false,
  },
  {
    ...keyColumn<WellScreen, 'to'>('to', typedFloatColumn),
    title: 'Até (m)',
    minWidth: 40,
    maxWidth: 80,
    continuousUpdates: false,
  },
  {
    ...keyColumn<WellScreen, 'diameter'>('diameter', typedFloatColumn),
    title: 'Diâmetro (mm)',
    minWidth: 60,
    maxWidth: 80,
  },
  {
    ...keyColumn<WellScreen, 'screen_slot_mm'>(
      'screen_slot_mm',
      typedFloatColumn,
    ),
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
];
