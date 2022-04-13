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
    title: 'De',
    maxWidth: 20,
    continuousUpdates: false,
  },
  {
    ...keyColumn('to', floatColumn),
    title: 'Até',
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
    title: 'De',
    maxWidth: 20,
    continuousUpdates: false,
  },
  {
    ...keyColumn('to', floatColumn),
    title: 'Até',
    maxWidth: 20,
    continuousUpdates: false,
  },
  {
    ...keyColumn('diam_pol', floatColumn),
    title: 'Diâmetro',
    maxWidth: 20,
  },
];

export default {
  GeologyColumns: geologyColumns,
  BoreHoleColumns: boreHoleColumns,
};
