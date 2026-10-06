<script setup lang="ts">
import SummaryCard from './SummaryCard.vue';
import SummaryEmpty from './SummaryEmpty.vue';
import SummaryField from './SummaryField.vue';
import { EDITOR_TAB } from './navigate';

const { t } = useI18n();
const profileStore = useProfileStore();
const uiStore = useUiStore();
const { formatLength } = useUnitFormat();

const DEFAULT_CRS = 'EPSG:4326';
const DEFAULT_CRS_LABEL = 'EPSG:4326 · WGS84';

/** The file's CRS when it differs from the spec default (EPSG:4326). */
const customCrs = computed(() => {
  const crs = profileStore.well.location?.properties?.crs?.trim();
  return crs && crs.toUpperCase() !== DEFAULT_CRS ? crs : null;
});

const location = computed(() => {
  const loc = profileStore.well.location;
  if (!loc || (loc.lat === 0 && loc.lng === 0)) return null;
  return loc;
});
</script>

<template>
  <SummaryCard
    :title="t('editor.summary.location.title')"
    icon="ph:map-pin-area-duotone"
    :tag="t('editor.summary.location.tag')"
    :tab="EDITOR_TAB.general"
    :link-label="t('editor.summary.seeIn', { tab: t('editor.tabs.general') })"
  >
    <template v-if="location">
      <dl class="m-0 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <SummaryField
          :label="t('editor.general.latitude')"
          :value="formatCoord(location.lat, uiStore.coordinateFormat, true)"
          mono
        />
        <SummaryField
          :label="t('editor.general.longitude')"
          :value="formatCoord(location.lng, uiStore.coordinateFormat, false)"
          mono
        />
        <SummaryField
          :label="t('editor.general.elevation')"
          :value="
            location.elevation != null ? formatLength(location.elevation) : null
          "
          mono
        />
      </dl>
      <span
        v-if="customCrs"
        class="inline-flex w-fit items-center gap-1.5 rounded-md border border-warning-200 bg-warning-50 px-2 py-0.5 font-mono text-[11px] text-warning-800 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-300"
      >
        <Icon name="ph:globe-hemisphere-west-duotone" class="size-3.5" />
        {{ customCrs }}
      </span>
      <span v-else class="font-mono text-[10px] text-content-400">
        {{ DEFAULT_CRS_LABEL }}
      </span>
      <ClientOnly>
        <LocationMap :lat="location.lat" :lng="location.lng" readonly />
      </ClientOnly>
    </template>
    <SummaryEmpty v-else :text="t('editor.summary.location.empty')" />
  </SummaryCard>
</template>
