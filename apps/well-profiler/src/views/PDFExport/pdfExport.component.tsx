import { ChangeEvent, useEffect, useRef, useState } from 'react';

import {
  ActionIcon,
  Button,
  Checkbox,
  Divider,
  Input,
  List,
  Popover,
  SegmentedControl,
  Slider,
  Stack,
  Text,
  TextInput as TextField,
  Tooltip,
} from '@mantine/core';

import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable } from '@dnd-kit/sortable';

import { ChevronUpDownIcon } from '@heroicons/react/24/outline';

import { CSS } from '@dnd-kit/utilities';

import {
  Download,
  FileText,
  PlusCircle,
  Printer,
  XCircle,
} from 'react-feather';

import { Profile } from '@/src/types/profile.types';
import { infoType } from '../../../src_old/types/profile2Export.types';

import styles from './pdfExport.module.scss';

import { DEFAULT_PDF_HEADER, useUIStore } from '@/src/store/ui.store';
import profile2Export from './profile2Export.component';

type InfoItem = infoType & { profileField?: keyof Profile };

const WELL_METADATA_FIELDS: { key: keyof Profile; label: string }[] = [
  { key: 'name', label: 'Nome' },
  { key: 'well_type', label: 'Tipo' },
  { key: 'well_driller', label: 'Perfurador' },
  { key: 'construction_date', label: 'Data de Construção' },
  { key: 'lat', label: 'Latitude' },
  { key: 'lng', label: 'Longitude' },
  { key: 'elevation', label: 'Elevação' },
  { key: 'obs', label: 'Observações' },
];

const resolveInfo = (items: InfoItem[], profile: Profile): infoType[] =>
  items.map(item =>
    item.profileField
      ? { label: item.label, value: String(profile[item.profileField] ?? '') }
      : { label: item.label, value: item.value },
  );

type PDFEProps = {
  profile: Profile & {
    info: {
      headingInfo: InfoItem[];
      endInfo: InfoItem[];
    };
  };
  onChangeInfo: (newPerfilState: any) => void;
};

function SortableItem({ id, children }: { id: any; children: any }) {
  const { setNodeRef, listeners, transform, transition, attributes } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <List.Item
      ref={setNodeRef}
      className={styles.listItem}
      style={style}
      icon={
        <ChevronUpDownIcon className="drag-handle h-4 w-4" {...listeners} />
      }
      {...attributes}
    >
      <div className={styles.layerRow}>{children}</div>
    </List.Item>
  );
}

function SortableList({
  items,
  defaultItem,
  onChangeList,
  onChangeValues,
  limit,
  profile,
}: {
  items: InfoItem[];
  defaultItem: InfoItem;
  onChangeList: (newComponents: InfoItem[]) => void;
  onChangeValues: (newComponent: InfoItem, index: number) => void;
  limit?: number | null;
  profile: Profile;
}) {
  const dragEndEvent = (e: DragEndEvent) => {
    const { over, active } = e;
    onChangeList(
      arrayMove(items, (active.id as number) - 1, (over?.id as number) - 1),
    );
  };

  const onDelete = (index: number) => {
    const newLayers = [...items];
    newLayers.splice(index, 1);
    onChangeList(newLayers);
  };
  const onAdd = () => {
    const newLayers = [...items];
    newLayers.push(defaultItem);
    onChangeList(newLayers);
  };
  const [metaPopoverOpen, setMetaPopoverOpen] = useState(false);
  const [selectedMeta, setSelectedMeta] = useState<string[]>([]);

  const onAddMetadata = () => {
    const newItems = WELL_METADATA_FIELDS.filter(f =>
      selectedMeta.includes(f.key),
    ).map(f => ({ label: f.label, value: '', profileField: f.key }));
    onChangeList([...items, ...newItems]);
    setSelectedMeta([]);
    setMetaPopoverOpen(false);
  };

  return (
    <>
      <List className={styles.sortableList} listStyleType="none">
        <DndContext onDragEnd={dragEndEvent}>
          <SortableContext items={items.map((_item, index) => index + 1)}>
            {items.map((item, index) => (
              <>
                <SortableItem key={`${item.label}-${index}`} id={index + 1}>
                  <Input
                    className={styles.layerInput}
                    placeholder="Nome"
                    style={{ width: '100%' }}
                    value={item.label}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                      onChangeValues(
                        { ...item, label: event.target.value },
                        index,
                      );
                    }}
                  />
                  <Tooltip
                    label="Valor sincronizado com o perfil"
                    disabled={!item.profileField}
                  >
                    <Input
                      className={styles.layerInput}
                      placeholder="Valor"
                      style={{ width: '100%' }}
                      disabled={!!item.profileField}
                      value={
                        item.profileField
                          ? String(profile[item.profileField] ?? '')
                          : item.value
                      }
                      onChange={(event: ChangeEvent<HTMLInputElement>) => {
                        onChangeValues(
                          { ...item, value: event.target.value },
                          index,
                        );
                      }}
                    />
                  </Tooltip>
                  <ActionIcon
                    onClick={() => onDelete(index)}
                    variant="transparent"
                  >
                    <XCircle className="h-4 w-4" />
                  </ActionIcon>
                </SortableItem>
                {index < items.length - 1 && <Divider />}
              </>
            ))}
          </SortableContext>
        </DndContext>
      </List>
      <div className="flex gap-2 mb-3">
        <Button
          className={styles.addBtn}
          aria-disabled={(limit && items.length > limit - 1) || false}
          onClick={() => onAdd()}
          leftSection={<PlusCircle className="h-4 w-4" />}
        >
          Adicionar
        </Button>
        <Popover
          position="bottom-start"
          opened={metaPopoverOpen}
          onChange={setMetaPopoverOpen}
          withinPortal
        >
          <Popover.Target>
            <Button
              variant="subtle"
              leftSection={<FileText className="h-4 w-4" />}
              onClick={() => setMetaPopoverOpen(o => !o)}
            >
              Metadados do poço
            </Button>
          </Popover.Target>
          <Popover.Dropdown>
            <Stack gap="xs">
              {WELL_METADATA_FIELDS.map(field => (
                <Checkbox
                  key={field.key}
                  label={field.label}
                  checked={selectedMeta.includes(field.key)}
                  onChange={e => {
                    const isChecked = e.currentTarget?.checked;
                    setSelectedMeta(prev => {
                      if (isChecked) {
                        return [...prev, field.key];
                      } else {
                        return prev.filter(k => k !== field.key);
                      }
                    });
                  }}
                />
              ))}
              <Button
                size="xs"
                disabled={selectedMeta.length === 0}
                onClick={onAddMetadata}
                leftSection={<PlusCircle className="h-3 w-3" />}
              >
                Adicionar
              </Button>
            </Stack>
          </Popover.Dropdown>
        </Popover>
      </div>
    </>
  );
}

function PDFExport({ profile, onChangeInfo }: PDFEProps) {
  const timeoutRef = useRef<any>();
  const infoDebounceRef = useRef<any>();
  const IFRAME_ID = 'ÏFRAME_PDF_ID';
  const {
    length_units,
    diameter_units,
    pdf_header: header,
    pdf_break_pages: breakPages,
    pdf_zoom_value: zoomValue,
    pdf_metadata_position: metadataPosition,
    coord_format: coordFormat,
    setPdfHeader: setHeader,
    setPdfBreakPages: setBreakPages,
    setPdfZoomValue: setZoomValue,
    setPdfMetadataPosition: setMetadataPosition,
  } = useUIStore();

  const headingInfo = profile.info?.headingInfo || [];
  const endInfo = profile.info?.endInfo || [];

  const effectiveHeader =
    header === DEFAULT_PDF_HEADER && profile.name
      ? `${header} - ${profile.name}`
      : header;

  useEffect(() => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      try {
        profile2Export(
          effectiveHeader,
          resolveInfo(headingInfo, profile),
          resolveInfo(endInfo, profile),
          { ...profile },
          breakPages,
          zoomValue,
          IFRAME_ID,
          undefined,
          length_units,
          diameter_units,
          metadataPosition,
        );
      } catch (e) {
        console.log(`There was a error while generating your PDF file`, e);
      }

      onChangeInfo({ ...profile, info: { headingInfo, endInfo } });
    }, 1000);
  }, [
    headingInfo,
    header,
    endInfo,
    breakPages,
    zoomValue,
    length_units,
    diameter_units,
    metadataPosition,
    coordFormat,
  ]);

  const handleBreakChange = (event: ChangeEvent<HTMLInputElement>) => {
    setBreakPages(event.target.checked);
  };

  const onChangeHeadingInfo = (newHeadingInfo: InfoItem[]) => {
    clearTimeout(infoDebounceRef.current);
    infoDebounceRef.current = setTimeout(() => {
      onChangeInfo({
        ...profile,
        info: { headingInfo: newHeadingInfo, endInfo },
      });
    }, 500);
  };

  const handleHeadingInfoValueChange = (newValue: InfoItem, index: number) => {
    const newHeadingInfo = [...headingInfo];
    newHeadingInfo[index] = newValue;

    onChangeHeadingInfo(newHeadingInfo);
  };

  const onChangeEndInfo = (newEndInfo: InfoItem[]) => {
    clearTimeout(infoDebounceRef.current);
    infoDebounceRef.current = setTimeout(() => {
      onChangeInfo({
        ...profile,
        info: { headingInfo, endInfo: newEndInfo },
      });
    }, 500);
  };

  const handleEndInfoValueChange = (newValue: InfoItem, index: number) => {
    const newEndInfo = [...endInfo];
    newEndInfo[index] = newValue;

    onChangeEndInfo(newEndInfo);
  };

  return (
    <div className={styles.root}>
      <div className={styles.settingsPanel}>
        <Button
          className="mr-2"
          onClick={() => {
            profile2Export(
              effectiveHeader,
              resolveInfo(headingInfo, profile),
              resolveInfo(endInfo, profile),
              { ...profile },
              breakPages,
              zoomValue,
              undefined,
              false,
              length_units,
              diameter_units,
              metadataPosition,
            );
            // @ts-ignore
            if (window.gtag) {
              // @ts-ignore
              window.gtag(
                'event',
                'button clicked',
                'User Interaction',
                'download pdf',
              );
            }
          }}
          leftSection={<Download className="h-4 w-4" />}
        >
          Baixar PDF
        </Button>
        <Button
          onClick={() => {
            // @ts-ignore
            if (window.gtag) {
              // @ts-ignore
              window.gtag(
                'event',
                'button clicked',
                'User Interaction',
                'print pdf',
              );
            }
            profile2Export(
              effectiveHeader,
              resolveInfo(headingInfo, profile),
              resolveInfo(endInfo, profile),
              { ...profile },
              breakPages,
              zoomValue,
              undefined,
              true,
              length_units,
              diameter_units,
              metadataPosition,
            );
          }}
          leftSection={<Printer className="h-4 w-4" />}
        >
          Imprimir
        </Button>

        <TextField
          className="mb-2 mt-2"
          id="standard-multiline-flexible"
          label="Cabeçalho"
          value={header}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            setHeader(event.target.value);
          }}
        />

        <Checkbox
          className="mb-2"
          label="Quebra de páginas"
          checked={breakPages}
          onChange={handleBreakChange}
        />
        <div className="mb-2">
          <Text size="sm" mb={4}>
            Seção de metadados do poço
          </Text>
          <SegmentedControl
            value={metadataPosition ?? 'none'}
            onChange={v =>
              setMetadataPosition(
                v === 'none' ? null : (v as 'before' | 'after'),
              )
            }
            data={[
              { label: 'Antes', value: 'before' },
              { label: 'Depois', value: 'after' },
              { label: 'Não exibir', value: 'none' },
            ]}
          />
        </div>
        <Divider />
        {/* scale slider */}
        <span className="text-lg font-bold text-[#55575D] mt-4 block">
          Escala
        </span>
        <div className="flex flex-row w-full my-3 items-center">
          <Slider
            className="flex-grow"
            label="Escala"
            value={zoomValue}
            onChange={setZoomValue}
            max={850}
            min={1}
          />
          <div className="mx-2 flex flex-row items-center">
            <span className="block">1:</span>
            <Input
              className={`${styles.scaleInput} min-w-16`}
              id="standard-multiline-flexible"
              type="number"
              // placeholder="Escala"
              value={zoomValue}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                // eslint-disable-next-line implicit-arrow-linebreak
                setZoomValue(parseFloat(event.target.value));
              }}
            />
          </div>
        </div>

        <Divider />

        <span className={styles.componentTitle}>Infomações iniciais</span>
        <SortableList
          defaultItem={{ label: '', value: '' }}
          items={[...headingInfo]}
          limit={6}
          onChangeList={onChangeHeadingInfo}
          onChangeValues={handleHeadingInfoValueChange}
          profile={profile}
        />
        <Divider />
        <span className={styles.componentTitle}>Infomações finais</span>
        <SortableList
          defaultItem={{ label: '', value: '' }}
          items={[...endInfo]}
          onChangeList={onChangeEndInfo}
          onChangeValues={handleEndInfoValueChange}
          profile={profile}
        />
      </div>
      <div className={styles.pdfFrameContainer}>
        <iframe
          id={IFRAME_ID}
          className={styles.pdfFrame}
          title="Pré-visualização"
        >
          {/* // contains the pdf preview */}
        </iframe>
      </div>
    </div>
  );
}

export default PDFExport;
