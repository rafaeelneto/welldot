import React, { useCallback, useEffect, useRef, useState } from 'react';

import { checkIfProfileIsEmpty } from '@/src/lib/utils/well.utils';

import { WellDrawer } from '@/src/lib/wellDrawer/WellDrawer';

import { Well } from '@/src/lib/@types/well.types';
import { useUIStore } from '@/src/store/ui.store';

import styles from './profileDrawer.module.scss';

interface ProfileDrawerProps {
  profile: Well;
}

const INIT_CONFIG = {
  animation:    { duration: 750 },
  geologic:     { xLeft: 10, xRightInset: 90 },
  layout:       { pocoWidthRatio: 0.25, pocoCenterRatio: 0.75 },
  caves:        { pathSteps: 32, amplitude: { ratio: 0.06, min: 2, max: 5 } },
  fractures: {
    widthMultiplier: 1.2,
    hitBuffer:       { single: 8, swarm: 14 },
    swarm: {
      lineCountBase: 4, lineCountVariance: 2,
      spread: 18,
      centralStrokeWidth: 1.8,
      sideStrokeWidthBase: 0.6, sideStrokeWidthVariance: 0.7,
    },
    single: { mainStrokeWidth: 1.8, crackStrokeWidth: 0.9 },
  },
  construction: {
    cementPad:   { widthMultiplier: 0.7, thicknessMultiplier: 0.7 },
    surfaceCase: { diameterPaddingRatio: 0.1 },
  },
};

type RenderCfg = typeof INIT_CONFIG;

const ProfileDrawer = ({ profile }: ProfileDrawerProps) => {
  const svgContainer = useRef(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const profileDrawer = useRef<WellDrawer | null>(null);
  const { length_units, diameter_units } = useUIStore();
  const [config, setConfig] = useState<RenderCfg>(INIT_CONFIG);
  const [showEditor, setShowEditor] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);

  const MARGINS = { TOP: 30, RIGHT: 30, BOTTOM: 15, LEFT: 50 };
  const HEIGHT = 800 - MARGINS.TOP - MARGINS.BOTTOM;
  const WIDTH  = Math.max(0, containerWidth - MARGINS.LEFT - MARGINS.RIGHT);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const obs = new ResizeObserver(entries => {
      setContainerWidth(entries[0].contentRect.width);
    });
    obs.observe(wrapperRef.current);
    return () => obs.disconnect();
  }, []);

  const setNum = useCallback((path: string[], value: number) => {
    setConfig(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as RenderCfg;
      let obj: any = next;
      for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]];
      obj[path[path.length - 1]] = value;
      return next;
    });
  }, []);

  useEffect(() => {
    if (!svgContainer.current || WIDTH <= 0) return;

    profileDrawer.current = new WellDrawer([
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
      }
    ], {
      classNames: {
        tooltip: {
          root: styles.tooltip,
          title: styles.title,
          primaryInfo: styles.primaryInfo,
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

  const noProfile = checkIfProfileIsEmpty(profile);

  const numInput = (label: string, path: string[], step = 0.1) => (
    <div className={styles.editorRow} key={path.join('.')}>
      <label className={styles.editorLabel}>{label}</label>
      <input
        className={styles.editorInput}
        type="number"
        step={step}
        value={path.reduce((o: any, k) => o[k], config)}
        onChange={e => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) setNum(path, v);
        }}
      />
    </div>
  );

  return (
    <div className={styles.editorWrapper} ref={wrapperRef}>
      <button className={styles.toggleBtn} onClick={() => setShowEditor(v => !v)}>
        {showEditor ? '✕ Config' : '⚙ Config'}
      </button>
      {showEditor && (
        <div className={styles.editor}>
          <div className={styles.editorSection}>
            <h4 className={styles.editorSectionTitle}>Animation</h4>
            {numInput('Duration (ms)', ['animation', 'duration'], 50)}
          </div>

          <div className={styles.editorSection}>
            <h4 className={styles.editorSectionTitle}>Geologic</h4>
            {numInput('X Left', ['geologic', 'xLeft'], 1)}
            {numInput('X Right Inset', ['geologic', 'xRightInset'], 1)}
          </div>

          <div className={styles.editorSection}>
            <h4 className={styles.editorSectionTitle}>Layout</h4>
            {numInput('Poco Width Ratio', ['layout', 'pocoWidthRatio'], 0.01)}
            {numInput('Poco Center Ratio', ['layout', 'pocoCenterRatio'], 0.01)}
          </div>

          <div className={styles.editorSection}>
            <h4 className={styles.editorSectionTitle}>Caves</h4>
            {numInput('Path Steps', ['caves', 'pathSteps'], 1)}
            {numInput('Amplitude Ratio', ['caves', 'amplitude', 'ratio'], 0.01)}
            {numInput('Amplitude Min', ['caves', 'amplitude', 'min'], 0.5)}
            {numInput('Amplitude Max', ['caves', 'amplitude', 'max'], 0.5)}
          </div>

          <div className={styles.editorSection}>
            <h4 className={styles.editorSectionTitle}>Fractures</h4>
            {numInput('Width Multiplier', ['fractures', 'widthMultiplier'], 0.1)}
            {numInput('Hit Buffer Single', ['fractures', 'hitBuffer', 'single'], 1)}
            {numInput('Hit Buffer Swarm', ['fractures', 'hitBuffer', 'swarm'], 1)}
            <h5 className={styles.editorSubTitle}>Swarm</h5>
            {numInput('Line Count Base', ['fractures', 'swarm', 'lineCountBase'], 1)}
            {numInput('Line Count Variance', ['fractures', 'swarm', 'lineCountVariance'], 1)}
            {numInput('Spread', ['fractures', 'swarm', 'spread'], 1)}
            {numInput('Central Stroke Width', ['fractures', 'swarm', 'centralStrokeWidth'], 0.1)}
            {numInput('Side Stroke Base', ['fractures', 'swarm', 'sideStrokeWidthBase'], 0.1)}
            {numInput('Side Stroke Variance', ['fractures', 'swarm', 'sideStrokeWidthVariance'], 0.1)}
            <h5 className={styles.editorSubTitle}>Single</h5>
            {numInput('Main Stroke Width', ['fractures', 'single', 'mainStrokeWidth'], 0.1)}
            {numInput('Crack Stroke Width', ['fractures', 'single', 'crackStrokeWidth'], 0.1)}
          </div>

          <div className={styles.editorSection}>
            <h4 className={styles.editorSectionTitle}>Construction</h4>
            <h5 className={styles.editorSubTitle}>Cement Pad</h5>
            {numInput('Width Multiplier', ['construction', 'cementPad', 'widthMultiplier'], 0.1)}
            {numInput('Thickness Multiplier', ['construction', 'cementPad', 'thicknessMultiplier'], 0.1)}
            <h5 className={styles.editorSubTitle}>Surface Case</h5>
            {numInput('Diameter Padding Ratio', ['construction', 'surfaceCase', 'diameterPaddingRatio'], 0.01)}
          </div>
        </div>
      )}
      {noProfile ? (
        <span className={styles.noFilesMsg}>Perfil não configurado</span>
      ) : (
        ''
      )}
      <svg
        id='#svg_drawer'
        className={`${styles.svgContainer} ${noProfile ? styles.hide : ''}`}
        ref={svgContainer}
      />
    </div>
  );
};

export default ProfileDrawer;
