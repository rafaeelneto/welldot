import React, { useEffect, useRef, useState } from 'react';

import { checkIfProfileIsEmpty } from '@/src/lib/utils/well.utils';
import { WellDrawer } from '@/src/lib/wellDrawer/WellDrawer';
import { Well } from '@/src/lib/@types/well.types';
import { DrawerRenderConfig } from '@/src/lib/@types/drawer.types';
import { DeepPartial } from '@/src/lib/@types/generic.types';
import { useUIStore } from '@/src/store/ui.store';

import RenderConfigEditor, { RENDER_EDITOR_DEFAULTS } from './RenderConfigEditor.component';
import { drawWellLegend } from '@/src/lib/wellDrawer/drawer.legend';
import styles from './profileDrawer.module.scss';

interface ProfileDrawerProps {
  profile: Well;
}

const ProfileDrawer = ({ profile }: ProfileDrawerProps) => {
  const svgContainer  = useRef(null);
  const legendSvgRef  = useRef<SVGSVGElement>(null);
  const wrapperRef    = useRef<HTMLDivElement>(null);
  const profileDrawer = useRef<WellDrawer | null>(null);
  const { length_units, diameter_units } = useUIStore();
  const [config, setConfig]           = useState<DeepPartial<DrawerRenderConfig>>(RENDER_EDITOR_DEFAULTS);
  const [containerWidth, setContainerWidth] = useState(0);

  const MARGINS = { TOP: 30, RIGHT: 30, BOTTOM: 15, LEFT: 50 };
  const HEIGHT  = 800 - MARGINS.TOP - MARGINS.BOTTOM;
  const WIDTH   = Math.max(0, containerWidth - MARGINS.LEFT - MARGINS.RIGHT);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const obs = new ResizeObserver(entries => setContainerWidth(entries[0].contentRect.width));
    obs.observe(wrapperRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!svgContainer.current || WIDTH <= 0) return;
    profileDrawer.current = new WellDrawer([
      {
        selector: `.${styles.svgContainer}`,
        height: HEIGHT,
        width:  WIDTH,
        margins: { top: MARGINS.TOP, right: MARGINS.RIGHT, bottom: MARGINS.BOTTOM, left: MARGINS.LEFT },
      },
    ], {
      classNames: {
        tooltip: {
          root:          styles.tooltip,
          title:         styles.title,
          primaryInfo:   styles.primaryInfo,
          secondaryInfo: styles.secondaryInfo,
        },
      },
      renderConfig: config,
    });
    profileDrawer.current.prepareSvg();
    profileDrawer.current.draw(profile, { units: { length: length_units, diameter: diameter_units } });
  }, [svgContainer.current, config, containerWidth]);

  useEffect(() => {
    if (!profileDrawer.current) return;
    profileDrawer.current.draw(profile, { units: { length: length_units, diameter: diameter_units } });
  }, [profile, length_units, diameter_units]);

  useEffect(() => {
    if (!legendSvgRef.current) return;
    drawWellLegend('#svg_legend', profile);
  }, [profile]);

  const noProfile = checkIfProfileIsEmpty(profile);

  return (
    <div className={styles.editorWrapper} ref={wrapperRef}>
      <RenderConfigEditor config={config} onChange={setConfig} />
      {noProfile && <span className={styles.noFilesMsg}>Perfil não configurado</span>}
      <svg id='svg_legend' ref={legendSvgRef} />
      <svg
        id='#svg_drawer'
        className={`${styles.svgContainer} ${noProfile ? styles.hide : ''}`}
        ref={svgContainer}
      />
    </div>
  );
};

export default ProfileDrawer;
