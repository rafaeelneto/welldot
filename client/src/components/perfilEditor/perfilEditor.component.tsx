import React, { useState, useEffect, useRef } from 'react';
import {
  Button,
  IconButton,
  Collapse,
  Divider,
  TextField,
  ListItemSecondaryAction,
  ListItemText,
  InputAdornment,
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import Popover from '@mui/material/Popover';

import PropTypes from 'prop-types';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

import { format } from 'date-fns';

import { Container, Draggable } from 'react-smooth-dnd';
import { arrayMoveImmutable } from 'array-move';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';

import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';

import Checkbox from '@mui/material/Checkbox';

import {
  ChevronDown,
  ChevronUp,
  Trash,
  PlusCircle,
  Upload,
  Download,
} from 'react-feather';

import download from 'downloadjs';

import PerfilDrawer from '../perfilDrawer/perfilDrawer.component';

import {
  FuroLayer,
  EALayer,
  FiltrosLayer,
  GeologicLayer,
  RevestLayer,
  TuboBocaLayer,
} from './inputComponents';

import styles from './perfilEditor.module.scss';

import {
  onChangeValuesType,
  onChangeListType,
  LayerProps,
} from '../../types/perfilEditor.types';

type PerfilEditorProps = {
  nomePoco?: string;
};

const PERFIL_DEFAULT = {
  geologico: [],
  construtivo: {
    furo: [],
    filtros: [],
    tubo_boca: [],
    revestimento: [],
    espaco_anelar: [],
    laje: {
      tipo: '',
      largura: '',
      espessura: '',
      comprimento: '',
    },
  },
};

const NULL_VALUE = { value: PERFIL_DEFAULT, label: '' };

const GEOLOGIC_COMPONENT_DEFAULT = {
  de: 0,
  ate: 10,
  descricao: '',
  color: '#ff0000',
  fgdc_texture: '',
};

const FURO_COMPONENT_DEFAULT = {
  de: 0,
  ate: 10,
  diam_pol: 10,
};
const REVESTIMENTO_COMPONENT_DEFAULT = {
  de: 0,
  ate: 10,
  tipo: '',
  diam_pol: 10,
};

const FILTROS_COMPONENT_DEFAULT = {
  de: 0,
  ate: 10,
  tipo: '',
  diam_pol: 10,
  ranhura_mm: 0.75,
};
const ESP_ANELAR_COMPONENT_DEFAULT = {
  de: 0,
  ate: 10,
  tipo: 'cimento',
  diam_pol: 10,
  descricao: '',
};
const TUBO_BOCA_COMPONENT_DEFAULT = {
  altura: 20,
  diam_pol: 10,
};

const SortableList = ({
  layers,
  defaultComponent,
  component,
  onChangeList,
  onChangeValues,
}: {
  layers: any[];
  component: any;
  defaultComponent: any;
  onChangeList: onChangeListType;
  onChangeValues: onChangeValuesType;
}) => {
  const onDrop = ({ removedIndex, addedIndex }) => {
    onChangeList(arrayMoveImmutable(layers, removedIndex, addedIndex));
  };
  const onDelete = (index) => {
    const newLayers = [...layers];
    newLayers.splice(index, 1);
    onChangeList(newLayers);
  };
  const onAdd = () => {
    const newLayers = [...layers];
    newLayers.push(defaultComponent);
    onChangeList(newLayers);
  };

  const LayerComponent: React.FC<LayerProps> = component;

  return (
    <List className={styles.sortableList}>
      <Container dragHandleSelector=".drag-handle" lockAxis="y" onDrop={onDrop}>
        {layers.map((item, index) => (
          <Draggable key={index}>
            <ListItem>
              <ListItemIcon
                style={{
                  height: '24px',
                  minWidth: 'auto',
                  marginRight: '5px',
                }}
                className="drag-handle"
              >
                <DragIndicatorIcon />
              </ListItemIcon>
              <ListItemSecondaryAction>
                <IconButton
                  onClick={() => onDelete(index)}
                  edge="end"
                  aria-label="comments"
                >
                  <Trash />
                </IconButton>
              </ListItemSecondaryAction>

              <LayerComponent
                component={item}
                index={index}
                onChangeValues={onChangeValues}
              />
            </ListItem>
          </Draggable>
        ))}
        <ListItem
          className={styles.btnAdd}
          dense
          button
          onClick={() => onAdd()}
        >
          <ListItemIcon
            style={{ height: '24px', minWidth: 'auto', marginRight: '5px' }}
          >
            <PlusCircle />
          </ListItemIcon>
          <ListItemText primary="Adicionar" />
        </ListItem>
      </Container>
    </List>
  );
};

function TabPanel(props) {
  const { children, value, index } = props;

  if (value !== index) return <></>;

  return (
    <div style={{ height: '90%', overflowY: 'auto' }} hidden={value !== index}>
      {value === index ? <>{children}</> : ''}
    </div>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

const PerfilEditor = ({ nomePoco = '' }: PerfilEditorProps) => {
  const inputFile = useRef(null);

  const MARGINS = { TOP: 30, RIGHT: 30, BOTTOM: 15, LEFT: 40 };
  const HEIGHT = 800 - MARGINS.TOP - MARGINS.BOTTOM;
  const WIDTH = 200 - MARGINS.LEFT - MARGINS.RIGHT;

  const [perfilState, setPerfilState] = useState<null | any>(PERFIL_DEFAULT);
  const [changesCounter, setChangesCounter] = useState(0);

  const [geologicChecked, setGeologicChecked] = useState(true);
  const [constructiveChecked, setConstructiveChecked] = useState(true);
  const [lajeChecked, setLajeChecked] = useState(true);

  const [tabValue, setTabValue] = React.useState(0);

  const handleChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleGeologicCheckedChange = () => {
    setGeologicChecked(!geologicChecked);
  };

  const handleConstructiveCheckedChange = () => {
    setConstructiveChecked(!constructiveChecked);
  };

  // SAVE BTN
  const handleSave = () => {
    console.log('SAVE');
  };

  const reorderComponentsDepth = (newGeologicLayers) => {
    const newLayers: any[] = [];
    let currentDepth: number = 0;
    for (let index = 0; index < newGeologicLayers.length; index++) {
      const newLayer = newGeologicLayers[index];
      const layerThickness = newLayer.ate - newLayer.de;
      const newDe = index === 0 ? 0 : currentDepth;
      const newAte = newDe + layerThickness;
      currentDepth += layerThickness;
      newLayers.push({ ...newLayer, de: newDe, ate: newAte });
    }
    return newLayers;
  };

  const onChangePerfilState = (newPerfilState) => {
    setPerfilState(newPerfilState);
    setChangesCounter(changesCounter + 1);
    if (changesCounter > 30) {
      setChangesCounter(0);
      handleSave();
    }
  };

  const reorderHandlers = {
    geologico: (newGeologicLayers) => {
      const newPerfilState = {
        ...perfilState,
        geologico: reorderComponentsDepth(newGeologicLayers),
      };
      onChangePerfilState(newPerfilState);
    },
    espaco_anelar: (newRevectComp) => {
      const newEAList = reorderComponentsDepth(newRevectComp);
      const newPerfilState = {
        ...perfilState,
        construtivo: { ...perfilState.construtivo, espaco_anelar: newEAList },
      };
      onChangePerfilState(newPerfilState);
    },
    tubo_boca: (newRevectComp) => {
      const newTBList = reorderComponentsDepth(newRevectComp);
      const newPerfilState = {
        ...perfilState,
        construtivo: { ...perfilState.construtivo, tubo_boca: newTBList },
      };
      onChangePerfilState(newPerfilState);
    },
    furo: (newRevectComp) => {
      const newFuroList = reorderComponentsDepth(newRevectComp);
      const newPerfilState = {
        ...perfilState,
        construtivo: { ...perfilState.construtivo, furo: newFuroList },
      };
      onChangePerfilState(newPerfilState);
    },
    revestimento: (newRevectComp) => {
      // const newRevestList = reorderComponentsDepth(newRevectComp);
      const newPerfilState = {
        ...perfilState,
        construtivo: {
          ...perfilState.construtivo,
          revestimento: newRevectComp,
        },
      };
      onChangePerfilState(newPerfilState);
    },
    filtros: (newComponents) => {
      // const newRevestList = reorderComponentsDepth(newRevectComp);
      const newPerfilState = {
        ...perfilState,
        construtivo: { ...perfilState.construtivo, filtros: newComponents },
      };
      onChangePerfilState(newPerfilState);
    },
  };

  const onChangeHandlers = {
    geologico: (newLayer, index) => {
      const newLayers = [...perfilState.geologico];
      newLayers[index] = newLayer;
      const newPerfilState = {
        ...perfilState,
        geologico: reorderComponentsDepth(newLayers),
      };
      onChangePerfilState(newPerfilState);
    },
    espaco_anelar: (newEA, index) => {
      const newLayers = [...perfilState.construtivo.espaco_anelar];
      newLayers[index] = newEA;
      const newEAList = reorderComponentsDepth(newLayers);

      const newPerfilState = {
        ...perfilState,
        construtivo: { ...perfilState.construtivo, espaco_anelar: newEAList },
      };
      onChangePerfilState(newPerfilState);
    },
    tubo_boca: (newTB, index) => {
      const newLayers = [...perfilState.construtivo.tubo_boca];
      newLayers[index] = newTB;
      const newTBList = reorderComponentsDepth(newLayers);

      const newPerfilState = {
        ...perfilState,
        construtivo: { ...perfilState.construtivo, tubo_boca: newTBList },
      };
      onChangePerfilState(newPerfilState);
    },
    furo: (newFuros, index) => {
      const newLayers = [...perfilState.construtivo.furo];
      newLayers[index] = newFuros;
      const newFurosList = reorderComponentsDepth(newLayers);

      const newPerfilState = {
        ...perfilState,
        construtivo: { ...perfilState.construtivo, furo: newFurosList },
      };
      onChangePerfilState(newPerfilState);
    },
    revestimento: (newRevest, index) => {
      const newLayers = [...perfilState.construtivo.revestimento];
      newLayers[index] = newRevest;
      // const newRevestList = reorderComponentsDepth(newLayers);

      const newPerfilState = {
        ...perfilState,
        construtivo: { ...perfilState.construtivo, revestimento: newLayers },
      };
      onChangePerfilState(newPerfilState);
    },
    filtros: (newComps, index) => {
      const newLayers = [...perfilState.construtivo.filtros];
      newLayers[index] = newComps;
      // const newRevestList = reorderComponentsDepth(newLayers);

      const newPerfilState = {
        ...perfilState,
        construtivo: { ...perfilState.construtivo, filtros: newLayers },
      };
      onChangePerfilState(newPerfilState);
    },
  };

  const handleLaje = (property, value) => {
    const newLaje = { ...perfilState.construtivo.laje };
    newLaje[property] = value;

    const newPerfilState = {
      ...perfilState,
      construtivo: { ...perfilState.construtivo, laje: newLaje },
    };
    onChangePerfilState(newPerfilState);
  };

  const handleClickFile = (event) => {
    // @ts-ignore
    inputFile.current.click();
  };
  const handleChangeInputFile = (event) => {
    const fileUploaded = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      if (!e) return;
      // @ts-ignore
      const perfilImported = JSON.parse(e.target.result);
      setPerfilState(perfilImported);
    };
    reader.readAsText(fileUploaded);
  };

  return (
    <div className={styles.root}>
      <div className={styles.btnContainer}>
        <Button
          className={styles.mainBtns}
          onClick={handleSave}
          color="primary"
          variant="contained"
        >
          Salvar
        </Button>
        <Button
          className={styles.mainBtns}
          onClick={() => {
            const perfilJSON = JSON.stringify(perfilState);

            const blob = new Blob([perfilJSON], { type: 'application/json' });

            download(
              blob,
              `perfil_${nomePoco.replace(/ /g, '_').toLowerCase()}_${format(
                new Date(),
                'dd_MM_yyyy__hh_mm'
              )}.json`,
              'application/json'
            );
          }}
          startIcon={<Download />}
          color="primary"
        >
          Exportar Dados
        </Button>
        <>
          <Button
            className={styles.mainBtns}
            onClick={handleClickFile}
            startIcon={<Upload />}
            color="primary"
          >
            Importar Dados
          </Button>

          <input
            type="file"
            ref={inputFile}
            onChange={handleChangeInputFile}
            accept="application/json"
            style={{ display: 'none' }}
          />
        </>
      </div>
      <div className={styles.container}>
        <div className={`${styles.perfilContainer}`}>
          <PerfilDrawer
            perfil={perfilState}
            dimensions={{ MARGINS, HEIGHT, WIDTH }}
          />
        </div>
        <div className={styles.dataContainer}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={tabValue}
              onChange={handleChange}
              aria-label="basic tabs example"
            >
              <Tab label="Construtivo" {...a11yProps(0)} />
              <Tab label="Geológico" {...a11yProps(1)} />
            </Tabs>
          </Box>
          <TabPanel value={tabValue} index={0}>
            <div className={styles.inputContainers}>
              <div className={styles.componentContainer}>
                <span className={styles.componentTitle}>
                  Laje:
                  <Checkbox
                    checked={lajeChecked}
                    onChange={(event) => {
                      const { checked } = event.target;

                      if (checked) {
                        const newPerfilState = {
                          ...perfilState,
                          construtivo: {
                            ...perfilState.construtivo,
                            laje: {
                              largura: 3,
                              espessura: 0.25,
                              comprimento: 3,
                              tipo: 'Cimento',
                            },
                          },
                        };
                        setPerfilState(newPerfilState);
                      } else {
                        const newPerfilState = {
                          ...perfilState,
                          construtivo: {
                            ...perfilState.construtivo,
                            laje: { ...PERFIL_DEFAULT.construtivo.laje },
                          },
                        };
                        setPerfilState(newPerfilState);
                      }

                      setLajeChecked(checked);
                    }}
                    inputProps={{ 'aria-label': 'primary checkbox' }}
                  />
                </span>

                <Collapse in={lajeChecked} unmountOnExit>
                  <div>
                    <div className={styles.layerRow}>
                      <TextField
                        size="small"
                        variant="standard"
                        className={styles.layerInput}
                        id="standard-multiline-flexible"
                        label="Largura"
                        type="number"
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">m</InputAdornment>
                          ),
                        }}
                        value={
                          perfilState &&
                          perfilState.construtivo &&
                          perfilState.construtivo.laje &&
                          perfilState.construtivo.laje.largura
                            ? perfilState.construtivo.laje.largura
                            : ''
                        }
                        onChange={(event) => {
                          // eslint-disable-next-line implicit-arrow-linebreak
                          handleLaje('largura', event.target.value);
                        }}
                      />

                      <TextField
                        size="small"
                        variant="standard"
                        className={styles.layerInput}
                        id="standard-multiline-flexible"
                        label="Comprimento"
                        type="number"
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">m</InputAdornment>
                          ),
                        }}
                        value={
                          perfilState &&
                          perfilState.construtivo &&
                          perfilState.construtivo.laje &&
                          perfilState.construtivo.laje.comprimento
                            ? perfilState.construtivo.laje.comprimento
                            : ''
                        }
                        onChange={(event) => {
                          // eslint-disable-next-line implicit-arrow-linebreak
                          handleLaje('comprimento', event.target.value);
                        }}
                      />
                      <TextField
                        size="small"
                        variant="standard"
                        className={styles.layerInput}
                        id="standard-multiline-flexible"
                        label="Espessura"
                        type="number"
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">m</InputAdornment>
                          ),
                        }}
                        value={
                          perfilState &&
                          perfilState.construtivo &&
                          perfilState.construtivo.laje &&
                          perfilState.construtivo.laje.espessura
                            ? perfilState.construtivo.laje.espessura
                            : ''
                        }
                        onChange={(event) => {
                          // eslint-disable-next-line implicit-arrow-linebreak
                          handleLaje('espessura', event.target.value);
                        }}
                      />
                    </div>
                    <TextField
                      size="small"
                      variant="standard"
                      className={styles.layerInput}
                      id="standard-multiline-flexible"
                      label="Tipo"
                      value={
                        perfilState &&
                        perfilState.construtivo &&
                        perfilState.construtivo.laje &&
                        perfilState.construtivo.laje.tipo
                          ? perfilState.construtivo.laje.tipo
                          : ''
                      }
                      onChange={(event) => {
                        // eslint-disable-next-line implicit-arrow-linebreak
                        handleLaje('tipo', event.target.value);
                      }}
                    />
                  </div>
                </Collapse>
              </div>
              <div className={styles.componentContainer}>
                <span className={styles.componentTitle}>Furo:</span>
                {perfilState &&
                perfilState.construtivo &&
                perfilState.construtivo.furo ? (
                  <SortableList
                    defaultComponent={FURO_COMPONENT_DEFAULT}
                    layers={perfilState.construtivo.furo}
                    component={FuroLayer}
                    onChangeList={reorderHandlers.furo}
                    onChangeValues={onChangeHandlers.furo}
                  />
                ) : (
                  ''
                )}
              </div>
              <div className={styles.componentContainer}>
                <span className={styles.componentTitle}>Espaço Anelar:</span>
                {perfilState &&
                perfilState.construtivo &&
                perfilState.construtivo.espaco_anelar ? (
                  <SortableList
                    defaultComponent={ESP_ANELAR_COMPONENT_DEFAULT}
                    layers={perfilState.construtivo.espaco_anelar}
                    component={EALayer}
                    onChangeList={reorderHandlers.espaco_anelar}
                    onChangeValues={onChangeHandlers.espaco_anelar}
                  />
                ) : (
                  ''
                )}
              </div>
              <div className={styles.componentContainer}>
                <span className={styles.componentTitle}>Tubo de Boca:</span>
                {perfilState &&
                perfilState.construtivo &&
                perfilState.construtivo.tubo_boca ? (
                  <SortableList
                    defaultComponent={TUBO_BOCA_COMPONENT_DEFAULT}
                    layers={perfilState.construtivo.tubo_boca}
                    component={TuboBocaLayer}
                    onChangeList={reorderHandlers.tubo_boca}
                    onChangeValues={onChangeHandlers.tubo_boca}
                  />
                ) : (
                  ''
                )}
              </div>
              <div className={styles.componentContainer}>
                <span className={styles.componentTitle}>Revestimento:</span>
                {perfilState &&
                perfilState.construtivo &&
                perfilState.construtivo.revestimento ? (
                  <SortableList
                    defaultComponent={REVESTIMENTO_COMPONENT_DEFAULT}
                    layers={perfilState.construtivo.revestimento}
                    component={RevestLayer}
                    onChangeList={reorderHandlers.revestimento}
                    onChangeValues={onChangeHandlers.revestimento}
                  />
                ) : (
                  ''
                )}
              </div>
              <div className={styles.componentContainer}>
                <span className={styles.componentTitle}>Filtros:</span>
                {perfilState &&
                perfilState.construtivo &&
                perfilState.construtivo.filtros ? (
                  <SortableList
                    defaultComponent={FILTROS_COMPONENT_DEFAULT}
                    layers={perfilState.construtivo.filtros}
                    component={FiltrosLayer}
                    onChangeList={reorderHandlers.filtros}
                    onChangeValues={onChangeHandlers.filtros}
                  />
                ) : (
                  ''
                )}
              </div>
            </div>
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <div className={styles.inputContainers}>
              {perfilState && perfilState.geologico ? (
                <SortableList
                  defaultComponent={GEOLOGIC_COMPONENT_DEFAULT}
                  layers={perfilState.geologico}
                  component={GeologicLayer}
                  onChangeList={reorderHandlers.geologico}
                  onChangeValues={onChangeHandlers.geologico}
                />
              ) : (
                ''
              )}
            </div>
          </TabPanel>
        </div>
      </div>
    </div>
  );
};

export default PerfilEditor;
