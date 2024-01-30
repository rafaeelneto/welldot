import React from 'react';

import { Button } from '@mantine/core';

import Link from 'next/link';

import WellProfilerLogo from '@/public/assets/well_profiler_logo.svg';
import styles from './header.module.scss';

function Header() {
  return (
    <div className="h-auto min-h-[50px] bg-white w-full p-2 flex flex-row justify-between shadow-md md:h-[50px]">
      <div className={styles.logoContainer}>
        <Link href="/">
          <span>
            <WellProfilerLogo className={styles.logo} />
          </span>
          <span className={styles.title}>Well Profiler</span>
        </Link>
      </div>

      <div className={styles.btnsContainer}>
        <Button
          variant="light"
          className={styles.btn}
          component={Link}
          href="/"
        >
          Home
        </Button>
        <Button className={styles.btn} component={Link} href="/editor">
          Editor
        </Button>
      </div>
    </div>
  );
}

export default Header;
