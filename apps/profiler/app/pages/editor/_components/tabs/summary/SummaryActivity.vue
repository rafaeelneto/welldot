<script setup lang="ts">
import SummaryCard from './SummaryCard.vue';
import SummaryEmpty from './SummaryEmpty.vue';
import { EDITOR_TAB, summaryNavigateKey } from './navigate';
import { useWellAlerts } from './useWellAlerts';

const MAX_LOGS = 5;

const { t } = useI18n();
const profileStore = useProfileStore();
const { categoryIcon, categoryLabel } = useHistoryLogCategories();
const { typeOptions } = useHydrodynamicEventTypes();
const { latestEvent } = useAquiferState();
const { formatFlow } = useUnitFormat();
const navigate = inject(summaryNavigateKey, () => {});
const { alerts, dataIssues, dataIssuesCount } = useWellAlerts();

const recentLogs = computed(() =>
  [...(profileStore.well.history_logs ?? [])]
    .sort(
      (a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime(),
    )
    .slice(0, MAX_LOGS),
);

const latestEventInfo = computed(() => {
  const e = latestEvent.value;
  if (!e) return null;
  const type = typeOptions.value.find(o => o.value === e.type);
  const rate = stepRate(e);
  return {
    label: type?.label ?? e.type,
    icon: type?.icon ?? 'ph:drop-duotone',
    date: formatDate(e.datetime, 'dd/MM/yyyy HH:mm'),
    rate: rate != null ? formatFlow(rate) : null,
  };
});
</script>

<template>
  <SummaryCard
    :title="t('editor.summary.activity.title')"
    icon="ph:pulse-duotone"
    :tag="t('editor.summary.activity.tag')"
    :tab="EDITOR_TAB.historyLog"
    :link-label="
      t('editor.summary.seeIn', { tab: t('editor.tabs.historyLog') })
    "
  >
    <!-- Alerts -->
    <div class="flex flex-col gap-2">
      <span
        class="font-mono text-[9.5px] tracking-[0.08em] uppercase text-content-400"
      >
        {{ t('editor.summary.activity.alerts') }}
      </span>
      <ul v-if="alerts.length" class="m-0 flex list-none flex-col gap-1.5 p-0">
        <li v-for="a in alerts" :key="a.key">
          <button
            type="button"
            class="flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left text-xs"
            :class="
              a.severity === 'danger'
                ? 'border-error-200 bg-error-50 text-error-800 hover:bg-error-100 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300'
                : 'border-warning-200 bg-warning-50 text-warning-800 hover:bg-warning-100 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-300'
            "
            @click="navigate(a.tab)"
          >
            <Icon :name="a.icon" class="mt-px size-4 shrink-0" />
            <span class="flex-1">{{ a.message }}</span>
            <Icon name="ph:arrow-right" class="mt-px size-3.5 shrink-0" />
          </button>
        </li>
      </ul>
      <span v-else class="flex items-center gap-1.5 text-xs text-content-300">
        <Icon name="ph:check-circle-duotone" class="size-4 text-success-500" />
        {{ t('editor.summary.activity.noAlerts') }}
      </span>

      <!-- Data consistency issues: discreet, collapsed -->
      <details v-if="dataIssuesCount" class="group text-xs">
        <summary
          class="flex cursor-pointer list-none items-center gap-1.5 text-content-400 hover:text-content-0"
        >
          <Icon
            name="ph:caret-right"
            class="size-3 transition-transform group-open:rotate-90"
          />
          {{ t('editor.summary.activity.dataIssues', { n: dataIssuesCount }) }}
        </summary>
        <ul class="m-0 mt-2 flex list-none flex-col gap-2 p-0 pl-4.5">
          <li
            v-for="g in dataIssues"
            :key="g.key"
            class="flex flex-col gap-0.5"
          >
            <button
              type="button"
              class="flex w-fit items-center gap-1 font-medium text-content-0 hover:text-primary-600 dark:hover:text-primary-400"
              @click="navigate(g.tab)"
            >
              {{ g.label }}
              <Icon name="ph:arrow-right" class="size-3" />
            </button>
            <ul
              class="m-0 flex list-disc flex-col gap-0.5 pl-4 text-[11px] text-content-300"
            >
              <li v-for="msg in g.messages" :key="msg">{{ msg }}</li>
            </ul>
          </li>
        </ul>
      </details>
    </div>

    <!-- Latest hydrodynamic event -->
    <div class="flex flex-col gap-2">
      <span
        class="font-mono text-[9.5px] tracking-[0.08em] uppercase text-content-400"
      >
        {{ t('editor.summary.activity.latestEvent') }}
      </span>
      <button
        v-if="latestEventInfo"
        type="button"
        class="flex items-center gap-2.5 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-left hover:bg-surface-100"
        @click="navigate(EDITOR_TAB.hydrodynamicEvents)"
      >
        <Icon
          :name="latestEventInfo.icon"
          class="size-4 shrink-0 text-primary-500"
        />
        <span class="flex min-w-0 flex-1 flex-col">
          <span class="text-xs font-medium text-content-0">
            {{ latestEventInfo.label }}
          </span>
          <span class="font-mono text-[10.5px] text-content-400">
            {{ latestEventInfo.date }}
            <template v-if="latestEventInfo.rate">
              · {{ latestEventInfo.rate }}
            </template>
          </span>
        </span>
        <Icon
          name="ph:arrow-right"
          class="size-3.5 shrink-0 text-content-400"
        />
      </button>
      <span v-else class="text-xs text-content-400">
        {{ t('editor.summary.activity.noEvents') }}
      </span>
    </div>

    <!-- Recent history logs -->
    <div class="flex flex-col gap-2">
      <span
        class="font-mono text-[9.5px] tracking-[0.08em] uppercase text-content-400"
      >
        {{ t('editor.summary.activity.recentLogs') }}
      </span>
      <ol v-if="recentLogs.length" class="m-0 flex list-none flex-col p-0">
        <li
          v-for="log in recentLogs"
          :key="log.id"
          class="flex items-start gap-2.5 border-b border-surface-200 py-2 last:border-b-0"
        >
          <Icon
            :name="categoryIcon(log.category)"
            class="mt-0.5 size-4 shrink-0 text-content-300"
          />
          <span class="flex min-w-0 flex-1 flex-col gap-0.5">
            <span class="flex items-baseline justify-between gap-2">
              <span class="text-xs font-medium text-content-0">
                {{ categoryLabel(log.category) }}
              </span>
              <span class="shrink-0 font-mono text-[10.5px] text-content-400">
                {{ formatDate(log.datetime, 'dd/MM/yyyy') }}
              </span>
            </span>
            <span class="line-clamp-2 text-xs text-content-300">
              {{ log.description }}
            </span>
          </span>
        </li>
      </ol>
      <SummaryEmpty v-else :text="t('editor.summary.activity.noLogs')" />
    </div>
  </SummaryCard>
</template>
