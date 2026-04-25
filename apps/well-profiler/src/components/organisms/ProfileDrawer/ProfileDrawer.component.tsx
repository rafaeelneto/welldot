import { useEffect, useRef, useState } from 'react';

import { useUIStore } from '@/src/store/ui.store';
import { isWellEmpty, type Well } from '@welldot/core';
import {
  DeepPartial,
  INTERACTIVE_RENDER_CONFIG,
  RenderConfig,
  WellRenderer,
} from '@welldot/render';
import styles from './profileDrawer.module.scss';

interface ProfileDrawerProps {
  profile: Well;
}

const ProfileDrawer = ({ profile }: ProfileDrawerProps) => {
  const svgContainer = useRef(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const profileDrawer = useRef<WellRenderer | null>(null);
  const { length_units, diameter_units } = useUIStore();
  const [config, setConfig] = useState<DeepPartial<RenderConfig>>(
    INTERACTIVE_RENDER_CONFIG,
  );
  const [containerWidth, setContainerWidth] = useState(0);

  const MARGINS = { TOP: 30, RIGHT: 30, BOTTOM: 15, LEFT: 50 };
  const HEIGHT = 800 - MARGINS.TOP - MARGINS.BOTTOM;
  const WIDTH = Math.max(0, containerWidth - MARGINS.LEFT - MARGINS.RIGHT);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const obs = new ResizeObserver(entries =>
      setContainerWidth(entries[0].contentRect.width),
    );
    obs.observe(wrapperRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!svgContainer.current || WIDTH <= 0) return;
    profileDrawer.current = new WellRenderer(
      [
        {
          selector: `.${styles.svgContainer}`,
          height: HEIGHT,
          width: WIDTH,
          margins: {
            top: MARGINS.TOP,
            right: MARGINS.RIGHT,
            bottom: MARGINS.BOTTOM,
            left: MARGINS.LEFT,
          },
        },
      ],
      {
        classNames: {
          tooltip: {
            root: styles.tooltip,
            title: styles.title,
            primaryInfo: styles.primaryInfo,
            secondaryInfo: styles.secondaryInfo,
          },
        },
        renderConfig: config,
      },
    );
    profileDrawer.current.prepareSvg();
    profileDrawer.current.draw(profile, {
      units: { length: length_units, diameter: diameter_units },
    });
    // profileDrawer.current.renderLegend('#svg_legend', profile);
  }, [svgContainer.current, config, containerWidth]);

  useEffect(() => {
    if (!profileDrawer.current) return;
    profileDrawer.current.draw(profile, {
      units: { length: length_units, diameter: diameter_units },
    });
    profileDrawer.current.renderLegend('#svg_legend', profile);
  }, [profile, length_units, diameter_units]);

  const noProfile = isWellEmpty(profile);

  return (
    <div className={styles.editorWrapper} ref={wrapperRef}>
      {/* <RenderConfigEditor config={config} onChange={setConfig} /> */}
      {noProfile && (
        <span className={styles.noFilesMsg}>Perfil não configurado</span>
      )}
      {/* <svg id="svg_legend" /> */}
      <svg
        id="#svg_drawer"
        className={`${styles.svgContainer} ${noProfile ? styles.hide : ''}`}
        ref={svgContainer}
      />
    </div>
  );
};

export default ProfileDrawer;
