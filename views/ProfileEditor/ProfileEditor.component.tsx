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
// import PDFExport from '@/src/components/export/pdfExport.component';
import DataSheet from '@/src/components/dataSheetComponent/dataSheet.component';

import { useProfileStore } from '@/store/profile/profile.store';

import { convertProfileFromJSON } from '@/utils/profile.utils';
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

import { getWindow } from '@/utils/window.utils';

import {
  BoreHole,
  HoleFill,
  Lithology,
  Profile,
  SurfaceCase,
  WellCase,
  WellScreen,
} from '@/types/profile.types';

import styles from './profileEditor.module.scss';
import {
  EMPTY_PROFILE,
  BORE_HOLE_FEATURE_DEFAULT,
  HOLE_FILL_FEATURE_DEFAULT,
  WELL_SCREEN_FEATURE_DEFAULT,
  SURFACE_CASE_FEATURE_DEFAULT,
  WELL_CASE_FEATURE_DEFAULT,
  LITHOLOGY_FEATURE_DEFAULT,
} from '@/data/profile/profile.data';

function ProfileEditor() {
  const inputFile = useRef(null);

  const { profile, clear, updateProfile, getUpdateListingFeatures } =
    useProfileStore(state => ({
      ...state,
    }));

  const [changesCounter, setChangesCounter] = useState(0);

  const [openExport, setOpenExport] = useState(false);

  const [openImportErrorS, setOpenImportErrorS] = useState(false);

  const [tabValue, setTabValue] = React.useState<string | null>('constructive');

  const firstRun = useRef(true);

  const handleChange = (newValue: string | null) => {
    setTabValue(newValue);
  };

  // SAVE BTN
  const handleSave = (profile2Save?: Profile) => {
    // SAVE ON LOCAL STORAGE
    console.log('AUTO SAVE');
    const profileJSon = JSON.stringify(profile2Save || profile);
    getWindow()?.localStorage.setItem('profile', profileJSon);
  };

  // CHECKS IF THERE IS A WELL ON LOCAL STORAGE AND IF IT IS THE FIRST RUN OF THE APP
  // IF TRUE SETS THE PROFILE STATE TO THE PROFILE STORED ON LOCAL STORAGE
  const savedProfileJson = getWindow()?.localStorage.getItem('profile');

  if (firstRun.current && savedProfileJson) {
    try {
      const importedWell = convertProfileFromJSON(savedProfileJson);
      if (!importedWell) return null;
      updateProfile({ ...importedWell });
    } catch (error) {
      // error
    }
    firstRun.current = false;
  }

  const handleCementPadChange = (property: string, value: string) => {
    const newcementPad = { ...profile.cement_pad };
    // @ts-ignore
    newcementPad[property] = value;

    const newPerfilState = {
      ...profile,
      cement_pad: newcementPad,
    };
    updateProfile(newPerfilState);
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
        const importedWell = convertProfileFromJSON(e.target?.result as string);
        if (!importedWell) return;
        updateProfile(importedWell);
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
    if (profile.cement_pad && profile.cement_pad.thickness) {
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
              {/* <PDFExport
                profile={{ ...profileState }}
                onChangeInfo={onChangePerfilState}
              /> */}
              jnijfndsfnd
            </Modal.Body>
          </Modal.Content>
        </Modal.Root>
      </div>
      <div className="h-full flex flex-col">
        <div className="flex flex-col-reverse lg:flex-row lg:justify-between lg:max-h-15">
          <input
            className="bg-transparent rounded-lg p-2 text-4xl border-none m-1 font-semibold text-gray-500"
            autoComplete="off"
            value={profile.name || ''}
            placeholder="Nome do Poço"
            onChange={event => {
              // eslint-disable-next-line implicit-arrow-linebreak
              updateProfile({
                ...profile,
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

                  // SET EXAMPLE PROFILE
                  updateProfile({
                    ...EMPTY_PROFILE,
                  });
                }}
              >
                <ExampleWell className="h-4 w-4" />
              </IconButton>
            </Tooltip>
            <Divider orientation="vertical" />
            <Button
              variant="light"
              onClick={clear}
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
                const profileToSave = { ...profile };

                const perfilJSON = JSON.stringify(profileToSave);

                const blob = new Blob([perfilJSON], {
                  type: 'application/json',
                });

                download(
                  blob,
                  `perfil_${(profile.name || '')
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
              {/* <ProfileDrawer profile={profile} /> */}
              <div>kmifdmafa</div>
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
                                ...profile,
                                cement_pad: {
                                  width: 3,
                                  thickness: 0.25,
                                  length: 3,
                                  type: 'Cimento',
                                },
                              };
                              updateProfile(newPerfilState);
                            } else {
                              const newPerfilState = {
                                ...profile,
                                cement_pad: {
                                  ...EMPTY_PROFILE.cement_pad,
                                },
                              };
                              updateProfile(newPerfilState);
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
                            value={profile.cement_pad.type || ''}
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
                              value={profile.cement_pad.width}
                              onChange={value => {
                                handleCementPadChange('width', value as string);
                              }}
                            />

                            <NumberInput
                              className={styles.layerInput}
                              id="standard-multiline-flexible"
                              label="Comprimento"
                              value={profile.cement_pad.length}
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
                              value={profile.cement_pad.thickness}
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
                    <section className="grid grid-cols-1 xl:grid-cols-[600px_auto]">
                      <div className="flex flex-col p-2.5">
                        <span className={styles.componentTitle}>Furo:</span>
                        <DataSheet
                          data={profile.bore_hole}
                          onChangeValues={getUpdateListingFeatures<BoreHole>(
                            'bore_hole',
                          )}
                          columns={boreHoleColumns}
                          defaultValue={() => BORE_HOLE_FEATURE_DEFAULT}
                        />
                      </div>
                      <div className="flex flex-col p-2.5">
                        <span className={styles.componentTitle}>
                          Espaço Anelar:
                        </span>
                        <DataSheet
                          data={profile.hole_fill}
                          onChangeValues={getUpdateListingFeatures<HoleFill>(
                            'hole_fill',
                          )}
                          columns={holeFillColumns}
                          defaultValue={() => HOLE_FILL_FEATURE_DEFAULT}
                        />
                      </div>
                    </section>
                    <section className="grid grid-cols-1 xl:grid-cols-[300px_auto]">
                      <div className="flex flex-col p-2.5">
                        <span className={styles.componentTitle}>
                          Tubo de Boca:
                        </span>
                        <DataSheet
                          data={profile.surface_case}
                          onChangeValues={getUpdateListingFeatures<SurfaceCase>(
                            'surface_case',
                          )}
                          columns={surfaceCaseColumns}
                          defaultValue={() => SURFACE_CASE_FEATURE_DEFAULT}
                        />
                      </div>
                      <div className="flex flex-col p-2.5">
                        <span className={styles.componentTitle}>
                          Revestimento:
                        </span>
                        <DataSheet
                          data={profile.well_case}
                          onChangeValues={getUpdateListingFeatures<WellCase>(
                            'well_case',
                          )}
                          columns={wellCaseColumns}
                          defaultValue={() => WELL_CASE_FEATURE_DEFAULT}
                        />
                      </div>
                    </section>
                    <div className="flex flex-col p-2.5">
                      <span className={styles.componentTitle}>Filtros:</span>
                      <DataSheet
                        data={profile.well_screen}
                        onChangeValues={getUpdateListingFeatures<WellScreen>(
                          'well_screen',
                        )}
                        columns={wellScreenColumns}
                        defaultValue={() => WELL_SCREEN_FEATURE_DEFAULT}
                      />
                    </div>
                  </div>
                </Tabs.Panel>
                <Tabs.Panel
                  value="geology"
                  className="h-[calc(100%-50px)] overflow-y-auto"
                >
                  <div className="flex flex-col p-2.5">
                    <DataSheet
                      data={profile.lithology}
                      onChangeValues={getUpdateListingFeatures<Lithology>(
                        'lithology',
                      )}
                      columns={geologyColumns}
                      defaultValue={() => LITHOLOGY_FEATURE_DEFAULT}
                    />
                  </div>
                </Tabs.Panel>
                <Tabs.Panel
                  value="info"
                  className="h-[calc(100%-50px)] overflow-y-auto"
                >
                  fdafa
                  {/* <Info profile={profile} /> */}
                </Tabs.Panel>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileEditor;
