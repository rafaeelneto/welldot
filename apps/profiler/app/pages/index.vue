<script setup lang="ts">
import { useElementBounding } from '@vueuse/core';

definePageMeta({ layout: 'landing' });

const { t, tm, rt } = useI18n();

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

const horizonProps = computed(() =>
  (tm('horizon.props') as any[]).map((p: any) => ({
    num: rt(p.num),
    title: rt(p.title),
    body: rt(p.body),
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
            class="font-mono text-[11px] tracking-[0.12em] uppercase text-content-500 mb-[18px] w-fit bg-surface-0/55 backdrop-blur-sm rounded px-2 py-0.5"
          >
            {{ t('hero.kicker') }}
          </div>
          <h1
            class="font-serif font-medium text-[44px] lg:text-[76px] leading-none tracking-[-0.025em] mb-[14px] lg:mb-[22px] text-balance w-fit bg-surface-0/55 backdrop-blur-sm rounded-md px-2 py-1"
          >
            {{ t('hero.headline1') }}
            <em class="text-primary-500">{{ t('hero.headlineEm') }}</em
            >{{ t('hero.headline2') }}
          </h1>
          <p
            class="text-[15px] lg:text-[19px] leading-[1.55] text-content-400 lg:max-w-[480px] mb-5 lg:mb-7 w-fit bg-surface-0/55 backdrop-blur-sm rounded-md px-2 py-1"
          >
            {{ t('hero.body') }}
          </p>
          <div class="flex flex-col sm:flex-row gap-2.5 mb-5 lg:mb-7">
            <Button :label="t('hero.ctaPrimary')" as="a" href="#" />
            <Button
              :label="t('hero.ctaSecondary')"
              as="a"
              href="#"
              variant="outlined"
              severity="secondary"
            />
          </div>
          <div
            class="flex flex-wrap gap-[22px] pt-5 border-t border-surface-200 font-mono text-[11px] text-content-500 tracking-[0.04em]"
          >
            <span
              ><b class="text-content-0 font-medium">v1.0</b>
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
            class="kicker mb-[18px] w-fit bg-surface-0/55 backdrop-blur-sm rounded px-2 py-0.5"
          >
            {{ t('format.kicker') }}
          </div>
          <h2
            class="font-serif font-medium text-[38px] lg:text-[60px] leading-none tracking-[-0.025em] mb-[14px] w-fit bg-surface-0/55 backdrop-blur-sm rounded-md px-2 py-1"
          >
            {{ t('format.headline1') }}<br /><em class="text-primary-500">{{
              t('format.headlineEm')
            }}</em>
            {{ t('format.headline2') }}
          </h2>
          <p
            class="text-[15px] lg:text-[17px] leading-[1.55] text-content-400 lg:max-w-[480px] mb-8 w-fit bg-surface-0/55 backdrop-blur-sm rounded-md px-2 py-1"
          >
            <i18n-t keypath="format.intro" tag="span">
              <template #well><b>.well</b></template>
              <template #standard
                ><em>{{ t('format.standard') }}</em></template
              >
            </i18n-t>
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
        class="hidden lg:block sticky top-[60px] h-[calc(100vh-60px)] overflow-visible pt-8 lg:pt-14 pr-4 z-0"
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

  <!-- ── §II · Intenção ──────────────────────────────────────────────────── -->
  <section
    class="manifesto-bg relative py-14 lg:py-20 border-b border-surface-200/60 overflow-hidden"
  >
    <div
      class="absolute right-[-100px] top-[30%] w-[500px] h-[500px] pointer-events-none rounded-full"
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
        class="font-serif text-[19px] lg:text-[26px] leading-[1.45] max-w-[880px] mb-9 font-normal text-content-0"
      >
        <i18n-t keypath="intention.body" tag="span">
          <template #unreadable>
            <em class="text-primary-500">{{ t('intention.unreadable') }}</em>
          </template>
          <template #welldot><b>welldot</b></template>
          <template #well><b>.well</b></template>
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

  <!-- ── §III · Padrão por dentro, flexível por fora. ─────────────────────── -->
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
        <div class="kicker mb-[18px]">{{ t('contexts.kicker') }}</div>
        <h2
          class="font-serif font-medium text-[38px] lg:text-[60px] leading-none tracking-[-0.025em] mb-3.5"
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

  <!-- ── §IV · No horizonte ────────────────────────────────────────────────── -->
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
      <div class="kicker mb-[18px]">{{ t('horizon.kicker') }}</div>
      <h2
        class="font-serif font-medium text-[38px] lg:text-[60px] leading-none tracking-[-0.025em] mb-3.5"
      >
        {{ t('horizon.headline1') }}
        <em class="text-primary-500">{{ t('horizon.headlineEm') }}</em
        >{{ t('horizon.headline2') }}
      </h2>
      <p
        class="text-[15px] lg:text-[17px] leading-[1.55] text-content-400 lg:max-w-[480px] mb-8"
      >
        {{ t('horizon.intro') }}
      </p>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
        class="font-serif font-medium text-[40px] lg:text-[64px] leading-[1.05] tracking-[-0.025em] mb-3.5 text-balance"
      >
        {{ t('cta.headline1') }}<br /><em class="text-primary-500">{{
          t('cta.headlineEm')
        }}</em
        >{{ t('cta.headline2') }}
      </h2>
      <p
        class="text-[14px] lg:text-[18px] text-content-400 max-w-[540px] mx-auto mb-7"
      >
        {{ t('cta.subtitle') }}
      </p>
      <div
        class="flex flex-col sm:flex-row gap-2.5 justify-center items-center"
      >
        <Button :label="t('cta.primary')" as="a" href="#" />
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
