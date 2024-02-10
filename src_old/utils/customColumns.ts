import { Column } from 'react-datasheet-grid';

import { SelectOptions } from '../types/customColumns.types';

import ColorPicker from '../components/colorPicker/colorPicker.component';
import CustomSelect from '../components/customSelect/customSelect.component';

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
  copyValue: ({ rowData }) =>
    params.options.find(choice => choice.value === rowData)?.label,
  pasteValue: ({ value }) =>
    params.options.find(choice => choice.label === value)?.value ?? null,
});

export default {
  colorPickerColumn,
  customAutocompleteColumn: customSelectColumn,
};
