'use client';

import React, { useState, useRef } from 'react';

import {
  Modal,
  Button,
  ActionIcon as IconButton,
  Tooltip,
  Divider,
  Tabs,
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

// TODO reactive profileDrawer and info
// import ProfileDrawer from '@/src_old/components/profileDrawer/profileDrawer.component';
// import Info from '@/src_old/components/info/info.component';
// import PDFExport from '@/src/components/export/pdfExport.component';

import TabConstructive from '@/src/views/ProfileEditor/ProfileEditor.constructive';
import TabGeologic from '@/src/views/ProfileEditor/ProfileEditor.geologic';

import { useProfileStore } from '@/src/store/profile/profile.store';

import { convertProfileFromJSON } from '@/src/utils/profile.utils';

import DeleteWell from '@/public/assets/icons/delete_well_icon.svg';
import ExampleWell from '@/public/assets/icons/example_well_icon.svg';

import { getWindow } from '@/src/utils/window.utils';

import styles from './profileEditor.module.scss';
import { EMPTY_PROFILE } from '@/src/data/profile/profile.data';

function ProfileEditor() {
  const inputFile = useRef(null);
  const firstRun = useRef(true);

  const { profile, clear, updateProfile } = useProfileStore(state => ({
    ...state,
  }));

  const [openExport, setOpenExport] = useState(false);

  const [tabValue, setTabValue] = React.useState<string | null>('constructive');

  const changeTab = (newValue: string | null) => {
    setTabValue(newValue);
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

  const handleClickFile = (_event: React.MouseEvent<HTMLButtonElement>) => {
    (inputFile?.current as HTMLButtonElement | null)?.click();
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
      }
    };

    try {
      reader.readAsText(fileUploaded as Blob);
    } catch (e) {
      // user cancelled upload
    }
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
                onChange={changeTab}
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
                  <TabConstructive />
                </Tabs.Panel>
                <Tabs.Panel
                  value="geology"
                  className="h-[calc(100%-50px)] overflow-y-auto"
                >
                  <TabGeologic />
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
