<script setup lang="ts">
import type { RenderableWell } from '@welldot/render';
import { WellRenderer, INTERACTIVE_RENDER_CONFIG } from '@welldot/render';
import { useDark } from '@vueuse/core';

const props = defineProps<{ progress: number }>();
const { t } = useI18n();

const svgId = `hero-well-${Math.random().toString(36).slice(2, 8)}`;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let wellRenderer: any = null;
let ro: ResizeObserver | null = null;
let io: IntersectionObserver | null = null;
let containerEl: HTMLElement | null = null;
const entranceRef = ref<HTMLElement>();

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

// ── Static well profiles (5 hand-crafted) ─────────────────────────────────

const WELL_PROFILES: RenderableWell[] = [
  // ── 1. Bauru-Paraná — deep tropical sedimentary, 240 m ───────────────────
  {
    name: 'Poço Bauru-Paraná',
    well_type: 'tubular',
    bore_hole: [
      { id: 'bh-0', from: 0, to: 30, diameter: 600 },
      { id: 'bh-1', from: 30, to: 240, diameter: 500 },
    ],
    surface_case: [{ id: 'sc-0', from: 0, to: 30, diameter: 600 }],
    well_case: [{ id: 'wc-0', from: 0, to: 165, type: 'steel', diameter: 450 }],
    reduction: [],
    well_screen: [
      {
        id: 'ws-0',
        from: 167,
        to: 180,
        type: 'wire_wound',
        diameter: 420,
        screen_slot_mm: 0.5,
      },
      {
        id: 'ws-1',
        from: 185,
        to: 200,
        type: 'wire_wound',
        diameter: 420,
        screen_slot_mm: 0.5,
      },
      {
        id: 'ws-2',
        from: 207,
        to: 224,
        type: 'wire_wound',
        diameter: 420,
        screen_slot_mm: 0.75,
      },
    ],
    hole_fill: [
      {
        id: 'hf-0',
        from: 0,
        to: 30,
        type: 'seal',
        diameter: 600,
        description: 'Cimento',
      },
      {
        id: 'hf-1',
        from: 30,
        to: 165,
        type: 'seal',
        diameter: 500,
        description: 'Bentonita',
      },
      {
        id: 'hf-2',
        from: 165,
        to: 240,
        type: 'gravel_pack',
        diameter: 500,
        description: 'Pré-filtro 1–2 mm',
      },
    ],
    cement_pad: { type: '', width: 0, thickness: 0, length: 0 },
    lithology: [
      {
        id: 'li-0',
        from: 0,
        to: 6,
        color: '#f6ebc9',
        fgdc_texture: '612',
        description: 'Solo argiloso amarelado',
        geologic_unit: 'Quaternário',
        aquifer_unit: '',
      },
      {
        id: 'li-1',
        from: 6,
        to: 12,
        color: '#c25c1e',
        fgdc_texture: '682',
        description: 'Areia laterítica avermelhada',
        geologic_unit: 'Quaternário',
        aquifer_unit: '',
      },
      {
        id: 'li-2',
        from: 12,
        to: 25,
        color: '#b26d40',
        fgdc_texture: '601',
        description: 'Argila arenosa, castanha',
        geologic_unit: 'Quaternário',
        aquifer_unit: '',
      },
      {
        id: 'li-3',
        from: 25,
        to: 42,
        color: '#e08d40',
        fgdc_texture: '612',
        description: 'Argila com concreções lateríticas',
        geologic_unit: 'Fm. Serra Geral',
        aquifer_unit: '',
      },
      {
        id: 'li-4',
        from: 42,
        to: 65,
        color: '#b8624b',
        fgdc_texture: '607',
        description: 'Areia fina a média, castanha',
        geologic_unit: 'Fm. Bauru',
        aquifer_unit: 'Aquífero Bauru',
      },
      {
        id: 'li-5',
        from: 65,
        to: 92,
        color: '#71814f',
        fgdc_texture: '612',
        description: 'Intercalação argila e areia',
        geologic_unit: 'Fm. Bauru',
        aquifer_unit: 'Aquífero Bauru',
      },
      {
        id: 'li-6',
        from: 92,
        to: 118,
        color: '#849c78',
        fgdc_texture: '620',
        description: 'Areia média, cinza esverdeada',
        geologic_unit: 'Fm. Bauru',
        aquifer_unit: 'Aquífero Bauru',
      },
      {
        id: 'li-7',
        from: 118,
        to: 145,
        color: '#70705e',
        fgdc_texture: '620',
        description: 'Argila cinza, micácea',
        geologic_unit: 'Fm. Caiuá',
        aquifer_unit: 'Aquífero Caiuá',
      },
      {
        id: 'li-8',
        from: 145,
        to: 168,
        color: '#504b4b',
        fgdc_texture: '682',
        description: 'Conglomerado cinza escuro',
        geologic_unit: 'Fm. Caiuá',
        aquifer_unit: 'Aquífero Caiuá',
      },
      {
        id: 'li-9',
        from: 168,
        to: 188,
        color: '#3b3434',
        fgdc_texture: '601',
        description: 'Areia argilosa cinza escura',
        geologic_unit: 'Fm. Caiuá',
        aquifer_unit: 'Aquífero Caiuá',
      },
      {
        id: 'li-10',
        from: 188,
        to: 210,
        color: '#5c5454',
        fgdc_texture: '635',
        description: 'Calcarenito cinza',
        geologic_unit: 'Fm. Profunda',
        aquifer_unit: 'Aquífero Confinado',
      },
      {
        id: 'li-11',
        from: 210,
        to: 228,
        color: '#726c6c',
        fgdc_texture: '601',
        description: 'Areia grossa cinza',
        geologic_unit: 'Fm. Profunda',
        aquifer_unit: 'Aquífero Confinado',
      },
      {
        id: 'li-12',
        from: 228,
        to: 240,
        color: '#d3cccc',
        fgdc_texture: '607',
        description: 'Conglomerado cinza claro',
        geologic_unit: 'Fm. Profunda',
        aquifer_unit: 'Aquífero Confinado',
      },
    ],
    fractures: [],
    caves: [],
  },

  // ── 2. Carste Nordeste — limestone karst with caves, 190 m ───────────────
  {
    name: 'Poço Carste Nordeste',
    well_type: 'tubular',
    bore_hole: [{ id: 'bh-0', from: 0, to: 190, diameter: 400 }],
    surface_case: [{ id: 'sc-0', from: 0, to: 8, diameter: 460 }],
    well_case: [{ id: 'wc-0', from: 0, to: 85, type: 'steel', diameter: 350 }],
    reduction: [],
    well_screen: [],
    hole_fill: [
      {
        id: 'hf-0',
        from: 0,
        to: 8,
        type: 'seal',
        diameter: 400,
        description: 'Cimento',
      },
      {
        id: 'hf-1',
        from: 8,
        to: 85,
        type: 'seal',
        diameter: 400,
        description: 'Bentonita',
      },
    ],
    cement_pad: { type: '', width: 0, thickness: 0, length: 0 },
    lithology: [
      {
        id: 'li-0',
        from: 0,
        to: 8,
        color: '#c8a97a',
        fgdc_texture: '601',
        description: 'Solo argiloso avermelhado',
        geologic_unit: 'Quaternário',
        aquifer_unit: '',
      },
      {
        id: 'li-1',
        from: 8,
        to: 22,
        color: '#a08878',
        fgdc_texture: '682',
        description: 'Argila avermelhada com laterita',
        geologic_unit: 'Quaternário',
        aquifer_unit: '',
      },
      {
        id: 'li-2',
        from: 22,
        to: 40,
        color: '#c4b8a8',
        fgdc_texture: '612',
        description: 'Argila calcária',
        geologic_unit: 'Fm. Jandaíra',
        aquifer_unit: '',
      },
      {
        id: 'li-3',
        from: 40,
        to: 62,
        color: '#c5ceb6',
        fgdc_texture: '619',
        description: 'Marga cinza esverdeada',
        geologic_unit: 'Fm. Jandaíra',
        aquifer_unit: '',
      },
      {
        id: 'li-4',
        from: 62,
        to: 90,
        color: '#d0ccc0',
        fgdc_texture: '701',
        description: 'Calcário cinza claro',
        geologic_unit: 'Fm. Jandaíra',
        aquifer_unit: 'Aquífero Jandaíra',
      },
      {
        id: 'li-5',
        from: 90,
        to: 115,
        color: '#c8c4bc',
        fgdc_texture: '701',
        description: 'Calcário maciço',
        geologic_unit: 'Fm. Jandaíra',
        aquifer_unit: 'Aquífero Jandaíra',
      },
      {
        id: 'li-6',
        from: 115,
        to: 142,
        color: '#c4c0b4',
        fgdc_texture: '703',
        description: 'Calcário fraturado',
        geologic_unit: 'Fm. Jandaíra',
        aquifer_unit: 'Aquífero Jandaíra',
      },
      {
        id: 'li-7',
        from: 142,
        to: 162,
        color: '#b8b4ac',
        fgdc_texture: '703',
        description: 'Calcário argiloso',
        geologic_unit: 'Fm. Jandaíra',
        aquifer_unit: 'Aquífero Jandaíra',
      },
      {
        id: 'li-8',
        from: 162,
        to: 178,
        color: '#a8b4b8',
        fgdc_texture: '716',
        description: 'Dolomita cinza',
        geologic_unit: 'Fm. Açu',
        aquifer_unit: 'Aquífero Jandaíra',
      },
      {
        id: 'li-9',
        from: 178,
        to: 190,
        color: '#a4aeac',
        fgdc_texture: '716',
        description: 'Calcário dolomítico',
        geologic_unit: 'Fm. Açu',
        aquifer_unit: 'Aquífero Jandaíra',
      },
    ],
    fractures: [
      {
        id: 'fr-0',
        depth: 95,
        water_intake: true,
        description: 'Fratura produtiva',
        swarm: false,
        azimuth: 210,
        dip: 35,
      },
      {
        id: 'fr-1',
        depth: 130,
        water_intake: true,
        description: 'Fratura produtiva',
        swarm: false,
        azimuth: 145,
        dip: 28,
      },
      {
        id: 'fr-2',
        depth: 165,
        water_intake: true,
        description: 'Enxame fraturado',
        swarm: true,
        azimuth: 290,
        dip: 42,
      },
    ],
    caves: [
      {
        id: 'cv-0',
        from: 98,
        to: 104,
        water_intake: true,
        description: 'Caverna em calcário',
      },
      {
        id: 'cv-1',
        from: 152,
        to: 157,
        water_intake: false,
        description: 'Caverna em calcário',
      },
    ],
  },

  // ── 3. Embasamento Sul — fractured gneiss/granite basement, 135 m ────────
  {
    name: 'Poço Embasamento Sul',
    well_type: 'tubular',
    bore_hole: [{ id: 'bh-0', from: 0, to: 135, diameter: 300 }],
    surface_case: [{ id: 'sc-0', from: 0, to: 5, diameter: 360 }],
    well_case: [{ id: 'wc-0', from: 0, to: 38, type: 'steel', diameter: 250 }],
    reduction: [],
    well_screen: [],
    hole_fill: [
      {
        id: 'hf-0',
        from: 0,
        to: 5,
        type: 'seal',
        diameter: 300,
        description: 'Cimento',
      },
      {
        id: 'hf-1',
        from: 5,
        to: 38,
        type: 'seal',
        diameter: 300,
        description: 'Bentonita',
      },
    ],
    cement_pad: { type: '', width: 0, thickness: 0, length: 0 },
    lithology: [
      {
        id: 'li-0',
        from: 0,
        to: 5,
        color: '#c8a97a',
        fgdc_texture: '601',
        description: 'Solo residual argiloso',
        geologic_unit: 'Quaternário',
        aquifer_unit: '',
      },
      {
        id: 'li-1',
        from: 5,
        to: 15,
        color: '#b08050',
        fgdc_texture: '682',
        description: 'Saprólito amarelado',
        geologic_unit: 'Regolito',
        aquifer_unit: '',
      },
      {
        id: 'li-2',
        from: 15,
        to: 38,
        color: '#8a6040',
        fgdc_texture: '612',
        description: 'Saprólito avermelhado',
        geologic_unit: 'Regolito',
        aquifer_unit: '',
      },
      {
        id: 'li-3',
        from: 38,
        to: 58,
        color: '#6e6860',
        fgdc_texture: '619',
        description: 'Rocha alterada',
        geologic_unit: 'Regolito',
        aquifer_unit: '',
      },
      {
        id: 'li-4',
        from: 58,
        to: 82,
        color: '#606060',
        fgdc_texture: '716',
        description: 'Gnaisse alterado',
        geologic_unit: 'Embasamento',
        aquifer_unit: 'Aquífero Fraturado',
      },
      {
        id: 'li-5',
        from: 82,
        to: 105,
        color: '#505058',
        fgdc_texture: '716',
        description: 'Gnaisse fraturado',
        geologic_unit: 'Embasamento',
        aquifer_unit: 'Aquífero Fraturado',
      },
      {
        id: 'li-6',
        from: 105,
        to: 120,
        color: '#404048',
        fgdc_texture: '717',
        description: 'Gnaisse são',
        geologic_unit: 'Embasamento',
        aquifer_unit: 'Aquífero Fraturado',
      },
      {
        id: 'li-7',
        from: 120,
        to: 135,
        color: '#383840',
        fgdc_texture: '717',
        description: 'Granito são',
        geologic_unit: 'Embasamento',
        aquifer_unit: 'Aquífero Fraturado',
      },
    ],
    fractures: [
      {
        id: 'fr-0',
        depth: 62,
        water_intake: true,
        description: 'Fratura produtiva',
        swarm: false,
        azimuth: 110,
        dip: 62,
      },
      {
        id: 'fr-1',
        depth: 78,
        water_intake: true,
        description: 'Fratura produtiva',
        swarm: false,
        azimuth: 250,
        dip: 71,
      },
      {
        id: 'fr-2',
        depth: 95,
        water_intake: true,
        description: 'Enxame fraturado',
        swarm: true,
        azimuth: 180,
        dip: 58,
      },
      {
        id: 'fr-3',
        depth: 112,
        water_intake: false,
        description: 'Fratura seca',
        swarm: false,
        azimuth: 320,
        dip: 75,
      },
      {
        id: 'fr-4',
        depth: 126,
        water_intake: true,
        description: 'Fratura produtiva',
        swarm: false,
        azimuth: 85,
        dip: 68,
      },
    ],
    caves: [],
  },

  // ── 4. Amazônia Profunda — full-complexity deep sedimentary, 270 m ────────
  {
    name: 'Poço Amazônia Profunda',
    well_type: 'tubular',
    bore_hole: [
      { id: 'bh-0', from: 0, to: 20, diameter: 600 },
      { id: 'bh-1', from: 20, to: 270, diameter: 450 },
    ],
    surface_case: [{ id: 'sc-0', from: 0, to: 20, diameter: 600 }],
    well_case: [{ id: 'wc-0', from: 0, to: 185, type: 'steel', diameter: 400 }],
    reduction: [],
    well_screen: [
      {
        id: 'ws-0',
        from: 187,
        to: 202,
        type: 'wire_wound',
        diameter: 370,
        screen_slot_mm: 0.5,
      },
      {
        id: 'ws-1',
        from: 208,
        to: 228,
        type: 'wire_wound',
        diameter: 370,
        screen_slot_mm: 0.75,
      },
      {
        id: 'ws-2',
        from: 235,
        to: 258,
        type: 'wire_wound',
        diameter: 370,
        screen_slot_mm: 0.75,
      },
    ],
    hole_fill: [
      {
        id: 'hf-0',
        from: 0,
        to: 20,
        type: 'seal',
        diameter: 600,
        description: 'Cimento',
      },
      {
        id: 'hf-1',
        from: 20,
        to: 185,
        type: 'seal',
        diameter: 450,
        description: 'Bentonita',
      },
      {
        id: 'hf-2',
        from: 185,
        to: 270,
        type: 'gravel_pack',
        diameter: 450,
        description: 'Pré-filtro',
      },
    ],
    cement_pad: { type: '', width: 0, thickness: 0, length: 0 },
    lithology: [
      {
        id: 'li-0',
        from: 0,
        to: 6,
        color: '#f6ebc9',
        fgdc_texture: '612',
        description: 'Solo argiloso amarelado',
        geologic_unit: 'Quaternário',
        aquifer_unit: '',
      },
      {
        id: 'li-1',
        from: 6,
        to: 10,
        color: '#c25c1e',
        fgdc_texture: '682',
        description: 'Areia laterítica avermelhada',
        geologic_unit: 'Quaternário',
        aquifer_unit: '',
      },
      {
        id: 'li-2',
        from: 10,
        to: 17,
        color: '#b26d40',
        fgdc_texture: '601',
        description: 'Argila arenosa, castanha',
        geologic_unit: 'Quaternário',
        aquifer_unit: '',
      },
      {
        id: 'li-3',
        from: 17,
        to: 28,
        color: '#bb5332',
        fgdc_texture: '682',
        description: 'Areia argilosa laterizada',
        geologic_unit: 'Quaternário',
        aquifer_unit: '',
      },
      {
        id: 'li-4',
        from: 28,
        to: 45,
        color: '#e08d40',
        fgdc_texture: '612',
        description: 'Argila arenosa alaranjada',
        geologic_unit: 'Fm. Sedimentar',
        aquifer_unit: '',
      },
      {
        id: 'li-5',
        from: 45,
        to: 70,
        color: '#b8624b',
        fgdc_texture: '607',
        description: 'Areia fina a média, castanha',
        geologic_unit: 'Fm. Sedimentar',
        aquifer_unit: 'Aquífero Livre',
      },
      {
        id: 'li-6',
        from: 70,
        to: 95,
        color: '#71814f',
        fgdc_texture: '612',
        description: 'Intercalação folhelho e areia',
        geologic_unit: 'Fm. Sedimentar',
        aquifer_unit: 'Aquífero Livre',
      },
      {
        id: 'li-7',
        from: 95,
        to: 120,
        color: '#849c78',
        fgdc_texture: '682',
        description: 'Argila arenosa cinza esverdeada',
        geologic_unit: 'Fm. Sedimentar',
        aquifer_unit: 'Aquífero Livre',
      },
      {
        id: 'li-8',
        from: 120,
        to: 150,
        color: '#70705e',
        fgdc_texture: '620',
        description: 'Argila cinza, micácea',
        geologic_unit: 'Fm. Profunda',
        aquifer_unit: 'Aquífero Confinado',
      },
      {
        id: 'li-9',
        from: 150,
        to: 175,
        color: '#444242',
        fgdc_texture: '682',
        description: 'Conglomerado cinza escuro',
        geologic_unit: 'Fm. Profunda',
        aquifer_unit: 'Aquífero Confinado',
      },
      {
        id: 'li-10',
        from: 175,
        to: 205,
        color: '#3b3434',
        fgdc_texture: '601',
        description: 'Areia argilosa cinza escura',
        geologic_unit: 'Fm. Profunda',
        aquifer_unit: 'Aquífero Confinado',
      },
      {
        id: 'li-11',
        from: 205,
        to: 230,
        color: '#c5ceb6',
        fgdc_texture: '619',
        description: 'Argila levemente carbonática',
        geologic_unit: 'Fm. Profunda',
        aquifer_unit: 'Aquífero Confinado',
      },
      {
        id: 'li-12',
        from: 230,
        to: 255,
        color: '#d3cccc',
        fgdc_texture: '601',
        description: 'Areia grossa cinza clara',
        geologic_unit: 'Fm. Profunda',
        aquifer_unit: 'Aquífero Confinado',
      },
      {
        id: 'li-13',
        from: 255,
        to: 270,
        color: '#dfd8d8',
        fgdc_texture: '607',
        description: 'Conglomerado cinza claro',
        geologic_unit: 'Fm. Profunda',
        aquifer_unit: 'Aquífero Confinado',
      },
    ],
    fractures: [],
    caves: [],
  },

  // ── 5. Semi-Árido Cristalino — thin cover over meta-sedimentary, 110 m ───
  {
    name: 'Poço Semi-Árido',
    well_type: 'tubular',
    bore_hole: [{ id: 'bh-0', from: 0, to: 110, diameter: 250 }],
    surface_case: [{ id: 'sc-0', from: 0, to: 5, diameter: 310 }],
    well_case: [{ id: 'wc-0', from: 0, to: 30, type: 'steel', diameter: 200 }],
    reduction: [],
    well_screen: [],
    hole_fill: [
      {
        id: 'hf-0',
        from: 0,
        to: 5,
        type: 'seal',
        diameter: 250,
        description: 'Cimento',
      },
      {
        id: 'hf-1',
        from: 5,
        to: 30,
        type: 'seal',
        diameter: 250,
        description: 'Bentonita',
      },
    ],
    cement_pad: { type: '', width: 0, thickness: 0, length: 0 },
    lithology: [
      {
        id: 'li-0',
        from: 0,
        to: 5,
        color: '#c8a97a',
        fgdc_texture: '601',
        description: 'Solo residual argiloso',
        geologic_unit: 'Quaternário',
        aquifer_unit: '',
      },
      {
        id: 'li-1',
        from: 5,
        to: 12,
        color: '#d4956a',
        fgdc_texture: '682',
        description: 'Saprólito amarelo',
        geologic_unit: 'Regolito',
        aquifer_unit: '',
      },
      {
        id: 'li-2',
        from: 12,
        to: 30,
        color: '#9e7060',
        fgdc_texture: '612',
        description: 'Saprólito argiloso avermelhado',
        geologic_unit: 'Regolito',
        aquifer_unit: '',
      },
      {
        id: 'li-3',
        from: 30,
        to: 48,
        color: '#726860',
        fgdc_texture: '619',
        description: 'Rocha alterada com filonitos',
        geologic_unit: 'Regolito',
        aquifer_unit: '',
      },
      {
        id: 'li-4',
        from: 48,
        to: 65,
        color: '#5e5860',
        fgdc_texture: '716',
        description: 'Filito fraturado',
        geologic_unit: 'Embasamento',
        aquifer_unit: 'Aquífero Fraturado',
      },
      {
        id: 'li-5',
        from: 65,
        to: 80,
        color: '#505060',
        fgdc_texture: '716',
        description: 'Quartzito fraturado',
        geologic_unit: 'Embasamento',
        aquifer_unit: 'Aquífero Fraturado',
      },
      {
        id: 'li-6',
        from: 80,
        to: 92,
        color: '#484855',
        fgdc_texture: '717',
        description: 'Filito são',
        geologic_unit: 'Embasamento',
        aquifer_unit: 'Aquífero Fraturado',
      },
      {
        id: 'li-7',
        from: 92,
        to: 102,
        color: '#404050',
        fgdc_texture: '717',
        description: 'Quartzito são',
        geologic_unit: 'Embasamento',
        aquifer_unit: 'Aquífero Fraturado',
      },
      {
        id: 'li-8',
        from: 102,
        to: 110,
        color: '#383848',
        fgdc_texture: '716',
        description: 'Gnaisse granitóide',
        geologic_unit: 'Embasamento',
        aquifer_unit: 'Aquífero Fraturado',
      },
    ],
    fractures: [
      {
        id: 'fr-0',
        depth: 52,
        water_intake: true,
        description: 'Fratura produtiva',
        swarm: false,
        azimuth: 195,
        dip: 65,
      },
      {
        id: 'fr-1',
        depth: 68,
        water_intake: true,
        description: 'Fratura produtiva',
        swarm: false,
        azimuth: 310,
        dip: 72,
      },
      {
        id: 'fr-2',
        depth: 85,
        water_intake: true,
        description: 'Enxame fraturado',
        swarm: true,
        azimuth: 145,
        dip: 60,
      },
      {
        id: 'fr-3',
        depth: 104,
        water_intake: false,
        description: 'Fratura seca',
        swarm: false,
        azimuth: 255,
        dip: 78,
      },
    ],
    caves: [],
  },
];

// ── Reactive state ─────────────────────────────────────────────────────────

const currentWell = ref<RenderableWell | null>(null);
const isDark = useDark({
  selector: 'html',
  attribute: 'class',
  valueDark: 'dark-mode',
  valueLight: '',
});
const viewerTheme = computed(() => (isDark.value ? 'dark' : 'light'));

// ── 3D card style (always tracks props.progress) ───────────────────────────

const cardStyle = computed(() => {
  const p = Math.min(props.progress, 1);
  // Starts right, slides and shrinks further right as JSON takes over
  return {
    transform: `translateX(${lerp(0, 22, p)}%) perspective(2400px) rotateY(${lerp(-5, -12, p)}deg) rotateX(${lerp(-1, 0.5, p)}deg) scale(${lerp(1.0, 0.72, p)})`,
    opacity: lerp(1, 0.35, p),
    zIndex: p < 0.5 ? 2 : 1,
    willChange: 'transform, opacity',
  };
});

const editorCardStyle = computed(() => {
  const p = Math.min(props.progress, 1);
  // Starts from the left, expands rightward to natural position
  return {
    transform: `translateX(${lerp(-40, 0, p)}%) perspective(2400px) rotateY(${lerp(10, 1, p)}deg) rotateX(${lerp(-2, 0.5, p)}deg) scale(${lerp(0.62, 1.0, p)})`,
    opacity: lerp(0.08, 1, p),
    zIndex: p >= 0.5 ? 2 : 1,
    willChange: 'transform, opacity',
  };
});

// ── Partial-well builder ───────────────────────────────────────────────────

function getPartialWell(p: number, well: RenderableWell): RenderableWell {
  const maxDepth = well.lithology.at(-1)!.to;
  const minDepth = well.lithology[0]!.to;
  const revealDepth = Math.max(minDepth, Math.min(p, 1) * maxDepth);

  function clip<T extends { from: number; to: number }>(arr: T[]): T[] {
    return arr
      .filter(item => item.from < revealDepth)
      .map(item => ({ ...item, to: Math.min(item.to, revealDepth) }));
  }

  return {
    ...well,
    lithology: clip(well.lithology),
    bore_hole: clip(well.bore_hole),
    well_case: clip(well.well_case),
    reduction: clip(well.reduction),
    well_screen: clip(well.well_screen),
    surface_case: clip(well.surface_case),
    hole_fill: clip(well.hole_fill),
    cement_pad: { type: '', width: 0, thickness: 0, length: 0 },
    fractures: well.fractures.filter(f => f.depth < revealDepth),
    caves: clip(well.caves),
  };
}

// ── Renderer setup ─────────────────────────────────────────────────────────

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
  const dark = isDark.value;
  wellRenderer = new WellRenderer(
    [{ selector: `#${svgId}`, height, width, margins }],
    {
      renderConfig: {
        ...INTERACTIVE_RENDER_CONFIG,
        zoom: false,
        pan: false,
        tooltips: false,
        animation: { duration: 120, ease: (t: number) => t },
        highlights: {
          ...INTERACTIVE_RENDER_CONFIG.highlights,
          fill: '#5d86d2',
          fillOpacity: 0.15,
          stroke: '#5d86d2',
          strokeWidth: 1.5,
        },
      },
      ...(dark && {
        theme: {
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
        },
      }),
    },
  );
  await wellRenderer.prepareSvg();
}

watch(isDark, async () => {
  if (!containerEl) return;
  await initRenderer(containerEl);
  redraw();
});

function redraw() {
  if (!wellRenderer || !currentWell.value) return;
  wellRenderer.draw(getPartialWell(props.progress, currentWell.value));
}

// ── JSON for editor (IDs stripped — shows the clean .well format) ──────────

const partialWellJson = computed(() => {
  if (!currentWell.value) return '{}';
  const partial = getPartialWell(props.progress, currentWell.value);
  const strip = <T extends { id?: string | number }>(arr: T[]) =>
    arr.map(({ id: _id, ...rest }) => rest);
  const clean = {
    ...partial,
    lithology: strip(partial.lithology),
    bore_hole: strip(partial.bore_hole),
    well_case: strip(partial.well_case),
    well_screen: strip(partial.well_screen),
    surface_case: strip(partial.surface_case),
    hole_fill: strip(partial.hole_fill),
    reduction: strip(partial.reduction),
    fractures: strip(partial.fractures),
    caves: strip(partial.caves),
  };
  return JSON.stringify(clean, null, 2);
});

const currentRevealDepth = computed(() => {
  if (!currentWell.value) return 0;
  const well = currentWell.value;
  const maxDepth = well.lithology.at(-1)!.to;
  const minDepth = well.lithology[0]!.to;
  return Math.round(Math.max(minDepth, Math.min(props.progress, 1) * maxDepth));
});

// ── Watchers ───────────────────────────────────────────────────────────────

watch(() => props.progress, redraw);

// ── Lifecycle ──────────────────────────────────────────────────────────────

onMounted(async () => {
  const svgEl = document.getElementById(svgId)!;
  containerEl = svgEl.parentElement!;
  currentWell.value = pick(WELL_PROFILES);
  await initRenderer(containerEl);
  redraw();

  ro = new ResizeObserver(async () => {
    await initRenderer(containerEl!);
    redraw();
  });
  ro.observe(containerEl);

  // ── Entrance animation via IntersectionObserver ──────────────────────────
  const card = entranceRef.value;
  if (card) {
    const svg = document.getElementById(svgId);
    const svgKids = svg
      ? Array.from(svg.querySelectorAll<SVGElement>(':scope > g'))
      : [];

    svgKids.forEach((el, i) => {
      el.classList.add('svg-child');
      el.style.setProperty('--i', String(i));
    });

    io = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            card.classList.add('revealed');
            svgKids.forEach(el => el.classList.add('entering'));
            // Play once — disconnect so scroll-out never resets the animation
            io?.disconnect();
            io = null;
            break;
          }
        }
      },
      { threshold: 0.2 },
    );
    io.observe(card);
  }
});

onUnmounted(() => {
  io?.disconnect();
  io = null;
  ro?.disconnect();
  ro = null;
  wellRenderer = null;
});
</script>

<template>
  <div ref="entranceRef" class="editor-card size-full relative">
    <!-- Live preview label -->
    <div class="live-label">
      <span class="live-dot" />
      <span class="live-text">
        <span class="live-title">{{ t('heroVisual.liveTitle') }}</span>
        <span class="live-sub">{{ t('heroVisual.liveSub') }}</span>
      </span>
    </div>

    <!-- Well profile panel -->
    <div
      class="absolute inset-y-0 right-0 w-[88%] lg:w-[58%] flex items-center justify-center"
      :style="cardStyle"
    >
      <svg :id="svgId" class="block" style="overflow: visible" />
    </div>

    <!-- JSON viewer panel -->
    <div
      class="absolute inset-y-0 left-[5%] w-[80%] lg:left-[20%] lg:w-[50%] rounded-lg overflow-hidden"
      :style="editorCardStyle"
    >
      <LandingWellJsonViewer
        :json="partialWellJson"
        :depth="currentRevealDepth"
        :theme="viewerTheme"
        class="h-full"
      />
    </div>
  </div>
</template>

<style scoped>
/* ── Tuneable tokens ───────────────────────────────────────────────────────── */
.editor-card {
  --card-dur: 700ms;
  --card-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --child-dur: 500ms;
  --stagger: 80ms;

  /* Hidden state before intersection fires */
  translate: 0 40px;
  opacity: 0;
  box-shadow: none;
}

/* ── Live preview label ────────────────────────────────────────────────────── */
.live-label {
  position: absolute;
  top: 10px;
  right: 12px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 10px;
  background: rgba(13, 18, 24, 0.55);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  pointer-events: none;
  user-select: none;
}

.live-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
}

.live-title {
  font-size: 9px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1;
}

.live-sub {
  font-size: 10px;
  letter-spacing: 0.02em;
  color: rgba(255, 255, 255, 0.35);
  line-height: 1;
}

.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #28c840;
  flex-shrink: 0;
  animation: pulse-dot 2.4s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}

/* ── Card entrance ─────────────────────────────────────────────────────────── */
.editor-card.revealed {
  translate: 0 0;
  opacity: 1;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.1);
  transition:
    translate var(--card-dur) var(--card-ease),
    opacity var(--card-dur) var(--card-ease),
    box-shadow var(--card-dur) var(--card-ease);
}

/* ── SVG children stagger ──────────────────────────────────────────────────── */
:global(.svg-child) {
  transform-box: fill-box;
  transform-origin: top center;
  opacity: 0;
}

:global(.svg-child.entering) {
  animation: svg-child-enter var(--child-dur, 500ms)
    var(--card-ease, cubic-bezier(0.22, 1, 0.36, 1)) both;
  animation-delay: calc(150ms + var(--i, 0) * var(--stagger, 80ms));
}

@keyframes svg-child-enter {
  from {
    opacity: 0;
    transform: scaleY(0);
  }
  to {
    opacity: 1;
    transform: scaleY(1);
  }
}
</style>
