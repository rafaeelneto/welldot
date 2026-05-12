<script setup lang="ts">
import type { Well } from '@welldot/core';
import { WellRenderer, INTERACTIVE_RENDER_CONFIG } from '@welldot/render';

const props = defineProps<{ progress: number }>();

const svgId = `hero-well-${Math.random().toString(36).slice(2, 8)}`;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let wellRenderer: any = null;
let ro: ResizeObserver | null = null;
let containerEl: HTMLElement | null = null;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

const cardStyle = computed(() => {
  const p = Math.min(props.progress, 1);
  const rotY = lerp(28, -4, p);
  const rotX = lerp(-6, 2, p);
  const scale = lerp(0.8, 1.0, p);
  return {
    transform: `perspective(1200px) rotateY(${rotY}deg) rotateX(${rotX}deg) scale(${scale})`,
    willChange: 'transform',
  };
});

const DEMO_WELL: Well = {
  name: 'Poço Exemplo',
  well_type: 'tubular',
  bore_hole: [
    { from: 0, to: 30, diameter: 250 },
    { from: 30, to: 80, diameter: 200 },
  ],
  surface_case: [{ from: 0, to: 3, diameter: 310 }],
  well_case: [{ from: 0, to: 52, type: 'steel', diameter: 168 }],
  reduction: [
    { from: 52, to: 54, diam_from: 168, diam_to: 140, type: 'conical' },
  ],
  well_screen: [
    {
      from: 54,
      to: 60,
      type: 'wire_wound',
      diameter: 140,
      screen_slot_mm: 0.5,
    },
    {
      from: 65,
      to: 74,
      type: 'wire_wound',
      diameter: 140,
      screen_slot_mm: 0.5,
    },
  ],
  hole_fill: [
    { from: 0, to: 10, type: 'seal', diameter: 250, description: 'Cimento' },
    { from: 10, to: 52, type: 'seal', diameter: 250, description: 'Bentonita' },
    {
      from: 52,
      to: 80,
      type: 'gravel_pack',
      diameter: 200,
      description: 'Pré-filtro 1–2mm',
    },
  ],
  cement_pad: { type: 'square', width: 0.8, thickness: 0.15, length: 0.8 },
  lithology: [
    {
      from: 0,
      to: 8,
      description: 'Solo argiloso',
      color: '#c8a97a',
      fgdc_texture: '601',
      geologic_unit: 'Quaternário',
      aquifer_unit: '',
    },
    {
      from: 8,
      to: 20,
      description: 'Argila siltosa',
      color: '#b0906a',
      fgdc_texture: '603',
      geologic_unit: 'Quaternário',
      aquifer_unit: '',
    },
    {
      from: 20,
      to: 38,
      description: 'Arenito fino',
      color: '#e8d5a0',
      fgdc_texture: '620',
      geologic_unit: 'Fm. Bauru',
      aquifer_unit: 'Aquífero Bauru',
    },
    {
      from: 38,
      to: 52,
      description: 'Arenito médio a grosso',
      color: '#f0e2b0',
      fgdc_texture: '625',
      geologic_unit: 'Fm. Bauru',
      aquifer_unit: 'Aquífero Bauru',
    },
    {
      from: 52,
      to: 68,
      description: 'Calcário',
      color: '#d0ccc0',
      fgdc_texture: '701',
      geologic_unit: 'Fm. Roncador',
      aquifer_unit: 'Aquífero Carste',
    },
    {
      from: 68,
      to: 80,
      description: 'Calcário fraturado',
      color: '#c4c0b4',
      fgdc_texture: '703',
      geologic_unit: 'Fm. Roncador',
      aquifer_unit: 'Aquífero Carste',
    },
  ],
  fractures: [
    {
      depth: 56,
      water_intake: true,
      description: 'Fratura produtiva',
      swarm: false,
      azimuth: 210,
      dip: 35,
    },
    {
      depth: 72,
      water_intake: true,
      description: 'Enxame c/ água',
      swarm: true,
      azimuth: 190,
      dip: 45,
    },
  ],
  caves: [],
};

const TOTAL_LAYERS = DEMO_WELL.lithology.length;

function getPartialWell(p: number): Well {
  const c = Math.min(p, 1);

  const layersVisible = Math.max(
    1,
    Math.min(TOTAL_LAYERS, Math.ceil((c / 0.45) * TOTAL_LAYERS)),
  );

  const showConstruction = c >= 0.45;
  const showFractures = c >= 0.75;

  return {
    ...DEMO_WELL,
    lithology: DEMO_WELL.lithology.slice(0, layersVisible),
    bore_hole: showConstruction ? DEMO_WELL.bore_hole : [],
    well_case: showConstruction ? DEMO_WELL.well_case : [],
    reduction: showConstruction ? DEMO_WELL.reduction : [],
    well_screen: showConstruction ? DEMO_WELL.well_screen : [],
    surface_case: showConstruction ? DEMO_WELL.surface_case : [],
    hole_fill: showConstruction ? DEMO_WELL.hole_fill : [],
    cement_pad: showConstruction
      ? DEMO_WELL.cement_pad
      : { type: '', width: 0, thickness: 0, length: 0 },
    fractures: showFractures ? DEMO_WELL.fractures : [],
  };
}

function getDimensions(el: HTMLElement) {
  const margins = { top: 24, right: 16, bottom: 20, left: 42 };
  return {
    margins,
    width: Math.max(el.clientWidth - margins.left - margins.right, 60),
    height: Math.max(el.clientHeight - margins.top - margins.bottom, 300),
  };
}

async function initRenderer(container: HTMLElement) {
  wellRenderer = null;
  const { width, height, margins } = getDimensions(container);
  wellRenderer = new WellRenderer(
    [{ selector: `#${svgId}`, height, width, margins }],
    {
      renderConfig: {
        ...INTERACTIVE_RENDER_CONFIG,
        zoom: false,
        pan: false,
        tooltips: false,
        animation: { duration: 250, ease: (t: number) => t },
        highlights: {
          ...INTERACTIVE_RENDER_CONFIG.highlights,
          fill: '#5d86d2',
          fillOpacity: 0.15,
          stroke: '#5d86d2',
          strokeWidth: 1.5,
        },
      },
    },
  );

  await wellRenderer.prepareSvg();
  redraw(props.progress);
}

function redraw(p: number) {
  if (!wellRenderer) return;
  wellRenderer.draw(getPartialWell(p));
}

onMounted(async () => {
  const svgEl = document.getElementById(svgId)!;
  containerEl = svgEl.parentElement!;
  await initRenderer(containerEl);

  ro = new ResizeObserver(() => initRenderer(containerEl!));
  ro.observe(containerEl);
});

watch(() => props.progress, redraw);

onUnmounted(() => {
  ro?.disconnect();
  ro = null;
  wellRenderer = null;
});
</script>

<template>
  <div
    class="w-full h-full flex items-center justify-center"
    :style="cardStyle"
  >
    <svg :id="svgId" class="block" style="overflow: visible" />
  </div>
</template>
