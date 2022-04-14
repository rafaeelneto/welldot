import React, { useState, useLayoutEffect, useRef, useEffect } from 'react';

import {
  DataSheetGrid,
  createTextColumn,
  checkboxColumn,
  textColumn,
  floatColumn,
  keyColumn,
  CellProps,
  AddRowsComponentProps,
} from 'react-datasheet-grid';

// Import the style only once in your app!
import 'react-datasheet-grid/dist/style.css';

import styles from './dataSheet.module.scss';

// import './dataSheetCustomStyles.css';

import { FGDC_TEXTURES_OPTIONS } from '../../utils/fgdcTextures';

export const CustomAddButton = ({ addRows }: AddRowsComponentProps) => {
  const [value, setValue] = useState<number>(1);
  const [rawValue, setRawValue] = useState<string>(String(value));

  return (
    <div className="dsg-add-row">
      <button
        type="button"
        className="dsg-add-row-btn"
        onClick={() => addRows(value)}
      >
        Adicionar
      </button>{' '}
      <input
        className="dsg-add-row-input"
        value={rawValue}
        onBlur={() => setRawValue(String(value))}
        type="number"
        min={1}
        onChange={(e) => {
          setRawValue(e.target.value);
          setValue(Math.max(1, Math.round(parseInt(e.target.value) || 0)));
        }}
        onKeyPress={(event) => {
          if (event.key === 'Enter') {
            addRows(value);
          }
        }}
      />{' '}
      linhas
    </div>
  );
};

type dataSheetProps = {
  data: any[];
  onChangeValues: any;
  columns: any;
  defaultValue?: (() => any) | undefined;
};

const DataSheet = ({
  data,
  onChangeValues,
  columns,
  defaultValue = undefined,
}: dataSheetProps) => {
  const ref = useRef<any>(null);
  const [height, setHeight] = useState(400);

  useEffect(() => {
    if (ref.current) {
      setHeight(ref.current.clientHeight);
    }
  }, [ref]);

  return (
    <div ref={ref} className={styles.dataSheetContainer}>
      <DataSheetGrid
        createRow={defaultValue || undefined}
        className={styles.dataSheet}
        value={data}
        height={height - 50}
        onChange={onChangeValues}
        columns={columns}
        gutterColumn={false}
        addRowsComponent={CustomAddButton}
      />
    </div>
  );
};

export default DataSheet;
