import React, { useState, useRef, useEffect } from 'react';

import { DataSheetGrid, AddRowsComponentProps } from 'react-datasheet-grid';

import 'react-datasheet-grid/dist/style.css';

import styles from './dataSheet.module.scss';

export function CustomAddButton({ addRows }: AddRowsComponentProps) {
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
        onChange={e => {
          setRawValue(e.target.value);
          setValue(Math.max(1, Math.round(parseInt(e.target.value) || 0)));
        }}
        onKeyPress={event => {
          if (event.key === 'Enter') {
            addRows(value);
          }
        }}
      />{' '}
      linhas
    </div>
  );
}

type dataSheetProps = {
  data: any[];
  onChangeValues: any;
  columns: any;
  defaultValue?: (() => any) | undefined;
  customHeight?: number;
};

function DataSheet({
  data,
  onChangeValues,
  columns,
  defaultValue = undefined,
  customHeight,
}: dataSheetProps) {
  const ref = useRef<any>(null);
  const [height, setHeight] = useState(400);

  useEffect(() => {
    if (ref.current) {
      setHeight(
        (document.querySelector(`.${styles.dataSheet}`)?.clientHeight || 400) -
          40,
      );
    }
  }, [ref]);

  return (
    <DataSheetGrid
      createRow={defaultValue || undefined}
      ref={ref}
      className={styles.dataSheet}
      value={data}
      height={customHeight || height}
      onChange={onChangeValues}
      columns={columns}
      gutterColumn={false}
      addRowsComponent={CustomAddButton}
    />
  );
}

export default DataSheet;
