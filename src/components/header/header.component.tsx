import React from 'react';

import { Button } from '@mui/material';

import { Link } from 'react-router-dom';

import styles from './header.module.scss';

import { ReactComponent as WPLogo } from '../../assets/well_profiler_logo.svg';

export default () => {
  return (
    <div className={styles.root}>
      <div className={styles.logoContainer}>
        <Link to="/">
          <span>
            <WPLogo className={styles.logo} />
          </span>
          <span className={styles.title}>Well Profiler</span>
        </Link>
      </div>

      <div className={styles.btnsContainer}>
        <Button
          className={styles.btn}
          component={Link}
          to="/"
          onClick={() => {
            // @ts-ignore
            if (window.gtag) {
              // @ts-ignore
              window.gtag(
                'event',
                'button clicked',
                'User Interaction',
                'home info'
              );
            }
          }}
        >
          Home
        </Button>
        <Button
          className={styles.btn}
          component={Link}
          to="/editor"
          onClick={() => {
            // @ts-ignore
            if (window.gtag) {
              // @ts-ignore
              window.gtag(
                'event',
                'button clicked',
                'User Interaction',
                'editor'
              );
            }
          }}
        >
          Editor
        </Button>
      </div>
    </div>
  );
};
