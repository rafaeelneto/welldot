import React, { useState, useRef } from 'react';

import { DataSheetGrid, AddRowsComponentProps } from 'react-datasheet-grid';

import { Button, NumberInput } from '@mantine/core';

import { PlusCircle } from 'react-feather';

import 'react-datasheet-grid/dist/style.css';

export function CustomAddButton({ addRows }: AddRowsComponentProps) {
  const [value, setValue] = useState<number>(1);
  const [rawValue, setRawValue] = useState<string>(String(value));

  return (
    <div className="flex mt-2 flex-row items-center">
      <Button
        variant="light"
        leftSection={<PlusCircle />}
        onClick={() => addRows(value)}
      >
        Adicionar
      </Button>
      <NumberInput
        className="ml-2 max-w-[100px]"
        suffix=" linhas"
        value={rawValue}
        onBlur={() => setRawValue(String(value))}
        min={1}
        onChange={newValue => {
          setRawValue(newValue as string);
          setValue(Math.max(1, Math.round(parseInt(newValue as string) || 0)));
        }}
        onKeyPress={event => {
          if (event.key === 'Enter') {
            addRows(value);
          }
        }}
      />
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
  const DEFAULT_HEIGHT = 400;

  return (
    <DataSheetGrid
      createRow={defaultValue || undefined}
      ref={ref}
      className="dataSheet h-full !text-sm"
      value={data}
      height={customHeight || DEFAULT_HEIGHT}
      onChange={onChangeValues}
      columns={columns}
      gutterColumn={false}
      addRowsComponent={CustomAddButton}
    />
  );
}

export default DataSheet;
