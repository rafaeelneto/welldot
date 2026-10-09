<script setup lang="ts">
import { WELL_PURPOSES, WELL_TYPES } from '@welldot/core';
import SummaryCard from './SummaryCard.vue';
import SummaryField from './SummaryField.vue';
import { EDITOR_TAB } from './navigate';

const { t } = useI18n();
const { vocabLabel, vocabList } = useVocab();
const profileStore = useProfileStore();

const well = computed(() => profileStore.well);

const wellIds = computed(() =>
  [...(well.value.well_id ?? [])]
    .filter(id => id.id)
    .sort((a, b) => Number(b.primary ?? false) - Number(a.primary ?? false)),
);
</script>

<template>
  <SummaryCard
    :title="t('editor.summary.identity.title')"
    icon="ph:identification-card-duotone"
    :tag="t('editor.summary.identity.tag')"
    :tab="EDITOR_TAB.general"
    :link-label="t('editor.summary.seeIn', { tab: t('editor.tabs.general') })"
  >
    <dl class="m-0 grid grid-cols-2 gap-x-4 gap-y-3">
      <SummaryField
        :label="t('editor.general.wellType')"
        :value="well.well_type ? vocabLabel(WELL_TYPES, well.well_type) : null"
      />
      <SummaryField
        :label="t('editor.general.wellPurpose')"
        :value="vocabList(WELL_PURPOSES, well.well_purpose)"
      />
      <SummaryField
        :label="t('editor.general.driller')"
        :value="well.well_driller"
      />
      <SummaryField
        :label="t('editor.general.constructionDate')"
        :value="
          well.construction_date
            ? formatCalendarDate(well.construction_date)
            : null
        "
        mono
      />
      <SummaryField
        :label="t('editor.summary.identity.ids')"
        class="col-span-2"
      >
        <div v-if="wellIds.length" class="flex flex-wrap gap-1.5">
          <span
            v-for="id in wellIds"
            :key="`${id.authority}:${id.id}`"
            class="inline-flex items-center gap-1 rounded-md border border-surface-200 bg-surface-50 px-2 py-0.5 font-mono text-[11px]"
            :class="id.primary ? 'text-content-0' : 'text-content-300'"
          >
            <Icon
              v-if="id.primary"
              name="ph:star-duotone"
              class="size-3 text-primary-500"
            />
            <span v-if="id.authority" class="text-content-400">
              {{ id.authority }}
            </span>
            {{ id.id }}
          </span>
        </div>
        <template v-else>—</template>
      </SummaryField>
    </dl>
  </SummaryCard>
</template>
