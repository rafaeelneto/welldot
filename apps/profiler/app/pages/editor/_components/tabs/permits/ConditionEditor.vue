<script setup lang="ts">
import type { Permit, PermitCondition, Well } from '@welldot/core';
import { getConditionAnchor, getConditionDeadlines } from '@welldot/utils';
import {
  CONDITION_CATEGORY_VALUES,
  resolveConditionCategoryLabel,
} from '~/utils/permitVocab';
import DurationInput from './DurationInput.vue';

/**
 * Inline list editor for a permit's `conditions`, used inside the permit
 * dialog. Rows are edited in place on the dialog's local copy; the preview
 * runs the normative deadline generation against the permit being edited.
 */
const conditions = defineModel<PermitCondition[]>({ required: true });

const props = defineProps<{
  /** The permit as currently edited — start date and validity drive the preview. */
  permit: Permit;
  /** The well with `permit` in place, so succession is taken into account. */
  well: Well;
}>();

const { t } = useI18n();

type DeadlineMode = 'none' | 'fixed' | 'relative';

const categoryOptions = computed(() =>
  CONDITION_CATEGORY_VALUES.map(value => ({
    value,
    label: resolveConditionCategoryLabel(value, t),
  })),
);
const modeOptions = computed(() =>
  (['none', 'fixed', 'relative'] as DeadlineMode[]).map(value => ({
    value,
    label: t(`editor.operation.permit.conditions.deadlineModes.${value}`),
  })),
);

function modeOf(c: PermitCondition): DeadlineMode {
  if (c.first_due) return 'fixed';
  if (c.due_after) return 'relative';
  return 'none';
}

function setMode(c: PermitCondition, mode: DeadlineMode) {
  if (mode !== 'fixed') delete c.first_due;
  if (mode !== 'relative') delete c.due_after;
  if (mode === 'fixed' && !c.first_due)
    c.first_due = toCalendarDate(new Date());
  if (mode === 'relative' && !c.due_after) c.due_after = 'P90D';
  if (mode === 'none') {
    delete c.recurrence;
    delete c.last_due;
    delete c.occurrences;
  }
}

function setDate(
  c: PermitCondition,
  key: 'first_due' | 'last_due',
  d: Date | null,
) {
  if (d) c[key] = toCalendarDate(d);
  else delete c[key];
}

function setRecurrence(c: PermitCondition, value: string | undefined) {
  if (value) {
    c.recurrence = value;
  } else {
    delete c.recurrence;
    delete c.last_due;
    delete c.occurrences;
  }
}

function setOccurrences(c: PermitCondition, value: number | null) {
  if (value) c.occurrences = value;
  else delete c.occurrences;
}

function setResponsible(c: PermitCondition, value: string | undefined) {
  if (value?.trim()) c.responsible = value;
  else delete c.responsible;
}

function setCategory(c: PermitCondition, value: string | null) {
  if (value?.trim()) c.category = value.trim();
  else delete c.category;
}

function add() {
  conditions.value = [
    ...conditions.value,
    { id: crypto.randomUUID(), description: '' },
  ];
}

function remove(id: string) {
  conditions.value = conditions.value.filter(c => c.id !== id);
}

const PREVIEW_COUNT = 3;

/** First generated deadlines, or a hint when the condition cannot resolve. */
function preview(c: PermitCondition): {
  dates: string[];
  more: number;
  hint?: string;
} {
  if (modeOf(c) === 'none') {
    return {
      dates: [],
      more: 0,
      hint: t('editor.operation.permit.conditions.undated'),
    };
  }
  if (!getConditionAnchor(props.permit, c)) {
    return {
      dates: [],
      more: 0,
      hint: t('editor.operation.permit.conditions.noStartDate'),
    };
  }
  const all = getConditionDeadlines(props.well, props.permit, c);
  if (!all.length) {
    return {
      dates: [],
      more: 0,
      hint: t('editor.operation.permit.conditions.previewNone'),
    };
  }
  return {
    dates: all.slice(0, PREVIEW_COUNT),
    more: Math.max(0, all.length - PREVIEW_COUNT),
  };
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <p v-if="!conditions.length" class="text-xs text-content-400 m-0">
      {{ t('editor.operation.permit.conditions.empty') }}
    </p>

    <div
      v-for="c in conditions"
      :key="c.id"
      class="rounded-lg border border-surface-200/70 bg-surface-50 p-3 flex flex-col gap-3"
    >
      <div class="flex items-start gap-2">
        <LabeledField
          class="flex-1"
          :label="t('editor.operation.permit.conditions.description')"
          :info="t('editor.operation.permit.conditions.descriptionInfo')"
        >
          <Textarea
            v-model="c.description"
            :rows="2"
            auto-resize
            class="w-full text-sm"
            :invalid="!c.description.trim()"
          />
        </LabeledField>
        <Button
          severity="danger"
          text
          size="small"
          class="mt-5"
          :aria-label="t('editor.operation.permit.conditions.remove')"
          @click="remove(c.id)"
        >
          <template #icon>
            <Icon name="ph:x-bold" />
          </template>
        </Button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <LabeledField :label="t('editor.operation.permit.conditions.category')">
          <Select
            :model-value="c.category ?? null"
            :options="categoryOptions"
            option-label="label"
            option-value="value"
            editable
            show-clear
            class="w-full"
            @update:model-value="setCategory(c, $event)"
          />
        </LabeledField>
        <LabeledField
          :label="t('editor.operation.permit.conditions.responsible')"
          :info="t('editor.operation.permit.conditions.responsibleInfo')"
        >
          <InputText
            :model-value="c.responsible ?? ''"
            class="w-full"
            @update:model-value="setResponsible(c, $event)"
          />
        </LabeledField>
        <LabeledField
          class="sm:col-span-2"
          :label="t('editor.operation.permit.conditions.deadline')"
        >
          <SelectButton
            :model-value="modeOf(c)"
            :options="modeOptions"
            option-label="label"
            option-value="value"
            :allow-empty="false"
            size="small"
            @update:model-value="setMode(c, $event)"
          />
        </LabeledField>
      </div>

      <div
        v-if="modeOf(c) !== 'none'"
        class="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        <LabeledField
          v-if="modeOf(c) === 'fixed'"
          :label="t('editor.operation.permit.conditions.firstDue')"
        >
          <DatePicker
            :model-value="fromCalendarDate(c.first_due)"
            date-format="dd/mm/yy"
            class="w-full"
            :pt="{ pcInput: { root: 'font-mono text-sm w-full' } }"
            @update:model-value="setDate(c, 'first_due', $event as Date | null)"
          />
        </LabeledField>
        <LabeledField
          v-else
          :label="t('editor.operation.permit.conditions.dueAfter')"
        >
          <DurationInput v-model="c.due_after" :invalid="!c.due_after" />
        </LabeledField>

        <LabeledField
          :label="t('editor.operation.permit.conditions.recurrence')"
        >
          <DurationInput
            :model-value="c.recurrence"
            :placeholder="
              t('editor.operation.permit.conditions.recurrenceNone')
            "
            @update:model-value="setRecurrence(c, $event)"
          />
        </LabeledField>

        <template v-if="c.recurrence">
          <LabeledField
            :label="t('editor.operation.permit.conditions.lastDue')"
          >
            <DatePicker
              :model-value="fromCalendarDate(c.last_due)"
              date-format="dd/mm/yy"
              show-button-bar
              class="w-full"
              :pt="{ pcInput: { root: 'font-mono text-sm w-full' } }"
              @update:model-value="
                setDate(c, 'last_due', $event as Date | null)
              "
            />
          </LabeledField>
          <LabeledField
            :label="t('editor.operation.permit.conditions.occurrences')"
          >
            <WellInputNumber
              :model-value="c.occurrences ?? null"
              :min="1"
              :max-fraction-digits="0"
              class="w-full"
              :pt="{ pcInput: { root: 'w-full font-mono text-sm' } }"
              @update:model-value="setOccurrences(c, $event)"
            />
          </LabeledField>
        </template>
      </div>

      <!-- deadline preview -->
      <div class="flex items-center flex-wrap gap-1.5 text-xs text-content-400">
        <Icon name="ph:calendar-dots-duotone" class="size-4" />
        <span>{{ t('editor.operation.permit.conditions.preview') }}:</span>
        <span v-if="preview(c).hint">{{ preview(c).hint }}</span>
        <span
          v-for="d in preview(c).dates"
          :key="d"
          class="font-mono text-content-200"
        >
          {{ formatCalendarDate(d) }}
        </span>
        <span v-if="preview(c).more">
          {{
            t('editor.operation.permit.conditions.more', {
              count: preview(c).more,
            })
          }}
        </span>
      </div>
    </div>

    <Button
      severity="secondary"
      text
      size="small"
      class="self-start"
      :label="t('editor.operation.permit.conditions.add')"
      @click="add"
    >
      <template #icon>
        <Icon name="ph:plus" />
      </template>
    </Button>
  </div>
</template>
