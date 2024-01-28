import { textColumn, floatColumn, keyColumn } from 'react-datasheet-grid';

// Import the style only once in your app!
import 'react-datasheet-grid/dist/style.css';

import {
  colorPickerColumn,
  customSelectColumn,
} from '../../utils/customColumns';

import { FGDC_TEXTURES_OPTIONS } from '../../utils/fgdcTextures';

import TextureHelper from '../textureHelperColumn/textureHelper.component';

export const geologyColumns = [
  {
    ...keyColumn('from', floatColumn),
    title: 'De (m)',
    minWidth: 60,
    maxWidth: 80,
    continuousUpdates: false,
  },
  {
    ...keyColumn('to', floatColumn),
    title: 'Até (m)',
    minWidth: 60,
    maxWidth: 80,
    continuousUpdates: false,
  },
  {
    ...keyColumn('color', colorPickerColumn()),
    title: 'Cor',
    minWidth: 60,
    maxWidth: 60,
  },
  {
    ...keyColumn(
      'fgdc_texture',
      customSelectColumn({ options: FGDC_TEXTURES_OPTIONS }),
    ),
    title: TextureHelper(),
    minWidth: 90,
  },
  {
    ...keyColumn('geologic_unit', textColumn),
    title: 'Unid. Geológica',
    grow: 1,
    minWidth: 100,
  },
  {
    ...keyColumn('description', textColumn),
    title: 'Descrição',
    grow: 2,
    minWidth: 400,
  },
];

export const boreHoleColumns = [
  {
    ...keyColumn('from', floatColumn),
    title: 'De (m)',
    minWidth: 60,
    maxWidth: 80,
    continuousUpdates: false,
  },
  {
    ...keyColumn('to', floatColumn),
    title: 'Até (m)',
    minWidth: 60,
    maxWidth: 80,
    continuousUpdates: false,
  },
  {
    ...keyColumn('diam_pol', floatColumn),
    title: 'Diâmetro (pol)',
    minWidth: 60,
  },
];

export const holeFillColumns = [
  {
    ...keyColumn('from', floatColumn),
    title: 'De (m)',
    minWidth: 60,
    maxWidth: 80,
    continuousUpdates: false,
  },
  {
    ...keyColumn('to', floatColumn),
    title: 'Até (m)',
    minWidth: 60,
    maxWidth: 80,
    continuousUpdates: false,
  },
  {
    ...keyColumn('diam_pol', floatColumn),
    title: 'Diâmetro (pol)',
    minWidth: 60,
    maxWidth: 80,
  },
  {
    ...keyColumn(
      'type',
      customSelectColumn({
        options: [
          { value: 'seal', label: 'Cimento' },
          { value: 'gravel_pack', label: 'Seixo' },
        ],
      }),
    ),
    title: 'Tipo',
    minWidth: 60,
    maxWidth: 120,
  },
  {
    ...keyColumn('description', textColumn),
    title: 'Descrição',
    grow: 2,
    minWidth: 300,
  },
];

export const surfaceCaseColumns = [
  {
    ...keyColumn('from', floatColumn),
    title: 'De (m)',
    minWidth: 60,
    maxWidth: 80,
    continuousUpdates: false,
  },
  {
    ...keyColumn('to', floatColumn),
    title: 'Até (m)',
    minWidth: 60,
    maxWidth: 80,
    continuousUpdates: false,
  },
  {
    ...keyColumn('diam_pol', floatColumn),
    title: 'Diâmetro (pol)',
    minWidth: 60,
  },
];

export const wellCaseColumns = [
  {
    ...keyColumn('from', floatColumn),
    title: 'De (m)',
    minWidth: 60,
    maxWidth: 80,
    continuousUpdates: false,
  },
  {
    ...keyColumn('to', floatColumn),
    title: 'Até (m)',
    minWidth: 60,
    maxWidth: 80,
    continuousUpdates: false,
  },
  {
    ...keyColumn('diam_pol', floatColumn),
    title: 'Diâmetro (pol)',
    minWidth: 60,
    maxWidth: 80,
  },
  {
    ...keyColumn('type', textColumn),
    title: 'Tipo',
    minWidth: 60,
    grow: 2,
  },
];

export const wellScreenColumns = [
  {
    ...keyColumn('from', floatColumn),
    title: 'De (m)',
    minWidth: 40,
    maxWidth: 80,
    continuousUpdates: false,
  },
  {
    ...keyColumn('to', floatColumn),
    title: 'Até (m)',
    minWidth: 40,
    maxWidth: 80,
    continuousUpdates: false,
  },
  {
    ...keyColumn('diam_pol', floatColumn),
    title: 'Diâmetro (pol)',
    minWidth: 60,
    maxWidth: 80,
  },
  {
    ...keyColumn('screen_slot_mm', floatColumn),
    title: 'Ranhura (mm)',
    minWidth: 60,
    maxWidth: 80,
    continuousUpdates: false,
  },
  {
    ...keyColumn('type', textColumn),
    title: 'Tipo',
    minWidth: 100,
  },
];
