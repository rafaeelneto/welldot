'use client';

import React, { useState, useRef } from 'react';

import NextImage from 'next/image';

import {
  Modal,
  Button,
  ActionIcon as IconButton,
  Collapse,
  TextInput as TextField,
  Tooltip,
  Divider,
  Tabs,
  Checkbox,
  Input as InputBase,
} from '@mantine/core';

import { notifications } from '@mantine/notifications';

import Joyride from 'react-joyride';

import { format } from 'date-fns';

import { Upload, Download, FileText } from 'react-feather';

import download from 'downloadjs';

import ProfileDrawer from '@/src/components/profileDrawer/profileDrawer.component';

// import Info from '@/src/components/info/info.component';

import { convertProfile } from '@/src/utils/profile.utils';

import PDFExport from '@/src/components/export/pdfExport.component';

import DataSheet from '@/src/components/dataSheetComponent/dataSheet.component';
import {
  geologyColumns,
  boreHoleColumns,
  holeFillColumns,
  surfaceCaseColumns,
  wellCaseColumns,
  wellScreenColumns,
} from '@/src/components/dataSheetComponent/columns';

import DeleteWell from '@/public/assets/delete_well_icon.svg';
import ExampleWell from '@/public/assets/example_well_icon.svg';

import {
  onChangeValuesType,
  onChangeListType,
  LayerProps,
} from '@/src/types/profileEditor.types';

import {
  PROFILE_EXAMPLE,
  PROFILE_DEFAULT,
  BORE_HOLE_COMPONENT_DEFAULT,
  GEOLOGIC_COMPONENT_DEFAULT,
  HOLE_FILL_COMPONENT_DEFAULT,
  SURFACE_CASE_COMPONENT_DEFAULT,
  WELL_CASE_COMPONENT_DEFAULT,
  WELL_SCREEN_COMPONENT_DEFAULT,
} from '@/src/utils/profileDefaults';
import { getWindow } from '@/utils/window';
import { PROFILE_TYPE } from '@/src/types/profile.types';
import styles from './profileEditor.module.scss';

function PerfilEditor() {
  const inputFile = useRef(null);

  const [profileState, setProfileState] = useState({
    ...PROFILE_DEFAULT,
    constructive: { ...PROFILE_DEFAULT.constructive },
  });

  const [changesCounter, setChangesCounter] = useState(0);

  const [openExport, setOpenExport] = useState(false);

  const [openImportErrorS, setOpenImportErrorS] = useState(false);

  const [tabValue, setTabValue] = React.useState<string | null>('constructive');

  const firstRun = useRef(true);

  const handleChange = (newValue: string | null) => {
    setTabValue(newValue);
  };

  // SAVE BTN
  const handleSave = (profile2Save?: PROFILE_TYPE) => {
    // SAVE ON LOCAL STORAGE
    console.log('AUTO SAVE');
    const profileJSon = JSON.stringify(profile2Save || profileState);
    getWindow()?.localStorage.setItem('profile', profileJSon);
  };

  // CHECKS IF THERE IS A WELL ON LOCAL STORAGE AND IF IT IS THE FIRST RUN OF THE APP
  // IF TRUE SETS THE PROFILE STATE TO THE PROFILE STORED ON LOCAL STORAGE
  const savedProfileJson = getWindow()?.localStorage.getItem('profile');

  if (firstRun.current && savedProfileJson) {
    try {
      const { perfilImported } = convertProfile(savedProfileJson);
      setProfileState({ ...perfilImported });
    } catch (error) {
      // error
    }
    firstRun.current = false;
  }

  const reorderComponentsDepth = (newGeologicLayers: any) => {
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
    geologic: (newGeologicLayers: any) => {
      const newPerfilState = {
        ...profileState,
        geologic: reorderComponentsDepth(newGeologicLayers),
      };
      onChangePerfilState(newPerfilState);
    },
    hole_fill: (newRevectComp: any) => {
      const newEAList = reorderComponentsDepth(newRevectComp);
      const newPerfilState = {
        ...profileState,
        constructive: { ...profileState.constructive, hole_fill: newEAList },
      };
      onChangePerfilState(newPerfilState);
    },
    surface_case: (newRevectComp: any) => {
      const newTBList = newRevectComp;
      const newPerfilState = {
        ...profileState,
        constructive: { ...profileState.constructive, surface_case: newTBList },
      };
      onChangePerfilState(newPerfilState);
    },
    bore_hole: (newRevectComp: any) => {
      const newBoreHoleList = reorderComponentsDepth(newRevectComp);
      const newPerfilState = {
        ...profileState,
        constructive: {
          ...profileState.constructive,
          bore_hole: newBoreHoleList,
        },
      };
      onChangePerfilState(newPerfilState);
    },
    well_case: (newWC: any) => {
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
    well_screen: (newWS: any) => {
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

  const handleCementPadChange = (property: string, value: string) => {
    const newcementPad = { ...profileState.constructive.cement_pad };
    // @ts-ignore
    newcementPad[property] = value;

    const newPerfilState = {
      ...profileState,
      constructive: { ...profileState.constructive, cement_pad: newcementPad },
    };
    onChangePerfilState(newPerfilState);
  };

  const handleClickFile = (_event: React.MouseEvent<HTMLButtonElement>) => {
    // @ts-ignore
    inputFile.current.click();
  };

  const handleChangeInputFile = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const fileUploaded = event.target?.files?.[0];
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      if (!e) return;

      try {
        const { perfilImported, cementPad } = convertProfile(e.target?.result);
        setProfileState({ ...perfilImported });
      } catch (error) {
        notifications.show({
          title: 'Default notification',
          message: 'Hey there, your code is awesome! 🤥',
        });
        setOpenImportErrorS(true);
      }
    };

    try {
      reader.readAsText(fileUploaded as Blob);
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

  const tour = getWindow()?.localStorage.getItem('tour');

  return (
    <div className="w-full h-full p-2 relative flex flex-grow overflow-y-auto flex-col bg-gray-100">
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
                  getWindow()?.localStorage.setItem('tour', 'true');
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
        <Modal.Root
          opened={openExport}
          onClose={() => setOpenExport(false)}
          fullScreen
          radius={0}
          transitionProps={{ transition: 'slide-up', duration: 400 }}
        >
          <Modal.Content style={{ overflow: 'hidden' }}>
            <Modal.Header>
              <Modal.Title>Exportar Perfil</Modal.Title>
              <Modal.CloseButton />
            </Modal.Header>
            <Modal.Body style={{ height: 'calc(100% - 60px)' }}>
              <PDFExport
                profile={{ ...profileState }}
                onChangeInfo={onChangePerfilState}
              />
            </Modal.Body>
          </Modal.Content>
        </Modal.Root>
      </div>
      <div className="h-full flex flex-col">
        <div className="flex flex-col-reverse lg:flex-row lg:justify-between lg:max-h-15">
          <input
            className="bg-transparent rounded-lg p-2 text-4xl border-none m-1 font-semibold text-gray-500"
            autoComplete="off"
            value={profileState.name || ''}
            placeholder="Nome do Poço"
            onChange={event => {
              // eslint-disable-next-line implicit-arrow-linebreak
              onChangePerfilState({
                ...profileState,
                name: event.target.value,
              });
            }}
          />

          <div className="h-auto py-2 flex flex-row justify-start space-x-3 overflow-x-auto lg:overflow-x-hidden lg:justify-end">
            <Tooltip label="Perfil Exemplo">
              <IconButton
                variant="filled"
                aria-label="Settings"
                id="btn-example"
                onClick={() => {
                  // @ts-ignore
                  if (getWindow()?.gtag) {
                    // @ts-ignore
                    getWindow()?.gtag(
                      'event',
                      'button clicked',
                      'User Interaction',
                      'profile example',
                    );
                  }
                  setProfileState({
                    ...PROFILE_EXAMPLE,
                    constructive: { ...PROFILE_EXAMPLE.constructive },
                  });
                }}
                color="primary"
              >
                <NextImage src={ExampleWell} alt="example well" />
              </IconButton>
            </Tooltip>
            <Divider orientation="vertical" />
            <Button
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
              leftSection={<NextImage src={DeleteWell} alt="example well" />}
            >
              Limpar Perfil
            </Button>
            <Button
              onClick={() => {
                // call pdf function
                // pdfGenerate()
                // @ts-ignore
                if (getWindow()?.gtag) {
                  // @ts-ignore
                  getWindow()?.gtag(
                    'event',
                    'button clicked',
                    'User Interaction',
                    'export pdf button',
                  );
                }
                setOpenExport(true);
              }}
              leftSection={<FileText />}
              color="primary"
            >
              Exportar PDF
            </Button>

            <Button
              onClick={() => {
                // @ts-ignore
                if (getWindow()?.gtag) {
                  // @ts-ignore
                  getWindow()?.gtag(
                    'event',
                    'button clicked',
                    'User Interaction',
                    'download profile',
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
                    'dd_MM_yyyy__hh_mm',
                  )}.json`,
                  'application/json',
                );
              }}
              leftSection={<Download />}
              color="primary"
            >
              Exportar Dados
            </Button>
            <Button
              onClick={handleClickFile}
              leftSection={<Upload />}
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
          </div>
        </div>
        <div className="h-full overflow-x-auto">
          <div className="flex relative h-full flex-row w-auto md:overflow-hidden">
            <div className={`${styles.perfilContainer}`} id="profileContainer">
              <ProfileDrawer profile={profileState} />
            </div>
            <div className="w-full h-full p-5 bg-white rounded-lg relative md:w-2/3">
              <Tabs
                className="h-full"
                defaultValue="constructive"
                value={tabValue}
                onChange={handleChange}
                aria-label="basic tabs example"
              >
                <Tabs.List>
                  <Tabs.Tab value="constructive">Construtivo</Tabs.Tab>
                  <Tabs.Tab value="geology">Geológico</Tabs.Tab>
                  <Tabs.Tab value="info">Info</Tabs.Tab>
                </Tabs.List>
                <Tabs.Panel
                  value="constructive"
                  className="h-full overflow-y-auto"
                >
                  <div className="h-full">
                    <div className={styles.componentContainer}>
                      <span className={styles.componentTitle}>
                        Laje de Proteção Sanitária
                        <Checkbox
                          checked={checkCementPad()}
                          onChange={event => {
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
                        />
                      </span>

                      <Collapse in={checkCementPad()}>
                        <div>
                          <div className={styles.layerRow}>
                            <TextField
                              size="small"
                              variant="standard"
                              className={styles.layerInput}
                              id="standard-multiline-flexible"
                              label="Largura"
                              type="number"
                              value={
                                profileState &&
                                profileState.constructive &&
                                profileState.constructive.cement_pad &&
                                profileState.constructive.cement_pad.width
                                  ? profileState.constructive.cement_pad.width
                                  : ''
                              }
                              onChange={event => {
                                // eslint-disable-next-line implicit-arrow-linebreak
                                handleCementPadChange(
                                  'width',
                                  event.target.value,
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
                              value={
                                profileState &&
                                profileState.constructive &&
                                profileState.constructive.cement_pad &&
                                profileState.constructive.cement_pad.length
                                  ? profileState.constructive.cement_pad.length
                                  : ''
                              }
                              onChange={event => {
                                // eslint-disable-next-line implicit-arrow-linebreak
                                handleCementPadChange(
                                  'length',
                                  event.target.value,
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
                              value={
                                profileState &&
                                profileState.constructive &&
                                profileState.constructive.cement_pad &&
                                profileState.constructive.cement_pad.thickness
                                  ? profileState.constructive.cement_pad
                                      .thickness
                                  : ''
                              }
                              onChange={event => {
                                // eslint-disable-next-line implicit-arrow-linebreak
                                handleCementPadChange(
                                  'thickness',
                                  event.target.value,
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
                            onChange={event => {
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
                          onChangeValues={reorderHandlers.bore_hole}
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
                      <span className={styles.componentTitle}>
                        Tubo de Boca:
                      </span>
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
                      <span className={styles.componentTitle}>
                        Revestimento:
                      </span>
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
                </Tabs.Panel>
                <Tabs.Panel value="geology">
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
                </Tabs.Panel>
                {/* <Tabs.Panel value="info">
                <Info profile={profileState} />
              </Tabs.Panel> */}
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PerfilEditor;
