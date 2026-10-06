<script setup lang="ts">
import {
  getPermitStartDate,
  getPermitStatus,
  todayCalendarDate,
} from '@welldot/utils';
import SummaryCard from './SummaryCard.vue';
import SummaryEmpty from './SummaryEmpty.vue';
import SummaryField from './SummaryField.vue';
import { getPendingConditions, getSummaryPermit } from './derive';
import { EDITOR_TAB } from './navigate';

const MAX_DEADLINES = 3;

const { t } = useI18n();
const profileStore = useProfileStore();
const permitView = usePermitView();
const { formatFlow } = useUnitFormat();
const { formatNumber } = useNumberFormat();

const today = todayCalendarDate();
const permitsCount = computed(() => profileStore.well.permits?.length ?? 0);

const permit = computed(() => getSummaryPermit(profileStore.well, today));

const status = computed(() =>
  permit.value ? getPermitStatus(profileStore.well, permit.value, today) : null,
);

const validity = computed(() => {
  const p = permit.value;
  if (!p) return null;
  const start = getPermitStartDate(p);
  const end = p.valid_until
    ? formatCalendarDate(p.valid_until)
    : t('editor.operation.permit.noExpiry');
  return start ? `${formatCalendarDate(start)} → ${end}` : end;
});

const waterUses = computed(() =>
  (permit.value?.water_use ?? [])
    .map(u => resolveWaterUseLabel(u, t))
    .join(', '),
);

/**
 * One row per pending condition. Overdue ones show their oldest missed
 * deadline (and how many are missed) and come first; the others show the
 * next deadline.
 */
const deadlines = computed(() => {
  const p = permit.value;
  if (!p) return [];
  return getPendingConditions(profileStore.well, p, today)
    .map(c => ({
      key: c.id,
      description: c.description,
      due_date: c.overdue[0] ?? c.next!,
      status: c.overdue.length ? ('overdue' as const) : ('upcoming' as const),
      overdueCount: c.overdue.length,
    }))
    .sort(
      (a, b) =>
        Number(b.status === 'overdue') - Number(a.status === 'overdue') ||
        a.due_date.localeCompare(b.due_date),
    )
    .slice(0, MAX_DEADLINES);
});
</script>

<template>
  <SummaryCard
    :title="t('editor.summary.permit.title')"
    icon="ph:seal-check-duotone"
    :tab="EDITOR_TAB.permits"
    :link-label="t('editor.summary.seeIn', { tab: t('editor.tabs.permits') })"
  >
    <template v-if="permit" #aside>
      <Tag
        v-if="status"
        :value="t(`editor.operation.permit.status.${status}`)"
        :severity="PERMIT_STATUS_SEVERITY[status] ?? 'secondary'"
        class="text-[11px]"
      />
    </template>

    <template v-if="permit">
      <div class="flex flex-col gap-0.5">
        <span class="text-sm font-medium text-content-0">
          {{ resolvePermitTypeLabel(permit.type, t) }}
          <span
            v-if="permit.identifier ?? permit.request_identifier"
            class="font-mono font-normal text-content-300"
          >
            · {{ permit.identifier ?? permit.request_identifier }}
          </span>
        </span>
        <span class="text-xs text-content-400">
          {{ permit.authority }}
          <template v-if="permitsCount > 1">
            · {{ t('editor.summary.permit.total', { n: permitsCount }) }}
          </template>
        </span>
      </div>
      <dl class="m-0 grid grid-cols-2 gap-x-4 gap-y-3">
        <SummaryField
          :label="t('editor.summary.permit.validity')"
          :value="validity"
          mono
          class="col-span-2"
        />
        <SummaryField
          :label="t('editor.summary.permit.flowRate')"
          :value="formatFlow(permit.flow_rate)"
          mono
        />
        <SummaryField
          :label="t('editor.summary.permit.dailyTime')"
          :value="
            permit.daily_operating_time != null
              ? formatNumber(permit.daily_operating_time, {
                  maximumFractionDigits: 2,
                  suffix: 'h',
                })
              : null
          "
          mono
        />
        <SummaryField
          v-if="waterUses"
          :label="t('editor.summary.permit.waterUse')"
          :value="waterUses"
          class="col-span-2"
        />
      </dl>

      <div v-if="permit.conditions?.length" class="flex flex-col gap-2">
        <span
          class="font-mono text-[9.5px] tracking-[0.08em] uppercase text-content-400"
        >
          {{ t('editor.summary.permit.nextDeadlines') }}
        </span>
        <ul v-if="deadlines.length" class="m-0 flex list-none flex-col p-0">
          <li
            v-for="d in deadlines"
            :key="d.key"
            class="flex items-center justify-between gap-3 border-b border-surface-200 py-1.5 text-xs last:border-b-0"
          >
            <span class="min-w-0 truncate text-content-0">
              {{ d.description }}
            </span>
            <span class="flex shrink-0 items-center gap-2">
              <span class="font-mono text-[11px] text-content-300">
                {{ formatCalendarDate(d.due_date) }}
              </span>
              <Tag
                :value="
                  d.overdueCount > 1
                    ? t('editor.summary.permit.overdueCount', {
                        n: d.overdueCount,
                      })
                    : t(
                        `editor.operation.permit.conditions.deadlineStatus.${d.status}`,
                      )
                "
                :severity="DEADLINE_STATUS_SEVERITY[d.status] ?? 'secondary'"
                class="text-[10px]"
              />
            </span>
          </li>
        </ul>
        <span v-else class="text-xs text-content-400">
          {{ t('editor.summary.permit.noDeadlines') }}
        </span>
      </div>
    </template>
    <Button
      v-if="permit"
      severity="secondary"
      text
      size="small"
      class="self-start"
      :label="t('editor.operation.permit.view.open')"
      @click="permitView.open(permit.id)"
    >
      <template #icon>
        <Icon name="ph:eye-duotone" />
      </template>
    </Button>
    <SummaryEmpty v-else :text="t('editor.summary.permit.empty')" />
  </SummaryCard>
</template>
