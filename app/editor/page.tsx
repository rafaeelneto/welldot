'use client';

import React, { useState, useRef } from 'react';

import {
  Modal,
  Button,
  ActionIcon as IconButton,
  Collapse,
  NumberInput,
  TextInput,
  Tooltip,
  Divider,
  Tabs,
  Checkbox,
} from '@mantine/core';

import { notifications } from '@mantine/notifications';

import Joyride from 'react-joyride';

import { format } from 'date-fns';

import {
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/solid';

import download from 'downloadjs';

import ProfileDrawer from '@/src/components/profileDrawer/profileDrawer.component';

import Info from '@/src/components/info/info.component';

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

import DeleteWell from '@/public/assets/icons/delete_well_icon.svg';
import ExampleWell from '@/public/assets/icons/example_well_icon.svg';

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

          <div className="h-auto py-2 flex flex-row justify-start items-center space-x-3 overflow-x-auto lg:overflow-x-hidden lg:justify-end">
            <Tooltip label="Perfil Exemplo">
              <IconButton
                variant="light"
                size="lg"
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
              >
                <ExampleWell className="h-4 w-4" />
              </IconButton>
            </Tooltip>
            <Divider orientation="vertical" />
            <Button
              variant="light"
              onClick={() => {
                setProfileState({
                  ...PROFILE_DEFAULT,
                  constructive: { ...PROFILE_DEFAULT.constructive },
                });
                handleSave({
                  ...PROFILE_DEFAULT,
                });
              }}
              leftSection={<DeleteWell className="h-4 w-4" />}
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
              leftSection={<DocumentTextIcon className="h-4 w-4" />}
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
              leftSection={<ArrowDownTrayIcon className="h-4 w-4" />}
            >
              Exportar Dados
            </Button>
            <Button
              onClick={handleClickFile}
              leftSection={<ArrowUpTrayIcon className="h-4 w-4" />}
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
            <div className="w-full h-full bg-white rounded-lg relative md:w-2/3">
              <Tabs
                className="h-full"
                defaultValue="constructive"
                value={tabValue}
                onChange={handleChange}
                aria-label="basic tabs example"
              >
                <Tabs.List className="pt-2 pb-0 pl-2 pr-2">
                  <Tabs.Tab value="constructive">Construtivo</Tabs.Tab>
                  <Tabs.Tab value="geology">Geológico</Tabs.Tab>
                  <Tabs.Tab value="info">Info</Tabs.Tab>
                </Tabs.List>
                <Tabs.Panel
                  value="constructive"
                  className="h-[calc(100%-50px)] overflow-y-auto"
                >
                  <div>
                    <div className="flex flex-col p-2.5">
                      <span className="text-lg font-bold text-[#55575D] flex flex-row items-center mb-2">
                        Laje de Proteção Sanitária
                        <Checkbox
                          className="ml-2"
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
                          <TextInput
                            className={`${styles.layerInput}`}
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
                              handleCementPadChange(
                                'type',
                                event.currentTarget.value,
                              );
                            }}
                          />
                          <div className={styles.layerRow}>
                            <NumberInput
                              className={styles.layerInput}
                              id="standard-multiline-flexible"
                              label="Largura"
                              value={
                                profileState &&
                                profileState.constructive &&
                                profileState.constructive.cement_pad &&
                                profileState.constructive.cement_pad.width
                                  ? profileState.constructive.cement_pad.width
                                  : ''
                              }
                              onChange={value => {
                                handleCementPadChange('width', value as string);
                              }}
                            />

                            <NumberInput
                              className={styles.layerInput}
                              id="standard-multiline-flexible"
                              label="Comprimento"
                              value={
                                profileState &&
                                profileState.constructive &&
                                profileState.constructive.cement_pad &&
                                profileState.constructive.cement_pad.length
                                  ? profileState.constructive.cement_pad.length
                                  : ''
                              }
                              onChange={value => {
                                handleCementPadChange(
                                  'length',
                                  value as string,
                                );
                              }}
                            />
                            <NumberInput
                              className={styles.layerInput}
                              id="standard-multiline-flexible"
                              label="Espessura"
                              value={
                                profileState &&
                                profileState.constructive &&
                                profileState.constructive.cement_pad &&
                                profileState.constructive.cement_pad.thickness
                                  ? profileState.constructive.cement_pad
                                      .thickness
                                  : ''
                              }
                              onChange={value => {
                                handleCementPadChange(
                                  'thickness',
                                  value as string,
                                );
                              }}
                            />
                          </div>
                        </div>
                      </Collapse>
                    </div>
                    <section className="grid grid-cols-1 xl:grid-cols-[300px_auto]">
                      <div className="flex flex-col p-2.5">
                        <span className={styles.componentTitle}>Furo:</span>
                        {profileState &&
                        profileState.constructive &&
                        profileState.constructive.bore_hole ? (
                          <DataSheet
                            data={profileState.constructive.bore_hole}
                            onChangeValues={reorderHandlers.bore_hole}
                            columns={boreHoleColumns}
                            defaultValue={() => BORE_HOLE_COMPONENT_DEFAULT}
                            // customHeight={400}
                          />
                        ) : (
                          ''
                        )}
                      </div>
                      <div className="flex flex-col p-2.5">
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
                            // customHeight={400}
                          />
                        ) : (
                          ''
                        )}
                      </div>
                    </section>
                    <section className="grid grid-cols-1 xl:grid-cols-[300px_auto]">
                      <div className="flex flex-col p-2.5">
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
                      <div className="flex flex-col p-2.5">
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
                    </section>
                    <div className="flex flex-col p-2.5">
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
                <Tabs.Panel
                  value="geology"
                  className="h-[calc(100%-50px)] overflow-y-auto"
                >
                  <div className="flex flex-col p-2.5">
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
                  </div>
                </Tabs.Panel>
                <Tabs.Panel
                  value="info"
                  className="h-[calc(100%-50px)] overflow-y-auto"
                >
                  <Info profile={profileState} />
                </Tabs.Panel>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PerfilEditor;
