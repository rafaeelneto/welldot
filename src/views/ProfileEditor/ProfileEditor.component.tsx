'use client';

import React, { useState, useRef } from 'react';

import {
  Modal,
  Button,
  ActionIcon as IconButton,
  Tooltip,
  Divider,
  Tabs,
  Popover,
  SegmentedControl,
  Text,
  Stack,
} from '@mantine/core';

// import Joyride from 'react-joyride';
const Joyride = dynamic(() => import('react-joyride'), { ssr: false });

import { format } from 'date-fns';

import {
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/solid';

import download from 'downloadjs';

import ProfileDrawer from '@/src/components/organisms/ProfileDrawer/ProfileDrawer.component';
import Info from '@/src/components/organisms/Info/Info.component';
import PDFExport from '@/src/views/PDFExport/pdfExport.component';

import TabConstructive from '@/src/views/ProfileEditor/ProfileEditor.constructive';
import TabGeologic from '@/src/views/ProfileEditor/ProfileEditor.geologic';

import { useProfileStore } from '@/src/store/profile/profile.store';
import { useUIStore } from '@/src/store/ui.store';

import DeleteWell from '@/public/assets/icons/delete_well_icon.svg';
import ExampleWell from '@/public/assets/icons/example_well_icon.svg';

import { getWindow } from '@/src/utils/window.utils';

import styles from './profileEditor.module.scss';
import { EMPTY_PROFILE } from '@/src/data/profile/profile.data';
import { Profile } from '@/src/types/profile.types';
import dynamic from 'next/dynamic';

function ProfileEditor() {
  const inputFile = useRef(null);
  const firstRun = useRef(true);

  const { profile, clear, updateProfile, updateProfileFromJSON } =
    useProfileStore(state => ({
      ...state,
    }));

  const { diameter_units, length_units, setDiameterUnits, setLengthUnits } = useUIStore();

  const [openExport, setOpenExport] = useState(false);

  const [tabValue, setTabValue] = React.useState<string | null>('constructive');

  const changeTab = (newValue: string | null) => {
    setTabValue(newValue);
  };

  // CHECKS IF THERE IS A WELL ON LOCAL STORAGE AND IF IT IS THE FIRST RUN OF THE APP
  // IF TRUE SETS THE PROFILE STATE TO THE PROFILE STORED ON LOCAL STORAGE
  const savedProfileJson = getWindow()?.localStorage.getItem('profile');

  if (firstRun.current && savedProfileJson) {
    updateProfileFromJSON(savedProfileJson);
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

      updateProfileFromJSON(e.target?.result as string);
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
              <PDFExport
                profile={
                  { ...profile } as Profile & {
                    info: {
                      headingInfo: { label: string; value: string }[];
                      endInfo: { label: string; value: string }[];
                    };
                  }
                }
                onChangeInfo={updateProfile}
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
            <Popover width={240} position="bottom-end" withArrow shadow="md">
              <Popover.Target>
                <Tooltip label="Preferências de Exibição">
                  <IconButton variant="light" size="lg" aria-label="Preferências">
                    <Cog6ToothIcon className="h-4 w-4" />
                  </IconButton>
                </Tooltip>
              </Popover.Target>
              <Popover.Dropdown>
                <Stack gap="sm">
                  <div>
                    <Text size="xs" fw={600} mb={4} c="dimmed">UNIDADE DE DIÂMETRO</Text>
                    <SegmentedControl
                      fullWidth
                      size="xs"
                      value={diameter_units}
                      onChange={v => setDiameterUnits(v as 'mm' | 'inches')}
                      data={[
                        { label: 'mm', value: 'mm' },
                        { label: 'polegadas', value: 'inches' },
                      ]}
                    />
                  </div>
                  <div>
                    <Text size="xs" fw={600} mb={4} c="dimmed">UNIDADE DE COMPRIMENTO</Text>
                    <SegmentedControl
                      fullWidth
                      size="xs"
                      value={length_units}
                      onChange={v => setLengthUnits(v as 'm' | 'ft')}
                      data={[
                        { label: 'm', value: 'm' },
                        { label: 'ft', value: 'ft' },
                      ]}
                    />
                  </div>
                </Stack>
              </Popover.Dropdown>
            </Popover>
            <Divider orientation="vertical" />
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
              <ProfileDrawer profile={profile} />
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
                  <Info profile={profile} />
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
