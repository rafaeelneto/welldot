import React, { useState } from 'react';

import {
  TextField,
  InputAdornment,
  Autocomplete,
  Popover,
} from '@mui/material';

import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';

import { SketchPicker } from 'react-color';

import { LayerProps } from '../../types/perfilEditor.types';

import styles from './perfilEditor.module.scss';

const FGDC_TEXTURES = [
  120, 123, 132, 601, 602, 603, 605, 606, 607, 608, 609, 610, 611, 612, 613,
  614, 616, 617, 618, 619, 620, 621, 622, 623, 624, 625, 626, 627, 628, 629,
  630, 631, 632, 633, 634, 635, 636, 637, 638, 639, 640, 641, 642, 643, 644,
  645, 646, 647, 648, 649, 650, 651, 652, 653, 654, 655, 656, 657, 658, 659,
  660, 661, 662, 663, 664, 665, 666, 667, 668, 669, 670, 671, 672, 673, 674,
  675, 676, 677, 678, 679, 680, 681, 682, 683, 684, 685, 686, 701, 702, 703,
  704, 705, 706, 707, 708, 709, 710, 711, 712, 713, 714, 715, 716, 717, 718,
  719, 720, 721, 722, 723, 724, 725, 726, 727, 728, 729, 730, 731, 732, 733,
];

export const GeologicLayer = ({
  component,
  index,
  onChangeValues,
}: LayerProps) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? 'simple-popover' : undefined;

  const { de, ate, color, fgdc_texture, descricao } = component;
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
          value={de}
          onChange={(event) => {
            // eslint-disable-next-line implicit-arrow-linebreak
            updateValues({ ...component, de: event.target.value });
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
          value={ate}
          onChange={(event) => {
            // eslint-disable-next-line implicit-arrow-linebreak
            updateValues({ ...component, ate: event.target.value });
          }}
        />
        <Autocomplete
          id="combo-box-demo"
          className={styles.layerInput}
          options={FGDC_TEXTURES}
          value={fgdc_texture}
          onChange={(event, newValue) => {
            updateValues({ ...component, fgdc_texture: newValue });
          }}
          getOptionLabel={(option) => option.toString()}
          // style={{ width: 300 }}
          renderInput={(params) => (
            <TextField {...params} variant="standard" label="Textura" />
          )}
        />
      </div>
      <div className={`${styles.colorInput} ${styles.layerInput}`}>
        <span>Cor da Camada:</span>
        <div
          aria-describedby={id}
          style={{ backgroundColor: color }}
          className={styles.colorBtn}
          onClick={handleClick}
        />
        <Popover
          id={id}
          open={open}
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
            color={color}
            onChange={(newColor, event) => {
              updateValues({ ...component, color: newColor.hex });
            }}
          />
        </Popover>
      </div>

      <TextField
        size="small"
        variant="standard"
        className={styles.layerInput}
        id="standard-multiline-flexible"
        label="Descrição"
        style={{ width: '100%' }}
        multiline
        value={descricao}
        onChange={(event) => {
          // eslint-disable-next-line implicit-arrow-linebreak
          updateValues({ ...component, descricao: event.target.value });
        }}
      />
    </div>
  );
};

export const EALayer = ({ component, index, onChangeValues }: LayerProps) => {
  const { de, ate, tipo, diam_pol, descricao } = component;
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
          value={de}
          onChange={(event) => {
            // eslint-disable-next-line implicit-arrow-linebreak
            updateValues({ ...component, de: event.target.value });
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
          value={ate}
          onChange={(event) => {
            // eslint-disable-next-line implicit-arrow-linebreak
            updateValues({ ...component, ate: event.target.value });
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
            updateValues({ ...component, diam_pol: event.target.value });
          }}
        />
        <FormControl className={styles.layerInput} component="fieldset">
          <FormLabel component="legend">Tipo:</FormLabel>
          <RadioGroup
            className={styles.radioEA}
            aria-label="tipo"
            defaultValue={tipo}
            name="radio-buttons-group"
            row
            onChange={(event) => {
              // eslint-disable-next-line implicit-arrow-linebreak
              updateValues({ ...component, tipo: event.target.value });
            }}
          >
            <FormControlLabel
              value="cimento"
              control={<Radio />}
              label="Cimentação"
            />
            <FormControlLabel
              value="pre_filtro"
              control={<Radio />}
              label="Pré-Filtro"
            />
          </RadioGroup>
        </FormControl>
      </div>
      <TextField
        size="small"
        variant="standard"
        className={styles.layerInput}
        id="standard-multiline-flexible"
        label="Descrição"
        value={descricao}
        onChange={(event) => {
          // eslint-disable-next-line implicit-arrow-linebreak
          updateValues({ ...component, descricao: event.target.value });
        }}
      />
    </div>
  );
};

export const RevestLayer = ({
  component,
  index,
  onChangeValues,
}: LayerProps) => {
  const { de, ate, tipo, diam_pol } = component;
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
          value={de}
          onChange={(event) => {
            // eslint-disable-next-line implicit-arrow-linebreak
            updateValues({ ...component, de: event.target.value });
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
          value={ate}
          onChange={(event) => {
            // eslint-disable-next-line implicit-arrow-linebreak
            updateValues({ ...component, ate: event.target.value });
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
            updateValues({ ...component, diam_pol: event.target.value });
          }}
        />
      </div>
      <TextField
        size="small"
        variant="standard"
        className={styles.layerInput}
        id="standard-multiline-flexible"
        label="Tipo"
        value={tipo}
        onChange={(event) => {
          // eslint-disable-next-line implicit-arrow-linebreak
          updateValues({ ...component, tipo: event.target.value });
        }}
      />
    </div>
  );
};

export const FuroLayer = ({ component, index, onChangeValues }: LayerProps) => {
  const { de, ate, diam_pol } = component;
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
          value={de}
          onChange={(event) => {
            // eslint-disable-next-line implicit-arrow-linebreak
            updateValues({ ...component, de: event.target.value });
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
          value={ate}
          onChange={(event) => {
            // eslint-disable-next-line implicit-arrow-linebreak
            updateValues({ ...component, ate: event.target.value });
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
            updateValues({ ...component, diam_pol: event.target.value });
          }}
        />
      </div>
    </div>
  );
};

export const TuboBocaLayer = ({
  component,
  index,
  onChangeValues,
}: LayerProps) => {
  const { altura, diam_pol } = component;
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
          label="Altura"
          type="number"
          InputProps={{
            endAdornment: <InputAdornment position="end">m</InputAdornment>,
          }}
          value={altura}
          onChange={(event) => {
            // eslint-disable-next-line implicit-arrow-linebreak
            updateValues({ ...component, altura: event.target.value });
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
            updateValues({ ...component, diam_pol: event.target.value });
          }}
        />
      </div>
    </div>
  );
};

export const FiltrosLayer = ({
  component,
  index,
  onChangeValues,
}: LayerProps) => {
  const { de, ate, tipo, diam_pol, ranhura_mm } = component;
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
          value={de}
          onChange={(event) => {
            // eslint-disable-next-line implicit-arrow-linebreak
            updateValues({ ...component, de: event.target.value });
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
          value={ate}
          onChange={(event) => {
            // eslint-disable-next-line implicit-arrow-linebreak
            updateValues({ ...component, ate: event.target.value });
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
            updateValues({ ...component, diam_pol: event.target.value });
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
          value={ranhura_mm}
          onChange={(event) => {
            // eslint-disable-next-line implicit-arrow-linebreak
            updateValues({ ...component, ranhura_mm: event.target.value });
          }}
        />
      </div>
      <TextField
        size="small"
        variant="standard"
        className={styles.layerInput}
        id="standard-multiline-flexible"
        label="Tipo"
        value={tipo}
        onChange={(event) => {
          // eslint-disable-next-line implicit-arrow-linebreak
          updateValues({ ...component, tipo: event.target.value });
        }}
      />
    </div>
  );
};
