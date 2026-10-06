<script setup lang="ts">
import { getCurrentWellStatus } from '@welldot/utils';
import {
  WELL_STATUS_SEVERITY,
  resolveWellStatusLabel,
} from '~/utils/operationVocab';
import { summaryNavigateKey, type EditorTabKey } from './summary/navigate';
import SummaryActivity from './summary/SummaryActivity.vue';
import SummaryConstruction from './summary/SummaryConstruction.vue';
import SummaryIdentity from './summary/SummaryIdentity.vue';
import SummaryKpis from './summary/SummaryKpis.vue';
import SummaryLocation from './summary/SummaryLocation.vue';
import SummaryPermit from './summary/SummaryPermit.vue';
import SummaryPump from './summary/SummaryPump.vue';
import SummaryWaterQuality from './summary/SummaryWaterQuality.vue';

const emit = defineEmits<{ navigate: [tab: EditorTabKey] }>();

const { t } = useI18n();
const profileStore = useProfileStore();

provide(summaryNavigateKey, tab => emit('navigate', tab));

const status = computed(() => getCurrentWellStatus(profileStore.well));
</script>

<template>
  <div class="flex flex-col gap-8 p-6">
    <!-- ── Header ─────────────────────────────────────────────────────────── -->
    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="flex min-w-0 flex-col gap-1">
          <span
            class="font-mono text-[10px] tracking-[0.08em] uppercase text-content-500"
          >
            {{ t('editor.summary.tag') }}
          </span>
          <h3
            class="m-0 font-serif text-[26px] font-medium tracking-[-0.015em] text-content-0"
            :class="{ 'italic text-content-400': !profileStore.well.name }"
          >
            {{ profileStore.well.name || t('editor.summary.unnamed') }}
          </h3>
        </div>
        <Tag
          v-if="status"
          :value="resolveWellStatusLabel(status, t)"
          :severity="WELL_STATUS_SEVERITY[status] ?? 'secondary'"
          class="text-[11px]"
        />
      </div>
      <SummaryKpis />
    </div>

    <!-- ── Overview cards ─────────────────────────────────────────────────── -->
    <div class="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
      <div class="flex flex-col gap-4">
        <SummaryIdentity />
        <SummaryLocation />
        <SummaryPermit />
      </div>
      <div class="flex flex-col gap-4">
        <SummaryPump />
        <SummaryWaterQuality />
        <SummaryActivity />
      </div>
    </div>

    <!-- ── Construction ───────────────────────────────────────────────────── -->
    <section class="flex flex-col gap-5">
      <div class="flex items-baseline justify-between">
        <h3
          class="m-0 font-serif text-[22px] font-medium tracking-[-0.015em] text-content-0"
        >
          {{ t('editor.summary.construction.title') }}
        </h3>
        <span
          class="font-mono text-[10px] tracking-[0.08em] uppercase text-content-500"
        >
          {{ t('editor.summary.construction.tag') }}
        </span>
      </div>
      <SummaryConstruction />
    </section>
  </div>
</template>
