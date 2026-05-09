import { Column } from 'react-datasheet-grid';

import { SelectOptions } from '../types/customColumns.types';

import ColorPicker from '../components/colorPicker/colorPicker.component';
import CustomSelect from '../components/customSelect/customSelect.component';
import CustomSelectTexture from '../components/customSelect/customSelectTexture.component';

export const colorPickerColumn = (): Column<string | null> => ({
  component: ColorPicker,
  keepFocus: true,
  deleteValue: () => null,
  copyValue: ({ rowData }) => rowData,
  pasteValue: ({ value }) => value ?? null,
});

export const customSelectColumn = (
  params: SelectOptions,
): Column<string | null, SelectOptions, string> => ({
  component: CustomSelect,
  columnData: params,
  disableKeys: true,
  keepFocus: true,
  disabled: params.disabled,
  deleteValue: () => null,
  // @ts-ignore
  copyValue: ({ rowData }) => {
    return rowData ?? null;
  },
  pasteValue: ({ value }) =>
    params.options.find(choice => choice.label === value)?.value ?? null,
});

export const customSelectTextureColumn = (
  params: SelectOptions,
): Column<string | null, SelectOptions, string> => ({
  component: CustomSelectTexture,
  columnData: params,
  disableKeys: true,
  keepFocus: true,
  disabled: params.disabled,
  deleteValue: () => null,
  // @ts-ignore
  copyValue: ({ rowData }) => {
    return rowData ?? null;
  },
  pasteValue: ({ value }) =>
    params.options.find(choice => choice.code === value)?.code ?? null,
});

export default {
  colorPickerColumn,
  customAutocompleteColumn: customSelectColumn,
};
