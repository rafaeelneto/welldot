import React, { useCallback, useState } from 'react';
import { DrawerRenderConfig, TooltipKey } from '@/src/lib/@types/drawer.types';
import { DeepPartial } from '@/src/lib/@types/generic.types';
import styles from './profileDrawer.module.scss';
import { INTERACTIVE_RENDER_CONFIG } from '@/src/lib/wellDrawer/drawer.configs';

type ActiveLabelItem    = 'lithology' | 'fractures' | 'caves';
type LithologyLabelItem = 'depth' | 'description' | 'dividers';

const ALL_TOOLTIP_KEYS: TooltipKey[] = [
  'geology', 'hole', 'surfaceCase', 'holeFill', 'wellCase',
  'wellScreen', 'conflict', 'fracture', 'cementPad', 'cave',
];

const TOOLTIP_LABELS: Record<TooltipKey, string> = {
  geology: 'Geology', hole: 'Bore Hole', surfaceCase: 'Surface Case',
  holeFill: 'Hole Fill', wellCase: 'Well Case', wellScreen: 'Well Screen',
  conflict: 'Conflict', fracture: 'Fracture', cementPad: 'Cement Pad', cave: 'Cave',
};

const ALL_ACTIVE_LABEL_ITEMS: ActiveLabelItem[]    = ['lithology', 'fractures', 'caves'];
const ALL_LITHOLOGY_LABEL_ITEMS: LithologyLabelItem[] = ['depth', 'description', 'dividers'];

const ACTIVE_LABEL_NAMES: Record<ActiveLabelItem, string> = {
  lithology: 'Lithology', fractures: 'Fractures', caves: 'Caves',
};

const LITHOLOGY_LABEL_NAMES: Record<LithologyLabelItem, string> = {
  depth: 'Depth Tips', description: 'Descriptions', dividers: 'Dividers',
};

export const RENDER_EDITOR_DEFAULTS: DeepPartial<DrawerRenderConfig> = INTERACTIVE_RENDER_CONFIG;

interface Props {
  config: DeepPartial<DrawerRenderConfig>;
  onChange: React.Dispatch<React.SetStateAction<DeepPartial<DrawerRenderConfig>>>;
}

const RenderConfigEditor = ({ config, onChange: setConfig }: Props) => {
  const [showEditor, setShowEditor] = useState(false);
  const [copied, setCopied]         = useState(false);

  const setNum = useCallback((path: string[], value: number) => {
    setConfig(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as DeepPartial<DrawerRenderConfig>;
      let obj: any = next;
      for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]];
      obj[path[path.length - 1]] = value;
      return next;
    });
  }, [setConfig]);

  const setStr = useCallback((path: string[], value: string) => {
    setConfig(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as DeepPartial<DrawerRenderConfig>;
      let obj: any = next;
      for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]];
      obj[path[path.length - 1]] = value;
      return next;
    });
  }, [setConfig]);

  const setBool = useCallback((key: 'zoom' | 'pan', value: boolean) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, [setConfig]);

  const toggleTooltip = useCallback((key: TooltipKey) => {
    setConfig(prev => {
      const active = prev.tooltips === undefined ? [...ALL_TOOLTIP_KEYS] : prev.tooltips ? [...prev.tooltips] : [];
      const idx = active.indexOf(key);
      if (idx >= 0) active.splice(idx, 1); else active.push(key);
      const next = active.length === 0 ? false : active.length === ALL_TOOLTIP_KEYS.length ? undefined : active as TooltipKey[];
      return { ...prev, tooltips: next };
    });
  }, [setConfig]);

  const toggleAllTooltips = useCallback((enable: boolean) => {
    setConfig(prev => ({ ...prev, tooltips: enable ? undefined : false }));
  }, [setConfig]);

  const toggleActiveLabel = useCallback((item: ActiveLabelItem) => {
    setConfig(prev => {
      const cur = prev.labels?.active;
      const arr: ActiveLabelItem[] =
        cur === true  ? [...ALL_ACTIVE_LABEL_ITEMS] :
        cur === false || cur == null ? [] :
        [...(cur as ActiveLabelItem[])];
      const idx = arr.indexOf(item);
      if (idx >= 0) arr.splice(idx, 1); else arr.push(item);
      const next: boolean | ActiveLabelItem[] =
        arr.length === 0                             ? false :
        arr.length === ALL_ACTIVE_LABEL_ITEMS.length ? true  : arr;
      return { ...prev, labels: { ...prev.labels, active: next } };
    });
  }, [setConfig]);

  const toggleAllActiveLabels = useCallback((enable: boolean) => {
    setConfig(prev => ({ ...prev, labels: { ...prev.labels, active: enable ? true : false } }));
  }, [setConfig]);

  const toggleLithologyLabel = useCallback((item: LithologyLabelItem) => {
    setConfig(prev => {
      const cur = prev.labels?.lithology;
      const arr: LithologyLabelItem[] =
        cur === true  ? [...ALL_LITHOLOGY_LABEL_ITEMS] :
        cur === false || cur == null ? [] :
        [...(cur as LithologyLabelItem[])];
      const idx = arr.indexOf(item);
      if (idx >= 0) arr.splice(idx, 1); else arr.push(item);
      const next: boolean | LithologyLabelItem[] =
        arr.length === 0                                  ? false :
        arr.length === ALL_LITHOLOGY_LABEL_ITEMS.length   ? true  : arr;
      return { ...prev, labels: { ...prev.labels, lithology: next } };
    });
  }, [setConfig]);

  const toggleAllLithologyLabels = useCallback((enable: boolean) => {
    setConfig(prev => ({ ...prev, labels: { ...prev.labels, lithology: enable ? true : false } }));
  }, [setConfig]);

  const numInput = (label: string, path: string[], step = 0.1) => (
    <div className={styles.editorRow} key={path.join('.')}>
      <label className={styles.editorLabel}>{label}</label>
      <input
        className={styles.editorInput}
        type="number"
        step={step}
        value={path.reduce((o: any, k) => o?.[k], config) ?? ''}
        onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) setNum(path, v); }}
      />
    </div>
  );

  const activeLabels = config.labels?.active;
  const activeArr: ActiveLabelItem[] =
    activeLabels === true  ? [...ALL_ACTIVE_LABEL_ITEMS] :
    activeLabels === false || activeLabels == null ? [] :
    activeLabels as ActiveLabelItem[];

  const lithologyLabels = config.labels?.lithology;
  const lithologyArr: LithologyLabelItem[] =
    lithologyLabels === true  ? [...ALL_LITHOLOGY_LABEL_ITEMS] :
    lithologyLabels === false || lithologyLabels == null ? [] :
    lithologyLabels as LithologyLabelItem[];

  return (
    <>
      <button className={styles.toggleBtn} onClick={() => setShowEditor(v => !v)}>
        {showEditor ? '✕ Config' : '⚙ Config'}
      </button>

      {showEditor && (
        <div className={styles.editor}>
          <div className={styles.editorSection}>
            <h4 className={styles.editorSectionTitle}>Interaction</h4>
            {(['zoom', 'pan'] as const).map(key => (
              <div className={styles.editorRow} key={key}>
                <label className={styles.editorLabel} style={{ textTransform: 'capitalize' }}>{key}</label>
                <input type="checkbox" checked={!!config[key]} onChange={e => setBool(key, e.target.checked)} />
              </div>
            ))}
          </div>

          <div className={styles.editorSection}>
            <h4 className={styles.editorSectionTitle}>Tooltips</h4>
            {(() => {
              const active = config.tooltips === undefined ? ALL_TOOLTIP_KEYS : config.tooltips || [];
              return (
                <>
                  <div className={styles.editorRow}>
                    <label className={styles.editorLabel}>All</label>
                    <input
                      type="checkbox"
                      checked={(active as TooltipKey[]).length === ALL_TOOLTIP_KEYS.length}
                      onChange={e => toggleAllTooltips(e.target.checked)}
                    />
                  </div>
                  {ALL_TOOLTIP_KEYS.map(key => (
                    <div className={styles.editorRow} key={key}>
                      <label className={styles.editorLabel}>{TOOLTIP_LABELS[key]}</label>
                      <input
                        type="checkbox"
                        checked={(active as TooltipKey[]).includes(key)}
                        onChange={() => toggleTooltip(key)}
                      />
                    </div>
                  ))}
                </>
              );
            })()}
          </div>

          <div className={styles.editorSection}>
            <h4 className={styles.editorSectionTitle}>Animation</h4>
            {numInput('Duration (ms)', ['animation', 'duration'], 50)}
          </div>

          <div className={styles.editorSection}>
            <h4 className={styles.editorSectionTitle}>Geologic</h4>
            {numInput('X Left',        ['geologic', 'xLeft'],       1)}
            {numInput('X Right Inset', ['geologic', 'xRightInset'], 1)}
          </div>

          <div className={styles.editorSection}>
            <h4 className={styles.editorSectionTitle}>Layout</h4>
            {numInput('Poco Width Ratio',  ['layout', 'pocoWidthRatio'],  0.01)}
            {numInput('Poco Center Ratio', ['layout', 'pocoCenterRatio'], 0.01)}
          </div>

          <div className={styles.editorSection}>
            <h4 className={styles.editorSectionTitle}>Caves</h4>
            {numInput('Path Steps',     ['caves', 'pathSteps'],           1)}
            {numInput('Amplitude Ratio',['caves', 'amplitude', 'ratio'],  0.01)}
            {numInput('Amplitude Min',  ['caves', 'amplitude', 'min'],    0.5)}
            {numInput('Amplitude Max',  ['caves', 'amplitude', 'max'],    0.5)}
          </div>

          <div className={styles.editorSection}>
            <h4 className={styles.editorSectionTitle}>Fractures</h4>
            {numInput('Width Multiplier',   ['fractures', 'widthMultiplier'],         0.1)}
            {numInput('Hit Buffer Single',  ['fractures', 'hitBuffer', 'single'],     1)}
            {numInput('Hit Buffer Swarm',   ['fractures', 'hitBuffer', 'swarm'],      1)}
            <h5 className={styles.editorSubTitle}>Swarm</h5>
            {numInput('Line Count Base',    ['fractures', 'swarm', 'lineCountBase'],       1)}
            {numInput('Line Count Variance',['fractures', 'swarm', 'lineCountVariance'],   1)}
            {numInput('Spread',             ['fractures', 'swarm', 'spread'],              1)}
            {numInput('Central Stroke',     ['fractures', 'swarm', 'centralStrokeWidth'],  0.1)}
            {numInput('Side Stroke Base',   ['fractures', 'swarm', 'sideStrokeWidthBase'], 0.1)}
            {numInput('Side Stroke Var',    ['fractures', 'swarm', 'sideStrokeWidthVariance'], 0.1)}
            <h5 className={styles.editorSubTitle}>Single</h5>
            {numInput('Main Stroke',  ['fractures', 'single', 'mainStrokeWidth'],  0.1)}
            {numInput('Crack Stroke', ['fractures', 'single', 'crackStrokeWidth'], 0.1)}
          </div>

          <div className={styles.editorSection}>
            <h4 className={styles.editorSectionTitle}>Construction</h4>
            <h5 className={styles.editorSubTitle}>Cement Pad</h5>
            {numInput('Width Multiplier',     ['construction', 'cementPad', 'widthMultiplier'],     0.1)}
            {numInput('Thickness Multiplier', ['construction', 'cementPad', 'thicknessMultiplier'], 0.1)}
            <h5 className={styles.editorSubTitle}>Surface Case</h5>
            {numInput('Diameter Padding', ['construction', 'surfaceCase', 'diameterPaddingRatio'], 0.01)}
          </div>

          <div className={styles.editorSection}>
            <h4 className={styles.editorSectionTitle}>Labels</h4>

            <h5 className={styles.editorSubTitle}>Active</h5>
            <div className={styles.editorRow}>
              <label className={styles.editorLabel}>All</label>
              <input
                type="checkbox"
                checked={activeArr.length === ALL_ACTIVE_LABEL_ITEMS.length}
                onChange={e => toggleAllActiveLabels(e.target.checked)}
              />
            </div>
            {ALL_ACTIVE_LABEL_ITEMS.map(item => (
              <div className={styles.editorRow} key={item}>
                <label className={styles.editorLabel}>{ACTIVE_LABEL_NAMES[item]}</label>
                <input
                  type="checkbox"
                  checked={activeArr.includes(item)}
                  onChange={() => toggleActiveLabel(item)}
                />
              </div>
            ))}

            <h5 className={styles.editorSubTitle}>Lithology</h5>
            <div className={styles.editorRow}>
              <label className={styles.editorLabel}>All</label>
              <input
                type="checkbox"
                checked={lithologyArr.length === ALL_LITHOLOGY_LABEL_ITEMS.length}
                onChange={e => toggleAllLithologyLabels(e.target.checked)}
              />
            </div>
            {ALL_LITHOLOGY_LABEL_ITEMS.map(item => (
              <div className={styles.editorRow} key={item}>
                <label className={styles.editorLabel}>{LITHOLOGY_LABEL_NAMES[item]}</label>
                <input
                  type="checkbox"
                  checked={lithologyArr.includes(item)}
                  onChange={() => toggleLithologyLabel(item)}
                />
              </div>
            ))}

            <h5 className={styles.editorSubTitle}>Type Labels</h5>
            <div className={styles.editorRow}>
              <label className={styles.editorLabel}>Fracture</label>
              <input
                className={styles.editorInput}
                type="text"
                value={config.labels?.typeLabels?.fracture ?? ''}
                onChange={e => setStr(['labels', 'typeLabels', 'fracture'], e.target.value)}
              />
            </div>
            <div className={styles.editorRow}>
              <label className={styles.editorLabel}>Cave</label>
              <input
                className={styles.editorInput}
                type="text"
                value={config.labels?.typeLabels?.cave ?? ''}
                onChange={e => setStr(['labels', 'typeLabels', 'cave'], e.target.value)}
              />
            </div>

            <h5 className={styles.editorSubTitle}>Style</h5>
            {numInput('Font Size',             ['labels', 'style', 'fontSize'],              0.5)}
            {numInput('Description X Offset',  ['labels', 'style', 'descriptionXOffset'],    1)}
            {numInput('Description Max Width', ['labels', 'style', 'descriptionMaxWidth'],   1)}
            {numInput('Stacking Line Height',  ['labels', 'style', 'stackingLineHeight'],    1)}
            {numInput('Stacking Gap',          ['labels', 'style', 'stackingGap'],           1)}
            {numInput('Leader Gap',            ['labels', 'style', 'fractureLabelLeaderGap'],1)}
          </div>

          <button
            className={styles.copyBtn}
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(config, null, 2));
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? '✓ Copied' : 'Copy JSON'}
          </button>
        </div>
      )}
    </>
  );
};

export default RenderConfigEditor;
