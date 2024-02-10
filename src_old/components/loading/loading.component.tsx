import React from 'react';

import LinearProgress from '@mui/material/LinearProgress';
import Box from '@mui/material/Box';

import styles from './loading.module.scss';

export default function Loading() {
  return (
    <div className={styles.root}>
      <div className={styles.loadingContainer}>
        <Box className={`${styles.containers} `} width="80%">
          <LinearProgress variant="indeterminate" />
        </Box>
        <Box className={styles.containers}>Carregando...</Box>
      </div>
    </div>
  );
}
