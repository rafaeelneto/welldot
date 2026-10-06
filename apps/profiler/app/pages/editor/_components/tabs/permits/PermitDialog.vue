<script setup lang="ts">
import type {
  Attachment,
  MonthlyGrant,
  Permit,
  PermitAdministrativeStatus,
  PermitCondition,
  PermitHistoryEntry,
  VolumeLimit,
  Well,
} from '@welldot/core';
import AppChip from '~/components/AppChip.vue';
import AttachmentField from '~/components/attachments/AttachmentField.vue';
import {
  PERMIT_ADMINISTRATIVE_STATUS_VALUES,
  PERMIT_TYPE_VALUES,
  WATER_USE_VALUES,
  permitLabel,
  resolvePermitTypeLabel,
  resolveWaterUseLabel,
} from '~/utils/permitVocab';
import ConditionEditor from './ConditionEditor.vue';
import PermitHistoryEditor from './PermitHistoryEditor.vue';

/** The permit being edited. `null` means "adding a new one". */
const model = defineModel<Permit | null>({ default: null });
const visible = defineModel<boolean>('visible', { default: false });

const props = withDefaults(
  defineProps<{
    /** Tab shown when the dialog opens. */
    initialTab?: 'grant' | 'conditions' | 'history';
  }>(),
  { initialTab: 'grant' },
);

const emit = defineEmits<{ save: [permit: Permit] }>();

const { t, locale } = useI18n();
const { flowUnit, volumeUnit } = useUnitFormat();
const profileStore = useProfileStore();

const VOLUME_PERIODS = ['daily', 'monthly', 'annual'] as const;
type VolumePeriod = (typeof VOLUME_PERIODS)[number];

type MonthRow = {
  month: number;
  enabled: boolean;
  flowRate: number | null;
  dailyOperatingTime: number | null;
  days: number | null;
};

const typeOptions = computed(() =>
  PERMIT_TYPE_VALUES.map(value => ({
    value,
    label: resolvePermitTypeLabel(value, t),
  })),
);

const statusOptions = computed(() =>
  PERMIT_ADMINISTRATIVE_STATUS_VALUES.map(value => ({
    value,
    label: t(`editor.operation.permit.status.${value}`),
  })),
);

/** Statuses of a permit that was never granted: validity and grant are unknown. */
const NOT_GRANTED: readonly PermitAdministrativeStatus[] = [
  'requested',
  'denied',
  'withdrawn',
];

// ─── Water use checkboxes ─────────────────────────────────────────────────────

/**
 * Recommended uses, plus any non-canonical value (e.g. `x-` prefixed) the
 * record was loaded with — kept listed so unchecking it can be undone.
 */
const waterUseOptions = computed(() => {
  const values = new Set<string>([
    ...WATER_USE_VALUES,
    ...(model.value?.water_use ?? []),
  ]);
  return [...values].map(value => ({
    value,
    label: resolveWaterUseLabel(value, t),
  }));
});

const selectedWaterUses = computed(() =>
  waterUseOptions.value.filter(option => form.waterUse.includes(option.value)),
);

const waterUsePopover = ref();

function removeWaterUse(value: string) {
  form.waterUse = form.waterUse.filter(v => v !== value);
}

const supersedesOptions = computed(() =>
  (profileStore.well.permits ?? [])
    .filter(p => p.id !== model.value?.id)
    .map(p => ({
      value: p.id,
      label: `${resolvePermitTypeLabel(p.type, t)} · ${permitLabel(p)}`,
    })),
);

const monthNames = computed(() => {
  const fmt = new Intl.DateTimeFormat(locale.value, { month: 'short' });
  return Array.from({ length: 12 }, (_, i) => fmt.format(new Date(2000, i, 1)));
});

/** Local copy — edits never reach the bound value until Save. */
const form = reactive({
  type: 'abstraction_permit' as string,
  authority: '',
  identifier: '',
  requestIdentifier: '',
  status: 'granted' as PermitAdministrativeStatus,
  issuedAt: null as Date | null,
  validFrom: null as Date | null,
  validUntil: null as Date | null,
  renewalRequestedAt: null as Date | null,
  waterUse: [] as string[],
  flowRate: null as number | null,
  dailyOperatingTime: null as number | null,
  volumes: { daily: null, monthly: null, annual: null } as Record<
    VolumePeriod,
    number | null
  >,
  useSchedule: false,
  schedule: [] as MonthRow[],
  conditions: [] as PermitCondition[],
  history: [] as PermitHistoryEntry[],
  supersedes: null as string | null,
  notes: '',
  attachments: [] as Attachment[],
});

const validUntilBeforeStart = computed(() => {
  const start = form.validFrom ?? form.issuedAt;
  return !!start && !!form.validUntil && form.validUntil < start;
});

const grantValid = computed(
  () =>
    !!form.type.trim() &&
    !!form.authority.trim() &&
    (!!form.identifier.trim() || !!form.requestIdentifier.trim()) &&
    !validUntilBeforeStart.value,
);
const conditionsValid = computed(() =>
  form.conditions.every(c => !!c.description.trim()),
);
const historyValid = computed(() =>
  form.history.every(h => !!h.description.trim() && !!h.date),
);
const isFormValid = computed(
  () => grantValid.value && conditionsValid.value && historyValid.value,
);

type EditTab = 'grant' | 'conditions' | 'history';
const activeTab = ref<EditTab>('grant');

const showSchedule = ref(false);

const notGranted = computed(() => NOT_GRANTED.includes(form.status));
/** Validity and grant fields, collapsed while the permit is not granted. */
const showGrant = ref(true);

// `immediate` so the dialog seeds when mounted already open (behind `v-if`).
watch(
  visible,
  open => {
    if (open) seedForm(model.value);
  },
  { immediate: true },
);

function seedForm(p: Permit | null) {
  activeTab.value = props.initialTab;
  form.type = p?.type ?? 'abstraction_permit';
  form.authority = p?.authority ?? '';
  form.identifier = p?.identifier ?? '';
  form.requestIdentifier = p?.request_identifier ?? '';
  form.status = p?.status ?? 'granted';
  form.issuedAt = fromCalendarDate(p?.issued_at);
  form.validFrom = fromCalendarDate(p?.valid_from);
  form.validUntil = fromCalendarDate(p?.valid_until);
  form.renewalRequestedAt = fromCalendarDate(p?.renewal_requested_at);
  form.waterUse = [...(p?.water_use ?? [])];
  form.flowRate = p?.flow_rate ?? null;
  form.dailyOperatingTime = p?.daily_operating_time ?? null;
  for (const period of VOLUME_PERIODS) {
    form.volumes[period] =
      p?.volume_limits?.find(v => v.period === period)?.volume ?? null;
  }
  form.useSchedule = !!p?.monthly_schedule;
  form.schedule = Array.from({ length: 12 }, (_, i) => {
    const g = p?.monthly_schedule?.find(m => m.month === i + 1);
    return {
      month: i + 1,
      enabled: !!g,
      flowRate: g?.flow_rate ?? null,
      dailyOperatingTime: g?.daily_operating_time ?? null,
      days: g?.days ?? null,
    };
  });
  form.conditions = (p?.conditions ?? []).map(c => ({ ...c }));
  form.history = (p?.history ?? []).map(h => ({
    ...h,
    ...(h.attachments && { attachments: h.attachments.map(a => ({ ...a })) }),
  }));
  form.supersedes = p?.supersedes ?? null;
  form.notes = p?.notes ?? '';
  form.attachments = (p?.attachments ?? []).map(a => ({ ...a }));
  showSchedule.value = form.useSchedule;
  showGrant.value =
    !NOT_GRANTED.includes(form.status) ||
    !!(
      p?.issued_at ||
      p?.valid_from ||
      p?.valid_until ||
      p?.flow_rate != null ||
      p?.volume_limits?.length
    );
}

watch(
  () => form.status,
  status => {
    if (!NOT_GRANTED.includes(status)) showGrant.value = true;
  },
);

// ─── Build ────────────────────────────────────────────────────────────────────

/** Drops `undefined` members so optional fields are absent, not `undefined`. */
function compact<T extends object>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as T;
}

const optional = <T,>(v: T | null): T | undefined =>
  v == null ? undefined : v;
const optionalText = (v: string | null) => v?.trim() || undefined;
const optionalDate = (d: Date | null) => (d ? toCalendarDate(d) : undefined);

/**
 * The edited permit. The bound record is spread first so fields the form
 * does not cover (e.g. `x-` members) survive the round-trip.
 */
function buildPermit(): Permit {
  const volumeLimits: VolumeLimit[] = VOLUME_PERIODS.filter(
    period => form.volumes[period] != null,
  ).map(period => ({ period, volume: form.volumes[period]! }));

  const schedule: MonthlyGrant[] = form.schedule
    .filter(row => row.enabled)
    .map(row =>
      compact<MonthlyGrant>({
        month: row.month,
        flow_rate: optional(row.flowRate),
        daily_operating_time: optional(row.dailyOperatingTime),
        days: optional(row.days),
      }),
    );

  return compact<Permit>({
    ...model.value,
    id: model.value?.id ?? crypto.randomUUID(),
    type: form.type.trim(),
    authority: form.authority.trim(),
    identifier: optionalText(form.identifier),
    request_identifier: optionalText(form.requestIdentifier),
    // `granted` is the default: written only when the record already had it.
    status:
      form.status === 'granted' && !model.value?.status
        ? undefined
        : form.status,
    issued_at: optionalDate(form.issuedAt),
    valid_from: optionalDate(form.validFrom),
    valid_until: optionalDate(form.validUntil),
    renewal_requested_at: optionalDate(form.renewalRequestedAt),
    water_use: form.waterUse.length ? [...form.waterUse] : undefined,
    flow_rate: optional(form.flowRate),
    daily_operating_time: optional(form.dailyOperatingTime),
    volume_limits: volumeLimits.length ? volumeLimits : undefined,
    monthly_schedule: form.useSchedule ? schedule : undefined,
    conditions: form.conditions.length
      ? form.conditions.map(c =>
          compact<PermitCondition>({ ...c, description: c.description.trim() }),
        )
      : undefined,
    history: form.history.length
      ? form.history.map(h =>
          compact<PermitHistoryEntry>({
            ...h,
            description: h.description.trim(),
            attachments: h.attachments?.length ? h.attachments : undefined,
          }),
        )
      : undefined,
    supersedes: optional(form.supersedes),
    notes: optionalText(form.notes),
    attachments: form.attachments.length
      ? form.attachments.map(a => ({ ...a }))
      : undefined,
  });
}

/** Live permit + well for the condition deadline preview. */
const draftPermit = computed(() => buildPermit());
const draftWell = computed<Well>(() => {
  const others = (profileStore.well.permits ?? []).filter(
    p => p.id !== draftPermit.value.id,
  );
  return { ...profileStore.well, permits: [...others, draftPermit.value] };
});

function save() {
  if (!isFormValid.value) return;
  const next = { ...buildPermit(), updated_at: new Date().toISOString() };
  model.value = next;
  emit('save', next);
  visible.value = false;
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    :header="
      model
        ? t('editor.operation.permit.edit')
        : t('editor.operation.permit.add')
    "
    :style="{ width: '100vw', maxWidth: '48rem', height: 'min(90vh, 56rem)' }"
    :breakpoints="{ '640px': '100vw' }"
    :pt="{ content: { class: 'flex flex-col min-h-0 flex-1 pb-0' } }"
  >
    <Tabs v-model:value="activeTab">
      <TabList>
        <Tab value="grant">
          <span class="flex items-center gap-1.5">
            {{ t('editor.operation.permit.view.tabs.grant') }}
            <span
              v-if="!grantValid"
              class="size-1.5 rounded-full bg-error-500"
            />
          </span>
        </Tab>
        <Tab value="conditions">
          <span class="flex items-center gap-1.5">
            {{ t('editor.operation.permit.view.tabs.conditions') }}
            <span class="font-mono text-xs text-content-400">
              {{ form.conditions.length }}
            </span>
            <span
              v-if="!conditionsValid"
              class="size-1.5 rounded-full bg-error-500"
            />
          </span>
        </Tab>
        <Tab value="history">
          <span class="flex items-center gap-1.5">
            {{ t('editor.operation.permit.view.tabs.history') }}
            <span class="font-mono text-xs text-content-400">
              {{ form.history.length }}
            </span>
            <span
              v-if="!historyValid"
              class="size-1.5 rounded-full bg-error-500"
            />
          </span>
        </Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="grant">
          <div class="flex flex-col gap-5 py-4">
            <!-- ── Identity ───────────────────────────────────────────────────── -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <LabeledField
                :label="t('editor.operation.permit.fields.type')"
                :info="t('editor.operation.permit.fields.typeInfo')"
              >
                <Select
                  v-model="form.type"
                  :options="typeOptions"
                  option-label="label"
                  option-value="value"
                  editable
                  class="w-full"
                />
              </LabeledField>
              <LabeledField
                :label="t('editor.operation.permit.fields.authority')"
                :info="t('editor.operation.permit.fields.authorityInfo')"
              >
                <InputText
                  v-model="form.authority"
                  class="w-full"
                  :invalid="!form.authority.trim()"
                />
              </LabeledField>
              <LabeledField
                :label="t('editor.operation.permit.fields.status')"
                :info="t('editor.operation.permit.fields.statusInfo')"
              >
                <Select
                  v-model="form.status"
                  :options="statusOptions"
                  option-label="label"
                  option-value="value"
                  class="w-full"
                />
              </LabeledField>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <LabeledField
                :label="t('editor.operation.permit.fields.identifier')"
                :info="t('editor.operation.permit.fields.identifierInfo')"
              >
                <InputText
                  v-model="form.identifier"
                  class="w-full font-mono text-sm"
                  :invalid="
                    !form.identifier.trim() && !form.requestIdentifier.trim()
                  "
                />
              </LabeledField>
              <LabeledField
                :label="t('editor.operation.permit.fields.requestIdentifier')"
                :info="
                  t('editor.operation.permit.fields.requestIdentifierInfo')
                "
              >
                <InputText
                  v-model="form.requestIdentifier"
                  class="w-full font-mono text-sm"
                  :invalid="
                    !form.identifier.trim() && !form.requestIdentifier.trim()
                  "
                />
              </LabeledField>
            </div>
            <Message
              v-if="!form.identifier.trim() && !form.requestIdentifier.trim()"
              severity="error"
              size="small"
              variant="simple"
            >
              {{ t('editor.operation.permit.warnings.missing_identifier') }}
            </Message>

            <!-- ── Grant (collapsible while not granted) ──────────────────────── -->
            <button
              v-if="notGranted"
              type="button"
              class="flex items-center gap-2 self-start text-xs font-medium text-content-300 hover:text-content-0 bg-transparent border-0 p-0 cursor-pointer"
              @click="showGrant = !showGrant"
            >
              <Icon
                :name="showGrant ? 'ph:caret-down' : 'ph:caret-right'"
                class="size-3"
              />
              <Icon name="ph:seal-duotone" class="size-4" />
              {{ t('editor.operation.permit.grantDetails') }}
              <span class="font-normal text-content-400">
                · {{ t('editor.operation.permit.grantDetailsInfo') }}
              </span>
            </button>

            <template v-if="showGrant">
              <!-- ── Validity ───────────────────────────────────────────────────── -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <LabeledField
                  :label="t('editor.operation.permit.fields.issuedAt')"
                >
                  <DatePicker
                    v-model="form.issuedAt"
                    date-format="dd/mm/yy"
                    show-button-bar
                    class="w-full"
                    :pt="{ pcInput: { root: 'font-mono text-sm w-full' } }"
                  />
                </LabeledField>
                <LabeledField
                  :label="t('editor.operation.permit.fields.validFrom')"
                  :info="t('editor.operation.permit.fields.validFromInfo')"
                >
                  <DatePicker
                    v-model="form.validFrom"
                    date-format="dd/mm/yy"
                    show-button-bar
                    class="w-full"
                    :pt="{ pcInput: { root: 'font-mono text-sm w-full' } }"
                  />
                </LabeledField>
                <LabeledField
                  :label="t('editor.operation.permit.fields.validUntil')"
                  :info="t('editor.operation.permit.fields.validUntilInfo')"
                >
                  <DatePicker
                    v-model="form.validUntil"
                    date-format="dd/mm/yy"
                    show-button-bar
                    class="w-full"
                    :invalid="validUntilBeforeStart"
                    :pt="{ pcInput: { root: 'font-mono text-sm w-full' } }"
                  />
                </LabeledField>
                <LabeledField
                  :label="
                    t('editor.operation.permit.fields.renewalRequestedAt')
                  "
                  :info="
                    t('editor.operation.permit.fields.renewalRequestedAtInfo')
                  "
                >
                  <DatePicker
                    v-model="form.renewalRequestedAt"
                    date-format="dd/mm/yy"
                    show-button-bar
                    class="w-full"
                    :pt="{ pcInput: { root: 'font-mono text-sm w-full' } }"
                  />
                </LabeledField>
              </div>
              <Message
                v-if="validUntilBeforeStart"
                severity="error"
                size="small"
                variant="simple"
              >
                {{
                  t(
                    'editor.operation.permit.warnings.valid_until_before_valid_from',
                  )
                }}
              </Message>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <LabeledField
                  :label="t('editor.operation.permit.fields.waterUse')"
                >
                  <div class="flex flex-wrap items-center gap-2 pt-1">
                    <AppChip
                      v-for="option in selectedWaterUses"
                      :key="option.value"
                      :label="option.label"
                      removable
                      :remove-label="
                        t('editor.operation.permit.fields.waterUseRemove')
                      "
                      @remove="removeWaterUse(option.value)"
                    />
                    <span
                      v-if="!selectedWaterUses.length"
                      class="text-sm text-content-400 italic"
                    >
                      {{ t('editor.operation.permit.fields.waterUseEmpty') }}
                    </span>
                    <Button
                      :label="
                        selectedWaterUses.length
                          ? t('editor.operation.permit.fields.waterUseEdit')
                          : t('editor.operation.permit.fields.waterUseAdd')
                      "
                      severity="secondary"
                      size="small"
                      text
                      @click="waterUsePopover?.toggle($event)"
                    >
                      <template #icon>
                        <Icon
                          :name="
                            selectedWaterUses.length
                              ? 'ph:pencil-simple'
                              : 'ph:plus'
                          "
                          class="size-3.5"
                        />
                      </template>
                    </Button>
                  </div>
                </LabeledField>
                <LabeledField
                  :label="t('editor.operation.permit.fields.supersedes')"
                  :info="t('editor.operation.permit.fields.supersedesInfo')"
                >
                  <Select
                    v-model="form.supersedes"
                    :options="supersedesOptions"
                    option-label="label"
                    option-value="value"
                    show-clear
                    :disabled="!supersedesOptions.length"
                    class="w-full"
                  />
                </LabeledField>
              </div>

              <Popover ref="waterUsePopover">
                <div class="flex flex-col gap-2.5 p-1 min-w-60">
                  <label
                    v-for="option in waterUseOptions"
                    :key="option.value"
                    class="flex items-center gap-2.5 text-sm text-content-0 cursor-pointer"
                  >
                    <Checkbox v-model="form.waterUse" :value="option.value" />
                    {{ option.label }}
                  </label>
                </div>
              </Popover>

              <!-- ── Granted abstraction ────────────────────────────────────────── -->
              <div class="grid grid-cols-2 gap-4">
                <LabeledField
                  :label="t('editor.operation.permit.fields.flowRate')"
                >
                  <UnitInput
                    v-model="form.flowRate"
                    unit-type="flow"
                    :min="0"
                    :max-fraction-digits="2"
                    :suffix="` ${flowUnit}`"
                    class="w-full"
                    :pt="{ pcInput: { root: 'w-full font-mono text-sm' } }"
                  />
                </LabeledField>
                <LabeledField
                  :label="
                    t('editor.operation.permit.fields.dailyOperatingTime')
                  "
                >
                  <WellInputNumber
                    v-model="form.dailyOperatingTime"
                    :min="0"
                    :max="24"
                    :max-fraction-digits="2"
                    suffix=" h"
                    class="w-full"
                    :pt="{ pcInput: { root: 'w-full font-mono text-sm' } }"
                  />
                </LabeledField>
              </div>

              <LabeledField
                :label="t('editor.operation.permit.fields.volumeLimits')"
                :info="t('editor.operation.permit.fields.volumeLimitsInfo')"
              >
                <div class="grid grid-cols-3 gap-3">
                  <div
                    v-for="period in VOLUME_PERIODS"
                    :key="period"
                    class="flex flex-col gap-1"
                  >
                    <span class="text-[11px] text-content-400">
                      {{
                        t(
                          `editor.operation.permit.fields.volumePeriods.${period}`,
                        )
                      }}
                    </span>
                    <UnitInput
                      v-model="form.volumes[period]"
                      unit-type="volume"
                      :min="0"
                      :max-fraction-digits="2"
                      :suffix="` ${volumeUnit}`"
                      class="w-full"
                      :pt="{ pcInput: { root: 'w-full font-mono text-sm' } }"
                    />
                  </div>
                </div>
              </LabeledField>

              <!-- ── Monthly schedule (collapsible) ─────────────────────────────── -->
              <div class="flex flex-col gap-3">
                <button
                  type="button"
                  class="flex items-center gap-2 self-start text-xs font-medium text-content-300 hover:text-content-0 bg-transparent border-0 p-0 cursor-pointer"
                  @click="showSchedule = !showSchedule"
                >
                  <Icon
                    :name="showSchedule ? 'ph:caret-down' : 'ph:caret-right'"
                    class="size-3"
                  />
                  <Icon name="ph:calendar-duotone" class="size-4" />
                  {{ t('editor.operation.permit.fields.monthlySchedule') }}
                </button>
                <template v-if="showSchedule">
                  <div class="flex items-center gap-3">
                    <ToggleSwitch v-model="form.useSchedule" />
                    <span class="text-xs text-content-400">
                      {{
                        t('editor.operation.permit.fields.monthlyScheduleInfo')
                      }}
                    </span>
                  </div>
                  <div v-if="form.useSchedule" class="flex flex-col gap-1.5">
                    <div
                      class="grid grid-cols-12 gap-2 font-mono text-[10px] tracking-[0.08em] uppercase text-content-400"
                    >
                      <span class="col-span-3">
                        {{ t('editor.operation.permit.fields.month') }}
                      </span>
                      <span class="col-span-3">
                        {{ t('editor.operation.permit.fields.flowRate') }}
                      </span>
                      <span class="col-span-3">
                        {{
                          t('editor.operation.permit.fields.dailyOperatingTime')
                        }}
                      </span>
                      <span class="col-span-3">
                        {{ t('editor.operation.permit.fields.days') }}
                      </span>
                    </div>
                    <div
                      v-for="row in form.schedule"
                      :key="row.month"
                      class="grid grid-cols-12 gap-2 items-center"
                    >
                      <label class="col-span-3 flex items-center gap-2 text-sm">
                        <Checkbox v-model="row.enabled" binary />
                        {{ monthNames[row.month - 1] }}
                      </label>
                      <UnitInput
                        v-model="row.flowRate"
                        unit-type="flow"
                        :min="0"
                        :max-fraction-digits="2"
                        :disabled="!row.enabled"
                        class="col-span-3 w-full"
                        :pt="{ pcInput: { root: 'w-full font-mono text-sm' } }"
                      />
                      <WellInputNumber
                        v-model="row.dailyOperatingTime"
                        :min="0"
                        :max="24"
                        :max-fraction-digits="2"
                        suffix=" h"
                        :disabled="!row.enabled"
                        class="col-span-3 w-full"
                        :pt="{ pcInput: { root: 'w-full font-mono text-sm' } }"
                      />
                      <WellInputNumber
                        v-model="row.days"
                        :min="0"
                        :max="31"
                        :max-fraction-digits="0"
                        :disabled="!row.enabled"
                        class="col-span-3 w-full"
                        :pt="{ pcInput: { root: 'w-full font-mono text-sm' } }"
                      />
                    </div>
                  </div>
                </template>
              </div>
            </template>

            <LabeledField :label="t('editor.operation.permit.fields.notes')">
              <Textarea v-model="form.notes" :rows="3" class="w-full text-sm" />
            </LabeledField>

            <!-- ── Attachments ────────────────────────────────────────────────── -->
            <LabeledField
              :label="t('editor.historyLog.logs.fields.attachments')"
            >
              <AttachmentField v-model="form.attachments" context="permit" />
            </LabeledField>
          </div>
        </TabPanel>
        <TabPanel value="conditions">
          <div class="py-4">
            <ConditionEditor
              v-model="form.conditions"
              :permit="draftPermit"
              :well="draftWell"
            />
          </div>
        </TabPanel>
        <TabPanel value="history">
          <div class="flex flex-col gap-3 py-4">
            <p class="m-0 text-xs text-content-400">
              {{ t('editor.operation.permit.history.info') }}
            </p>
            <PermitHistoryEditor v-model="form.history" />
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>

    <template #footer>
      <Button
        :label="t('editor.confirmClear.reject')"
        severity="secondary"
        text
        @click="visible = false"
      />
      <Button
        :label="model ? t('editor.save') : t('editor.operation.permit.add')"
        :disabled="!isFormValid"
        @click="save"
      />
    </template>
  </Dialog>
</template>
