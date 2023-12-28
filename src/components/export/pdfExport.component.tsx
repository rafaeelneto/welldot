/* @ts-ignore */
/* eslint-disable one-var */
import React, { useState, useEffect, useRef, ChangeEvent } from 'react';

import {
  Button,
  Slider,
  Checkbox,
  Divider,
  TextInput as TextField,
  List,
  ListItem,
  Input,
} from '@mantine/core';

import { Container, Draggable } from 'react-smooth-dnd';
import { arrayMoveImmutable } from 'array-move';

import { ChevronUpDownIcon } from '@heroicons/react/24/outline';

import {
  Trash,
  PlusCircle,
  Printer,
  Download,
  XCircle,
  FileText,
} from 'react-feather';

import { PROFILE_TYPE } from '../../types/profile.types';
import { infoType } from '../../types/profile2Export.types';

import styles from './pdfExport.module.scss';

import profile2Export from './profile2Export.component';

type PDFEProps = {
  profile: PROFILE_TYPE;
  onChangeInfo: (newPerfilState: any) => void;
};

function SortableList({
  itens,
  defaultItem,
  onChangeList,
  onChangeValues,
  limit,
}: {
  itens: infoType[];
  defaultItem: infoType;
  onChangeList: (newComponents: infoType[]) => void;
  onChangeValues: (newComponent: infoType, index: number) => void;
  limit?: number | null;
}) {
  const onDrop = ({
    removedIndex,
    addedIndex,
  }: {
    removedIndex: any;
    addedIndex: any;
  }) => {
    onChangeList(arrayMoveImmutable(itens, removedIndex, addedIndex));
  };
  const onDelete = (index: number) => {
    const newLayers = [...itens];
    newLayers.splice(index, 1);
    onChangeList(newLayers);
  };
  const onAdd = () => {
    const newLayers = [...itens];
    newLayers.push(defaultItem);
    onChangeList(newLayers);
  };

  return (
    <List className={styles.sortableList}>
      {/* @ts-ignore */}
      <Container
        dragHandleSelector=".drag-handle"
        lockAxis="y"
        onDrop={onDrop}
        dragBeginDelay={0.01}
      >
        {itens.map((item, index) => (
          // @ts-ignore
          <Draggable key={index}>
            <List.Item
              className={styles.listItem}
              icon={
                <>
                  <ChevronUpDownIcon className="drag-handle" />
                  <XCircle />
                </>
              }
            >
              <div className={styles.layerRow}>
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
              </div>
            </List.Item>
          </Draggable>
        ))}
        <List.Item
          className={styles.btnAdd}
          aria-disabled={(limit && itens.length > limit - 1) || false}
          onClick={() => onAdd()}
        >
          <div style={{ height: '24px', minWidth: 'auto', marginRight: '5px' }}>
            <PlusCircle />
          </div>
          Adicionar
        </List.Item>
      </Container>
    </List>
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
          className={styles.mainBtns}
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
          leftSection={<Download />}
          color="primary"
        >
          Baixar PDF
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
          leftSection={<Printer />}
          color="primary"
        >
          Imprimir
        </Button>

        <TextField
          className={`${styles.layerInput} ${styles.headerInput}`}
          id="standard-multiline-flexible"
          // placeholder="Cabeçalho"
          label="Cabeçalho"
          variant="standard"
          value={header}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            // eslint-disable-next-line implicit-arrow-linebreak
            setHeader(event.target.value);
          }}
        />

        {/* break pages checkbox */}

        <Checkbox
          label="Quebra de páginas"
          defaultChecked
          checked={breakPages}
          onChange={handleBreakChange}
        />
        <Divider />
        {/* scale slider */}
        <span className={styles.componentTitle}>Escala</span>
        <div className={styles.scaleRow}>
          <Slider
            aria-label="Volume"
            value={zoomValue}
            onChange={handleZoomChange}
            max={850}
            min={1}
          />
          <div className={`${styles.inputContainer}`}>
            1:
            <Input
              className={styles.scaleInput}
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
          itens={[...headingInfo]}
          limit={6}
          onChangeList={onChangeHeadingInfo}
          onChangeValues={handleHeadingInfoValueChange}
        />
        <Divider />
        <span className={styles.componentTitle}>Infomações finais</span>
        <SortableList
          defaultItem={{ label: '', value: '' }}
          itens={[...endInfo]}
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
