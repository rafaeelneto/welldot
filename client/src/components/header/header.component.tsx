import React from 'react';
import AnchorLink from 'react-anchor-link-smooth-scroll';
import { Button } from '@mui/material';
import ReactGA from 'react-ga';

import styles from './header.module.scss';

import { ReactComponent as WPLogo } from '../../assets/well_profiler_logo.svg';

export default () => {
  return (
    <div className={styles.root}>
      <div className={styles.logoContainer}>
        <span>
          <WPLogo className={styles.logo} />
        </span>
        <span className={styles.title}>Well Profiler</span>
      </div>

      <div className={styles.btnsContainer}>
        <Button
          className={styles.btn}
          onClick={() => {
            ReactGA.event({
              category: 'User',
              action: 'About Button',
            });
          }}
        >
          <AnchorLink className={styles.btnLink} href="#about">
            Sobre
          </AnchorLink>
        </Button>
      </div>
    </div>
  );
};
