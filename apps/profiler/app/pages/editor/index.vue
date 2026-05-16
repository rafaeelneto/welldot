<script setup lang="ts">
definePageMeta({ layout: 'editor' });

const { t } = useI18n();
const viewport = useViewport();

const isMobile = computed(() => viewport.isLessThan('lg'));
const mobileView = ref<'perfil' | 'dados'>('dados');
const activeTabKey = ref<string>('0');

const tabs = computed(() => [
  {
    value: '0',
    label: t('editor.tabs.general'),
    shortLabel: t('editor.tabs.general'),
  },
  {
    value: '1',
    label: t('editor.tabs.construction'),
    shortLabel: t('editor.tabs.constructionShort'),
  },
  {
    value: '2',
    label: t('editor.tabs.geological'),
    shortLabel: t('editor.tabs.geological'),
  },
  {
    value: '3',
    label: t('editor.tabs.summary'),
    shortLabel: t('editor.tabs.summary'),
  },
]);

const viewOptions = computed(() => [
  {
    value: 'perfil',
    label: t('editor.viewProfile'),
    icon: 'ph:chart-bar-horizontal-duotone',
  },
  { value: 'dados', label: t('editor.viewData'), icon: 'ph:table-duotone' },
]);
</script>

<template>
  <!-- ─── Mobile sticky header (hidden on desktop) ──────────────────── -->
  <div
    class="lg:hidden sticky top-0 z-40 bg-surface-0 border-b border-surface-200/60"
  >
    <!-- Row 1: top bar -->
    <div class="flex items-center gap-3 px-4 py-3">
      <button
        class="w-8 h-8 rounded-full border border-surface-200 flex items-center justify-center text-content-400 hover:text-content-0 hover:border-surface-300 transition-colors shrink-0"
        :aria-label="t('editor.back')"
      >
        <Icon name="ph:arrow-left" class="w-4 h-4" />
      </button>

      <div class="flex flex-col min-w-0 flex-1">
        <span class="kicker leading-none mb-0.5">{{ t('editor.well') }}</span>
        <span
          class="font-semibold text-[15px] text-content-0 truncate leading-tight"
          >P4 — Exemplo</span
        >
      </div>

      <button
        class="w-8 h-8 rounded-full border border-surface-200 flex items-center justify-center text-content-400 hover:text-content-0 hover:border-surface-300 transition-colors shrink-0"
        :aria-label="t('editor.menu')"
      >
        <Icon name="ph:dots-three-vertical" class="w-4 h-4" />
      </button>
    </div>

    <!-- Row 2: status bar -->
    <div class="flex items-center gap-2 px-4 pb-2.5">
      <span class="w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0" />
      <span
        class="font-mono text-[10px] tracking-[0.12em] uppercase text-content-400"
      >
        {{ t('editor.status.saved') }} · 160 M · 15
        {{ t('editor.status.layers').toUpperCase() }}
      </span>
    </div>

    <!-- Row 3: Perfil / Dados view toggle -->
    <div class="flex items-center gap-2 px-4 pb-3">
      <SelectButton
        v-model="mobileView"
        :options="viewOptions"
        option-value="value"
        :option-label="() => ''"
        data-key="value"
        :allow-empty="false"
      >
        <template #option="{ option }">
          <Icon :name="option.icon" class="w-3.5 h-3.5 shrink-0" />
          {{ option.label }}
        </template>
      </SelectButton>
    </div>
  </div>

  <!-- ─── Content row: flex-row container for all panes ────────────── -->
  <div class="flex flex-1 min-h-0 overflow-hidden">
    <!-- Profiler pane: sidebar on desktop, full-pane on mobile (perfil view) -->
    <div
      :class="[
        'flex-col overflow-hidden',
        isMobile && mobileView !== 'perfil' ? 'hidden' : 'flex',
        'flex-1 lg:flex-none lg:w-120 lg:shrink-0',
        'lg:border-r lg:border-surface-200/60',
      ]"
    >
      <div
        :class="[
          'flex-1 relative flex flex-col overflow-hidden',
          isMobile ? 'glass rounded-xl mx-4 my-4' : 'bg-surface-50',
        ]"
      >
        <!-- Floating zoom controls -->
        <div
          class="absolute top-3 lg:top-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-0.5 px-1.5 py-1.5 rounded-full border border-white/10 shadow-xl"
          style="
            background: linear-gradient(
              180deg,
              rgba(40, 52, 70, 0.82),
              rgba(28, 38, 54, 0.72)
            );
            backdrop-filter: saturate(150%) blur(12px);
          "
        >
          <Button
            unstyled
            :aria-label="t('editor.zoom.in')"
            :pt="{
              root: 'w-7 h-7 rounded-full flex items-center justify-center text-content-800 dark:text-content-200 hover:text-content-0 transition-colors cursor-pointer',
            }"
          >
            <template #icon>
              <Icon name="ph:plus" class="w-3.5 h-3.5" />
            </template>
          </Button>
          <Button
            unstyled
            :aria-label="t('editor.zoom.out')"
            :pt="{
              root: 'w-7 h-7 rounded-full flex items-center justify-center text-content-800 dark:text-content-200 hover:text-content-0 transition-colors cursor-pointer',
            }"
          >
            <template #icon>
              <Icon name="ph:minus" class="w-3.5 h-3.5" />
            </template>
          </Button>
          <Button
            :label="t('editor.zoom.fit')"
            unstyled
            :pt="{
              root: 'px-3 py-1 rounded-full bg-surface-50 text-content-200 text-[12px] font-semibold ml-0.5 transition-colors hover:bg-surface-50 cursor-pointer',
            }"
          />
          <span
            class="font-mono text-[11px] text-content-800 dark:text-content-200 px-2.5"
            >1 : 850</span
          >
        </div>
        <div class="flex-1 flex items-center justify-center">
          <span class="font-mono text-xs text-content-400">SVG Profiler</span>
        </div>
      </div>
    </div>

    <!-- Tabs: desktop right pane + mobile dados content -->
    <div
      :class="[
        'flex-1 flex-col overflow-hidden',
        isMobile && mobileView === 'perfil' ? 'hidden' : 'flex',
      ]"
    >
      <Tabs v-model:value="activeTabKey">
        <TabList>
          <Tab v-for="tab in tabs" :key="tab.value" :value="tab.value">
            {{ isMobile ? tab.shortLabel : tab.label }}
          </Tab>
        </TabList>
        <TabPanels>
          <TabPanel v-for="tab in tabs" :key="tab.value" :value="tab.value">
            <div class="flex items-center justify-center h-32 p-6">
              <span class="font-mono text-xs text-content-400">
                {{ tab.label }} — content placeholder
              </span>
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  </div>
</template>
