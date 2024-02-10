import React, { useState, useEffect, useRef, ChangeEvent } from 'react';

import {
  Button,
  Slider,
  Checkbox,
  Divider,
  TextInput as TextField,
  List,
  Input,
  ActionIcon,
} from '@mantine/core';

import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable } from '@dnd-kit/sortable';

import { ChevronUpDownIcon } from '@heroicons/react/24/outline';

import { CSS } from '@dnd-kit/utilities';

import {
  Trash,
  PlusCircle,
  Printer,
  Download,
  XCircle,
  FileText,
} from 'react-feather';

import { Profile } from '@/src/types/profile.types';
import { infoType } from '../../../src_old/types/profile2Export.types';

import styles from './pdfExport.module.scss';

import profile2Export from './profile2Export.component';

type PDFEProps = {
  profile: Profile & {
    info: {
      headingInfo: { label: string; value: string }[];
      endInfo: { label: string; value: string }[];
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
}: {
  items: infoType[];
  defaultItem: infoType;
  onChangeList: (newComponents: infoType[]) => void;
  onChangeValues: (newComponent: infoType, index: number) => void;
  limit?: number | null;
}) {
  const dragEndEvent = (e: DragEndEvent) => {
    const { over, active } = e;
    console.log(over?.id, active.id);
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

  return (
    <>
      <List className={styles.sortableList} listStyleType="none">
        <DndContext onDragEnd={dragEndEvent}>
          <SortableContext items={items.map((_item, index) => index + 1)}>
            {items.map((item, index) => (
              <>
                <SortableItem key={item.label} id={index + 1}>
                  <Input
                    className={styles.layerInput}
                    id="standard-multiline-flexible"
                    placeholder="Nome"
                    style={{ width: '100%' }}
                    value={item.label}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                      // eslint-disable-next-line implicit-arrow-linebreak
                      onChangeValues(
                        {
                          ...item,
                          label: event.target.value,
                        },
                        index,
                      );
                    }}
                  />
                  <Input
                    className={styles.layerInput}
                    id="standard-multiline-flexible"
                    placeholder="Valor"
                    style={{ width: '100%' }}
                    value={item.value}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                      // eslint-disable-next-line implicit-arrow-linebreak
                      onChangeValues(
                        {
                          ...item,
                          value: event.target.value,
                        },
                        index,
                      );
                    }}
                  />
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
      <Button
        className={styles.addBtn}
        aria-disabled={(limit && items.length > limit - 1) || false}
        onClick={() => onAdd()}
        leftSection={<PlusCircle className="h-4 w-4" />}
      >
        Adicionar
      </Button>
    </>
  );
}

function PDFExport({ profile, onChangeInfo }: PDFEProps) {
  const timeoutRef = useRef<any>();
  const IFRAME_ID = 'ÏFRAME_PDF_ID';

  const headingInfo = profile.info?.headingInfo || [];
  const endInfo = profile.info?.endInfo || [];

  const [zoomValue, setZoomValue] = useState<number>(500);
  const [header, setHeader] = useState<string>('PERFIL GEOLÓGICO CONSTRUTIVO');

  const [breakPages, setBreakPages] = useState<boolean>(false);

  useEffect(() => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      try {
        profile2Export(
          header,
          headingInfo,
          endInfo,
          { ...profile },
          breakPages,
          zoomValue,
          IFRAME_ID,
        );
      } catch (e) {
        console.log(`There was a error while generating your PDF file`);
      }

      onChangeInfo({ ...profile, info: { headingInfo, endInfo } });
    }, 1000);
  }, [headingInfo, header, endInfo, breakPages, zoomValue]);

  const handleBreakChange = (event: ChangeEvent<HTMLInputElement>) => {
    setBreakPages(event.target.checked);
  };

  const handleZoomChange = (newValue: number) => {
    setZoomValue(newValue);
  };

  const onChangeHeadingInfo = (newHeadingInfo: infoType[]) => {
    onChangeInfo({
      ...profile,
      info: { headingInfo: newHeadingInfo, endInfo },
    });
  };

  const handleHeadingInfoValueChange = (newValue: infoType, index: number) => {
    const newHeadingInfo = [...headingInfo];
    newHeadingInfo[index] = newValue;

    onChangeHeadingInfo(newHeadingInfo);
  };

  const onChangeEndInfo = (newEndInfo: infoType[]) => {
    onChangeInfo({
      ...profile,
      info: { headingInfo, endInfo: newEndInfo },
    });
  };

  const handleEndInfoValueChange = (newValue: infoType, index: number) => {
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
              header,
              headingInfo,
              endInfo,
              { ...profile },
              breakPages,
              zoomValue,
              undefined,
              false,
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
              header,
              headingInfo,
              endInfo,
              { ...profile },
              breakPages,
              zoomValue,
              undefined,
              true,
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
          defaultChecked
          checked={breakPages}
          onChange={handleBreakChange}
        />
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
            onChange={handleZoomChange}
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
        />
        <Divider />
        <span className={styles.componentTitle}>Infomações finais</span>
        <SortableList
          defaultItem={{ label: '', value: '' }}
          items={[...endInfo]}
          onChangeList={onChangeEndInfo}
          onChangeValues={handleEndInfoValueChange}
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
