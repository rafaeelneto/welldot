/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { useLayoutEffect, useRef } from 'react';

import { Popover } from '@mui/material';

import { SketchPicker } from 'react-color';

import { CellProps } from 'react-datasheet-grid';

// Import the style only once in your app!
import 'react-datasheet-grid/dist/style.css';

import styles from './colorPicker.module.scss';

export const ColorPicker = ({
  focus,
  rowData,
  setRowData,
  stopEditing,
}: CellProps) => {
  const ref = useRef<any>(null);

  // This function will be called only when `focus` changes
  useLayoutEffect(() => {
    if (focus) {
      ref.current?.focus();
    } else {
      // ref.current?.blur();
      handleClose();
    }
  }, [focus]);

  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(
    null
  );

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    stopEditing({ nextRow: false });
  };

  const open = Boolean(anchorEl);
  const id = open ? 'simple-popover' : undefined;

  return (
    <div className={styles.colorContainer}>
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
      <Popover
        id={id}
        open={focus}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        <SketchPicker
          className={styles.colorPicker}
          disableAlpha
          color={rowData}
          onChange={(newColor, _event) => {
            setRowData(newColor.hex);
          }}
        />
      </Popover>
    </div>
  );
};

export default ColorPicker;
