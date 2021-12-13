import React from 'react';
import AnchorLink from 'react-anchor-link-smooth-scroll';

import styles from './header.module.scss';

import { ReactComponent as WPLogo } from '../../assets/well_profiler_logo.svg';

export default () => {
  return (
    <div className={styles.root}>
      <span>
        <WPLogo className={styles.logo} />
      </span>
      <span className={styles.title}>Well Profiler</span>
      <AnchorLink href="#about">Sobre</AnchorLink>
    </div>
  );
};
