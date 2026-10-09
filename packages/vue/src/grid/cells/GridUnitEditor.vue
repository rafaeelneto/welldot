<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue';
import WellInputNumber from '../../components/WellInputNumber.vue';
import {
  isDisplayedValue,
  useWellUnits,
  type DisplayUnitType,
} from '../../composables/useWellUnits';

const props = defineProps<{
  val?: unknown;
  save: (value: unknown, preventFocus?: boolean) => void;
  close: (focusNext?: boolean) => void;
  unitType: DisplayUnitType;
}>();

defineOptions({ inheritAttrs: false });

const { toDisplay, toCanonical } = useWellUnits(() => props.unitType);

/** Matches the `max-fraction-digits` of the input below. */
const MAX_FRACTION_DIGITS = 4;

const numRef = ref<{ $el: HTMLElement } | null>(null);

const raw =
  props.val !== undefined && props.val !== null && props.val !== ''
    ? Number(props.val)
    : null;

/** Display value the editor opened with (null for an empty cell). */
const initialDisplay = raw != null && !isNaN(raw) ? toDisplay(raw) : null;
const localValue = ref<number | null>(initialDisplay);

onMounted(() =>
  nextTick(() => {
    const el = numRef.value?.$el;
    (el?.querySelector('input') as HTMLInputElement | null)?.focus();
  }),
);

let lastKeyWasEnter = false;

function onKeydownCapture(e: KeyboardEvent) {
  lastKeyWasEnter = e.key === 'Enter';
}

function commit() {
  if (localValue.value === null) return;
  // `InputNumber` emits its rounded text on blur/Enter: an untouched edit
  // closes without saving, so the exact canonical value is kept.
  if (isDisplayedValue(localValue.value, initialDisplay, MAX_FRACTION_DIGITS)) {
    props.close(lastKeyWasEnter);
    return;
  }
  props.save(toCanonical(localValue.value), !lastKeyWasEnter);
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.stopPropagation();
    commit();
  } else if (e.key === 'Escape') {
    e.stopPropagation();
    props.close();
  }
}

function update(value: number | null) {
  localValue.value = value;
  commit();
}
</script>

<template>
  <div class="contents" @keydown.capture="onKeydownCapture">
    <WellInputNumber
      ref="numRef"
      :model-value="localValue"
      :max-fraction-digits="MAX_FRACTION_DIGITS"
      :pt="{
        root: 'well-cell-input-number',
        pcInput: { root: 'well-cell-input well-cell-input-number text-right' },
      }"
      @update:model-value="update"
      @keydown="onKeydown"
    />
  </div>
</template>
