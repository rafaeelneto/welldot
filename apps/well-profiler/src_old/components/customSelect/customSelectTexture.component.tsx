/* eslint-disable jsx-a11y/no-autofocus */
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { CellProps } from 'react-datasheet-grid';
import Select, {
  components,
  OptionProps,
  SingleValue,
  SingleValueProps,
} from 'react-select';

import { importFgdcTextures } from '@welldot/render';

import { Texture } from '@welldot/core';
import { SelectOptions } from '../../types/customColumns.types';

// Load the JSON once; all TextureThumbnail instances share the same promise.
let _fgdcCache: Record<string | number, string> | null = null;
let _fgdcPromise: Promise<Record<string | number, string>> | null = null;

function loadFgdcPaths(): Promise<Record<string | number, string>> {
  if (_fgdcCache) return Promise.resolve(_fgdcCache);
  if (!_fgdcPromise) {
    _fgdcPromise = importFgdcTextures().then(paths => {
      _fgdcCache = paths;
      return paths;
    });
  }
  return _fgdcPromise;
}

const FGDC_DESCRIPTIONS: Record<number, string> = {
  // Padrões superficiais (série 100)
  120: 'Padrão superficial 120',
  123: 'Padrão superficial 123',
  132: 'Padrão superficial 132',
  // Padrões litológicos sedimentares (série 600)
  601: 'Cascalho ou conglomerado (1ª opção)',
  602: 'Cascalho ou conglomerado (2ª opção)',
  603: 'Cascalho ou conglomerado com estratificação cruzada',
  605: 'Brecha (1ª opção)',
  606: 'Brecha (2ª opção)',
  607: 'Areia ou arenito maciço',
  608: 'Areia ou arenito estratificado',
  609: 'Areia ou arenito com estratificação cruzada (1ª opção)',
  610: 'Areia ou arenito com estratificação cruzada (2ª opção)',
  611: 'Areia ou arenito com estratificação ondulada',
  612: 'Arenito argiloso ou com intercalações de folhelho',
  613: 'Arenito calcário',
  614: 'Arenito dolomítico',
  616: 'Silte, siltito ou silte argiloso',
  617: 'Siltito calcário',
  618: 'Siltito dolomítico',
  619: 'Folhelho arenoso ou siltoso',
  620: 'Argila ou folhelho argiloso',
  621: 'Folhelho chertoso',
  622: 'Folhelho dolomítico',
  623: 'Folhelho calcário ou marga',
  624: 'Folhelho carbonoso',
  625: 'Folhelho betuminoso',
  626: 'Giz',
  627: 'Calcário',
  628: 'Calcário clástico',
  629: 'Calcário clástico fossilífero',
  630: 'Calcário nodular ou com estratificação irregular',
  631: 'Calcário com preenchimentos irregulares (bioturbação?) de dolomita sacaroidal',
  632: 'Calcário com estratificação cruzada',
  633: 'Calcário chertoso com estratificação cruzada',
  634: 'Calcário clástico chertoso e arenoso com estratificação cruzada',
  635: 'Calcário oolítico',
  636: 'Calcário arenoso',
  637: 'Calcário siltoso',
  638: 'Calcário argiloso ou com folhelho',
  639: 'Calcário chertoso (1ª opção)',
  640: 'Calcário chertoso (2ª opção)',
  641: 'Calcário dolomítico, dolomita calcífera ou dolomita limosa',
  642: 'Dolomita ou dolomito',
  643: 'Dolomita com estratificação cruzada',
  644: 'Dolomita oolítica',
  645: 'Dolomita arenosa',
  646: 'Dolomita siltosa',
  647: 'Dolomita argilosa ou com folhelho',
  648: 'Dolomita chertosa',
  649: 'Chert estratificado (1ª opção)',
  650: 'Chert estratificado (2ª opção)',
  651: 'Chert estratificado fossilífero',
  652: 'Rocha fossilífera',
  653: 'Rocha diatomácea',
  654: 'Subgrauvaca',
  655: 'Subgrauvaca com estratificação cruzada',
  656: 'Subgrauvaca com estratificação ondulada',
  657: 'Turfa',
  658: 'Carvão',
  659: 'Carvão impuro ou carvão ósseo',
  660: 'Argila de base',
  661: 'Argila filítica',
  662: 'Bentonita',
  663: 'Glauconita',
  664: 'Limonita',
  665: 'Siderita',
  666: 'Rocha fosfática nodular',
  667: 'Gipsita',
  668: 'Sal-gema',
  669: 'Arenito e siltito intercalados',
  670: 'Arenito e folhelho intercalados',
  671: 'Arenito com estratificação ondulada e folhelho intercalados',
  672: 'Folhelho e calcário siltoso intercalados (folhelho dominante)',
  673: 'Folhelho e calcário intercalados (folhelho dominante) (1ª opção)',
  674: 'Folhelho e calcário intercalados (folhelho dominante) (2ª opção)',
  675: 'Folhelho calcário e calcário intercalados (folhelho dominante)',
  676: 'Calcário siltoso e folhelho intercalados',
  677: 'Calcário e folhelho intercalados (1ª opção)',
  678: 'Calcário e folhelho intercalados (2ª opção)',
  679: 'Calcário e folhelho intercalados (calcário dominante)',
  680: 'Calcário e folhelho calcário intercalados',
  681: 'Tilito ou diamictito (1ª opção)',
  682: 'Tilito ou diamictito (2ª opção)',
  683: 'Tilito ou diamictito (3ª opção)',
  684: 'Loesse (1ª opção)',
  685: 'Loesse (2ª opção)',
  686: 'Loesse (3ª opção)',
  // Padrões litológicos metamórficos (série 700)
  701: 'Metamorfismo',
  702: 'Quartzito',
  703: 'Ardósia',
  704: 'Granito xistoso ou gnáissico',
  705: 'Xisto',
  706: 'Xisto contorcido',
  707: 'Xisto e gnaisse',
  708: 'Gnaisse',
  709: 'Gnaisse contorcido',
  710: 'Esteatito, talco ou serpentinito',
  // Padrões litológicos ígneos e de veios (série 700 continuação)
  711: 'Rocha tufácea',
  712: 'Tufo cristalino',
  713: 'Tufo desvitrificado',
  714: 'Brecha vulcânica e tufo',
  715: 'Brecha vulcânica ou aglomerado',
  716: 'Rocha zeolítica',
  717: 'Derrames basálticos',
  718: 'Granito (1ª opção)',
  719: 'Granito (2ª opção)',
  720: 'Rocha ígnea bandada',
  721: 'Rocha ígnea (1ª opção)',
  722: 'Rocha ígnea (2ª opção)',
  723: 'Rocha ígnea (3ª opção)',
  724: 'Rocha ígnea (4ª opção)',
  725: 'Rocha ígnea (5ª opção)',
  726: 'Rocha ígnea (6ª opção)',
  727: 'Rocha ígnea (7ª opção)',
  728: 'Rocha ígnea (8ª opção)',
  729: 'Rocha porfírica (1ª opção)',
  730: 'Rocha porfírica (2ª opção)',
  731: 'Vitrofiro',
  732: 'Quartzo',
  733: 'Minério',
};

// ─── Dot-pattern textures ─────────────────────────────────────────────────────
// Codes 607–611 (and 719) use SVG path data made entirely of zero-length h0
// segments — i.e., they encode point positions, not stroked lines. Rendering
// them with stroke produces nothing visible. We re-parse the coordinates and
// render a <circle> per point instead.
const DOT_TEXTURE_CODES = new Set([607, 608, 609, 610, 611]);

/** Parse all absolute (x, y) positions from an h0-style dot path. */
function parseDotCoords(pathData: string): Array<[number, number]> {
  const tokens = pathData.match(/[MmHhVvLlCcZz]|[-+]?[0-9]*\.?[0-9]+/g) ?? [];
  const coords: Array<[number, number]> = [];
  let x = 0,
    y = 0,
    cmd = '';
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (/[MmHhVvLlCcZz]/.test(t)) {
      cmd = t;
      i++;
      continue;
    }
    const n = parseFloat(t);
    if (isNaN(n)) {
      i++;
      continue;
    }
    if (cmd === 'M') {
      const n2 = parseFloat(tokens[i + 1] ?? '');
      if (!isNaN(n2)) {
        x = n;
        y = n2;
        coords.push([x, y]);
        i += 2;
      } else i++;
    } else if (cmd === 'm') {
      const n2 = parseFloat(tokens[i + 1] ?? '');
      if (!isNaN(n2)) {
        x += n;
        y += n2;
        coords.push([x, y]);
        i += 2;
      } else i++;
    } else {
      i++;
    }
  }
  return coords;
}

// ─── Hand-crafted fallbacks for codes with empty path data ───────────────────
// 685 = Loess (2nd option): dashed horizontal bands + subtle wavy curves.
// 718 = Granite (1st option): scattered irregular crystal shapes.
const FALLBACK_SVG_CONTENT: Record<number, React.ReactElement> = {
  685: (
    <>
      {/* Dashed horizontal lines (loess strata) */}
      {[20, 50, 80, 110, 140].map(y => (
        <line
          key={y}
          x1="0"
          y1={y}
          x2="150"
          y2={y}
          stroke="currentColor"
          strokeWidth={1.5}
          strokeDasharray="18 6"
        />
      ))}
      {/* Subtle wavy curves between bands */}
      {[35, 65, 95, 125].map((y, i) => (
        <path
          key={y}
          d={`M0,${y} C25,${y - 8 + i * 2} 50,${y + 8 - i * 2} 75,${y} S125,${y - 6} 150,${y}`}
          stroke="currentColor"
          strokeWidth={0.7}
          fill="none"
        />
      ))}
    </>
  ),
  718: (
    <>
      {/* Granite: scattered short line segments / crystal facets */}
      {[
        [10, 15, 22, 12],
        [35, 8, 45, 18],
        [65, 5, 72, 20],
        [90, 12, 100, 8],
        [120, 6, 130, 18],
        [145, 15, 148, 28],
        [5, 40, 18, 35],
        [40, 32, 52, 45],
        [70, 38, 80, 28],
        [100, 30, 112, 42],
        [135, 35, 145, 25],
        [15, 60, 25, 50],
        [50, 55, 60, 68],
        [80, 58, 90, 48],
        [110, 52, 122, 65],
        [140, 58, 148, 48],
        [8, 80, 20, 72],
        [42, 76, 55, 88],
        [72, 78, 85, 68],
        [105, 74, 115, 86],
        [138, 80, 148, 70],
        [18, 100, 30, 92],
        [48, 96, 58, 108],
        [80, 100, 92, 90],
        [112, 97, 122, 108],
        [140, 102, 150, 94],
        [10, 118, 22, 110],
        [44, 116, 56, 128],
        [76, 120, 88, 112],
        [108, 118, 120, 128],
        [138, 122, 148, 112],
        [14, 138, 26, 130],
        [48, 136, 60, 148],
        [80, 140, 90, 130],
        [110, 138, 122, 148],
        [138, 140, 148, 132],
      ].map(([x1, y1, x2, y2], i) => (
        <line
          key={i}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="currentColor"
          strokeWidth={1}
        />
      ))}
      {/* Small dots at crystal centers */}
      {[
        [16, 13],
        [42, 12],
        [68, 12],
        [95, 10],
        [125, 12],
        [148, 12],
        [10, 48],
        [52, 40],
        [75, 33],
        [106, 36],
        [140, 30],
        [22, 78],
        [58, 78],
        [87, 73],
        [115, 78],
        [144, 75],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={1.8} fill="currentColor" />
      ))}
    </>
  ),
};

// ─── SVG thumbnail for a texture ─────────────────────────────────────────────
// The FGDC path data uses a ~150×150 viewBox coordinate space.
const SVG_WRAPPER_STYLE: React.CSSProperties = {
  display: 'block',
  flexShrink: 0,
  border: '1px solid rgba(0,0,0,0.12)',
  borderRadius: 3,
};

const TextureThumbnail: React.FC<{
  code: number;
  size?: number;
  strokeColor?: string;
}> = ({ code, size = 48, strokeColor = 'currentColor' }) => {
  const [pathData, setPathData] = useState<string | undefined>(undefined);

  useEffect(() => {
    loadFgdcPaths().then(paths => setPathData(paths[code]));
  }, [code]);

  // ── Fallback: hand-crafted SVG for codes with missing path data ──
  if (!pathData && FALLBACK_SVG_CONTENT[code]) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 150 150"
        xmlns="http://www.w3.org/2000/svg"
        style={{ ...SVG_WRAPPER_STYLE, color: strokeColor }}
        aria-hidden="true"
      >
        {FALLBACK_SVG_CONTENT[code]}
      </svg>
    );
  }

  if (!pathData) return <div style={{ width: size, height: size }} />;

  // ── Dot pattern: render each h0 coordinate as a filled circle ──
  if (DOT_TEXTURE_CODES.has(code)) {
    const dots = parseDotCoords(pathData);
    // Scale dot radius with thumbnail size so dots stay visible but not blotchy.
    // At 48px rendered / 150 viewBox = 0.32 scale; r=2.2 gives ~0.7px screen dots.
    const r = 2.2;
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 150 150"
        xmlns="http://www.w3.org/2000/svg"
        style={SVG_WRAPPER_STYLE}
        aria-hidden="true"
      >
        {dots.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill={strokeColor} />
        ))}
      </svg>
    );
  }

  // ── Default: stroked path ──
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 150 150"
      xmlns="http://www.w3.org/2000/svg"
      style={SVG_WRAPPER_STYLE}
      aria-hidden="true"
    >
      <path
        d={pathData}
        stroke={strokeColor}
        strokeWidth={0.8}
        fill="none"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};

const OptionLabel: React.FC<{ data: Texture; isCompact?: boolean }> = ({
  data,
  isCompact = false,
}) => {
  const code = typeof data.code === 'number' ? data.code : Number(data.code);
  const description = FGDC_DESCRIPTIONS[code];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: isCompact ? '2px 0' : '3px 0',
      }}
    >
      {/* dropdown rows: 48px, selected cell value: 28px */}
      <TextureThumbnail code={code} size={isCompact ? 28 : 48} />
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <span
          style={{
            fontWeight: 600,
            fontSize: isCompact ? 12 : 13,
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
          }}
        >
          {code}
        </span>
        {description && (
          <span
            style={{
              fontSize: 11,
              opacity: 0.65,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: isCompact ? 160 : 240,
              lineHeight: 1.3,
            }}
            title={description}
          >
            {description}
          </span>
        )}
      </div>
    </div>
  );
};

// ─── Custom react-select sub-components ──────────────────────────────────────
const CustomOption = (props: OptionProps<Texture>) => (
  <components.Option {...props} key={props.data.code}>
    <OptionLabel data={props.data} />
  </components.Option>
);

const CustomSingleValue = (props: SingleValueProps<Texture>) => (
  <components.SingleValue {...props}>
    <OptionLabel data={props.data} isCompact />
  </components.SingleValue>
);

// ─── Main component ───────────────────────────────────────────────────────────
function CustomSelect({
  active,
  rowData,
  setRowData,
  focus,
  stopEditing,
  columnData,
}: CellProps<string | null, SelectOptions>) {
  const ref = useRef<any>(null);

  useLayoutEffect(() => {
    if (focus) {
      ref.current?.focus();
    } else {
      ref.current?.blur();
    }
  }, [focus]);

  const handleChange = useCallback(
    (option: SingleValue<Texture>) => {
      if (!option) return;
      setRowData(String(option.code));
      setTimeout(stopEditing, 0);
    },
    [setRowData, stopEditing],
  );

  const customStyles = {
    container: (provided: any) => ({
      ...provided,
      flex: 1,
      alignSelf: 'stretch',
      pointerEvents: focus ? undefined : 'none',
    }),
    control: (provided: any) => ({
      ...provided,
      height: '100%',
      border: 'none',
      boxShadow: 'none',
      background: 'none',
      minHeight: 36,
    }),
    indicatorSeparator: (provided: any) => ({
      ...provided,
      opacity: 0,
    }),
    indicatorsContainer: (provided: any) => ({
      ...provided,
      opacity: active ? 1 : 0,
    }),
    placeholder: (provided: any) => ({
      ...provided,
      opacity: active ? 1 : 0,
    }),
    // Give the dropdown options a bit more height to accommodate the thumbnail
    option: (provided: any) => ({
      ...provided,
      padding: '5px 10px',
      cursor: 'pointer',
    }),
    // Wide enough for thumbnail + code + description
    menu: (provided: any) => ({
      ...provided,
      minWidth: 320,
    }),
  };

  const selectedOption =
    columnData.options.find(({ code }) => String(code) === String(rowData)) ??
    null;

  const handleMenuOpen = () => {
    if (!selectedOption) return;
    setTimeout(() => {
      const menuList = ref.current?.menuListRef;
      console.log('menuList element:', menuList);
      const selected = menuList?.querySelector('[aria-selected="true"]');
      selected?.scrollIntoView({ block: 'nearest' });
    }, 0);
  };

  return (
    <Select<Texture, false>
      ref={ref}
      menuShouldScrollIntoView
      onMenuOpen={handleMenuOpen}
      styles={customStyles}
      isDisabled={columnData.disabled}
      value={selectedOption as Texture | null}
      menuPortalTarget={document.body}
      menuIsOpen={focus}
      getOptionValue={option => String(option.code)}
      isSearchable={true}
      onChange={handleChange}
      onMenuClose={() => stopEditing({ nextRow: false })}
      options={columnData.options as Texture[]}
      components={{
        Option: CustomOption,
        SingleValue: CustomSingleValue,
      }}
    />
  );
}

export default CustomSelect;
