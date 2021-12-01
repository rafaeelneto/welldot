/* eslint-disable one-var */
import React, { useState, useEffect, useRef } from 'react';

import {
  Input,
  Button,
  Slider,
  FormControlLabel,
  FormGroup,
  Checkbox,
  Divider,
  TextField,
} from '@mui/material';

import { Container, Draggable } from 'react-smooth-dnd';
import { arrayMoveImmutable } from 'array-move';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

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

const SortableList = ({
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
}) => {
  const onDrop = ({ removedIndex, addedIndex }) => {
    onChangeList(arrayMoveImmutable(itens, removedIndex, addedIndex));
  };
  const onDelete = (index) => {
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
      <Container dragHandleSelector=".drag-handle" lockAxis="y" onDrop={onDrop}>
        {itens.map((item, index) => (
          <Draggable key={index}>
            <ListItem>
              <ListItemIcon
                style={{
                  height: '24px',
                  minWidth: 'auto',
                  marginRight: '5px',
                }}
                className="drag-handle"
              >
                <DragIndicatorIcon />
              </ListItemIcon>
              <ListItemIcon
                onClick={() => onDelete(index)}
                style={{
                  height: '24px',
                  minWidth: 'auto',
                  marginRight: '5px',
                }}
                className="drag-handle"
              >
                <XCircle />
              </ListItemIcon>
              <div className={styles.layerRow}>
                <Input
                  className={styles.layerInput}
                  id="standard-multiline-flexible"
                  placeholder="Nome"
                  style={{ width: '100%' }}
                  value={item.label}
                  onChange={(event) => {
                    // eslint-disable-next-line implicit-arrow-linebreak
                    onChangeValues(
                      {
                        ...item,
                        label: event.target.value,
                      },
                      index
                    );
                  }}
                />
                <Input
                  className={styles.layerInput}
                  id="standard-multiline-flexible"
                  placeholder="Valor"
                  style={{ width: '100%' }}
                  value={item.value}
                  onChange={(event) => {
                    // eslint-disable-next-line implicit-arrow-linebreak
                    onChangeValues(
                      {
                        ...item,
                        value: event.target.value,
                      },
                      index
                    );
                  }}
                />
              </div>
            </ListItem>
          </Draggable>
        ))}
        <ListItem
          className={styles.btnAdd}
          dense
          disabled={(limit && itens.length > limit - 1) || false}
          button
          onClick={() => onAdd()}
        >
          <ListItemIcon
            style={{ height: '24px', minWidth: 'auto', marginRight: '5px' }}
          >
            <PlusCircle />
          </ListItemIcon>
          Adicionar
        </ListItem>
      </Container>
    </List>
  );
};

const PDFExport = ({ profile, onChangeInfo }: PDFEProps) => {
  const timeoutRef = useRef<any>();
  const IFRAME_ID = 'ÏFRAME_PDF_ID';

  const headingInfo = profile.info?.headingInfo || [];
  const endInfo = profile.info?.endInfo || [];

  const [zoomValue, setZoomValue] = useState(500);
  const [header, setHeader] = useState('PERFIL GEOLÓGICO CONSTRUTIVO');

  const [breakPages, setBreakPages] = useState(false);

  useEffect(() => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      profile2Export(
        header,
        headingInfo,
        endInfo,
        { ...profile },
        breakPages,
        zoomValue,
        IFRAME_ID
      );

      onChangeInfo({ ...profile, info: { headingInfo, endInfo } });
    }, 1000);
  }, [headingInfo, header, endInfo, breakPages, zoomValue]);

  const handleBreakChange = (event) => {
    setBreakPages(event.target.checked);
  };

  const handleZoomChange = (event, newValue) => {
    setZoomValue(newValue);
  };

  const onChangeHeadingInfo = (newHeadingInfo) => {
    onChangeInfo({
      ...profile,
      info: { headingInfo: newHeadingInfo, endInfo },
    });
  };

  const handleHeadingInfoValueChange = (newValue, index) => {
    const newHeadingInfo = [...headingInfo];
    newHeadingInfo[index] = newValue;

    onChangeHeadingInfo(newHeadingInfo);
  };

  const onChangeEndInfo = (newEndInfo) => {
    onChangeInfo({
      ...profile,
      info: { headingInfo, endInfo: newEndInfo },
    });
  };

  const handleEndInfoValueChange = (newValue, index) => {
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
              false
            );
          }}
          startIcon={<Download />}
          color="primary"
        >
          Baixar PDF
        </Button>
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
              true
            );
          }}
          startIcon={<Printer />}
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
          onChange={(event) => {
            // eslint-disable-next-line implicit-arrow-linebreak
            setHeader(event.target.value);
          }}
        />

        {/* break pages checkbox */}
        <FormGroup>
          <FormControlLabel
            label="Quebra de páginas"
            control={
              <Checkbox
                defaultChecked
                checked={breakPages}
                onChange={handleBreakChange}
              />
            }
          />
        </FormGroup>
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
            valueLabelDisplay="auto"
          />
          <div className={`${styles.inputContainer}`}>
            1:
            <Input
              className={styles.scaleInput}
              id="standard-multiline-flexible"
              type="number"
              // placeholder="Escala"
              value={zoomValue}
              onChange={(event) => {
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
          itens={headingInfo}
          limit={6}
          onChangeList={onChangeHeadingInfo}
          onChangeValues={handleHeadingInfoValueChange}
        />
        <Divider />
        <span className={styles.componentTitle}>Infomações finais</span>
        <SortableList
          defaultItem={{ label: '', value: '' }}
          itens={endInfo}
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
};

export default PDFExport;
