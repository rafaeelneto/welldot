<script setup lang="ts">
import Header from './_components/Header.vue';
import WellCanvas from './_components/canvas/WellCanvas.vue';
import TabGeneral from './_components/tabs/TabGeneral.vue';
import TabConstruction from './_components/tabs/TabConstruction.vue';
import TabGeological from './_components/tabs/TabGeological.vue';
import TabSummary from './_components/tabs/TabSummary.vue';
import TabHistoryLog from './_components/tabs/TabHistoryLog.vue';
import TabHydrodynamicEvents from './_components/tabs/TabHydrodynamicEvents.vue';
import TabOperation from './_components/tabs/TabOperation.vue';
import TabPermits from './_components/tabs/TabPermits.vue';
import TabWaterQuality from './_components/tabs/TabWaterQuality.vue';

definePageMeta({ layout: 'editor' });

const { t } = useI18n();

useSeoMeta({
  title: () => t('editorMeta.title'),
  description: () => t('editorMeta.description'),
});

const viewport = useViewport();

useSharedProfileLoader();

const { showStartupTip } = useStartupTips();
onMounted(() => showStartupTip());

const isMobile = computed(() => viewport.isLessThan('lg'));
const mobileView = ref<'profile' | 'data'>('data');
// The summary (value '3') is listed first and opens by default.
const activeTabKey = ref<string>('3');

const tabs = computed<
  {
    value: string;
    label: string;
    shortLabel: string;
    /** Icon-only tab: the label goes to the tooltip / aria-label. */
    icon?: string;
    disabled?: boolean;
    comingSoon?: boolean;
  }[]
>(() => [
  {
    value: '3',
    label: t('editor.tabs.summary'),
    shortLabel: t('editor.tabs.summary'),
    icon: 'ph:squares-four-duotone',
  },
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
    value: '4',
    label: t('editor.tabs.historyLog'),
    shortLabel: t('editor.tabs.historyLog'),
  },
  {
    value: '5',
    label: t('editor.tabs.hydrodynamicEvents'),
    shortLabel: t('editor.tabs.hydro'),
  },
  {
    value: '6',
    label: t('editor.tabs.operation'),
    shortLabel: t('editor.tabs.operation'),
  },
  {
    value: '7',
    label: t('editor.tabs.permits'),
    shortLabel: t('editor.tabs.permits'),
  },
  {
    value: '8',
    label: t('editor.tabs.waterQuality'),
    shortLabel: t('editor.tabs.waterQualityShort'),
  },
]);
</script>

<template>
  <Header v-model:mobile-view="mobileView" />

  <!-- ─── Content row: flex-row container for all panes ────────────── -->
  <div class="flex flex-1 min-h-0 overflow-hidden">
    <!-- Profiler pane: sidebar on desktop, full-pane on mobile (profile view) -->
    <div
      :class="[
        'flex-col overflow-hidden',
        isMobile && mobileView !== 'profile' ? 'hidden' : 'flex',
        'flex-1 lg:flex-none lg:w-120 lg:shrink-0',
        'lg:border-r lg:border-surface-200/60',
      ]"
    >
      <WellCanvas
        :class="isMobile ? 'glass rounded-xl mx-4 my-4' : 'bg-surface-50'"
      />
    </div>

    <!-- Tabs: desktop right pane + mobile data content -->
    <div
      :class="[
        'flex-1 flex-col overflow-hidden',
        isMobile && mobileView === 'profile' ? 'hidden' : 'flex',
      ]"
    >
      <Tabs v-model:value="activeTabKey">
        <TabList>
          <Tab
            v-for="tab in tabs"
            :key="tab.value"
            :value="tab.value"
            :disabled="tab.disabled ?? false"
            :aria-label="tab.icon ? tab.label : undefined"
          >
            <Icon
              v-if="tab.icon"
              v-tooltip.bottom="tab.label"
              :name="tab.icon"
              class="block size-4.5"
            />
            <span v-else class="flex items-center gap-1.5">
              {{ isMobile ? tab.shortLabel : tab.label }}
              <span
                v-if="tab.comingSoon"
                class="text-[9px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-full bg-surface-200 dark:bg-surface-700 text-content-400"
              >
                {{ t('editor.tabs.inDevelopment') }}
              </span>
            </span>
          </Tab>
        </TabList>
        <TabPanels>
          <TabPanel value="0"><TabGeneral /></TabPanel>
          <TabPanel value="1"><TabConstruction /></TabPanel>
          <TabPanel value="2"><TabGeological /></TabPanel>
          <TabPanel value="3">
            <TabSummary @navigate="key => (activeTabKey = key)" />
          </TabPanel>
          <TabPanel value="4"><TabHistoryLog /></TabPanel>
          <TabPanel value="5"><TabHydrodynamicEvents /></TabPanel>
          <TabPanel value="6"><TabOperation /></TabPanel>
          <TabPanel value="7"><TabPermits /></TabPanel>
          <TabPanel value="8"><TabWaterQuality /></TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  </div>
</template>
