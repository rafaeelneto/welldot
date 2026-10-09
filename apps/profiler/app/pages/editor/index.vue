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
import {
  EDITOR_TAB,
  isEditorTabKey,
  type EditorTabKey,
} from './_components/tabs/summary/navigate';

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
const profileStore = useProfileStore();

// ─── Active tab ↔ URL hash ────────────────────────────────────────────────────
// The active tab lives in the URL hash (`/editor#permits`) so a reload keeps
// it; the default tab (summary) has no hash. The record open in a read-only
// view is appended to its tab: the permit view (`/editor#permits/<id>`) and
// the water sample view (`/editor#water-quality/<id>`).
// Opening or clearing a well goes back to the summary. The hash is written
// with `history.replaceState` (no router navigation): a hash-only route change
// would make Nuxt's scrollBehavior look for an element with that id.

const activeTabKey = ref<EditorTabKey>(EDITOR_TAB.summary);
const permitView = usePermitView();
const waterSampleView = useWaterSampleView();

/** Tabs whose hash can carry the id of the record open in their view. */
const recordViews = [
  { tab: EDITOR_TAB.permits, id: permitView.permitId },
  { tab: EDITOR_TAB.waterQuality, id: waterSampleView.sampleId },
] as const;

function readHash(): { tab: EditorTabKey | null; recordId: string | null } {
  const hash = decodeURIComponent(window.location.hash.slice(1));
  const [tab = '', ...rest] = hash.split('/');
  if (!isEditorTabKey(tab)) return { tab: null, recordId: null };
  const hasView = recordViews.some(v => v.tab === tab);
  return { tab, recordId: hasView && rest.length ? rest.join('/') : null };
}

function writeHash(tab: EditorTabKey) {
  let hash = tab === EDITOR_TAB.summary ? '' : `#${tab}`;
  const recordId = recordViews.find(v => v.tab === tab)?.id.value;
  if (recordId) hash += `/${encodeURIComponent(recordId)}`;
  if (window.location.hash === hash) return;
  const { pathname, search } = window.location;
  // Keep vue-router's history.state, which it relies on for navigation.
  window.history.replaceState(
    window.history.state,
    '',
    pathname + search + hash,
  );
}

function applyHash() {
  const { tab, recordId } = readHash();
  activeTabKey.value = tab ?? EDITOR_TAB.summary;
  for (const v of recordViews) {
    v.id.value = v.tab === tab ? recordId : null;
  }
}

onMounted(() => {
  // Read after hydration: the hash never reaches the server render.
  applyHash();
  window.addEventListener('hashchange', applyHash);
});

onBeforeUnmount(() => window.removeEventListener('hashchange', applyHash));

// Opening a record view from another tab (e.g. the summary) switches to its
// tab; leaving the tab closes it.
for (const v of recordViews) {
  watch(v.id, id => {
    if (id) activeTabKey.value = v.tab;
  });
}
watch(activeTabKey, tab => {
  for (const v of recordViews) {
    if (v.tab !== tab) v.id.value = null;
  }
});

watch(
  [activeTabKey, permitView.permitId, waterSampleView.sampleId],
  ([tab]) => {
    if (import.meta.client) writeHash(tab);
  },
);

watch(
  () => profileStore.wellSession,
  () => {
    permitView.close();
    waterSampleView.close();
    activeTabKey.value = EDITOR_TAB.summary;
  },
);

const tabs = computed<
  {
    value: EditorTabKey;
    label: string;
    shortLabel: string;
    /** Icon-only tab: the label goes to the tooltip / aria-label. */
    icon?: string;
    disabled?: boolean;
    comingSoon?: boolean;
  }[]
>(() => [
  {
    value: EDITOR_TAB.summary,
    label: t('editor.tabs.summary'),
    shortLabel: t('editor.tabs.summary'),
    icon: 'ph:squares-four-duotone',
  },
  {
    value: EDITOR_TAB.general,
    label: t('editor.tabs.general'),
    shortLabel: t('editor.tabs.general'),
  },
  {
    value: EDITOR_TAB.construction,
    label: t('editor.tabs.construction'),
    shortLabel: t('editor.tabs.constructionShort'),
  },
  {
    value: EDITOR_TAB.geological,
    label: t('editor.tabs.geological'),
    shortLabel: t('editor.tabs.geological'),
  },
  {
    value: EDITOR_TAB.historyLog,
    label: t('editor.tabs.historyLog'),
    shortLabel: t('editor.tabs.historyLog'),
  },
  {
    value: EDITOR_TAB.hydrodynamicEvents,
    label: t('editor.tabs.hydrodynamicEvents'),
    shortLabel: t('editor.tabs.hydro'),
  },
  {
    value: EDITOR_TAB.operation,
    label: t('editor.tabs.operation'),
    shortLabel: t('editor.tabs.operation'),
  },
  {
    value: EDITOR_TAB.permits,
    label: t('editor.tabs.permits'),
    shortLabel: t('editor.tabs.permits'),
  },
  {
    value: EDITOR_TAB.waterQuality,
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
        <TabList class="px-6">
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
          <TabPanel :value="EDITOR_TAB.summary">
            <TabSummary @navigate="key => (activeTabKey = key)" />
          </TabPanel>
          <TabPanel :value="EDITOR_TAB.general"><TabGeneral /></TabPanel>
          <TabPanel :value="EDITOR_TAB.construction"
            ><TabConstruction
          /></TabPanel>
          <TabPanel :value="EDITOR_TAB.geological"><TabGeological /></TabPanel>
          <TabPanel :value="EDITOR_TAB.historyLog"><TabHistoryLog /></TabPanel>
          <TabPanel :value="EDITOR_TAB.hydrodynamicEvents"
            ><TabHydrodynamicEvents
          /></TabPanel>
          <TabPanel :value="EDITOR_TAB.operation"><TabOperation /></TabPanel>
          <TabPanel :value="EDITOR_TAB.permits"><TabPermits /></TabPanel>
          <TabPanel :value="EDITOR_TAB.waterQuality"
            ><TabWaterQuality
          /></TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  </div>
</template>
