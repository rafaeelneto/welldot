<script setup lang="ts">
import type { Attachment, Permit, PermitCondition } from '@welldot/core';
import {
  getConditionDeadlineStates,
  getOverduePermitHistory,
  getPermitStartDate,
  getPermitStatus,
  getPermitWarnings,
  getSuccessorPermit,
  todayCalendarDate,
} from '@welldot/utils';
import type { ConditionDeadlineState } from '@welldot/utils';
import { useConfirm } from 'primevue/useconfirm';
import AttachmentField from '~/components/attachments/AttachmentField.vue';
import RecordCard, {
  type RecordAction,
} from '~/components/records/RecordCard.vue';
import {
  DEADLINE_STATUS_SEVERITY,
  PERMIT_STATUS_SEVERITY,
  permitLabel,
  resolveConditionCategoryLabel,
  resolvePermitTypeLabel,
  resolveWaterUseLabel,
} from '~/utils/permitVocab';
import ConditionFulfillDialog from './ConditionFulfillDialog.vue';
import PermitDialog from './PermitDialog.vue';
import PermitViewDialog from './PermitViewDialog.vue';

const { t, locale } = useI18n();
const confirm = useConfirm();
const profileStore = useProfileStore();
const { formatFlow, formatVolume } = useUnitFormat();
const { formatNumber } = useNumberFormat();

/** Local civil date the derived statuses are evaluated on. */
const today = todayCalendarDate();

// ─── Permits ──────────────────────────────────────────────────────────────────

const permits = computed<Permit[]>(() =>
  [...(profileStore.well.permits ?? [])].sort((a, b) =>
    (getPermitStartDate(b) ?? '').localeCompare(getPermitStartDate(a) ?? ''),
  ),
);

const warnings = computed(() => getPermitWarnings(profileStore.well, today));

/** Warning messages per permit id, for the card badges. */
const warningsById = computed(() => {
  const map = new Map<string, string[]>();
  for (const w of warnings.value) {
    for (const id of w.ids) {
      const list = map.get(id) ?? [];
      const msg = t(`editor.operation.permit.warnings.${w.code}`);
      if (!list.includes(msg)) list.push(msg);
      map.set(id, list);
    }
  }
  return map;
});

function status(p: Permit) {
  return getPermitStatus(profileStore.well, p, today)!;
}

/** Statuses shown dimmed: the permit no longer (or never) governs the well. */
const INACTIVE_STATUSES = [
  'superseded',
  'expired',
  'revoked',
  'denied',
  'withdrawn',
];

function permitLabelById(id: string | undefined): string {
  return permitLabel(
    profileStore.well.permits?.find(x => x.id === id),
    id ?? '',
  );
}

// ─── Read-only view ───────────────────────────────────────────────────────────

const permitView = usePermitView();
const viewVisible = computed({
  get: () =>
    !!permitView.permitId.value &&
    !!profileStore.well.permits?.some(p => p.id === permitView.permitId.value),
  set: open => {
    if (!open) permitView.close();
  },
});

function editFromView(id: string, tab: PermitDialogTab) {
  const p = profileStore.well.permits?.find(x => x.id === id);
  permitView.close();
  if (p) editPermit(p, tab);
}

// ─── Permit dialog ────────────────────────────────────────────────────────────

const permitDraft = ref<Permit | null>(null);
const permitDialogVisible = ref(false);

function addPermit() {
  permitDraft.value = null;
  permitDialogTab.value = 'grant';
  permitDialogVisible.value = true;
}

type PermitDialogTab = 'grant' | 'conditions' | 'history';
const permitDialogTab = ref<PermitDialogTab>('grant');

function editPermit(p: Permit, tab: PermitDialogTab = 'grant') {
  permitDraft.value = p;
  permitDialogTab.value = tab;
  permitDialogVisible.value = true;
}

function upsertPermit(p: Permit) {
  profileStore.updateWell(draft => {
    if (!draft.permits) draft.permits = [];
    const idx = draft.permits.findIndex(e => e.id === p.id);
    if (idx === -1) draft.permits.push(p);
    else draft.permits[idx] = p;
  });
}

function deletePermit(id: string) {
  confirm.require({
    icon: 'ph:warning-duotone',
    header: t('editor.operation.permit.deleteConfirm'),
    message: t('editor.operation.permit.deleteConfirm'),
    acceptLabel: t('editor.confirmClear.accept'),
    rejectLabel: t('editor.confirmClear.reject'),
    acceptProps: { severity: 'danger' },
    rejectProps: { text: true, severity: 'secondary' },
    defaultFocus: 'reject',
    accept: () => {
      profileStore.updateWell(draft => {
        draft.permits = draft.permits?.filter(e => e.id !== id);
        if (!draft.permits?.length) delete draft.permits;
      });
    },
  });
}

function setAttachments(id: string, list: Attachment[]) {
  profileStore.updateWell(draft => {
    assignAttachments(
      draft.permits?.find(p => p.id === id),
      list,
    );
  });
}

// ─── Conditions & fulfillment ────────────────────────────────────────────────

/**
 * Deadlines shown per condition: every overdue one, the latest fulfilled
 * ones and the next upcoming one, in date order.
 */
const VISIBLE_UPCOMING = 1;
const VISIBLE_FULFILLED = 3;

function deadlineStates(
  p: Permit,
  c: PermitCondition,
): ConditionDeadlineState[] {
  const states = getConditionDeadlineStates(profileStore.well, p, c, { today });
  const fulfilled = states
    .filter(s => s.status === 'fulfilled' || s.status === 'fulfilled_late')
    .slice(-VISIBLE_FULFILLED);
  const upcoming = states
    .filter(s => s.status === 'upcoming')
    .slice(0, VISIBLE_UPCOMING);
  return states.filter(
    s =>
      s.status === 'overdue' || fulfilled.includes(s) || upcoming.includes(s),
  );
}

function hiddenUpcoming(p: Permit, c: PermitCondition): number {
  const upcoming = getConditionDeadlineStates(profileStore.well, p, c, {
    today,
  }).filter(s => s.status === 'upcoming').length;
  return Math.max(0, upcoming - VISIBLE_UPCOMING);
}

/** An undated condition with no fulfillment yet can still be marked done. */
function canFulfillUndated(p: Permit, c: PermitCondition): boolean {
  return (
    !c.first_due &&
    !c.due_after &&
    !getConditionDeadlineStates(profileStore.well, p, c, { today }).length
  );
}

const fulfillTarget = ref<{
  permit: Permit;
  condition: PermitCondition;
  dueDate?: string;
} | null>(null);
const fulfillVisible = ref(false);

function openFulfill(
  permit: Permit,
  condition: PermitCondition,
  dueDate?: string,
) {
  fulfillTarget.value = { permit, condition, dueDate };
  fulfillVisible.value = true;
}

const { addFulfillment, removeFulfillment } = usePermitFulfillments();

// ─── Display helpers ──────────────────────────────────────────────────────────

function validity(p: Permit): string {
  const start = formatCalendarDate(getPermitStartDate(p));
  const end = p.valid_until
    ? formatCalendarDate(p.valid_until)
    : t('editor.operation.permit.noExpiry');
  return start ? `${start} → ${end}` : end;
}

function grants(p: Permit) {
  return [
    {
      label: t('editor.operation.permit.fields.flowRate'),
      value: p.flow_rate != null ? formatFlow(p.flow_rate) : null,
    },
    {
      label: t('editor.operation.permit.fields.dailyOperatingTime'),
      value:
        p.daily_operating_time != null
          ? `${formatNumber(p.daily_operating_time, { maximumFractionDigits: 2 })} h`
          : null,
    },
    ...(p.volume_limits ?? []).map(v => ({
      label: `${t('editor.operation.permit.fields.volumeLimits')} · ${t(`editor.operation.permit.fields.volumePeriods.${v.period}`)}`,
      value: formatVolume(v.volume, 0),
    })),
  ].filter(g => g.value);
}

function actions(p: Permit): RecordAction[] {
  return [
    {
      key: 'view',
      label: t('editor.operation.permit.view.open'),
      icon: 'ph:eye-duotone',
      onClick: () => permitView.open(p.id),
    },
    {
      key: 'edit',
      label: t('editor.edit'),
      ariaLabel: t('editor.operation.permit.edit'),
      icon: 'ph:pencil-simple-duotone',
      onClick: () => editPermit(p),
    },
    {
      key: 'delete',
      label: t('editor.operation.permit.deleteConfirm'),
      icon: 'ph:x-bold',
      severity: 'danger',
      onClick: () => deletePermit(p.id),
    },
  ];
}

function scheduleSummary(p: Permit): string | null {
  if (!p.monthly_schedule) return null;
  const fmt = new Intl.DateTimeFormat(locale.value, { month: 'short' });
  return (
    [...p.monthly_schedule]
      .sort((a, b) => a.month - b.month)
      .map(g => fmt.format(new Date(2000, g.month - 1, 1)))
      .join(' · ') || '—'
  );
}
</script>

<template>
  <div class="flex flex-col gap-4 p-6">
    <!-- ── Toolbar ───────────────────────────────────────────────────────── -->
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <p class="text-xs text-content-400 m-0 max-w-md">
        {{ t('editor.operation.permit.intro') }}
      </p>
      <Button
        unstyled
        class="add-entry-btn shrink-0"
        type="button"
        :label="t('editor.operation.permit.add')"
        @click="addPermit"
      >
        <template #icon>
          <Icon name="ph:plus" />
        </template>
      </Button>
    </div>

    <!-- ── Empty state ───────────────────────────────────────────────────── -->
    <div
      v-if="!permits.length"
      class="flex flex-col items-center gap-4 py-10 text-content-400"
    >
      <Icon name="ph:seal-check-duotone" class="size-12 opacity-40" />
      <p class="text-sm m-0">{{ t('editor.operation.permit.empty') }}</p>
    </div>

    <!-- ── Cards ─────────────────────────────────────────────────────────── -->
    <div v-else class="flex flex-col gap-3">
      <RecordCard
        v-for="p in permits"
        :key="p.id"
        :dimmed="INACTIVE_STATUSES.includes(status(p))"
        :date="validity(p)"
        :actions="actions(p)"
      >
        <template #tags>
          <Tag
            :value="t(`editor.operation.permit.status.${status(p)}`)"
            :severity="PERMIT_STATUS_SEVERITY[status(p)]"
            class="text-[11px]"
          />
          <span class="text-sm font-medium text-content-0">
            {{ resolvePermitTypeLabel(p.type, t) }}
          </span>
        </template>

        <!-- identity -->
        <div
          class="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-content-300"
        >
          <span>{{ p.authority }}</span>
          <span v-if="p.identifier" class="font-mono text-content-200">
            {{ p.identifier }}
          </span>
          <span
            v-if="p.request_identifier"
            class="flex items-center gap-1"
            :title="t('editor.operation.permit.fields.requestIdentifier')"
          >
            <Icon name="ph:file-text-duotone" class="size-3.5" />
            <span class="font-mono">{{ p.request_identifier }}</span>
          </span>
          <span v-if="p.supersedes" class="flex items-center gap-1">
            <Icon name="ph:arrow-bend-up-left-duotone" class="size-3.5" />
            {{
              t('editor.operation.permit.supersedes', {
                number: permitLabelById(p.supersedes),
              })
            }}
          </span>
          <span
            v-if="getSuccessorPermit(profileStore.well, p)"
            class="flex items-center gap-1"
          >
            <Icon name="ph:arrow-bend-down-right-duotone" class="size-3.5" />
            {{
              t('editor.operation.permit.supersededBy', {
                number: permitLabelById(
                  getSuccessorPermit(profileStore.well, p)?.id,
                ),
              })
            }}
          </span>
          <span v-if="p.renewal_requested_at" class="flex items-center gap-1">
            <Icon name="ph:hourglass-duotone" class="size-3.5" />
            {{ t('editor.operation.permit.fields.renewalRequestedAt') }}
            {{ formatCalendarDate(p.renewal_requested_at) }}
          </span>
        </div>

        <!-- water use -->
        <div v-if="p.water_use?.length" class="flex flex-wrap gap-1.5">
          <Tag
            v-for="use in p.water_use"
            :key="use"
            :value="resolveWaterUseLabel(use, t)"
            severity="secondary"
            class="text-[11px]"
          />
        </div>

        <!-- grants -->
        <div
          v-if="grants(p).length || scheduleSummary(p)"
          class="grid grid-cols-2 @md:grid-cols-3 gap-x-4 gap-y-2"
        >
          <div v-for="g in grants(p)" :key="g.label" class="flex flex-col">
            <span
              class="font-mono text-[10px] tracking-[0.08em] uppercase text-content-400"
            >
              {{ g.label }}
            </span>
            <span class="font-mono text-sm text-content-100">
              {{ g.value }}
            </span>
          </div>
          <div
            v-if="scheduleSummary(p)"
            class="flex flex-col col-span-2 @md:col-span-3"
          >
            <span
              class="font-mono text-[10px] tracking-[0.08em] uppercase text-content-400"
            >
              {{ t('editor.operation.permit.fields.monthlySchedule') }}
            </span>
            <span class="font-mono text-xs text-content-100">
              {{ scheduleSummary(p) }}
            </span>
          </div>
        </div>

        <!-- conditions -->
        <div v-if="p.conditions?.length" class="flex flex-col gap-2">
          <span
            class="font-mono text-[10px] tracking-[0.08em] uppercase text-content-400"
          >
            {{ t('editor.operation.permit.conditions.title') }}
          </span>
          <div
            v-for="c in p.conditions"
            :key="c.id"
            class="rounded-lg bg-surface-50 px-3 py-2 flex flex-col gap-1.5"
          >
            <div class="flex items-start gap-2">
              <span class="text-sm text-content-100 flex-1">
                {{ c.description }}
              </span>
              <span
                v-if="c.category || c.responsible"
                class="flex flex-col items-end text-[11px] text-content-400 shrink-0"
              >
                <span v-if="c.category">
                  {{ resolveConditionCategoryLabel(c.category, t) }}
                </span>
                <span v-if="c.responsible" class="flex items-center gap-1">
                  <Icon name="ph:user-duotone" class="size-3" />
                  {{ c.responsible }}
                </span>
              </span>
            </div>
            <div class="flex flex-wrap items-center gap-1.5">
              <template
                v-for="s in deadlineStates(p, c)"
                :key="s.due_date ?? s.fulfillment_id"
              >
                <Tag
                  :severity="DEADLINE_STATUS_SEVERITY[s.status]"
                  class="text-[11px] font-mono"
                >
                  <span class="flex items-center gap-1">
                    {{
                      s.due_date
                        ? formatCalendarDate(s.due_date)
                        : t('editor.operation.permit.conditions.undated')
                    }}
                    ·
                    {{
                      t(
                        `editor.operation.permit.conditions.deadlineStatus.${s.status}`,
                      )
                    }}
                    <button
                      v-if="s.fulfillment_id"
                      type="button"
                      class="bg-transparent border-0 p-0 cursor-pointer text-current"
                      :aria-label="
                        t('editor.operation.permit.conditions.undoFulfilled')
                      "
                      :title="
                        t('editor.operation.permit.conditions.undoFulfilled')
                      "
                      @click="removeFulfillment(p.id, c.id, s.fulfillment_id)"
                    >
                      <Icon name="ph:x" class="size-3" />
                    </button>
                    <button
                      v-else
                      type="button"
                      class="bg-transparent border-0 p-0 cursor-pointer text-current"
                      :aria-label="
                        t('editor.operation.permit.conditions.markFulfilled')
                      "
                      :title="
                        t('editor.operation.permit.conditions.markFulfilled')
                      "
                      @click="openFulfill(p, c, s.due_date)"
                    >
                      <Icon name="ph:check-bold" class="size-3" />
                    </button>
                  </span>
                </Tag>
              </template>
              <span
                v-if="hiddenUpcoming(p, c)"
                class="text-[11px] text-content-400"
              >
                {{
                  t('editor.operation.permit.conditions.more', {
                    count: hiddenUpcoming(p, c),
                  })
                }}
              </span>
              <Button
                v-if="canFulfillUndated(p, c)"
                severity="secondary"
                text
                size="small"
                :label="t('editor.operation.permit.conditions.markFulfilled')"
                @click="openFulfill(p, c)"
              >
                <template #icon>
                  <Icon name="ph:check-bold" />
                </template>
              </Button>
            </div>
          </div>
        </div>

        <!-- overdue administrative steps -->
        <Message
          v-if="getOverduePermitHistory(p, today).length"
          severity="warn"
          size="small"
          variant="simple"
        >
          {{
            t('editor.operation.permit.history.overdue', {
              n: getOverduePermitHistory(p, today).length,
            })
          }}
        </Message>

        <p
          v-if="p.notes"
          class="text-sm leading-relaxed whitespace-pre-line m-0 text-content-200"
        >
          {{ p.notes }}
        </p>

        <!-- warnings -->
        <Message
          v-for="msg in warningsById.get(p.id) ?? []"
          :key="msg"
          severity="warn"
          size="small"
          variant="simple"
        >
          {{ msg }}
        </Message>

        <!-- attachments -->
        <AttachmentField
          :model-value="p.attachments"
          context="permit"
          confirm-delete
          @update:model-value="setAttachments(p.id, $event)"
        />
      </RecordCard>
    </div>
  </div>

  <PermitDialog
    v-if="permitDialogVisible"
    v-model="permitDraft"
    v-model:visible="permitDialogVisible"
    :initial-tab="permitDialogTab"
    @save="upsertPermit"
  />

  <ConditionFulfillDialog
    v-if="fulfillVisible && fulfillTarget"
    v-model:visible="fulfillVisible"
    :permit="fulfillTarget.permit"
    :condition="fulfillTarget.condition"
    :due-date="fulfillTarget.dueDate"
    @save="
      addFulfillment(
        fulfillTarget!.permit.id,
        fulfillTarget!.condition.id,
        $event,
      )
    "
  />

  <PermitViewDialog
    v-if="viewVisible && permitView.permitId.value"
    v-model:visible="viewVisible"
    :permit-id="permitView.permitId.value"
    @edit="editFromView"
  />
</template>

<style scoped>
.add-entry-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 14px;
  min-height: 32px;
  border-radius: 999px;
  border: 1px dashed var(--color-surface-300);
  background: var(--color-surface-50);
  color: var(--color-content-300);
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition:
    background 120ms ease,
    color 120ms ease,
    border-color 120ms ease;
}

.add-entry-btn:hover {
  background: var(--color-surface-100);
  color: var(--color-content-0);
  border-color: var(--color-content-0);
}

.add-entry-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px
    color-mix(in srgb, var(--color-primary-500) 25%, transparent);
  border-color: var(--color-primary-500);
}
</style>
