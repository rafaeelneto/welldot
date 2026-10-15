<script setup lang="ts">
import { useDark, useElementBounding, useMounted } from '@vueuse/core';
import type { HydrodynamicEvent } from '@welldot/core';
import { NuxtLink } from '#components';
import PumpingTestCharts from '~/pages/editor/_components/tabs/hydrodynamicEvents/charts/PumpingTestCharts.vue';

definePageMeta({ layout: 'landing' });

const { t, tm, rt } = useI18n();
const localePath = useLocalePath();

useSeoMeta({
  title: () => t('meta.title'),
  description: () => t('meta.description'),
});

defineOgImage('Default', {
  kicker: computed(() => t('hero.kicker')),
  headline1: computed(() => t('hero.headline1')),
  headlineEm: computed(() => t('hero.headlineEm')),
  headline2: computed(() => t('hero.headline2')),
  tagline: computed(() => t('hero.body')),
  badgeSpec: computed(() => t('hero.badgeSpec')),
  badgeLicense: computed(() => t('hero.badgeLicense')),
  badgeSite: computed(() => t('hero.badgeSite')),
});

useSchemaOrg([
  defineSoftwareApp({
    '@type': 'WebApplication',
    name: 'Welldot',
    url: 'https://welldot.org',
    description: computed(() => t('meta.description')),
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any (web-based)',
    offers: {
      price: 0,
      priceCurrency: 'USD',
    },
    featureList: computed(() =>
      (tm('meta.featureList') as any[]).map(f => rt(f)),
    ),
  }),
]);

// ── Scroll-driven hero progress ────────────────────────────────────────────
const heroBandRef = ref<HTMLElement>();
const { top: bandTop, height: bandHeight } = useElementBounding(heroBandRef);

const scrollProgress = computed(() => {
  if (!import.meta.client) return 0;
  const scrolled = -bandTop.value;
  const scrollable = bandHeight.value - window.innerHeight;
  return scrollable > 0 ? Math.min(Math.max(scrolled / scrollable, 0), 1) : 0;
});

// ── Section data ────────────────────────────────────────────────────────────

const formatProps = computed(() =>
  (tm('format.props') as any[]).map((p: any) => ({
    num: rt(p.num),
    title: rt(p.title),
    body: rt(p.body),
  })),
);

const PILLAR_ICONS = ['⊙', '{ }', 'A4'] as const;

const pillars = computed(() =>
  (tm('intention.pillars') as any[]).map((p: any, i: number) => ({
    icon: PILLAR_ICONS[i]!,
    title: rt(p.title),
    body: rt(p.body),
  })),
);

// ── §III · Pumping tests & interpretation ─────────────────────────────────
// A sample step-drawdown test (three ascending steps plus recovery), drawn by
// the editor's own chart component. It has the data for every chart kind.

const TEST_EVENT: HydrodynamicEvent = {
  id: 'test-01',
  type: 'step_drawdown',
  datetime: '2024-09-03T08:00:00-03:00',
  static_level: 18.4,
  steps: [
    {
      rate: 12,
      duration: 120,
      readings: [
        { elapsed: 1, depth: 22.5 },
        { elapsed: 2, depth: 22.9 },
        { elapsed: 5, depth: 23.43 },
        { elapsed: 10, depth: 23.82 },
        { elapsed: 20, depth: 24.22 },
        { elapsed: 40, depth: 24.62 },
        { elapsed: 60, depth: 24.85 },
        { elapsed: 90, depth: 25.08 },
        { elapsed: 120, depth: 25.25 },
      ],
    },
    {
      rate: 20,
      duration: 120,
      readings: [
        { elapsed: 1, depth: 28.55 },
        { elapsed: 2, depth: 28.82 },
        { elapsed: 5, depth: 29.18 },
        { elapsed: 10, depth: 29.47 },
        { elapsed: 20, depth: 29.78 },
        { elapsed: 40, depth: 30.12 },
        { elapsed: 60, depth: 30.34 },
        { elapsed: 90, depth: 30.59 },
        { elapsed: 120, depth: 30.77 },
      ],
    },
    {
      rate: 28,
      duration: 120,
      readings: [
        { elapsed: 1, depth: 34.52 },
        { elapsed: 2, depth: 34.79 },
        { elapsed: 5, depth: 35.16 },
        { elapsed: 10, depth: 35.45 },
        { elapsed: 20, depth: 35.77 },
        { elapsed: 40, depth: 36.12 },
        { elapsed: 60, depth: 36.36 },
        { elapsed: 90, depth: 36.63 },
        { elapsed: 120, depth: 36.84 },
      ],
    },
  ],
  recovery: {
    readings: [
      { elapsed: 1, depth: 25.7 },
      { elapsed: 2, depth: 24.78 },
      { elapsed: 5, depth: 23.58 },
      { elapsed: 10, depth: 22.68 },
      { elapsed: 20, depth: 21.81 },
      { elapsed: 40, depth: 20.99 },
      { elapsed: 60, depth: 20.55 },
      { elapsed: 90, depth: 20.14 },
      { elapsed: 120, depth: 19.88 },
    ],
  },
};

const testsCards = computed(() =>
  (tm('tests.cards') as any[]).map((p: any) => ({
    num: rt(p.num),
    title: rt(p.title),
    body: rt(p.body),
    badge: p.badge ? rt(p.badge) : undefined,
  })),
);

const CTX_STATIC = [
  { icon: '📁', iconStyle: undefined as string | undefined, highlight: false },
  {
    icon: 'git',
    iconStyle: 'font-family: var(--font-mono); font-size: 13px;',
    highlight: false,
  },
  {
    icon: 'SQL',
    iconStyle: 'font-family: var(--font-mono); font-size: 10px;',
    highlight: false,
  },
  { icon: '✨', iconStyle: undefined as string | undefined, highlight: false },
  {
    icon: '⊕',
    iconStyle:
      'background: linear-gradient(135deg, var(--w-primary-500), oklch(58% 0.15 235)); color: white;',
    highlight: true,
  },
];

const ctxCards = computed(() =>
  (tm('contexts.cards') as any[]).map((card: any, i: number) => ({
    title: rt(card.title),
    meta: rt(card.meta),
    ...CTX_STATIC[i]!,
  })),
);

// ── §V · Graceful incompleteness ─────────────────────────────────────────
// One well file at three stages: an old report, a field visit and the
// permitting. Each stage is a valid `.well` file. Construction blocks stay
// as empty lists, open fields take free (`x-`) values, and whatever is not
// known is left out. Each stage only adds keys, so the new data lands at the
// bottom of the viewer, which scrolls there on change.

const incompleteStage = ref(0);

const incompleteStages = computed(() =>
  (tm('incomplete.stages') as any[]).map((label: any, i: number) => ({
    label: rt(label),
    value: i,
  })),
);

const incompleteJson = computed(() => {
  const oldReport = {
    version: 2,
    name: 'Poço 03',
    well_type: 'tubular',
    well_depth: 84,
    obs: t('incomplete.sample.obs'),
    bore_hole: [{ from: 0, to: 84, diameter: 250 }],
    well_case: [{ from: 0, to: 84, diameter: 152, type: 'x-galvanized_iron' }],
    reduction: [],
    well_screen: [],
    surface_case: [],
    hole_fill: [],
    lithology: [],
    fractures: [],
    caves: [],
    hydrodynamic_events: [
      {
        id: 'evt-01',
        type: 'airlift',
        datetime: '1987-03-10T00:00:00-03:00',
        steps: [{ rate: 6 }],
      },
    ],
  };
  const fieldVisit = {
    ...oldReport,
    location: { lat: -1.4558, lng: -48.4902 },
    history_logs: [
      {
        id: 'log-01',
        category: 'inspection',
        datetime: '2024-08-21T10:00:00-03:00',
        description: t('incomplete.sample.inspection'),
      },
    ],
  };
  const permitting = {
    ...fieldVisit,
    permits: [{ id: 'permit-01', type: 'registration', authority: 'SEMAS-PA' }],
  };
  const stages = [oldReport, fieldVisit, permitting];
  return JSON.stringify(stages[incompleteStage.value], null, 2);
});

const incompleteRules = computed(() =>
  (tm('incomplete.rules') as any[]).map((p: any) => ({
    num: rt(p.num),
    title: rt(p.title),
    body: rt(p.body),
  })),
);

// ── §VI · Extensible by anyone ─────────────────────────────────────────────
// The same well, extended at the three levels the spec allows: an `x-` field,
// a profile published by an institution and an `x-` top-level block. Each
// stage only adds keys at the end, where the viewer scrolls on change.

const EXT_BASE = {
  version: 2,
  name: 'Poço 03',
  well_type: 'tubular',
  well_depth: 84,
  bore_hole: [],
  well_case: [],
  reduction: [],
  well_screen: [],
  surface_case: [],
  hole_fill: [],
  lithology: [],
  fractures: [],
  caves: [],
};

const EXT_STAGES = (() => {
  const field = {
    ...EXT_BASE,
    'x-siagas': { registro: '1500012345' },
  };
  const profile = {
    ...field,
    profiles: ['https://hidro.example.org/profiles/monitoring/v1/schema.json'],
  };
  const block = {
    ...profile,
    'x-gas_monitoring': [
      { datetime: '2025-05-12T09:00:00-03:00', ch4_ppm: 12, h2s_ppm: 0.4 },
    ],
  };
  return [field, profile, block].map(w => JSON.stringify(w, null, 2));
})();

const extStage = ref(0);

const extStages = computed(() =>
  (tm('extensible.stages') as any[]).map((label: any, i: number) => ({
    label: rt(label),
    value: i,
  })),
);

const extJson = computed(() => EXT_STAGES[extStage.value]!);

const extLevels = computed(() =>
  (tm('extensible.levels') as any[]).map((p: any) => ({
    num: rt(p.num),
    title: rt(p.title),
    body: rt(p.body),
  })),
);

const isDark = useDark({
  selector: 'html',
  attribute: 'class',
  valueDark: 'dark-mode',
  valueLight: '',
});
// SSR always renders light; switch after mount so hydration doesn't keep it.
const mounted = useMounted();
const viewerTheme = computed(() =>
  mounted.value && isDark.value ? 'dark' : 'light',
);

const horizonProps = computed(() =>
  (tm('horizon.props') as any[]).map((p: any) => ({
    num: rt(p.num),
    title: rt(p.title),
    body: rt(p.body),
  })),
);

const TOOL_PATHS = [
  'packages/core',
  'packages/utils',
  'packages/render',
  'packages/pdf',
  'packages/vue',
  'apps/profiler',
] as const;

const toolCards = computed(() =>
  (tm('tools.cards') as any[]).map((card: any, i: number) => ({
    title: rt(card.title),
    body: rt(card.body),
    path: TOOL_PATHS[i]!,
    href: `https://github.com/rafaeelneto/welldot/tree/main/${TOOL_PATHS[i]}`,
  })),
);
</script>

<template>
  <!-- ── Hero + §I band ──────────────────────────────────────────────────────
       Two-column layout: left column scrolls (hero copy + section I content),
       right column is sticky through both sections (Three.js visual).
       Progress 0→1 drives the card gallery swap in HeroVisual.
  ─────────────────────────────────────────────────────────────────────────── -->
  <div ref="heroBandRef" class="relative border-b border-surface-200/60">
    <!-- Band-wide background gradient -->
    <div
      class="absolute inset-0 pointer-events-none"
      style="
        background:
          radial-gradient(
            420px 320px at 100% 20%,
            oklch(70% 0.14 235 / 0.16),
            transparent 70%
          ),
          radial-gradient(
            360px 260px at 8% 90%,
            oklch(72% 0.13 40 / 0.12),
            transparent 70%
          ),
          radial-gradient(
            700px 400px at 100% 100%,
            oklch(72% 0.13 235 / 0.08),
            transparent 70%
          );
      "
    />

    <div
      class="lg:grid lg:grid-cols-[1fr_660px] lg:items-start max-w-400 mx-auto w-full"
    >
      <!-- ── Left: scrolling content ─────────────────────────────────────── -->
      <div class="relative z-10">
        <!-- Hero section -->
        <div
          class="container-landing pt-8 pb-7 lg:pt-16 lg:pb-14 border-b border-surface-200/40"
        >
          <div
            class="font-mono text-[11px] tracking-[0.12em] uppercase text-content-500 mb-4.5 w-fit bg-surface-0/55 backdrop-blur-sm rounded px-2 py-0.5"
          >
            {{ t('hero.kicker') }}
          </div>
          <h1
            class="font-serif font-medium text-[44px] lg:text-[76px] leading-none tracking-tight mb-3.5 lg:mb-5.5 text-balance w-fit bg-surface-0/55 backdrop-blur-sm rounded-md px-2 py-1"
          >
            {{ t('hero.headline1') }}
            <em class="text-primary-500">{{ t('hero.headlineEm') }}</em
            >{{ t('hero.headline2') }}
          </h1>
          <p
            class="text-[15px] lg:text-[19px] leading-[1.55] text-content-400 lg:max-w-120 mb-5 lg:mb-7 w-fit bg-surface-0/55 backdrop-blur-sm rounded-md px-2 py-1"
          >
            {{ t('hero.body') }}
          </p>
          <div class="flex flex-col sm:flex-row gap-2.5 mb-5 lg:mb-7">
            <Button
              :label="t('hero.ctaPrimary')"
              :as="NuxtLink"
              :to="localePath('/editor')"
            />
            <Button
              :label="t('hero.ctaSecondary')"
              as="a"
              href="https://github.com/rafaeelneto/welldot/tree/main/packages/core"
              target="_blank"
              variant="outlined"
              severity="secondary"
            />
          </div>
          <div
            class="flex flex-wrap gap-5.5 pt-5 border-t border-surface-200 font-mono text-[11px] text-content-500 tracking-[0.04em]"
          >
            <span
              ><b class="text-content-0 font-medium">v2.3</b>
              {{ t('hero.badgeSpec') }}</span
            >
            <span
              ><b class="text-content-0 font-medium">Apache 2.0</b>
              {{ t('hero.badgeLicense') }}</span
            >
            <span
              ><b class="text-content-0 font-medium">{{
                t('hero.badgeSite')
              }}</b></span
            >
            <span
              ><b class="text-content-0 font-medium">{{
                t('hero.badgeFormerlyBold')
              }}</b>
              {{ t('hero.badgeFormerly') }}</span
            >
          </div>
        </div>

        <!-- Mobile: hero visual (scroll-driven, inline) -->
        <div
          class="block lg:hidden relative w-full h-[min(680px,80vh)] border-b border-surface-200/40"
        >
          <ClientOnly>
            <LandingHeroVisual :progress="scrollProgress * 2.5" />
          </ClientOnly>
        </div>

        <!-- §I · O formato -->
        <div class="container-landing py-14 lg:py-20">
          <div
            class="kicker mb-4.5 w-fit bg-surface-0/55 backdrop-blur-sm rounded px-2 py-0.5"
          >
            {{ t('format.kicker') }}
          </div>
          <h2
            class="font-serif font-medium text-[38px] lg:text-[60px] leading-none tracking-tight mb-3.5 w-fit bg-surface-0/55 backdrop-blur-sm rounded-md px-2 py-1"
          >
            {{ t('format.headline1') }}<br /><em class="text-primary-500">{{
              t('format.headlineEm')
            }}</em>
            {{ t('format.headline2') }}
          </h2>
          <p
            class="text-[15px] lg:text-[17px] leading-[1.55] text-content-400 lg:max-w-120 mb-8 w-fit bg-surface-0/55 backdrop-blur-sm rounded-md px-2 py-1"
          >
            <i18n-t keypath="format.intro" tag="span">
              <template #well><b>.well</b></template>
              <template #standard
                ><em>{{ t('format.standard') }}</em></template
              >
            </i18n-t>
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <LandingPropCard
              v-for="prop in formatProps"
              :key="prop.num"
              :num="prop.num"
              :title="prop.title"
            >
              {{ prop.body }}
            </LandingPropCard>
          </div>
        </div>
      </div>

      <!-- ── Right: sticky visual — bleeds leftward behind content ────────── -->
      <div
        class="hidden lg:block sticky top-15 h-[calc(100vh-60px)] overflow-visible pt-8 lg:pt-14 pr-4 z-0"
      >
        <div
          class="relative h-full"
          style="margin-left: -120px; width: calc(100% + 120px)"
        >
          <ClientOnly>
            <LandingHeroVisual :progress="scrollProgress" />
          </ClientOnly>
        </div>
      </div>
    </div>
  </div>
  <section
    class="manifesto-bg relative py-14 lg:py-20 border-b border-surface-200/60 overflow-hidden"
  >
    <div
      class="absolute right-[-100px] top-[30%] size-125 pointer-events-none rounded-full"
      style="
        background: radial-gradient(
          closest-side,
          oklch(72% 0.13 235 / 0.18),
          transparent
        );
      "
    />
    <div class="container-landing relative">
      <div class="kicker mb-3.5">{{ t('intention.kicker') }}</div>
      <p
        class="font-serif text-[19px] lg:text-[26px] leading-[1.45] max-w-220 mb-9 font-normal text-content-0"
      >
        <i18n-t keypath="intention.body" tag="span">
          <template #unreadable>
            <em class="text-primary-500">{{ t('intention.unreadable') }}</em>
          </template>
          <template #welldot><b>welldot</b></template>
          <template #well><b>.well</b></template>
        </i18n-t>
      </p>
      <p
        class="text-[14px] lg:text-[16px] leading-[1.55] max-w-220 mb-9 text-content-400"
      >
        <i18n-t keypath="intention.originNote" tag="span">
          <template #wellProfiler
            ><b class="text-content-0">{{
              t('intention.wellProfiler')
            }}</b></template
          >
        </i18n-t>
      </p>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        <LandingPillarCard
          v-for="pillar in pillars"
          :key="pillar.title"
          :icon="pillar.icon"
          :title="pillar.title"
        >
          {{ pillar.body }}
        </LandingPillarCard>
      </div>
    </div>
  </section>

  <!-- ── §III · Testes de bombeamento e interpretação ─────────────────────── -->
  <section
    class="relative py-14 lg:py-20 border-b border-surface-200/60 overflow-hidden"
  >
    <div
      class="absolute inset-0 pointer-events-none"
      style="
        background: radial-gradient(
          700px 400px at 100% 30%,
          oklch(72% 0.13 235 / 0.1),
          transparent 70%
        );
      "
    />
    <div class="container-landing relative lg:grid lg:grid-cols-2 lg:gap-14">
      <!-- Text col -->
      <div>
        <div class="kicker mb-4.5">{{ t('tests.kicker') }}</div>
        <h2
          class="font-serif font-medium text-[38px] lg:text-[60px] leading-none tracking-tight mb-3.5"
        >
          {{ t('tests.headline1') }}
          <em class="text-primary-500">{{ t('tests.headlineEm') }}</em
          >{{ t('tests.headline2') }}
        </h2>
        <p
          class="text-[15px] lg:text-[17px] leading-[1.55] text-content-400 mb-8"
        >
          <i18n-t keypath="tests.intro" tag="span">
            <template #ledger
              ><b class="text-content-0">{{ t('tests.ledger') }}</b></template
            >
          </i18n-t>
        </p>
        <div class="grid grid-cols-1 gap-3 mb-8 lg:mb-0">
          <LandingPropCard
            v-for="card in testsCards"
            :key="card.num"
            :num="card.num"
            :title="card.title"
            :badge="card.badge"
          >
            {{ card.body }}
          </LandingPropCard>
        </div>
      </div>
      <!-- Live charts (the editor's component) -->
      <div class="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <div class="glass rounded-lg p-4.5">
          <ClientOnly>
            <PumpingTestCharts :event="TEST_EVENT" />
            <template #fallback>
              <div class="h-80" />
            </template>
          </ClientOnly>
          <p class="font-mono text-[11px] text-content-400 mt-3 mb-0">
            {{ t('tests.chartCaption') }}
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- ── §IV · Padrão por dentro, flexível por fora. ─────────────────────── -->
  <section
    class="relative py-14 lg:py-20 border-b border-surface-200/60 overflow-hidden"
  >
    <div
      class="absolute inset-0 pointer-events-none"
      style="
        background: radial-gradient(
          700px 400px at 100% 100%,
          oklch(72% 0.13 235 / 0.1),
          transparent 70%
        );
      "
    />
    <div class="container-landing relative lg:grid lg:grid-cols-2 lg:gap-14">
      <!-- Text col -->
      <div>
        <div class="kicker mb-4.5">{{ t('contexts.kicker') }}</div>
        <h2
          class="font-serif font-medium text-[38px] lg:text-[60px] leading-none tracking-tight mb-3.5"
        >
          {{ t('contexts.headline1') }}<br /><em class="text-primary-500">{{
            t('contexts.headlineEm')
          }}</em>
          {{ t('contexts.headline2') }}
        </h2>
        <p class="text-[15px] leading-[1.55] text-content-400 mb-3.5">
          <i18n-t keypath="contexts.text1" tag="span">
            <template #aiEm
              ><em>{{ t('contexts.aiEm') }}</em></template
            >
            <template #si
              ><b>{{ t('contexts.si') }}</b></template
            >
            <template #wgs><b>WGS84</b></template>
            <template #flexible
              ><em>{{ t('contexts.flexible') }}</em></template
            >
          </i18n-t>
        </p>
        <p
          class="text-[15px] lg:text-[18px] leading-[1.55] text-content-400 mb-6 lg:mb-0"
        >
          <i18n-t keypath="contexts.text2" tag="span">
            <template #skill><b>welldot.skill</b></template>
            <template #repo>
              <code
                class="font-mono text-[0.92em] bg-black/[0.04] px-1.5 py-0.5 rounded"
                >github.com/rafaeelneto/welldot</code
              >
            </template>
          </i18n-t>
        </p>
      </div>
      <!-- Context stack -->
      <div class="flex flex-col gap-2.5 lg:self-start">
        <LandingCtxCard
          v-for="card in ctxCards"
          :key="card.title"
          :icon="card.icon"
          :icon-style="card.iconStyle"
          :title="card.title"
          :meta="card.meta"
          :highlight="card.highlight"
        />
      </div>
    </div>
  </section>

  <!-- ── §V · Incompletude graciosa ──────────────────────────────────────── -->
  <section
    class="relative py-14 lg:py-20 border-b border-surface-200/60 overflow-hidden"
  >
    <div
      class="absolute inset-0 pointer-events-none"
      style="
        background: radial-gradient(
          600px 360px at 0% 100%,
          oklch(72% 0.13 40 / 0.1),
          transparent 70%
        );
      "
    />
    <div class="container-landing relative lg:grid lg:grid-cols-2 lg:gap-14">
      <!-- Text col -->
      <div>
        <div class="kicker mb-4.5">{{ t('incomplete.kicker') }}</div>
        <h2
          class="font-serif font-medium text-[38px] lg:text-[60px] leading-none tracking-tight mb-3.5"
        >
          {{ t('incomplete.headline1') }}
          <em class="text-primary-500">{{ t('incomplete.headlineEm') }}</em
          >{{ t('incomplete.headline2') }}
        </h2>
        <p
          class="text-[15px] lg:text-[17px] leading-[1.55] text-content-400 mb-8"
        >
          <i18n-t keypath="incomplete.intro" tag="span">
            <template #well><b>.well</b></template>
            <template #unknown
              ><b class="text-content-0">{{
                t('incomplete.unknown')
              }}</b></template
            >
            <template #zero
              ><em>{{ t('incomplete.zero') }}</em></template
            >
          </i18n-t>
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8 lg:mb-0">
          <LandingPropCard
            v-for="rule in incompleteRules"
            :key="rule.num"
            :num="rule.num"
            :title="rule.title"
          >
            {{ rule.body }}
          </LandingPropCard>
        </div>
      </div>
      <!-- Record stages -->
      <div
        class="flex flex-col gap-3 min-w-0 lg:sticky lg:top-24 lg:self-start"
      >
        <SelectButton
          v-model="incompleteStage"
          :options="incompleteStages"
          option-label="label"
          option-value="value"
          :allow-empty="false"
          :aria-label="t('incomplete.stagesLabel')"
          class="self-start max-w-full overflow-x-auto"
        />
        <!-- The viewer fills its parent (scoped height: 100%) -->
        <div class="h-105">
          <LandingWellJsonViewer
            :json="incompleteJson"
            :badge="t('incomplete.valid')"
            filename="poco-03.well"
            :theme="viewerTheme"
          />
        </div>
      </div>
    </div>
  </section>

  <!-- ── §VI · Extensível por qualquer um ──────────────────────────────────── -->
  <section
    class="relative py-14 lg:py-20 border-b border-surface-200/60 overflow-hidden"
  >
    <div
      class="absolute inset-0 pointer-events-none"
      style="
        background: radial-gradient(
          700px 400px at 100% 0%,
          oklch(72% 0.13 235 / 0.1),
          transparent 70%
        );
      "
    />
    <div class="container-landing relative lg:grid lg:grid-cols-2 lg:gap-14">
      <!-- Text col -->
      <div>
        <div class="kicker mb-4.5">{{ t('extensible.kicker') }}</div>
        <h2
          class="font-serif font-medium text-[38px] lg:text-[60px] leading-none tracking-tight mb-3.5"
        >
          {{ t('extensible.headline1') }}
          <em class="text-primary-500">{{ t('extensible.headlineEm') }}</em
          >{{ t('extensible.headline2') }}
        </h2>
        <p
          class="text-[15px] lg:text-[17px] leading-[1.55] text-content-400 mb-8"
        >
          <i18n-t keypath="extensible.intro" tag="span">
            <template #anyone
              ><b class="text-content-0">{{
                t('extensible.anyone')
              }}</b></template
            >
          </i18n-t>
        </p>
        <div class="grid grid-cols-1 gap-3 mb-6">
          <LandingPropCard
            v-for="level in extLevels"
            :key="level.num"
            :num="level.num"
            :title="level.title"
          >
            {{ level.body }}
          </LandingPropCard>
        </div>
        <div class="flex flex-col sm:flex-row gap-2.5 mb-8 lg:mb-0">
          <Button
            :label="t('extensible.ctaContribute')"
            as="a"
            href="https://github.com/rafaeelneto/welldot/blob/main/CONTRIBUTING.md"
            target="_blank"
          />
          <Button
            :label="t('extensible.ctaPropose')"
            as="a"
            href="https://github.com/rafaeelneto/welldot/issues/new"
            target="_blank"
            variant="outlined"
            severity="secondary"
          />
        </div>
      </div>
      <!-- Extension levels -->
      <div
        class="flex flex-col gap-3 min-w-0 lg:sticky lg:top-24 lg:self-start lg:order-first"
      >
        <SelectButton
          v-model="extStage"
          :options="extStages"
          option-label="label"
          option-value="value"
          :allow-empty="false"
          :aria-label="t('extensible.stagesLabel')"
          class="self-start max-w-full overflow-x-auto"
        />
        <!-- The viewer fills its parent (scoped height: 100%) -->
        <div class="h-105">
          <LandingWellJsonViewer
            :json="extJson"
            :badge="t('extensible.valid')"
            filename="poco-03.well"
            :theme="viewerTheme"
          />
        </div>
      </div>
    </div>
  </section>

  <!-- ── §VII · No horizonte ────────────────────────────────────────────────── -->
  <section
    class="relative py-14 lg:py-20 border-b border-surface-200/60 overflow-hidden"
  >
    <div
      class="absolute inset-0 pointer-events-none"
      style="
        background: radial-gradient(
          700px 400px at 100% 100%,
          oklch(72% 0.13 235 / 0.1),
          transparent 70%
        );
      "
    />
    <div class="container-landing relative">
      <div class="kicker mb-4.5">{{ t('horizon.kicker') }}</div>
      <h2
        class="font-serif font-medium text-[38px] lg:text-[60px] leading-none tracking-tight mb-3.5"
      >
        {{ t('horizon.headline1') }}
        <em class="text-primary-500">{{ t('horizon.headlineEm') }}</em
        >{{ t('horizon.headline2') }}
      </h2>
      <p
        class="text-[15px] lg:text-[17px] leading-[1.55] text-content-400 lg:max-w-120 mb-8"
      >
        {{ t('horizon.intro') }}
      </p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <LandingPropCard
          v-for="prop in horizonProps"
          :key="prop.num"
          :num="prop.num"
          :title="prop.title"
        >
          {{ prop.body }}
        </LandingPropCard>
      </div>
    </div>
  </section>

  <!-- ── §VIII · Ecossistema de ferramentas livres ──────────────────────────────── -->
  <section
    class="relative py-14 lg:py-20 border-b border-surface-200/60 overflow-hidden"
  >
    <div class="container-landing relative">
      <div class="kicker mb-4.5">{{ t('tools.kicker') }}</div>
      <h2
        class="font-serif font-medium text-[38px] lg:text-[60px] leading-none tracking-tight mb-3.5"
      >
        {{ t('tools.headline1') }}
        <em class="text-primary-500">{{ t('tools.headlineEm') }}</em
        >{{ t('tools.headline2') }}
      </h2>
      <p
        class="text-[15px] lg:text-[17px] leading-[1.55] text-content-400 lg:max-w-120 mb-8"
      >
        {{ t('tools.intro') }}
      </p>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <LandingToolCard
          v-for="card in toolCards"
          :key="card.title"
          :title="card.title"
          :path="card.path"
          :href="card.href"
          :link-label="t('tools.viewSource')"
        >
          {{ card.body }}
        </LandingToolCard>
      </div>
    </div>
  </section>

  <!-- ── Final CTA ─────────────────────────────────────────────────────────── -->
  <section
    class="relative py-18 lg:py-27.5 text-center border-b border-surface-200/60 overflow-hidden"
  >
    <div
      class="absolute inset-0 pointer-events-none"
      style="
        background:
          radial-gradient(
            700px 400px at 50% 0%,
            oklch(70% 0.14 235 / 0.16),
            transparent 70%
          ),
          radial-gradient(
            500px 300px at 50% 100%,
            oklch(72% 0.13 40 / 0.1),
            transparent 70%
          );
      "
    />
    <div class="container-landing relative">
      <h2
        class="font-serif font-medium text-[40px] lg:text-[64px] leading-[1.05] tracking-tight mb-3.5 text-balance"
      >
        {{ t('cta.headline1') }}<br /><em class="text-primary-500">{{
          t('cta.headlineEm')
        }}</em
        >{{ t('cta.headline2') }}
      </h2>
      <p
        class="text-[14px] lg:text-[18px] text-content-400 max-w-135 mx-auto mb-7"
      >
        {{ t('cta.subtitle') }}
      </p>
      <div
        class="flex flex-col sm:flex-row gap-2.5 justify-center items-center"
      >
        <Button
          :label="t('cta.primary')"
          :as="NuxtLink"
          :to="localePath('/editor')"
        />
        <Button
          :label="t('cta.secondary')"
          as="a"
          href="https://github.com/rafaeelneto/welldot"
          target="_blank"
          variant="outlined"
          severity="secondary"
        />
      </div>
    </div>
  </section>
</template>
