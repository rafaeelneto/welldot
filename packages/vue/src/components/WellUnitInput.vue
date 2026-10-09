<script setup lang="ts">
/**
 * Number input bound to a canonical SI value, displayed and edited in the
 * configured unit for `unitType` (or the `unit` override). Other attrs pass
 * through to `WellInputNumber`; `maxFractionDigits` defaults to 4.
 */
import { computed, useAttrs } from 'vue';
import type { WelldotUnits } from '../config';
import {
  isDisplayedValue,
  useWellUnits,
  type DisplayUnitType,
} from '../composables/useWellUnits';
import WellInputNumber from './WellInputNumber.vue';

const props = defineProps<{
  modelValue?: number | null;
  unitType: DisplayUnitType;
  /** Overrides the configured display unit for this input. */
  unit?: WelldotUnits[DisplayUnitType];
  min?: number;
  max?: number;
  step?: number;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: number | null];
}>();

defineOptions({ inheritAttrs: false });

const attrs = useAttrs();
const { toDisplay, toCanonical } = useWellUnits(
  () => props.unitType,
  () => props.unit as WelldotUnits[typeof props.unitType] | undefined,
);

const displayValue = computed(() =>
  props.modelValue != null ? toDisplay(props.modelValue) : null,
);
const displayMin = computed(() =>
  props.min != null ? toDisplay(props.min) : undefined,
);
const displayMax = computed(() =>
  props.max != null ? toDisplay(props.max) : undefined,
);
const displayStep = computed(() =>
  props.step != null ? toDisplay(props.step) : undefined,
);
const maxFractionDigits = computed(
  () =>
    (attrs['maxFractionDigits'] ?? attrs['max-fraction-digits'] ?? 4) as number,
);

function onUpdate(value: number | null | undefined) {
  // `InputNumber` emits its (rounded) text on every blur: an untouched
  // focus + blur must not rewrite the exact canonical value.
  if (
    isDisplayedValue(value, displayValue.value, Number(maxFractionDigits.value))
  )
    return;
  emit('update:modelValue', value != null ? toCanonical(value) : null);
}
</script>

<template>
  <WellInputNumber
    v-bind="attrs"
    :model-value="displayValue"
    :min="displayMin"
    :max="displayMax"
    :step="displayStep"
    :max-fraction-digits="maxFractionDigits"
    @update:model-value="onUpdate"
  />
</template>
