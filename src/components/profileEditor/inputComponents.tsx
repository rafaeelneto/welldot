import React, { useState, useLayoutEffect, useRef } from 'react';

import {
  TextField,
  InputAdornment,
  Autocomplete,
  Popover,
  IconButton,
  gridClasses,
} from '@mui/material';

import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';

import { SketchPicker } from 'react-color';

import {
  DataSheetGrid,
  createTextColumn,
  checkboxColumn,
  textColumn,
  floatColumn,
  keyColumn,
  CellProps,
} from 'react-datasheet-grid';

// Import the style only once in your app!
import 'react-datasheet-grid/dist/style.css';

import { HelpCircle } from 'react-feather';

import {
  colorPickerColumn,
  customSelectColumn,
} from '../../utils/customColumns';

import { LayerProps } from '../../types/profileEditor.types';

import styles from './profileEditor.module.scss';

import { FGDC_TEXTURES_OPTIONS } from '../../utils/fgdcTextures';

export const GeologicSheet = ({ data, onChangeValues, columns }) => {
  return (
    <DataSheetGrid
      value={data}
      onChange={onChangeValues}
      columns={columns}
      gutterColumn={false}
    />
  );
};

export const HoleFillLayer = ({
  component,
  index,
  onChangeValues,
}: LayerProps) => {
  const { from, to, type, diam_pol, description } = component;
  const updateValues = (newLayer) => {
    onChangeValues(newLayer, index);
  };
  return (
    <div style={{ width: '100%' }}>
      <div className={styles.layerRow}>
        <TextField
          size="small"
          variant="standard"
          className={styles.layerInput}
          id="standard-multiline-flexible"
          label="De"
          type="number"
          InputProps={{
            endAdornment: <InputAdornment position="end">m</InputAdornment>,
          }}
          value={from}
          onChange={(event) => {
            // eslint-disable-next-line implicit-arrow-linebreak
            updateValues({
              ...component,
              from: parseFloat(event.target.value),
            });
          }}
        />
        <TextField
          size="small"
          variant="standard"
          className={styles.layerInput}
          id="standard-multiline-flexible"
          label="Até"
          type="number"
          InputProps={{
            endAdornment: <InputAdornment position="end">m</InputAdornment>,
          }}
          value={to}
          onChange={(event) => {
            // eslint-disable-next-line implicit-arrow-linebreak
            updateValues({ ...component, to: parseFloat(event.target.value) });
          }}
        />
        <TextField
          size="small"
          variant="standard"
          className={styles.layerInput}
          id="standard-multiline-flexible"
          label="Diâmetro"
          InputProps={{
            endAdornment: <InputAdornment position="end">pol</InputAdornment>,
          }}
          type="number"
          value={diam_pol}
          onChange={(event) => {
            // eslint-disable-next-line implicit-arrow-linebreak
            updateValues({
              ...component,
              diam_pol: parseFloat(event.target.value),
            });
          }}
        />
      </div>
      <FormControl className={styles.radioInput} component="fieldset">
        <FormLabel component="legend">Tipo</FormLabel>
        <RadioGroup
          className={styles.radioEA}
          aria-label="tipo"
          defaultValue={type}
          name="radio-buttons-group"
          row
          onChange={(event) => {
            // eslint-disable-next-line implicit-arrow-linebreak
            updateValues({ ...component, type: event.target.value });
          }}
        >
          <FormControlLabel
            value="seal"
            control={<Radio />}
            label="Cimentação"
          />
          <FormControlLabel
            value="gravel_pack"
            control={<Radio />}
            label="Pré-Filtro"
          />
        </RadioGroup>
      </FormControl>
      <TextField
        size="small"
        variant="standard"
        className={styles.layerInput}
        id="standard-multiline-flexible"
        label="Descrição"
        value={description}
        onChange={(event) => {
          // eslint-disable-next-line implicit-arrow-linebreak
          updateValues({
            ...component,
            description: event.target.value,
          });
        }}
      />
    </div>
  );
};

export const WellCaseLayer = ({
  component,
  index,
  onChangeValues,
}: LayerProps) => {
  const { from, to, type, diam_pol } = component;
  const updateValues = (newLayer) => {
    onChangeValues(newLayer, index);
  };
  return (
    <div style={{ width: '100%' }}>
      <div className={styles.layerRow}>
        <TextField
          size="small"
          variant="standard"
          className={styles.layerInput}
          id="standard-multiline-flexible"
          label="De"
          type="number"
          InputProps={{
            endAdornment: <InputAdornment position="end">m</InputAdornment>,
          }}
          value={from}
          onChange={(event) => {
            // eslint-disable-next-line implicit-arrow-linebreak
            updateValues({
              ...component,
              from: parseFloat(event.target.value),
            });
          }}
        />
        <TextField
          size="small"
          variant="standard"
          className={styles.layerInput}
          id="standard-multiline-flexible"
          label="Até"
          type="number"
          InputProps={{
            endAdornment: <InputAdornment position="end">m</InputAdornment>,
          }}
          value={to}
          onChange={(event) => {
            // eslint-disable-next-line implicit-arrow-linebreak
            updateValues({ ...component, to: parseFloat(event.target.value) });
          }}
        />
        <TextField
          size="small"
          variant="standard"
          className={styles.layerInput}
          id="standard-multiline-flexible"
          label="Diâmetro"
          InputProps={{
            endAdornment: <InputAdornment position="end">pol</InputAdornment>,
          }}
          type="number"
          value={diam_pol}
          onChange={(event) => {
            // eslint-disable-next-line implicit-arrow-linebreak
            updateValues({
              ...component,
              diam_pol: parseFloat(event.target.value),
            });
          }}
        />
      </div>
      <TextField
        size="small"
        variant="standard"
        className={styles.layerInput}
        id="standard-multiline-flexible"
        label="Tipo"
        value={type}
        onChange={(event) => {
          // eslint-disable-next-line implicit-arrow-linebreak
          updateValues({ ...component, type: event.target.value });
        }}
      />
    </div>
  );
};

export const BoreHoleLayer = ({
  component,
  index,
  onChangeValues,
}: LayerProps) => {
  const { from, to, diam_pol } = component;
  const updateValues = (newLayer) => {
    onChangeValues(newLayer, index);
  };
  return (
    <div style={{ width: '100%' }}>
      <div className={styles.layerRow}>
        <TextField
          size="small"
          variant="standard"
          className={styles.layerInput}
          id="standard-multiline-flexible"
          label="De"
          type="number"
          InputProps={{
            endAdornment: <InputAdornment position="end">m</InputAdornment>,
          }}
          value={from}
          onChange={(event) => {
            // eslint-disable-next-line implicit-arrow-linebreak
            updateValues({
              ...component,
              from: parseFloat(event.target.value),
            });
          }}
        />
        <TextField
          size="small"
          variant="standard"
          className={styles.layerInput}
          id="standard-multiline-flexible"
          label="Até"
          type="number"
          InputProps={{
            endAdornment: <InputAdornment position="end">m</InputAdornment>,
          }}
          value={to}
          onChange={(event) => {
            // eslint-disable-next-line implicit-arrow-linebreak
            updateValues({ ...component, to: parseFloat(event.target.value) });
          }}
        />
        <TextField
          size="small"
          variant="standard"
          className={styles.layerInput}
          id="standard-multiline-flexible"
          label="Diâmetro"
          InputProps={{
            endAdornment: <InputAdornment position="end">pol</InputAdornment>,
          }}
          type="number"
          value={diam_pol}
          onChange={(event) => {
            // eslint-disable-next-line implicit-arrow-linebreak
            updateValues({
              ...component,
              diam_pol: parseFloat(event.target.value),
            });
          }}
        />
      </div>
    </div>
  );
};

export const SurfaceCaseLayer = ({
  component,
  index,
  onChangeValues,
}: LayerProps) => {
  const { to, from, diam_pol } = component;
  const updateValues = (newLayer) => {
    onChangeValues(newLayer, index);
  };
  return (
    <div style={{ width: '100%' }}>
      <div className={styles.layerRow}>
        <TextField
          size="small"
          variant="standard"
          className={styles.layerInput}
          id="standard-multiline-flexible"
          label="De"
          type="number"
          InputProps={{
            endAdornment: <InputAdornment position="end">m</InputAdornment>,
          }}
          value={from}
          onChange={(event) => {
            // eslint-disable-next-line implicit-arrow-linebreak
            updateValues({
              ...component,
              from: parseFloat(event.target.value),
            });
          }}
        />
        <TextField
          size="small"
          variant="standard"
          className={styles.layerInput}
          id="standard-multiline-flexible"
          label="Até"
          type="number"
          InputProps={{
            endAdornment: <InputAdornment position="end">m</InputAdornment>,
          }}
          value={to}
          onChange={(event) => {
            // eslint-disable-next-line implicit-arrow-linebreak
            updateValues({ ...component, to: parseFloat(event.target.value) });
          }}
        />
        <TextField
          size="small"
          variant="standard"
          className={styles.layerInput}
          id="standard-multiline-flexible"
          label="Diâmetro"
          InputProps={{
            endAdornment: <InputAdornment position="end">pol</InputAdornment>,
          }}
          type="number"
          value={diam_pol}
          onChange={(event) => {
            // eslint-disable-next-line implicit-arrow-linebreak
            updateValues({
              ...component,
              diam_pol: parseFloat(event.target.value),
            });
          }}
        />
      </div>
    </div>
  );
};

export const WellScreenLayer = ({
  component,
  index,
  onChangeValues,
}: LayerProps) => {
  const { from, to, type, diam_pol, screen_slot_mm } = component;
  const updateValues = (newLayer) => {
    onChangeValues(newLayer, index);
  };
  return (
    <div style={{ width: '100%' }}>
      <div className={styles.layerRow}>
        <TextField
          size="small"
          variant="standard"
          className={styles.layerInput}
          id="standard-multiline-flexible"
          label="De"
          InputProps={{
            endAdornment: <InputAdornment position="end">m</InputAdornment>,
          }}
          type="number"
          value={from}
          onChange={(event) => {
            // eslint-disable-next-line implicit-arrow-linebreak
            updateValues({
              ...component,
              from: parseFloat(event.target.value),
            });
          }}
        />
        <TextField
          size="small"
          variant="standard"
          className={styles.layerInput}
          id="standard-multiline-flexible"
          label="Até"
          InputProps={{
            endAdornment: <InputAdornment position="end">m</InputAdornment>,
          }}
          type="number"
          value={to}
          onChange={(event) => {
            // eslint-disable-next-line implicit-arrow-linebreak
            updateValues({ ...component, to: parseFloat(event.target.value) });
          }}
        />
        <TextField
          size="small"
          variant="standard"
          className={styles.layerInput}
          id="standard-multiline-flexible"
          label="Diâmetro"
          InputProps={{
            endAdornment: <InputAdornment position="end">pol</InputAdornment>,
          }}
          type="number"
          value={diam_pol}
          onChange={(event) => {
            // eslint-disable-next-line implicit-arrow-linebreak
            updateValues({
              ...component,
              diam_pol: parseFloat(event.target.value),
            });
          }}
        />
        <TextField
          size="small"
          variant="standard"
          className={styles.layerInput}
          id="standard-multiline-flexible"
          label="Ranhura"
          type="number"
          InputProps={{
            endAdornment: <InputAdornment position="end">mm</InputAdornment>,
          }}
          value={screen_slot_mm}
          onChange={(event) => {
            // eslint-disable-next-line implicit-arrow-linebreak
            updateValues({
              ...component,
              screen_slot_mm: parseFloat(event.target.value),
            });
          }}
        />
      </div>
      <TextField
        size="small"
        variant="standard"
        className={styles.layerInput}
        id="standard-multiline-flexible"
        label="Tipo"
        value={type}
        onChange={(event) => {
          // eslint-disable-next-line implicit-arrow-linebreak
          updateValues({ ...component, type: event.target.value });
        }}
      />
    </div>
  );
};
