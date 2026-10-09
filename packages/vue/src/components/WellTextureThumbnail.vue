<script setup lang="ts">
/**
 * Thumbnail of an FGDC lithology texture, drawn from the texture registry
 * (loaded lazily from `@welldot/render/textures` and cached).
 */
import { importFgdcTextures } from '@welldot/render/textures';
import { computed, ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    code: number | string | undefined;
    size?: number;
  }>(),
  { size: 48 },
);
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

// Codes 607–611 use M x,y h0 path segments (zero-length = dot positions) — render as circles
const DOT_TEXTURE_CODES = new Set([607, 608, 609, 610, 611]);

function parseDotCoords(pathData: string): Array<[number, number]> {
  const tokens = pathData.match(/[MmHhVvLlCcZz]|[-+]?[0-9]*\.?[0-9]+/g) ?? [];
  const coords: Array<[number, number]> = [];
  let x = 0,
    y = 0,
    cmd = '';
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i] || '';
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

// ── Hand-crafted fallbacks for codes with empty path data ─────────────────────
const FALLBACK_685_LINES = [20, 50, 80, 110, 140];
const FALLBACK_685_CURVES = [35, 65, 95, 125].map((y, i) => ({ y, i }));

const FALLBACK_718_LINES: Array<[number, number, number, number]> = [
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
];

const FALLBACK_718_DOTS: Array<[number, number]> = [
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
];

const pathData = ref<string | undefined>(undefined);
const numericCode = computed(() => Number(props.code));

watch(
  () => props.code,
  () => {
    pathData.value = undefined;
    loadFgdcPaths().then(paths => {
      const code = String(props.code);
      pathData.value = paths[code];
    });
  },
  {
    immediate: true,
  },
);

type RenderMode = 'fallback685' | 'fallback718' | 'spacer' | 'dots' | 'path';

const renderMode = computed<RenderMode>(() => {
  const code = numericCode.value;
  if (!pathData.value) {
    if (code === 685) return 'fallback685';
    if (code === 718) return 'fallback718';
    return 'spacer';
  }
  if (DOT_TEXTURE_CODES.has(code)) return 'dots';
  return 'path';
});

const dotCoords = computed<Array<[number, number]>>(() => {
  if (renderMode.value !== 'dots' || !pathData.value) return [];
  return parseDotCoords(pathData.value);
});
</script>

<template>
  <svg
    v-if="renderMode === 'fallback685'"
    :width="size"
    :height="size"
    viewBox="0 0 150 150"
    xmlns="http://www.w3.org/2000/svg"
    class="texture-svg"
    aria-hidden="true"
  >
    <line
      v-for="y in FALLBACK_685_LINES"
      :key="y"
      x1="0"
      :y1="y"
      x2="150"
      :y2="y"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-dasharray="18 6"
    />
    <path
      v-for="{ y, i } in FALLBACK_685_CURVES"
      :key="y"
      :d="`M0,${y} C25,${y - 8 + i * 2} 50,${y + 8 - i * 2} 75,${y} S125,${y - 6} 150,${y}`"
      stroke="currentColor"
      stroke-width="0.7"
      fill="none"
    />
  </svg>

  <!-- Fallback 718: scattered granite crystal shapes -->
  <svg
    v-else-if="renderMode === 'fallback718'"
    :width="size"
    :height="size"
    viewBox="0 0 150 150"
    xmlns="http://www.w3.org/2000/svg"
    class="texture-svg"
    aria-hidden="true"
  >
    <line
      v-for="([x1, y1, x2, y2], i) in FALLBACK_718_LINES"
      :key="i"
      :x1="x1"
      :y1="y1"
      :x2="x2"
      :y2="y2"
      stroke="currentColor"
      stroke-width="1"
    />
    <circle
      v-for="([cx, cy], i) in FALLBACK_718_DOTS"
      :key="i"
      :cx="cx"
      :cy="cy"
      r="1.8"
      fill="currentColor"
    />
  </svg>

  <!-- Dot textures (607–611): h0 path segments rendered as circles -->
  <svg
    v-else-if="renderMode === 'dots'"
    :width="size"
    :height="size"
    viewBox="0 0 150 150"
    xmlns="http://www.w3.org/2000/svg"
    class="texture-svg"
    aria-hidden="true"
  >
    <circle
      v-for="([cx, cy], i) in dotCoords"
      :key="i"
      :cx="cx"
      :cy="cy"
      r="2.2"
      fill="currentColor"
    />
  </svg>

  <!-- Standard stroke path -->
  <svg
    v-else-if="renderMode === 'path'"
    :width="size"
    :height="size"
    viewBox="0 0 150 150"
    xmlns="http://www.w3.org/2000/svg"
    class="texture-svg"
    aria-hidden="true"
  >
    <path
      :d="pathData"
      stroke="currentColor"
      stroke-width="0.8"
      fill="none"
      vector-effect="non-scaling-stroke"
    />
  </svg>

  <!-- Loading spacer -->
  <div v-else :style="{ width: `${size}px`, height: `${size}px` }" />
</template>

<style scoped>
.texture-svg {
  display: block;
  flex-shrink: 0;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 3px;
}
</style>
