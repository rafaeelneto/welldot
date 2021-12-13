import React, { useState, useRef, useEffect } from 'react';
import {
  Button,
  IconButton,
  Collapse,
  TextField,
  Tooltip,
  InputAdornment,
  Snackbar,
  Divider,
  InputBase,
} from '@mui/material';

import PropTypes from 'prop-types';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';

import { format } from 'date-fns';

import { Container, Draggable } from 'react-smooth-dnd';
import { arrayMoveImmutable } from 'array-move';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

import Checkbox from '@mui/material/Checkbox';

import {
  Trash,
  PlusCircle,
  Upload,
  Download,
  XCircle,
  FileText,
} from 'react-feather';

import download from 'downloadjs';

import FullScreenDialog from '../dialogs/fullScreenDialog.component';

import PerfilDrawer from '../profileDrawer/profileDrawer.component';

import profileConverter from '../../utils/profileConverter';

import PDFExport from '../export/pdfExport.component';

import {
  BoreHoleLayer,
  HoleFillLayer,
  WellScreenLayer,
  GeologicLayer,
  WellCaseLayer,
  SurfaceCaseLayer,
} from './inputComponents';

import styles from './profileEditor.module.scss';

import { ReactComponent as DeleteWell } from '../../assets/delete_well_icon.svg';
import { ReactComponent as ExampleWell } from '../../assets/example_well_icon.svg';

import {
  onChangeValuesType,
  onChangeListType,
  LayerProps,
} from '../../types/profileEditor.types';

import {
  PROFILE_EXAMPLE,
  PROFILE_DEFAULT,
  BORE_HOLE_COMPONENT_DEFAULT,
  GEOLOGIC_COMPONENT_DEFAULT,
  HOLE_FILL_COMPONENT_DEFAULT,
  SURFACE_CASE_COMPONENT_DEFAULT,
  WELL_CASE_COMPONENT_DEFAULT,
  WELL_SCREEN_COMPONENT_DEFAULT,
} from '../../defaults/profileDefaults';

import { PROFILE_TYPE } from '../../types/profile.types';

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
              <ListItemIcon
                onClick={() => onDelete(index)}
                style={{
                  height: '24px',
                  minWidth: 'auto',
                  marginRight: '5px',
                }}
                className="drag-handle"
              >
                <XCircle />
              </ListItemIcon>

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
          Adicionar
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

const PerfilEditor = () => {
  const inputFile = useRef(null);

  const [profileState, setProfileState] = useState({
    ...PROFILE_DEFAULT,
    constructive: { ...PROFILE_DEFAULT.constructive },
  });

  const [changesCounter, setChangesCounter] = useState(0);

  const [openExport, setOpenExport] = useState(false);

  const [openImportErrorS, setOpenImportErrorS] = useState(false);

  const [tabValue, setTabValue] = React.useState(0);

  const firstRun = useRef(true);

  const handleChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // SAVE BTN
  const handleSave = () => {
    // SAVE ON LOCAL STORAGE
    console.log('AUTO SAVE');
    const profileJSon = JSON.stringify(profileState);
    window.localStorage.setItem('profile', profileJSon);
  };

  // CHECKS IF THERE IS A WELL ON LOCAL STORAGE AND IF IT IS THE FIRST RUN OF THE APP
  // IF TRUE SETS THE PROFILE STATE TO THE PROFILE STORED ON LOCAL STORAGE
  const savedProfileJson = window.localStorage.getItem('profile');

  if (firstRun.current && savedProfileJson) {
    try {
      const { perfilImported } = profileConverter(savedProfileJson);
      setProfileState({ ...perfilImported });
    } catch (error) {
      // error
    }
    firstRun.current = false;
  }

  const reorderComponentsDepth = (newGeologicLayers) => {
    const newLayers: any[] = [];
    let currentDepth: number = 0;
    for (let index = 0; index < newGeologicLayers.length; index++) {
      const newLayer = newGeologicLayers[index];
      const layerThickness = newLayer.to - newLayer.from;
      const newFrom = index === 0 ? 0 : currentDepth;
      const newTo = newFrom + layerThickness;
      currentDepth += layerThickness;
      newLayers.push({ ...newLayer, from: newFrom, to: newTo });
    }
    return newLayers;
  };

  const onChangePerfilState = (newPerfilState: PROFILE_TYPE) => {
    setProfileState(newPerfilState);
    setChangesCounter(changesCounter + 1);
    if (changesCounter > 20) {
      setChangesCounter(0);
      handleSave();
    }
  };

  const reorderHandlers = {
    geologic: (newGeologicLayers) => {
      const newPerfilState = {
        ...profileState,
        geologic: reorderComponentsDepth(newGeologicLayers),
      };
      onChangePerfilState(newPerfilState);
    },
    hole_fill: (newRevectComp) => {
      const newEAList = reorderComponentsDepth(newRevectComp);
      const newPerfilState = {
        ...profileState,
        constructive: { ...profileState.constructive, hole_fill: newEAList },
      };
      onChangePerfilState(newPerfilState);
    },
    surface_case: (newRevectComp) => {
      const newTBList = newRevectComp;
      const newPerfilState = {
        ...profileState,
        constructive: { ...profileState.constructive, surface_case: newTBList },
      };
      onChangePerfilState(newPerfilState);
    },
    bole_hole: (newRevectComp) => {
      const newBoreHoleList = reorderComponentsDepth(newRevectComp);
      const newPerfilState = {
        ...profileState,
        constructive: {
          ...profileState.constructive,
          bole_hole: newBoreHoleList,
        },
      };
      onChangePerfilState(newPerfilState);
    },
    well_case: (newRevectComp) => {
      // const newRevestList = reorderComponentsDepth(newRevectComp);
      const newPerfilState = {
        ...profileState,
        constructive: {
          ...profileState.constructive,
          well_case: newRevectComp,
        },
      };
      onChangePerfilState(newPerfilState);
    },
    well_screen: (newComponents) => {
      // const newRevestList = reorderComponentsDepth(newRevectComp);
      const newPerfilState = {
        ...profileState,
        constructive: {
          ...profileState.constructive,
          well_screen: newComponents,
        },
      };
      onChangePerfilState(newPerfilState);
    },
  };

  const onChangeHandlers = {
    geologic: (newLayer, index) => {
      const newLayers = [...profileState.geologic];
      newLayers[index] = newLayer;
      const newPerfilState = {
        ...profileState,
        geologic: reorderComponentsDepth(newLayers),
      };
      onChangePerfilState(newPerfilState);
    },
    hole_fill: (newEA, index) => {
      const newLayers = [...profileState.constructive.hole_fill];
      newLayers[index] = newEA;
      const newEAList = reorderComponentsDepth(newLayers);

      const newPerfilState = {
        ...profileState,
        constructive: { ...profileState.constructive, hole_fill: newEAList },
      };
      onChangePerfilState(newPerfilState);
    },
    surface_case: (newTB, index) => {
      const newLayers = [...profileState.constructive.surface_case];
      newLayers[index] = newTB;
      const newTBList = reorderComponentsDepth(newLayers);

      const newPerfilState = {
        ...profileState,
        constructive: { ...profileState.constructive, surface_case: newTBList },
      };
      onChangePerfilState(newPerfilState);
    },
    bole_hole: (newbole_holes, index) => {
      const newLayers = [...profileState.constructive.bole_hole];
      newLayers[index] = newbole_holes;
      const newBoleHoleList = reorderComponentsDepth(newLayers);

      const newPerfilState = {
        ...profileState,
        constructive: {
          ...profileState.constructive,
          bole_hole: newBoleHoleList,
        },
      };
      onChangePerfilState(newPerfilState);
    },
    well_case: (newRevest, index) => {
      const newLayers = [...profileState.constructive.well_case];
      newLayers[index] = newRevest;
      // const newRevestList = reorderComponentsDepth(newLayers);

      const newPerfilState = {
        ...profileState,
        constructive: { ...profileState.constructive, well_case: newLayers },
      };
      onChangePerfilState(newPerfilState);
    },
    well_screen: (newComps, index) => {
      const newLayers = [...profileState.constructive.well_screen];
      newLayers[index] = newComps;
      // const newRevestList = reorderComponentsDepth(newLayers);

      const newPerfilState = {
        ...profileState,
        constructive: { ...profileState.constructive, well_screen: newLayers },
      };
      onChangePerfilState(newPerfilState);
    },
  };

  const handleCementPadChange = (property, value) => {
    const newcementPad = { ...profileState.constructive.cement_pad };
    newcementPad[property] = value;

    const newPerfilState = {
      ...profileState,
      constructive: { ...profileState.constructive, cement_pad: newcementPad },
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

      try {
        const { perfilImported, cementPad } = profileConverter(
          e.target?.result
        );
        setProfileState({ ...perfilImported });
      } catch (error) {
        setOpenImportErrorS(true);
      }
    };

    try {
      reader.readAsText(fileUploaded);
    } catch (e) {
      // user cancelled upload
    }
  };

  const checkCementPad = () => {
    if (
      profileState.constructive.cement_pad &&
      profileState.constructive.cement_pad.thickness
    ) {
      return true;
    }
    return false;
  };

  return (
    <div className={styles.root}>
      <div>
        <FullScreenDialog
          open={openExport}
          onResponse={() => setOpenExport(false)}
          btnText={null}
          title="Exportar Perfil"
          alwaysFull
        >
          <PDFExport
            profile={{ ...profileState }}
            onChangeInfo={onChangePerfilState}
          />
        </FullScreenDialog>
      </div>
      <div className={styles.wrapper}>
        <div className={styles.headerContainer}>
          <InputBase
            className={styles.wellNameInput}
            autoComplete="off"
            value={profileState.name || ''}
            placeholder="Nome do Poço"
            onChange={(event) => {
              // eslint-disable-next-line implicit-arrow-linebreak
              onChangePerfilState({
                ...profileState,
                name: event.target.value,
              });
            }}
          />

          <div className={styles.btnContainer}>
            <Snackbar
              className="errorSnackBar"
              anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
              open={openImportErrorS}
              autoHideDuration={6000}
              onClose={() => {
                setOpenImportErrorS(false);
              }}
              message="Erro ao importar o arquivo. Verifique seu arquivo e tente novamente"
              // eslint-disable-next-line no-useless-concat
              key={'top' + 'center'}
            />

            <Tooltip title="Perfil Exemplo">
              <IconButton
                className={styles.mainBtns}
                onClick={() => {
                  setProfileState({
                    ...PROFILE_EXAMPLE,
                    constructive: { ...PROFILE_EXAMPLE.constructive },
                  });
                }}
                color="primary"
              >
                <ExampleWell />
              </IconButton>
            </Tooltip>
            <Divider orientation="vertical" />
            <Button
              className={styles.mainBtns}
              onClick={() => {
                setProfileState({
                  ...PROFILE_DEFAULT,
                  constructive: { ...PROFILE_DEFAULT.constructive },
                });
              }}
              color="primary"
              startIcon={<DeleteWell />}
            >
              Limpar Perfil
            </Button>
            <Button
              className={styles.mainBtns}
              onClick={() => {
                // call pdf function
                // pdfGenerate()
                setOpenExport(true);
              }}
              startIcon={<FileText />}
              color="primary"
            >
              Exportar PDF
            </Button>

            <Button
              className={styles.mainBtns}
              onClick={() => {
                const profileToSave = { ...profileState };

                const perfilJSON = JSON.stringify(profileToSave);

                const blob = new Blob([perfilJSON], {
                  type: 'application/json',
                });

                download(
                  blob,
                  `perfil_${(profileState.name || '')
                    .replace(/ /g, '_')
                    .toLowerCase()}_${format(
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
        </div>
        <div className={styles.container}>
          <div className={`${styles.perfilContainer}`}>
            <PerfilDrawer profile={{ ...profileState }} />
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
                    Laje de Proteção Sanitária
                    <Checkbox
                      checked={checkCementPad()}
                      onChange={(event) => {
                        const { checked } = event.target;

                        if (checked) {
                          const newPerfilState = {
                            ...profileState,
                            constructive: {
                              ...profileState.constructive,
                              cement_pad: {
                                width: 3,
                                thickness: 0.25,
                                length: 3,
                                type: 'Cimento',
                              },
                            },
                          };
                          setProfileState(newPerfilState);
                        } else {
                          const newPerfilState = {
                            ...profileState,
                            constructive: {
                              ...profileState.constructive,
                              cement_pad: {
                                ...PROFILE_DEFAULT.constructive.cement_pad,
                              },
                            },
                          };
                          setProfileState(newPerfilState);
                        }
                      }}
                      inputProps={{ 'aria-label': 'primary checkbox' }}
                    />
                  </span>

                  <Collapse in={checkCementPad()} unmountOnExit>
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
                            profileState &&
                            profileState.constructive &&
                            profileState.constructive.cement_pad &&
                            profileState.constructive.cement_pad.width
                              ? profileState.constructive.cement_pad.width
                              : ''
                          }
                          onChange={(event) => {
                            // eslint-disable-next-line implicit-arrow-linebreak
                            handleCementPadChange('width', event.target.value);
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
                            profileState &&
                            profileState.constructive &&
                            profileState.constructive.cement_pad &&
                            profileState.constructive.cement_pad.length
                              ? profileState.constructive.cement_pad.length
                              : ''
                          }
                          onChange={(event) => {
                            // eslint-disable-next-line implicit-arrow-linebreak
                            handleCementPadChange('length', event.target.value);
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
                            profileState &&
                            profileState.constructive &&
                            profileState.constructive.cement_pad &&
                            profileState.constructive.cement_pad.thickness
                              ? profileState.constructive.cement_pad.thickness
                              : ''
                          }
                          onChange={(event) => {
                            // eslint-disable-next-line implicit-arrow-linebreak
                            handleCementPadChange(
                              'thickness',
                              event.target.value
                            );
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
                          profileState &&
                          profileState.constructive &&
                          profileState.constructive.cement_pad &&
                          profileState.constructive.cement_pad.type
                            ? profileState.constructive.cement_pad.type
                            : ''
                        }
                        onChange={(event) => {
                          // eslint-disable-next-line implicit-arrow-linebreak
                          handleCementPadChange('type', event.target.value);
                        }}
                      />
                    </div>
                  </Collapse>
                </div>
                <div className={styles.componentContainer}>
                  <span className={styles.componentTitle}>Furo:</span>
                  {profileState &&
                  profileState.constructive &&
                  profileState.constructive.bole_hole ? (
                    <SortableList
                      defaultComponent={BORE_HOLE_COMPONENT_DEFAULT}
                      layers={profileState.constructive.bole_hole}
                      component={BoreHoleLayer}
                      onChangeList={reorderHandlers.bole_hole}
                      onChangeValues={onChangeHandlers.bole_hole}
                    />
                  ) : (
                    ''
                  )}
                </div>
                <div className={styles.componentContainer}>
                  <span className={styles.componentTitle}>Espaço Anelar:</span>
                  {profileState &&
                  profileState.constructive &&
                  profileState.constructive.hole_fill ? (
                    <SortableList
                      defaultComponent={HOLE_FILL_COMPONENT_DEFAULT}
                      layers={profileState.constructive.hole_fill}
                      component={HoleFillLayer}
                      onChangeList={reorderHandlers.hole_fill}
                      onChangeValues={onChangeHandlers.hole_fill}
                    />
                  ) : (
                    ''
                  )}
                </div>
                <div className={styles.componentContainer}>
                  <span className={styles.componentTitle}>Tubo de Boca:</span>
                  {profileState &&
                  profileState.constructive &&
                  profileState.constructive.surface_case ? (
                    <SortableList
                      defaultComponent={SURFACE_CASE_COMPONENT_DEFAULT}
                      layers={profileState.constructive.surface_case}
                      component={SurfaceCaseLayer}
                      onChangeList={reorderHandlers.surface_case}
                      onChangeValues={onChangeHandlers.surface_case}
                    />
                  ) : (
                    ''
                  )}
                </div>
                <div className={styles.componentContainer}>
                  <span className={styles.componentTitle}>Revestimento:</span>
                  {profileState &&
                  profileState.constructive &&
                  profileState.constructive.well_case ? (
                    <SortableList
                      defaultComponent={WELL_CASE_COMPONENT_DEFAULT}
                      layers={profileState.constructive.well_case}
                      component={WellCaseLayer}
                      onChangeList={reorderHandlers.well_case}
                      onChangeValues={onChangeHandlers.well_case}
                    />
                  ) : (
                    ''
                  )}
                </div>
                <div className={styles.componentContainer}>
                  <span className={styles.componentTitle}>Filtros:</span>
                  {profileState &&
                  profileState.constructive &&
                  profileState.constructive.well_screen ? (
                    <SortableList
                      defaultComponent={WELL_SCREEN_COMPONENT_DEFAULT}
                      layers={profileState.constructive.well_screen}
                      component={WellScreenLayer}
                      onChangeList={reorderHandlers.well_screen}
                      onChangeValues={onChangeHandlers.well_screen}
                    />
                  ) : (
                    ''
                  )}
                </div>
              </div>
            </TabPanel>
            <TabPanel value={tabValue} index={1}>
              <div className={styles.inputContainers}>
                {profileState && profileState.geologic ? (
                  <SortableList
                    defaultComponent={GEOLOGIC_COMPONENT_DEFAULT}
                    layers={profileState.geologic}
                    component={GeologicLayer}
                    onChangeList={reorderHandlers.geologic}
                    onChangeValues={onChangeHandlers.geologic}
                  />
                ) : (
                  ''
                )}
              </div>
            </TabPanel>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerfilEditor;
