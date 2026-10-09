<script setup lang="ts">
import { parseDateDuration } from '@welldot/utils';

/**
 * Edits an ISO 8601 date duration (`P90D`, `P6M`, `P1Y`) as an amount plus a
 * unit. Years-and-months combinations (`P1Y6M`) are shown as months, which is
 * equivalent for deadline math. Durations mixing months and days cannot be
 * split into one unit and are kept as raw text.
 */
const model = defineModel<string | undefined>();

defineProps<{ placeholder?: string; invalid?: boolean }>();

type Unit = 'D' | 'W' | 'M' | 'Y';

const { t } = useI18n();

const unitOptions = computed(() =>
  (['D', 'W', 'M', 'Y'] as Unit[]).map(value => ({
    value,
    label: t(`editor.operation.permit.conditions.units.${value}`),
  })),
);

/** Splits a duration into one amount + unit, or `null` when it cannot. */
function split(
  value: string | undefined,
): { amount: number; unit: Unit } | null {
  if (!value) return null;
  const d = parseDateDuration(value);
  if (!d) return null;
  const calendar = d.years * 12 + d.months;
  const fixed = d.weeks * 7 + d.days;
  if (calendar && fixed) return null;
  if (calendar) {
    return calendar % 12 === 0
      ? { amount: calendar / 12, unit: 'Y' }
      : { amount: calendar, unit: 'M' };
  }
  if (d.weeks && !d.days) return { amount: d.weeks, unit: 'W' };
  return { amount: fixed, unit: 'D' };
}

const amount = ref<number | null>(null);
const unit = ref<Unit>('M');
const raw = ref(false);

watch(
  model,
  value => {
    const parts = split(value);
    raw.value = !!value && !parts;
    if (parts) {
      amount.value = parts.amount;
      unit.value = parts.unit;
    } else if (!value) {
      amount.value = null;
    }
  },
  { immediate: true },
);

function emitValue() {
  model.value =
    amount.value && amount.value > 0
      ? `P${amount.value}${unit.value}`
      : undefined;
}
</script>

<template>
  <InputText
    v-if="raw"
    v-model="model"
    class="w-full font-mono text-sm"
    :invalid="invalid"
  />
  <div v-else class="flex gap-2">
    <WellInputNumber
      v-model="amount"
      :min="1"
      :max-fraction-digits="0"
      :placeholder="placeholder"
      class="w-20 shrink-0"
      :invalid="invalid"
      :pt="{ pcInput: { root: 'w-full font-mono text-sm' } }"
      @update:model-value="emitValue"
    />
    <Select
      v-model="unit"
      :options="unitOptions"
      option-label="label"
      option-value="value"
      class="flex-1 min-w-0"
      @update:model-value="emitValue"
    />
  </div>
</template>
