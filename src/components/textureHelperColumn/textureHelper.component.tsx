import React from 'react';

import { IconButton } from '@mui/material';
import { HelpCircle } from 'react-feather';

import styles from './textureHelper.module.scss';

const TextureHelper = () => (
  <div className={styles.textureHeaderContainner}>
    Textura
    <IconButton
      className={`${styles.helpBtn}`}
      onClick={() => {
        // @ts-ignore
        window
          .open(
            process.env.PUBLIC_URL + '/FGDCgeostdTM11A2web_PatternChart.pdf',
            '_blank'
          )
          .focus();
      }}
    >
      <HelpCircle />
    </IconButton>
  </div>
);

export default TextureHelper;
