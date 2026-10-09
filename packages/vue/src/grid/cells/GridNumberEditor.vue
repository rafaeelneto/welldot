<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue';
import WellInputNumber from '../../components/WellInputNumber.vue';

const props = defineProps<{
  val?: unknown;
  save: (value: unknown, preventFocus?: boolean) => void;
  close: (focusNext?: boolean) => void;
}>();

defineOptions({ inheritAttrs: false });

const numRef = ref<{ $el: HTMLElement } | null>(null);
const localValue = ref<number | null>(
  props.val !== undefined && props.val !== null && props.val !== ''
    ? Number(props.val)
    : null,
);

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
  props.save(localValue.value, !lastKeyWasEnter);
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

function update(value: number) {
  localValue.value = value;
  commit();
}
</script>

<template>
  <div class="contents" @keydown.capture="onKeydownCapture">
    <WellInputNumber
      ref="numRef"
      :model-value="localValue"
      :max-fraction-digits="4"
      :pt="{
        root: 'well-cell-input-number',
        pcInput: { root: 'well-cell-input well-cell-input-number text-right' },
      }"
      @update:model-value="update"
      @keydown="onKeydown"
    />
  </div>
</template>
