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

import Joyride from 'react-joyride';

import PropTypes from 'prop-types';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';

import { format } from 'date-fns';

import Checkbox from '@mui/material/Checkbox';

import { Upload, Download, FileText } from 'react-feather';

import download from 'downloadjs';

import Profile from '../../model/Profile';

import FullScreenDialog from '../dialogs/fullScreenDialog.component';

import ProfileDrawer from '../profileDrawer/profileDrawer.component';

import Info from '../info/info.component';

import profileConverter from '../../utils/profileConverter';

import PDFExport from '../export/pdfExport.component';

import DataSheet from '../dataSheetComponent/dataSheet.component';
import {
  geologyColumns,
  boreHoleColumns,
  holeFillColumns,
  surfaceCaseColumns,
  wellCaseColumns,
  wellScreenColumns,
} from '../dataSheetComponent/columns';

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
} from '../../utils/profileDefaults';

import { PROFILE_TYPE } from '../../types/profile.types';

function TabPanel(props) {
  const { children, value, index } = props;

  if (value !== index) return <></>;

  return (
    <div style={{ height: '90%' }} hidden={value !== index}>
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
  const handleSave = (profile2Save?: PROFILE_TYPE) => {
    // SAVE ON LOCAL STORAGE
    console.log('AUTO SAVE');
    const profileJSon = JSON.stringify(profile2Save || profileState);
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

  const reorderComponentsByFromDepth = (layers: any[]) => {
    // const sortedComponents = layers.sort(
    //   (a, b) => parseFloat(a.from) - parseFloat(b.from)
    // );
    // return sortedComponents;
    return layers;
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
    well_case: (newWC) => {
      const newWCList = reorderComponentsByFromDepth(newWC);
      const newPerfilState = {
        ...profileState,
        constructive: {
          ...profileState.constructive,
          well_case: newWCList,
        },
      };
      onChangePerfilState(newPerfilState);
    },
    well_screen: (newWS) => {
      const newWSList = reorderComponentsByFromDepth(newWS);
      const newPerfilState = {
        ...profileState,
        constructive: {
          ...profileState.constructive,
          well_screen: newWSList,
        },
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

  const steps = [
    {
      target: '#btn-example',
      content: 'Clique neste botão para ver um perfil de exemplo',
      disableBeacon: true,
    },
  ];

  const tour = window.localStorage.getItem('tour');

  const profile = new Profile(profileState);

  console.log(JSON.stringify(profile));

  return (
    <div className={styles.root}>
      <div>
        {
          // @ts-ignore
          tour && tour === 'true' ? (
            ''
          ) : (
            <Joyride
              run
              disableScrolling
              disableScrollParentFix
              disableOverlay
              hideBackButton
              steps={steps}
              locale={{ close: 'Ok' }}
              callback={({ action }) => {
                if (action === 'close' || action === 'reset') {
                  window.localStorage.setItem('tour', 'true');
                }
              }}
              styles={{
                options: {
                  primaryColor: '#02355a',
                  textColor: '#54575c',
                  zIndex: 1000,
                },
                buttonClose: {
                  // display: 'none',
                },
                overlay: { height: '100%' },
              }}
            />
          )
        }
      </div>
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
                id="btn-example"
                onClick={() => {
                  // @ts-ignore
                  if (window.gtag) {
                    // @ts-ignore
                    window.gtag(
                      'event',
                      'button clicked',
                      'User Interaction',
                      'profile example'
                    );
                  }
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
                handleSave({
                  ...PROFILE_DEFAULT,
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
                // @ts-ignore
                if (window.gtag) {
                  // @ts-ignore
                  window.gtag(
                    'event',
                    'button clicked',
                    'User Interaction',
                    'export pdf button'
                  );
                }
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
                // @ts-ignore
                if (window.gtag) {
                  // @ts-ignore
                  window.gtag(
                    'event',
                    'button clicked',
                    'User Interaction',
                    'download profile'
                  );
                }
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
          <div className={styles.containerWrapper}>
            <div className={`${styles.perfilContainer}`}>
              <ProfileDrawer profile={profileState} />
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
                  <Tab label="Info" {...a11yProps(2)} />
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
                                <InputAdornment position="end">
                                  m
                                </InputAdornment>
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
                              handleCementPadChange(
                                'width',
                                event.target.value
                              );
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
                                <InputAdornment position="end">
                                  m
                                </InputAdornment>
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
                              handleCementPadChange(
                                'length',
                                event.target.value
                              );
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
                                <InputAdornment position="end">
                                  m
                                </InputAdornment>
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
                    profileState.constructive.bore_hole ? (
                      <DataSheet
                        data={profileState.constructive.bore_hole}
                        onChangeValues={reorderHandlers.bole_hole}
                        columns={boreHoleColumns}
                        defaultValue={() => BORE_HOLE_COMPONENT_DEFAULT}
                        customHeight={400}
                      />
                    ) : (
                      ''
                    )}
                  </div>
                  <div className={styles.componentContainer}>
                    <span className={styles.componentTitle}>
                      Espaço Anelar:
                    </span>
                    {profileState &&
                    profileState.constructive &&
                    profileState.constructive.hole_fill ? (
                      <DataSheet
                        data={profileState.constructive.hole_fill}
                        onChangeValues={reorderHandlers.hole_fill}
                        columns={holeFillColumns}
                        defaultValue={() => HOLE_FILL_COMPONENT_DEFAULT}
                        customHeight={400}
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
                      <DataSheet
                        data={profileState.constructive.surface_case}
                        onChangeValues={reorderHandlers.surface_case}
                        columns={surfaceCaseColumns}
                        defaultValue={() => SURFACE_CASE_COMPONENT_DEFAULT}
                        customHeight={400}
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
                      <DataSheet
                        data={profileState.constructive.well_case}
                        onChangeValues={reorderHandlers.well_case}
                        columns={wellCaseColumns}
                        defaultValue={() => WELL_CASE_COMPONENT_DEFAULT}
                        customHeight={400}
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
                      <DataSheet
                        data={profileState.constructive.well_screen}
                        onChangeValues={reorderHandlers.well_screen}
                        columns={wellScreenColumns}
                        defaultValue={() => WELL_SCREEN_COMPONENT_DEFAULT}
                        customHeight={400}
                      />
                    ) : (
                      ''
                    )}
                  </div>
                </div>
              </TabPanel>
              <TabPanel value={tabValue} index={1}>
                {profileState && profileState.geologic ? (
                  <DataSheet
                    data={profileState.geologic}
                    onChangeValues={reorderHandlers.geologic}
                    columns={geologyColumns}
                    defaultValue={() => GEOLOGIC_COMPONENT_DEFAULT}
                  />
                ) : (
                  ''
                )}
              </TabPanel>
              <TabPanel value={tabValue} index={2}>
                <Info profile={profileState} />
              </TabPanel>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerfilEditor;
