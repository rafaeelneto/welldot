import {
  DataSheetGrid,
  createTextColumn,
  checkboxColumn,
  textColumn,
  floatColumn,
  keyColumn,
} from 'react-datasheet-grid';

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
    maxWidth: 20,
    continuousUpdates: false,
  },
  {
    ...keyColumn('to', floatColumn),
    title: 'Até (m)',
    maxWidth: 20,
    continuousUpdates: false,
  },
  {
    ...keyColumn('color', colorPickerColumn()),
    title: 'Cor',
    maxWidth: 20,
  },
  {
    ...keyColumn(
      'fgdc_texture',
      customSelectColumn({ options: FGDC_TEXTURES_OPTIONS })
    ),
    title: TextureHelper(),
    maxWidth: 30,
  },
  {
    ...keyColumn('geologic_unit', textColumn),
    title: 'Unid. Geológica',
  },
  {
    ...keyColumn('description', textColumn),
    title: 'Descrição',
  },
];

export const boreHoleColumns = [
  {
    ...keyColumn('from', floatColumn),
    title: 'De (m)',
    continuousUpdates: false,
  },
  {
    ...keyColumn('to', floatColumn),
    title: 'Até (m)',
    continuousUpdates: false,
  },
  {
    ...keyColumn('diam_pol', floatColumn),
    title: 'Diâmetro (pol)',
  },
];

export const holeFillColumns = [
  {
    ...keyColumn('from', floatColumn),
    title: 'De (m)',
    maxWidth: 20,
    continuousUpdates: false,
  },
  {
    ...keyColumn('to', floatColumn),
    title: 'Até (m)',
    maxWidth: 20,
    continuousUpdates: false,
  },
  {
    ...keyColumn('diam_pol', floatColumn),
    title: 'Diâmetro (pol)',
    maxWidth: 20,
  },
  {
    ...keyColumn(
      'type',
      customSelectColumn({
        options: [
          { value: 'seal', label: 'Cimento' },
          { value: 'gravel_pack', label: 'Seixo' },
        ],
      })
    ),
    title: 'Tipo',
  },
  {
    ...keyColumn('description', textColumn),
    title: 'Descrição',
  },
];

export const surfaceCaseColumns = [
  {
    ...keyColumn('from', floatColumn),
    title: 'De (m)',
    continuousUpdates: false,
  },
  {
    ...keyColumn('to', floatColumn),
    title: 'Até (m)',
    continuousUpdates: false,
  },
  {
    ...keyColumn('diam_pol', floatColumn),
    title: 'Diâmetro (pol)',
  },
];

export const wellCaseColumns = [
  {
    ...keyColumn('from', floatColumn),
    title: 'De (m)',
    maxWidth: 20,
    continuousUpdates: false,
  },
  {
    ...keyColumn('to', floatColumn),
    title: 'Até (m)',
    maxWidth: 20,
    continuousUpdates: false,
  },
  {
    ...keyColumn('diam_pol', floatColumn),
    title: 'Diâmetro (pol)',
    maxWidth: 20,
  },
  {
    ...keyColumn('type', textColumn),
    title: 'Tipo',
  },
];

export const wellScreenColumns = [
  {
    ...keyColumn('from', floatColumn),
    title: 'De (m)',
    maxWidth: 20,
    continuousUpdates: false,
  },
  {
    ...keyColumn('to', floatColumn),
    title: 'Até (m)',
    maxWidth: 20,
    continuousUpdates: false,
  },
  {
    ...keyColumn('diam_pol', floatColumn),
    title: 'Diâmetro (pol)',
    maxWidth: 20,
  },
  {
    ...keyColumn('screen_slot_mm', floatColumn),
    title: 'Ranhura (mm)',
    maxWidth: 20,
    continuousUpdates: false,
  },
  {
    ...keyColumn('type', textColumn),
    title: 'Tipo',
  },
];

export default {
  geologyColumns,
  boreHoleColumns,
  holeFillColumns,
  surfaceCaseColumns,
  wellCaseColumns,
  wellScreenColumns,
};
