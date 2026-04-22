'use client';

import LZString from 'lz-string';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';

import {
  Button,
  Divider,
  ActionIcon as IconButton,
  Modal,
  Popover,
  SegmentedControl,
  Stack,
  Tabs,
  Text,
  Tooltip,
} from '@mantine/core';
import { useClipboard } from '@mantine/hooks';

// import Joyride from 'react-joyride';
const Joyride = dynamic(() => import('react-joyride'), { ssr: false });

import { format } from 'date-fns';

import {
  ArrowDownOnSquareIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  FolderOpenIcon,
  ShareIcon,
} from '@heroicons/react/24/solid';

import {
  checkIfProfileIsEmpty,
  profileToWell,
} from '@/src/utils/profile.utils';
import download from 'downloadjs';

import ProfileDrawer from '@/src/components/organisms/ProfileDrawer/ProfileDrawer.component';
import Info from '@/src/components/organisms/Summary/Summary.component';
import PDFExport from '@/src/views/PDFExport/pdfExport.component';

import TabConstructive from '@/src/views/ProfileEditor/ProfileEditor.constructive';
import TabGeneral from '@/src/views/ProfileEditor/ProfileEditor.general';
import TabGeologic from '@/src/views/ProfileEditor/ProfileEditor.geologic';

import { useProfileStore } from '@/src/store/profile/profile.store';
import { useUIStore } from '@/src/store/ui.store';

import DeleteWell from '@/public/assets/icons/delete_well_icon.svg';
import ExampleWell from '@/public/assets/icons/example_well_icon.svg';

import { getWindow } from '@/src/utils/window.utils';

import { PROFILE_EXAMPLE } from '@/src/data/profile/profile.data';
import { Profile } from '@/src/types/profile.types';
import dynamic from 'next/dynamic';
import styles from './profileEditor.module.scss';

function ProfileEditor() {
  const inputFile = useRef(null);
  const firstRun = useRef(true);
  const router = useRouter();
  const searchParams = useSearchParams();

  const { profile, clear, updateProfile, updateProfileFromJSON } =
    useProfileStore(state => ({
      ...state,
    }));

  const {
    diameter_units,
    length_units,
    setDiameterUnits,
    setLengthUnits,
    coord_format,
    setCoordFormat,
  } = useUIStore();

  const clipboard = useClipboard({ timeout: 2000 });

  const [openExport, setOpenExport] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const pendingImportJson = useRef<string | null>(null);

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

  const removeParamFromUrl = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('p');
    const query = params.toString();
    router.replace(query ? `?${query}` : window.location.pathname, {
      scroll: false,
    });
  };

  // Detect ?p= param on mount and prompt user before overwriting
  useEffect(() => {
    const encoded = searchParams.get('p');
    if (!encoded) return;
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    if (!json) {
      removeParamFromUrl();
      return;
    }
    pendingImportJson.current = json;
    if (checkIfProfileIsEmpty(profile)) {
      updateProfileFromJSON(json);
      removeParamFromUrl();
      return;
    }
    setImportModalOpen(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClickFile = (_event: React.MouseEvent<HTMLButtonElement>) => {
    (inputFile?.current as HTMLButtonElement | null)?.click();
  };

  const handleChangeInputFile = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const fileUploaded = event.target?.files?.[0];
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      console.log('File loaded:', e.target?.result);
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
      <Modal
        opened={importModalOpen}
        onClose={() => {
          setImportModalOpen(false);
          removeParamFromUrl();
        }}
        title="Sobrescrever perfil atual?"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            Um perfil foi detectado no link. Deseja substituir o perfil atual
            pelo perfil do link?
          </Text>
          <Text size="sm" c="orange" fw={500}>
            Salve seu perfil atual antes de continuar para não perder os dados.
          </Text>
          <Button
            leftSection={<ArrowDownOnSquareIcon className="h-4 w-4" />}
            variant="light"
            onClick={() => {
              const wellData = profileToWell({ ...profile });
              const blob = new Blob([wellData], {
                type: 'application/vnd.well+json',
              });
              const safeName = (profile.name || '')
                .replace(/ /g, '_')
                .toLowerCase();
              download(
                blob,
                `perfil_${safeName}_${format(new Date(), 'dd_MM_yyyy__hh_mm')}.well`,
                'application/vnd.well+json',
              );
            }}
          >
            Salvar perfil atual
          </Button>
          <div className="flex gap-2 justify-end">
            <Button
              variant="default"
              onClick={() => {
                setImportModalOpen(false);
                removeParamFromUrl();
              }}
            >
              Cancelar
            </Button>
            <Button
              color="red"
              onClick={() => {
                if (pendingImportJson.current)
                  updateProfileFromJSON(pendingImportJson.current);
                setImportModalOpen(false);
                removeParamFromUrl();
              }}
            >
              Sobrescrever
            </Button>
          </div>
        </Stack>
      </Modal>
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
        <div className="flex flex-col-reverse lg:flex-row lg:justify-between lg:max-h-15"></div>
        <div className="h-full overflow-x-auto">
          <div className="flex relative h-full flex-row w-auto md:overflow-hidden">
            <div className={`${styles.perfilContainer}`} id="profileContainer">
              <ProfileDrawer profile={profile} />
            </div>
            <div className="w-full h-full bg-white rounded-lg relative md:w-2/3 flex flex-col">
              <div className="h-auto min-h-12 py-2 ml-2 flex flex-row justify-start items-center space-x-3 overflow-x-auto lg:overflow-x-hidden">
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
                    const wellData = profileToWell({ ...profile });
                    const blob = new Blob([wellData], {
                      type: 'application/vnd.well+json',
                    });
                    const safeName = (profile.name || '')
                      .replace(/ /g, '_')
                      .toLowerCase();
                    download(
                      blob,
                      `perfil_${safeName}_${format(new Date(), 'dd_MM_yyyy__hh_mm')}.well`,
                      'application/vnd.well+json',
                    );
                  }}
                  leftSection={<ArrowDownOnSquareIcon className="h-4 w-4" />}
                >
                  Salvar
                </Button>
                <Button
                  variant="light"
                  onClick={handleClickFile}
                  leftSection={<FolderOpenIcon className="h-4 w-4" />}
                >
                  Abrir
                </Button>
                <Button
                  variant="subtle"
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
                  variant="subtle"
                  onClick={clear}
                  leftSection={<DeleteWell className="h-4 w-4" />}
                >
                  Limpar Perfil
                </Button>
                <Tooltip
                  label={
                    clipboard.copied ? 'Link copiado!' : 'Compartilhar perfil'
                  }
                >
                  <Button
                    variant="subtle"
                    color={clipboard.copied ? 'teal' : undefined}
                    leftSection={<ShareIcon className="h-4 w-4" />}
                    onClick={() => {
                      const encoded = LZString.compressToEncodedURIComponent(
                        JSON.stringify(profile),
                      );
                      const url = `${window.location.origin}${window.location.pathname}?p=${encoded}`;
                      clipboard.copy(url);
                    }}
                  >
                    {clipboard.copied ? 'Copiado!' : 'Compartilhar'}
                  </Button>
                </Tooltip>
                <Divider orientation="vertical" />
                <Tooltip label="Perfil Exemplo">
                  <IconButton
                    variant="subtle"
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
                        ...PROFILE_EXAMPLE,
                      });
                    }}
                  >
                    <ExampleWell className="h-4 w-4" />
                  </IconButton>
                </Tooltip>
                <Divider orientation="vertical" />
                <Popover
                  width={240}
                  position="bottom-end"
                  withArrow
                  shadow="md"
                >
                  <Popover.Target>
                    <Tooltip label="Preferências de Exibição">
                      <IconButton
                        variant="light"
                        size="lg"
                        aria-label="Preferências"
                      >
                        <Cog6ToothIcon className="h-4 w-4" />
                      </IconButton>
                    </Tooltip>
                  </Popover.Target>
                  <Popover.Dropdown>
                    <Stack gap="sm">
                      <div>
                        <Text size="xs" fw={600} mb={4} c="dimmed">
                          UNIDADE DE DIÂMETRO
                        </Text>
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
                        <Text size="xs" fw={600} mb={4} c="dimmed">
                          UNIDADE DE COMPRIMENTO
                        </Text>
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
                      <div>
                        <Text size="xs" fw={600} mb={4} c="dimmed">
                          COORDENADAS
                        </Text>
                        <SegmentedControl
                          fullWidth
                          size="xs"
                          value={coord_format}
                          onChange={v => setCoordFormat(v as 'dd' | 'dms')}
                          data={[
                            { label: 'DD', value: 'dd' },
                            { label: 'DMS', value: 'dms' },
                          ]}
                        />
                      </div>
                      <p className="text-xs text-gray-400">
                        O formato do arquivo permanecerá armazenado em medidas
                        internacionais. Essas configurações alteram apenas a
                        visualização dos valores.
                      </p>
                    </Stack>
                  </Popover.Dropdown>
                </Popover>

                <input
                  type="file"
                  ref={inputFile}
                  onChange={handleChangeInputFile}
                  accept="application/json,.json,.well"
                  style={{ display: 'none' }}
                />
              </div>
              <Tabs
                defaultValue="constructive"
                classNames={{
                  root: '!flex !flex-col flex-1 overflow-hidden',
                  panel: 'overflow-y-auto',
                }}
                value={tabValue}
                onChange={changeTab}
                aria-label="basic tabs example"
              >
                <Tabs.List className="pt-2 pb-0 pl-2 pr-2 h-auto min-h-11">
                  <Tabs.Tab value="general">Geral</Tabs.Tab>
                  <Tabs.Tab value="constructive">Construtivo</Tabs.Tab>
                  <Tabs.Tab value="geology">Geológico</Tabs.Tab>
                  <Tabs.Tab value="summary">Sumário</Tabs.Tab>
                </Tabs.List>
                <Tabs.Panel value="general">
                  <TabGeneral />
                </Tabs.Panel>
                <Tabs.Panel value="constructive">
                  <TabConstructive />
                </Tabs.Panel>
                <Tabs.Panel value="geology">
                  <TabGeologic />
                </Tabs.Panel>
                <Tabs.Panel value="summary">
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
