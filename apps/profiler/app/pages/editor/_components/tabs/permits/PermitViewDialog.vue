<script setup lang="ts">
import type {
  ConditionFulfillment,
  Permit,
  PermitCondition,
} from '@welldot/core';
import {
  getConditionDeadlineStates,
  getPermitStartDate,
  getPermitStatus,
  getPermitTimeline,
  getPermitWarnings,
  getSuccessorPermit,
  todayCalendarDate,
} from '@welldot/utils';
import type { ConditionDeadlineState } from '@welldot/utils';
import AttachmentField from '~/components/attachments/AttachmentField.vue';
import {
  DEADLINE_STATUS_SEVERITY,
  PERMIT_HISTORY_TYPE_ICON,
  PERMIT_STATUS_SEVERITY,
  permitLabel,
  resolveConditionCategoryLabel,
  resolvePermitHistoryTypeLabel,
  resolvePermitTypeLabel,
  resolveWaterUseLabel,
} from '~/utils/permitVocab';
import { sampleLabel } from '~/utils/waterQualityVocab';
import ConditionFulfillDialog from './ConditionFulfillDialog.vue';

/**
 * Full view of one permit (.well v2.3), in tabs: identity, status and grant;
 * the complete condition schedule; and the timeline merging administrative
 * history and condition compliance. The permit itself is not edited here
 * (Edit opens the permit dialog on the same tab), but condition deadlines can
 * be marked fulfilled or have their fulfillment removed. The permit is
 * resolved from the store by id so the view stays live.
 */
const visible = defineModel<boolean>('visible', { default: false });

type ViewTab = 'grant' | 'conditions' | 'history';

const props = defineProps<{ permitId: string }>();

const emit = defineEmits<{ edit: [id: string, tab: ViewTab] }>();

const { t, locale } = useI18n();
const profileStore = useProfileStore();
const permitView = usePermitView();
const { formatFlow, formatVolume } = useUnitFormat();
const { formatNumber } = useNumberFormat();
const { eventTypeLabel } = useHydrodynamicEventTypes();

const today = todayCalendarDate();

const activeTab = ref<ViewTab>('grant');
// Following a supersedes link opens another permit: start on its first tab.
watch(
  () => props.permitId,
  () => (activeTab.value = 'grant'),
);

const permit = computed<Permit | undefined>(() =>
  profileStore.well.permits?.find(p => p.id === props.permitId),
);

const status = computed(() =>
  permit.value
    ? getPermitStatus(profileStore.well, permit.value, today)
    : undefined,
);

const predecessor = computed(() =>
  permit.value?.supersedes
    ? profileStore.well.permits?.find(p => p.id === permit.value!.supersedes)
    : undefined,
);
const successor = computed(() =>
  permit.value
    ? getSuccessorPermit(profileStore.well, permit.value)
    : undefined,
);

const warnings = computed(() => {
  const id = props.permitId;
  return [
    ...new Set(
      getPermitWarnings(profileStore.well, today)
        .filter(w => w.ids.includes(id))
        .map(w => t(`editor.operation.permit.warnings.${w.code}`)),
    ),
  ];
});

// ─── Identity & grant ─────────────────────────────────────────────────────────

const validity = computed(() => {
  const p = permit.value;
  if (!p) return '—';
  const start = getPermitStartDate(p);
  const end = p.valid_until
    ? formatCalendarDate(p.valid_until)
    : t('editor.operation.permit.noExpiry');
  return start ? `${formatCalendarDate(start)} → ${end}` : end;
});

const facts = computed(() => {
  const p = permit.value;
  if (!p) return [];
  return [
    {
      label: t('editor.operation.permit.fields.identifier'),
      value: p.identifier,
      mono: true,
    },
    {
      label: t('editor.operation.permit.fields.requestIdentifier'),
      value: p.request_identifier,
      mono: true,
    },
    {
      label: t('editor.operation.permit.fields.issuedAt'),
      value: p.issued_at && formatCalendarDate(p.issued_at),
      mono: true,
    },
    {
      label: t('editor.operation.permit.fields.validity'),
      value:
        p.issued_at || p.valid_from || p.valid_until ? validity.value : null,
      mono: true,
    },
    {
      label: t('editor.operation.permit.fields.renewalRequestedAt'),
      value:
        p.renewal_requested_at && formatCalendarDate(p.renewal_requested_at),
      mono: true,
    },
    {
      label: t('editor.operation.permit.fields.flowRate'),
      value: p.flow_rate != null ? formatFlow(p.flow_rate) : null,
      mono: true,
    },
    {
      label: t('editor.operation.permit.fields.dailyOperatingTime'),
      value:
        p.daily_operating_time != null
          ? `${formatNumber(p.daily_operating_time, { maximumFractionDigits: 2 })} h`
          : null,
      mono: true,
    },
    ...(p.volume_limits ?? []).map(v => ({
      label: `${t('editor.operation.permit.fields.volumeLimits')} · ${t(`editor.operation.permit.fields.volumePeriods.${v.period}`)}`,
      value: formatVolume(v.volume, 0),
      mono: true,
    })),
  ].filter(f => f.value);
});

const monthNames = computed(() => {
  const fmt = new Intl.DateTimeFormat(locale.value, { month: 'short' });
  return Array.from({ length: 12 }, (_, i) => fmt.format(new Date(2000, i, 1)));
});

/** All twelve months; months absent from the schedule have no grant. */
const scheduleRows = computed(() => {
  const schedule = permit.value?.monthly_schedule;
  if (!schedule) return [];
  return monthNames.value.map((name, i) => {
    const g = schedule.find(m => m.month === i + 1);
    return {
      month: i + 1,
      name,
      granted: !!g,
      flow: g?.flow_rate != null ? formatFlow(g.flow_rate) : '—',
      hours:
        g?.daily_operating_time != null
          ? `${formatNumber(g.daily_operating_time, { maximumFractionDigits: 2 })} h`
          : '—',
      days: g?.days != null ? String(g.days) : '—',
    };
  });
});

// ─── Conditions schedule ──────────────────────────────────────────────────────

function deadlineStates(c: PermitCondition): ConditionDeadlineState[] {
  return permit.value
    ? getConditionDeadlineStates(profileStore.well, permit.value, c, { today })
    : [];
}

function fulfillmentOf(
  c: PermitCondition,
  id: string | undefined,
): ConditionFulfillment | undefined {
  return id ? c.fulfillments?.find(f => f.id === id) : undefined;
}

/** "Every 6 months · from 31/07/2025 · until 31/12/2028 · max. 4". */
function scheduleSummary(c: PermitCondition): string {
  const parts: string[] = [];
  if (c.recurrence) {
    parts.push(
      `${t('editor.operation.permit.conditions.recurrence')} ${formatDuration(c.recurrence)}`,
    );
  } else if (c.first_due || c.due_after) {
    parts.push(t('editor.operation.permit.conditions.recurrenceNone'));
  } else {
    parts.push(t('editor.operation.permit.conditions.undated'));
  }
  if (c.first_due) parts.push(formatCalendarDate(c.first_due));
  else if (c.due_after) {
    parts.push(
      `${t('editor.operation.permit.conditions.dueAfter')} ${formatDuration(c.due_after)}`,
    );
  }
  if (c.last_due) {
    parts.push(
      `${t('editor.operation.permit.conditions.lastDue')} ${formatCalendarDate(c.last_due)}`,
    );
  }
  if (c.occurrences) {
    parts.push(
      `${t('editor.operation.permit.conditions.occurrences')} ${c.occurrences}`,
    );
  }
  return parts.join(' · ');
}

/** `P6M` → "6 months"; combined durations are joined. */
function formatDuration(value: string): string {
  const m = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?$/.exec(value);
  if (!m) return value;
  return (['Y', 'M', 'W', 'D'] as const)
    .map((unit, i) =>
      m[i + 1]
        ? `${m[i + 1]} ${t(`editor.operation.permit.conditions.units.${unit}`)}`
        : null,
    )
    .filter(Boolean)
    .join(' ');
}

function conditionCounts(c: PermitCondition) {
  const states = deadlineStates(c);
  return {
    fulfilled: states.filter(
      s => s.status === 'fulfilled' || s.status === 'fulfilled_late',
    ).length,
    overdue: states.filter(s => s.status === 'overdue').length,
    total: states.length,
  };
}

/** Linked evidence of a fulfillment: hydrodynamic event and/or water sample. */
function evidence(f: ConditionFulfillment): string | null {
  const well = profileStore.well;
  const event = f.event_id
    ? well.hydrodynamic_events?.find(e => e.id === f.event_id)
    : undefined;
  const sample = f.sample_id
    ? well.water_samples?.find(s => s.id === f.sample_id)
    : undefined;
  return (
    [
      event
        ? `${eventTypeLabel(event.type)} · ${formatDate(event.datetime, 'dd/MM/yyyy')}`
        : f.event_id,
      sample ? sampleLabel(sample, t) : f.sample_id,
    ]
      .filter(Boolean)
      .join(' · ') || null
  );
}

/** Overdue deadlines across all conditions, for the tab badge. */
const overdueTotal = computed(() =>
  (permit.value?.conditions ?? []).reduce(
    (n, c) => n + conditionCounts(c).overdue,
    0,
  ),
);

// ─── Recording fulfillments ──────────────────────────────────────────────────

const { addFulfillment, removeFulfillment } = usePermitFulfillments();

const fulfillTarget = ref<{
  condition: PermitCondition;
  dueDate?: string;
} | null>(null);
const fulfillVisible = ref(false);

function openFulfill(condition: PermitCondition, dueDate?: string) {
  fulfillTarget.value = { condition, dueDate };
  fulfillVisible.value = true;
}

/**
 * Deadlines that get the full "Mark fulfilled" button: every overdue one and
 * the next upcoming one. Later deadlines get an icon-only button.
 */
function isPrimaryDeadline(
  c: PermitCondition,
  s: ConditionDeadlineState,
): boolean {
  if (s.status === 'overdue') return true;
  if (s.status !== 'upcoming') return false;
  // States are recomputed per call: compare by deadline, not identity.
  return (
    deadlineStates(c).find(x => x.status === 'upcoming')?.due_date ===
    s.due_date
  );
}

/** An undated condition with no fulfillment yet can still be marked done. */
function canFulfillUndated(c: PermitCondition): boolean {
  return !c.first_due && !c.due_after && !deadlineStates(c).length;
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

const timeline = computed(() =>
  permit.value ? getPermitTimeline(permit.value) : [],
);

function historyIcon(type: string | undefined): string {
  return (type && PERMIT_HISTORY_TYPE_ICON[type]) || 'ph:note-duotone';
}

function isHistoryOverdue(due: string | undefined, done: boolean | undefined) {
  return !!due && done !== true && due < today;
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    maximizable
    dismissable-mask
    :style="{ width: '100vw', maxWidth: '64rem', height: 'min(90vh, 56rem)' }"
    :breakpoints="{ '640px': '100vw' }"
    :pt="{ content: { class: 'flex flex-col min-h-0 flex-1 pb-0' } }"
  >
    <template #header>
      <div v-if="permit" class="flex flex-col gap-1 min-w-0">
        <div class="flex items-center flex-wrap gap-2">
          <Icon name="ph:seal-check-duotone" class="size-5 text-content-300" />
          <span class="text-base font-medium text-content-0">
            {{ resolvePermitTypeLabel(permit.type, t) }}
          </span>
          <Tag
            v-if="status"
            :value="t(`editor.operation.permit.status.${status}`)"
            :severity="PERMIT_STATUS_SEVERITY[status] ?? 'secondary'"
            class="text-[11px]"
          />
        </div>
        <span class="text-xs text-content-300 truncate">
          {{ permitLabel(permit) || permit.authority }}
        </span>
      </div>
    </template>

    <Tabs v-if="permit" v-model:value="activeTab">
      <TabList>
        <Tab value="grant">
          {{ t('editor.operation.permit.view.tabs.grant') }}
        </Tab>
        <Tab value="conditions">
          <span class="flex items-center gap-1.5">
            {{ t('editor.operation.permit.view.tabs.conditions') }}
            <Badge
              v-if="overdueTotal"
              :value="overdueTotal"
              severity="danger"
              size="small"
            />
            <span v-else class="font-mono text-xs text-content-400">
              {{ permit.conditions?.length ?? 0 }}
            </span>
          </span>
        </Tab>
        <Tab value="history">
          <span class="flex items-center gap-1.5">
            {{ t('editor.operation.permit.view.tabs.history') }}
            <span class="font-mono text-xs text-content-400">
              {{ timeline.length }}
            </span>
          </span>
        </Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="grant">
          <div class="flex flex-col gap-6 py-4">
            <section class="flex flex-col gap-3">
              <h3 class="view-heading">
                {{ t('editor.operation.permit.view.sections.grant') }}
              </h3>
              <dl class="m-0 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
                <div class="flex flex-col">
                  <dt class="view-label">
                    {{ t('editor.operation.permit.fields.authority') }}
                  </dt>
                  <dd class="m-0 text-sm text-content-100">
                    {{ permit.authority }}
                  </dd>
                </div>
                <div v-for="f in facts" :key="f.label" class="flex flex-col">
                  <dt class="view-label">{{ f.label }}</dt>
                  <dd
                    class="m-0 text-sm text-content-100"
                    :class="{ 'font-mono': f.mono }"
                  >
                    {{ f.value }}
                  </dd>
                </div>
              </dl>

              <div
                v-if="permit.water_use?.length"
                class="flex flex-wrap gap-1.5"
              >
                <Tag
                  v-for="use in permit.water_use"
                  :key="use"
                  :value="resolveWaterUseLabel(use, t)"
                  severity="secondary"
                  class="text-[11px]"
                />
              </div>

              <div
                v-if="predecessor || permit.supersedes || successor"
                class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-content-300"
              >
                <button
                  v-if="permit.supersedes"
                  type="button"
                  class="link-btn"
                  :disabled="!predecessor"
                  @click="predecessor && permitView.open(predecessor.id)"
                >
                  <Icon name="ph:arrow-bend-up-left-duotone" class="size-3.5" />
                  {{
                    t('editor.operation.permit.supersedes', {
                      number: permitLabel(predecessor, permit.supersedes),
                    })
                  }}
                </button>
                <button
                  v-if="successor"
                  type="button"
                  class="link-btn"
                  @click="permitView.open(successor.id)"
                >
                  <Icon
                    name="ph:arrow-bend-down-right-duotone"
                    class="size-3.5"
                  />
                  {{
                    t('editor.operation.permit.supersededBy', {
                      number: permitLabel(successor),
                    })
                  }}
                </button>
              </div>

              <!-- monthly schedule -->
              <div v-if="scheduleRows.length" class="flex flex-col gap-2">
                <span class="view-label">
                  {{ t('editor.operation.permit.fields.monthlySchedule') }}
                </span>
                <div class="overflow-x-auto">
                  <table class="view-table">
                    <thead>
                      <tr>
                        <th>{{ t('editor.operation.permit.fields.month') }}</th>
                        <th>
                          {{ t('editor.operation.permit.fields.flowRate') }}
                        </th>
                        <th>
                          {{
                            t(
                              'editor.operation.permit.fields.dailyOperatingTime',
                            )
                          }}
                        </th>
                        <th>{{ t('editor.operation.permit.fields.days') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="row in scheduleRows"
                        :key="row.month"
                        :class="{ 'text-content-500': !row.granted }"
                      >
                        <td>{{ row.name }}</td>
                        <td class="font-mono">{{ row.flow }}</td>
                        <td class="font-mono">{{ row.hours }}</td>
                        <td class="font-mono">{{ row.days }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
            <section
              v-if="
                permit.notes || permit.attachments?.length || warnings.length
              "
              class="flex flex-col gap-3"
            >
              <h3 class="view-heading">
                {{ t('editor.operation.permit.view.sections.notes') }}
              </h3>
              <Message
                v-for="msg in warnings"
                :key="msg"
                severity="warn"
                size="small"
                variant="simple"
              >
                {{ msg }}
              </Message>
              <p
                v-if="permit.notes"
                class="m-0 text-sm leading-relaxed whitespace-pre-line text-content-200"
              >
                {{ permit.notes }}
              </p>
              <AttachmentField
                :model-value="permit.attachments"
                readonly
                :visible-count="6"
              />
            </section>
          </div>
        </TabPanel>
        <TabPanel value="conditions">
          <div class="py-4">
            <section class="flex flex-col gap-3">
              <p
                v-if="!permit.conditions?.length"
                class="m-0 text-xs text-content-400"
              >
                {{ t('editor.operation.permit.conditions.empty') }}
              </p>
              <div
                v-for="c in permit.conditions"
                :key="c.id"
                class="rounded-lg border border-surface-200/70 bg-surface-50 px-3 py-2.5 flex flex-col gap-2"
              >
                <div class="flex items-start gap-3">
                  <div class="flex flex-col gap-0.5 flex-1 min-w-0">
                    <span class="text-sm text-content-0">{{
                      c.description
                    }}</span>
                    <span
                      class="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-content-400"
                    >
                      <span v-if="c.category">
                        {{ resolveConditionCategoryLabel(c.category, t) }}
                      </span>
                      <span
                        v-if="c.responsible"
                        class="flex items-center gap-1"
                      >
                        <Icon name="ph:user-duotone" class="size-3" />
                        {{ c.responsible }}
                      </span>
                      <span class="font-mono">{{ scheduleSummary(c) }}</span>
                    </span>
                  </div>
                  <span
                    v-if="conditionCounts(c).total"
                    class="shrink-0 font-mono text-[11px] text-content-300"
                  >
                    {{
                      t('editor.operation.permit.view.fulfilledCount', {
                        done: conditionCounts(c).fulfilled,
                        total: conditionCounts(c).total,
                      })
                    }}
                  </span>
                </div>

                <ul
                  v-if="deadlineStates(c).length"
                  class="m-0 p-0 list-none flex flex-col"
                >
                  <li
                    v-for="s in deadlineStates(c)"
                    :key="s.due_date ?? s.fulfillment_id"
                    class="flex flex-col gap-1.5 border-t border-surface-200 py-2 first:border-t-0"
                  >
                    <div class="flex flex-wrap items-center gap-2 text-xs">
                      <span class="font-mono text-content-100 w-24 shrink-0">
                        {{
                          s.due_date
                            ? formatCalendarDate(s.due_date)
                            : t('editor.operation.permit.conditions.undated')
                        }}
                      </span>
                      <Tag
                        :value="
                          t(
                            `editor.operation.permit.conditions.deadlineStatus.${s.status}`,
                          )
                        "
                        :severity="
                          DEADLINE_STATUS_SEVERITY[s.status] ?? 'secondary'
                        "
                        class="text-[10px]"
                      />
                      <template v-if="fulfillmentOf(c, s.fulfillment_id)">
                        <span class="font-mono text-content-300">
                          {{
                            formatDate(
                              fulfillmentOf(c, s.fulfillment_id)!.datetime,
                              'dd/MM/yyyy HH:mm',
                            )
                          }}
                        </span>
                        <span
                          v-if="fulfillmentOf(c, s.fulfillment_id)!.author"
                          class="flex items-center gap-1 text-content-300"
                        >
                          <Icon name="ph:user-duotone" class="size-3" />
                          {{ fulfillmentOf(c, s.fulfillment_id)!.author }}
                        </span>
                      </template>
                      <Button
                        v-if="!s.fulfillment_id"
                        v-tooltip.left="
                          isPrimaryDeadline(c, s)
                            ? undefined
                            : t(
                                'editor.operation.permit.conditions.markFulfilled',
                              )
                        "
                        severity="success"
                        text
                        size="small"
                        class="ml-auto"
                        :label="
                          isPrimaryDeadline(c, s)
                            ? t(
                                'editor.operation.permit.conditions.markFulfilled',
                              )
                            : undefined
                        "
                        :aria-label="
                          t('editor.operation.permit.conditions.markFulfilled')
                        "
                        @click="openFulfill(c, s.due_date)"
                      >
                        <template #icon>
                          <Icon name="ph:check-circle-duotone" />
                        </template>
                      </Button>
                      <Button
                        v-else
                        v-tooltip.left="
                          t('editor.operation.permit.conditions.undoFulfilled')
                        "
                        severity="secondary"
                        text
                        size="small"
                        class="ml-auto"
                        :aria-label="
                          t('editor.operation.permit.conditions.undoFulfilled')
                        "
                        @click="
                          removeFulfillment(permit.id, c.id, s.fulfillment_id)
                        "
                      >
                        <template #icon>
                          <Icon name="ph:arrow-counter-clockwise" />
                        </template>
                      </Button>
                    </div>
                    <template v-if="fulfillmentOf(c, s.fulfillment_id)">
                      <p
                        v-if="fulfillmentOf(c, s.fulfillment_id)!.description"
                        class="m-0 text-xs text-content-200 whitespace-pre-line sm:pl-26"
                      >
                        {{ fulfillmentOf(c, s.fulfillment_id)!.description }}
                      </p>
                      <span
                        v-if="evidence(fulfillmentOf(c, s.fulfillment_id)!)"
                        class="flex items-center gap-1.5 text-[11px] text-content-400 sm:pl-26"
                      >
                        <Icon name="ph:link-duotone" class="size-3.5" />
                        {{ evidence(fulfillmentOf(c, s.fulfillment_id)!) }}
                      </span>
                      <div class="sm:pl-26">
                        <AttachmentField
                          :model-value="
                            fulfillmentOf(c, s.fulfillment_id)!.attachments
                          "
                          readonly
                        />
                      </div>
                    </template>
                  </li>
                </ul>
                <Button
                  v-if="canFulfillUndated(c)"
                  severity="success"
                  text
                  size="small"
                  class="self-start"
                  :label="t('editor.operation.permit.conditions.markFulfilled')"
                  @click="openFulfill(c)"
                >
                  <template #icon>
                    <Icon name="ph:check-circle-duotone" />
                  </template>
                </Button>
              </div>
            </section>
          </div>
        </TabPanel>
        <TabPanel value="history">
          <div class="py-4">
            <section class="flex flex-col gap-3">
              <p v-if="!timeline.length" class="m-0 text-xs text-content-400">
                {{ t('editor.operation.permit.view.timelineEmpty') }}
              </p>
              <Timeline
                v-else
                :value="timeline"
                :pt="{ eventOpposite: { class: 'hidden' } }"
              >
                <template #marker="{ item }">
                  <span
                    class="flex size-7 items-center justify-center rounded-full border border-surface-200 bg-surface-0"
                  >
                    <Icon
                      :name="
                        item.kind === 'history'
                          ? historyIcon(item.entry.type)
                          : 'ph:check-circle-duotone'
                      "
                      class="size-4"
                      :class="
                        item.kind === 'fulfillment'
                          ? 'text-success-500'
                          : isHistoryOverdue(
                                item.entry.due_date,
                                item.entry.done,
                              )
                            ? 'text-warning-500'
                            : 'text-content-300'
                      "
                    />
                  </span>
                </template>
                <template #content="{ item }">
                  <div class="flex flex-col gap-1 pb-4">
                    <div class="flex flex-wrap items-center gap-2 text-xs">
                      <span class="font-mono text-content-300">
                        {{ formatCalendarDate(item.date) }}
                      </span>
                      <template v-if="item.kind === 'history'">
                        <span v-if="item.entry.type" class="text-content-400">
                          {{
                            resolvePermitHistoryTypeLabel(item.entry.type, t)
                          }}
                        </span>
                        <Tag
                          v-if="item.entry.done === true"
                          :value="t('editor.operation.permit.history.done')"
                          severity="success"
                          class="text-[10px]"
                        />
                        <Tag
                          v-else-if="item.entry.due_date"
                          :value="
                            t('editor.operation.permit.history.dueOn', {
                              date: formatCalendarDate(item.entry.due_date),
                            })
                          "
                          :severity="
                            isHistoryOverdue(
                              item.entry.due_date,
                              item.entry.done,
                            )
                              ? 'warn'
                              : 'info'
                          "
                          class="text-[10px]"
                        />
                      </template>
                      <template v-else>
                        <span class="text-content-400">
                          {{
                            t('editor.operation.permit.view.conditionFulfilled')
                          }}
                        </span>
                        <span
                          v-if="item.fulfillment.due_date"
                          class="font-mono text-content-400"
                        >
                          · {{ t('editor.operation.permit.fulfill.deadline') }}
                          {{ formatCalendarDate(item.fulfillment.due_date) }}
                        </span>
                      </template>
                    </div>
                    <span class="text-sm text-content-0 whitespace-pre-line">
                      {{
                        item.kind === 'history'
                          ? item.entry.description
                          : item.fulfillment.description ||
                            item.condition.description
                      }}
                    </span>
                    <span
                      v-if="item.kind === 'fulfillment'"
                      class="flex flex-wrap items-center gap-x-3 text-[11px] text-content-400"
                    >
                      <span v-if="item.fulfillment.description">
                        {{ item.condition.description }}
                      </span>
                      <span
                        v-if="item.fulfillment.author"
                        class="flex items-center gap-1"
                      >
                        <Icon name="ph:user-duotone" class="size-3" />
                        {{ item.fulfillment.author }}
                      </span>
                    </span>
                    <AttachmentField
                      :model-value="
                        item.kind === 'history'
                          ? item.entry.attachments
                          : item.fulfillment.attachments
                      "
                      readonly
                    />
                  </div>
                </template>
              </Timeline>
            </section>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>

    <template #footer>
      <Button
        :label="t('editor.operation.permit.view.close')"
        severity="secondary"
        text
        @click="visible = false"
      />
      <Button
        :label="t('editor.edit')"
        @click="emit('edit', permitId, activeTab)"
      >
        <template #icon>
          <Icon name="ph:pencil-simple-duotone" />
        </template>
      </Button>
    </template>
  </Dialog>

  <ConditionFulfillDialog
    v-if="permit && fulfillVisible && fulfillTarget"
    v-model:visible="fulfillVisible"
    :permit="permit"
    :condition="fulfillTarget.condition"
    :due-date="fulfillTarget.dueDate"
    @save="addFulfillment(permit!.id, fulfillTarget!.condition.id, $event)"
  />
</template>

<style scoped>
.view-heading {
  margin: 0;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--color-surface-200);
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 600;
  color: var(--color-content-0);
}

.view-label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-content-400);
}

.view-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.view-table th {
  text-align: left;
  padding: 4px 8px;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-content-400);
  border-bottom: 1px solid var(--color-surface-200);
}

.view-table td {
  padding: 4px 8px;
  border-bottom: 1px solid var(--color-surface-100);
}

.link-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.link-btn:hover:not(:disabled) {
  color: var(--color-primary-500);
  text-decoration: underline;
}

.link-btn:disabled {
  cursor: default;
}
</style>
