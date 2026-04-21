import React, { useEffect, useRef, useState } from 'react';
import { floatColumn, Column } from 'react-datasheet-grid';

type AnyColumn = Partial<Column<number | null, any, any>>;

const cellStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  height: '100%',
  padding: '0 5px',
  border: 'none',
  outline: 'none',
  background: 'transparent',
  fontSize: 'inherit',
  fontFamily: 'inherit',
};

function createUnitComponent(
  toDisplay: (v: number) => number,
  fromDisplay: (v: number) => number,
) {
  const UnitFloatCell = ({ rowData, setRowData, focus, stopEditing }: any) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [inputValue, setInputValue] = useState(
      rowData != null ? String(toDisplay(rowData)) : '',
    );

    useEffect(() => {
      if (focus) inputRef.current?.select();
    }, [focus]);

    useEffect(() => {
      if (!focus) {
        setInputValue(rowData != null ? String(toDisplay(rowData)) : '');
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rowData, focus]);

    return (
      <input
        ref={inputRef}
        type="number"
        style={{ ...cellStyle, pointerEvents: focus ? 'auto' : 'none' }}
        value={inputValue}
        onChange={e => {
          const raw = e.target.value;
          setInputValue(raw);
          const n = parseFloat(raw);
          setRowData(isNaN(n) ? null : fromDisplay(n));
        }}
        onKeyDown={e => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            stopEditing({ nextRow: false });
          }
        }}
      />
    );
  };
  UnitFloatCell.displayName = 'UnitFloatCell';
  return UnitFloatCell;
}

const base = floatColumn as AnyColumn;

const inchesComponent = createUnitComponent(
  mm => parseFloat((mm / 25.4).toFixed(3)),
  inches => parseFloat((inches * 25.4).toFixed(2)),
);

export const inchesColumn: AnyColumn = {
  ...base,
  component: inchesComponent,
  copyValue: ({ rowData }: { rowData: number | null }) =>
    rowData != null ? String(parseFloat((rowData / 25.4).toFixed(3))) : null,
  pasteValue: ({ value }: { value: string }) => {
    const n = parseFloat(value);
    return isNaN(n) ? null : parseFloat((n * 25.4).toFixed(2));
  },
};

const ftComponent = createUnitComponent(
  m => parseFloat((m * 3.28084).toFixed(3)),
  ft => parseFloat((ft / 3.28084).toFixed(4)),
);

export const ftColumn: AnyColumn = {
  ...base,
  component: ftComponent,
  copyValue: ({ rowData }: { rowData: number | null }) =>
    rowData != null ? String(parseFloat((rowData * 3.28084).toFixed(3))) : null,
  pasteValue: ({ value }: { value: string }) => {
    const n = parseFloat(value);
    return isNaN(n) ? null : parseFloat((n / 3.28084).toFixed(4));
  },
};
