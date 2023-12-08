/* eslint-disable jsx-a11y/no-autofocus */
import React, { useLayoutEffect, useRef } from 'react';
import { CellProps } from 'react-datasheet-grid';

import Select from 'react-select';

import { SelectOptions } from '../../types/customColumns.types';

import styles from './customSelect.module.scss';

function CustomSelect({
  active,
  rowData,
  setRowData,
  focus,
  stopEditing,
  columnData,
}: CellProps<string | null, SelectOptions>) {
  const ref = useRef<any>(null);

  useLayoutEffect(() => {
    if (focus) {
      ref.current?.focus();
    } else {
      ref.current?.blur();
    }
  }, [focus]);

  const customStyles = {
    container: (provided) => ({
      ...provided,
      flex: 1,
      alignSelf: 'stretch',
      pointerEvents: focus ? undefined : 'none',
    }),
    control: (provided) => ({
      ...provided,
      height: '100%',
      border: 'none',
      boxShadow: 'none',
      background: 'none',
    }),
    indicatorSeparator: (provided) => ({
      ...provided,
      opacity: 0,
    }),
    indicatorsContainer: (provided) => ({
      ...provided,
      opacity: active ? 1 : 0,
    }),
    placeholder: (provided) => ({
      ...provided,
      opacity: active ? 1 : 0,
    }),
  };

  return (
    <Select
      ref={ref}
      styles={customStyles}
      isDisabled={columnData.disabled}
      value={columnData.options.find(({ value }) => value === rowData) ?? null}
      menuPortalTarget={document.body}
      menuIsOpen={focus}
      onChange={({ value }) => {
        setRowData(value);
        setTimeout(stopEditing, 0);
      }}
      onMenuClose={() => stopEditing({ nextRow: false })}
      options={columnData.options}
    />
  );
}

export default CustomSelect;
