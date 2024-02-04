/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { useLayoutEffect, useRef } from 'react';

import { Popover } from '@mantine/core';

import { SketchPicker } from 'react-color';

import { CellProps } from 'react-datasheet-grid';

// Import the style only once in your app!
import 'react-datasheet-grid/dist/style.css';

import styles from './colorPicker.module.scss';

function ColorPicker({ focus, rowData, setRowData, stopEditing }: CellProps) {
  const ref = useRef<any>(null);

  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(
    null,
  );

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = (value: boolean) => {
    if (value) {
      return;
    }
    setAnchorEl(null);
    stopEditing({ nextRow: false });
  };

  const open = Boolean(anchorEl);
  const id = open ? 'simple-popover' : undefined;

  // This function will be called only when `focus` changes
  useLayoutEffect(() => {
    if (focus) {
      ref.current?.focus();
    } else {
      // ref.current?.blur();
      handleClose(false);
    }
  }, [focus]);

  return (
    <div className={styles.colorContainer}>
      <Popover id={id} opened={focus} onChange={handleClose}>
        <Popover.Target>
          <div
            role="button"
            ref={ref}
            aria-describedby={id}
            aria-label="Color"
            style={{ backgroundColor: rowData }}
            className={styles.colorBtn}
            tabIndex={0}
            // @ts-ignore
            onFocus={handleClick}
          />
        </Popover.Target>
        <Popover.Dropdown>
          <SketchPicker
            className={styles.colorPicker}
            disableAlpha
            color={rowData}
            onChange={(newColor, _event) => {
              setRowData(newColor.hex);
            }}
          />
        </Popover.Dropdown>
      </Popover>
    </div>
  );
}

export default ColorPicker;
