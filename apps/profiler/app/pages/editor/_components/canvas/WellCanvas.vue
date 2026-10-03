<script setup lang="ts">
import type { DeepPartial, WellTheme } from '@welldot/render';
import {
  WellRenderer,
  INTERACTIVE_RENDER_CONFIG,
  applyRenderLocale,
} from '@welldot/render';
import { isWellEmpty } from '@welldot/core';
import { useDark } from '@vueuse/core';
import ZoomControls from './ZoomControls.vue';

const { t, locale } = useI18n();
const profileStore = useProfileStore();
const uiStore = useUiStore();

const svgId = `well-canvas-${Math.random().toString(36).slice(2, 8)}`;
const containerRef = ref<HTMLElement | null>(null);

const isDark = useDark({
  selector: 'html',
  attribute: 'class',
  valueDark: 'dark-mode',
  valueLight: '',
});

const well = computed(() => profileStore.renderableWell);
const isEmpty = computed(() => !well.value || isWellEmpty(well.value));

// ── Zoom state ───────────────────────────────────────────────────────────
// WellRenderer wires real mouse-wheel/drag zoom-pan internally once `zoom`/
// `pan` are enabled. `zoomBy`/`resetZoom`/`getZoomScale` + the `onZoom`
// callback operate on that same internal behavior, so wheel/drag and this
// toolbar never fall out of sync (see packages/render/CLAUDE.md — there is
// no other way to drive it from outside the class).
//
// The readout is a zoom percentage, not a physical "1 : N" engineering
// scale — the browser has no reliable way to know the monitor's actual
// pixel density, so a real-world ratio would just be wrong.

const ZOOM_STEP = 1.25;
const MARGINS = { top: 24, right: 16, bottom: 20, left: 48 };

const currentScale = ref(1);
const scaleLabel = computed(() => `${Math.round(currentScale.value * 100)}%`);

// ── Renderer lifecycle ──────────────────────────────────────────────────

const DARK_THEME_OVERRIDES: DeepPartial<WellTheme> = {
  labels: {
    color: 'rgba(255,255,255,0.55)',
    bodyColor: 'rgba(255,255,255,0.40)',
    dividerStroke: 'rgba(255,255,255,0.15)',
    annotationBg: '#1a2230',
    depthTipFill: '#2a3344',
  },
  constructionLabels: {
    labelFill: '#1a2230',
    labelColor: 'rgba(255,255,255,0.65)',
  },
  unitLabels: {
    geologicFill: '#2a3344',
    aquiferFill: '#1e3250',
    stroke: 'rgba(255,255,255,0.15)',
  },
};

let wellRenderer: WellRenderer | null = null;
let resizeObserver: ResizeObserver | null = null;
let renderToken = 0;

async function initRenderer() {
  const container = containerRef.value;
  if (!container) return;
  const token = ++renderToken;

  const width = Math.max(
    container.clientWidth - MARGINS.left - MARGINS.right,
    60,
  );
  const height = Math.max(
    container.clientHeight - MARGINS.top - MARGINS.bottom,
    60,
  );

  const renderer = new WellRenderer(
    [{ selector: `#${svgId}`, width, height, margins: MARGINS }],
    {
      units: {
        length: uiStore.lengthUnit,
        diameter: uiStore.diameterUnit,
        power: uiStore.powerUnit,
      },
      locale: locale.value as 'en' | 'pt',
      renderConfig: applyRenderLocale(
        INTERACTIVE_RENDER_CONFIG,
        locale.value === 'en' ? 'en' : 'pt',
      ),
      onZoom: scale => {
        currentScale.value = scale;
      },
      ...(isDark.value && { theme: DARK_THEME_OVERRIDES }),
    },
  );
  await renderer.prepareSvg();

  // A newer init started while we were awaiting texture preload — drop this one.
  if (token !== renderToken) return;
  wellRenderer = renderer;
  // The `<svg>` node (and its d3-zoom transform) survives reinit — read
  // back whatever scale the user was already at rather than assuming 1.
  currentScale.value = renderer.getZoomScale();
}

function redraw() {
  if (!wellRenderer) return;
  const profile = well.value;
  if (!profile || isWellEmpty(profile)) return;
  wellRenderer.draw(profile, {
    units: {
      length: uiStore.lengthUnit,
      diameter: uiStore.diameterUnit,
      power: uiStore.powerUnit,
    },
    locale: locale.value as 'en' | 'pt',
  });
}

async function reinitAndRedraw() {
  await initRenderer();
  redraw();
}

function zoomIn() {
  wellRenderer?.zoomBy(ZOOM_STEP);
}

function zoomOut() {
  wellRenderer?.zoomBy(1 / ZOOM_STEP);
}

function fit() {
  wellRenderer?.resetZoom();
}

async function reload() {
  await reinitAndRedraw();
}

// ── Watchers ─────────────────────────────────────────────────────────────
// The SVG's pixel size no longer depends on depth (it's fixed to the
// container), so depth-changing edits don't need a reinit — draw() always
// remaps the current depth range onto the same fixed height.

watch(well, redraw);
// Unit changes do a full reinit (same path as the reload button), not just
// redraw(), so anything the constructor's `units` option seeds is rebuilt too.
watch(
  [
    () => uiStore.lengthUnit,
    () => uiStore.diameterUnit,
    () => uiStore.powerUnit,
  ],
  () => reinitAndRedraw(),
);
// Locale changes need a full reinit, not just redraw() — renderConfig's
// translated strings (construction labels, tooltip text, legend, type words)
// are resolved once via applyRenderLocale() in initRenderer(), not per-draw().
watch([isDark, () => locale.value], () => reinitAndRedraw());

// ── Mount lifecycle ──────────────────────────────────────────────────────

onMounted(async () => {
  await reinitAndRedraw();

  resizeObserver = new ResizeObserver(() => reinitAndRedraw());
  if (containerRef.value) resizeObserver.observe(containerRef.value);
});

onUnmounted(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  wellRenderer = null;
});
</script>

<template>
  <div class="flex-1 relative flex flex-col overflow-hidden">
    <div ref="containerRef" class="flex-1 relative overflow-hidden">
      <ClientOnly>
        <svg :id="svgId" class="block" style="overflow: visible" />
        <template #fallback>
          <div class="w-full h-full animate-pulse rounded bg-surface-100" />
        </template>
      </ClientOnly>

      <div
        v-if="isEmpty"
        class="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <span class="font-mono text-xs text-content-400">{{
          t('editor.canvas.empty')
        }}</span>
      </div>
    </div>

    <ClientOnly>
      <ZoomControls
        :scale-label="scaleLabel"
        :disabled="isEmpty"
        @zoom-in="zoomIn"
        @zoom-out="zoomOut"
        @fit="fit"
        @reload="reload"
      />
    </ClientOnly>
  </div>
</template>
