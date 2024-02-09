import React, { useEffect, useRef } from 'react';

import { isProfileEmpty } from '../../utils/profile.utils';

import { DinamicDrawer } from '../../utils/ProfileDrawer';

import { PROFILE_TYPE } from '../../types/profile.types';

import styles from './profileDrawer.module.scss';

type PDProps = {
  profile: PROFILE_TYPE;
};

const ProfileDrawer = ({ profile }: PDProps) => {
  const svgContainer = useRef(null);
  const profileDrawer = useRef<DinamicDrawer | null>(null);

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
      }
    );

    profileDrawer.current.prepareSvg();

    profileDrawer.current.drawLog(profile);
  };

  useEffect(() => {
    setSVGContainer();
  }, [svgContainer.current]);

  useEffect(() => {
    if (profileDrawer.current) {
      profileDrawer.current.drawLog(profile);
    }
  }, [profile, svgContainer.current]);

  const noProfile = isProfileEmpty(profile);

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
