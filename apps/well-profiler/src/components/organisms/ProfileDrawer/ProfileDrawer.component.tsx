import React, { useEffect, useRef } from 'react';

import { checkIfProfileIsEmpty } from '@/src/utils/profile.utils';

import { DinamicDrawer } from '@/src/utils/ProfileDrawer/ProfileDrawer';

import { Profile } from '@/src/types/profile.types';
import { useUIStore } from '@/src/store/ui.store';

import styles from './profileDrawer.module.scss';

interface ProfileDrawerProps {
  profile: Profile;
}

const ProfileDrawer = ({ profile }: ProfileDrawerProps) => {
  const svgContainer = useRef(null);
  const profileDrawer = useRef<DinamicDrawer | null>(null);
  const { length_units, diameter_units } = useUIStore();

  const MARGINS = { TOP: 30, RIGHT: 30, BOTTOM: 15, LEFT: 50 };
  const HEIGHT = 800 - MARGINS.TOP - MARGINS.BOTTOM;
  const WIDTH = 200 - MARGINS.LEFT - MARGINS.RIGHT;

  const setSVGContainer = () => {
    if (!svgContainer.current) {
      return;
    }

    profileDrawer.current = new DinamicDrawer(
      // @ts-ignore
      svgContainer.current,
      HEIGHT,
      WIDTH,
      MARGINS,
      {
        tooltip: styles.tooltip,
        tooltipTitle: styles.title,
        tooltipPrimaryInfo: styles.primaryInfo,
        tooltipSecondaryInfo: styles.secondaryInfo,
      },
    );

    profileDrawer.current.prepareSvg();

    profileDrawer.current.drawLog(profile, length_units, diameter_units);
  };

  useEffect(() => {
    setSVGContainer();
  }, [svgContainer.current]);

  useEffect(() => {
    if (profileDrawer.current) {
      profileDrawer.current.drawLog(profile, length_units, diameter_units);
    }
  }, [profile, svgContainer.current, length_units, diameter_units]);

  const noProfile = checkIfProfileIsEmpty(profile);

  return (
    <>
      {noProfile ? (
        <span className={styles.noFilesMsg}>Perfil não configurado</span>
      ) : (
        ''
      )}
      <svg
        className={`${styles.svgContainer} ${noProfile ? styles.hide : ''}`}
        ref={svgContainer}
      />
    </>
  );
};

export default ProfileDrawer;
