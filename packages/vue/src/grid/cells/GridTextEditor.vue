<script setup lang="ts">
import InputText from 'primevue/inputtext';
import { nextTick, onMounted, ref } from 'vue';

const props = defineProps<{
  val?: unknown;
  save: (value: unknown, preventFocus?: boolean) => void;
  close: (focusNext?: boolean) => void;
}>();

defineOptions({ inheritAttrs: false });

const inputRef = ref<{ $el: HTMLInputElement } | null>(null);
// RevoGrid passes the typed key when editing starts by typing, the cell's
// current value otherwise.
const localValue = ref<string>(
  props.val === undefined || props.val === null ? '' : String(props.val),
);

onMounted(() =>
  nextTick(() => {
    const el = inputRef.value?.$el;
    if (!el) return;
    el.focus();
    const end = el.value.length;
    el.setSelectionRange(end, end);
  }),
);

function commit(preventFocus = true) {
  props.save(localValue.value, preventFocus);
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.stopPropagation();
    commit(false);
  } else if (e.key === 'Escape') {
    e.stopPropagation();
    props.close();
  }
}

function update(value: string | undefined) {
  localValue.value = value || '';
}
</script>

<template>
  <p v-show="false" class="h-0 w-0">{{ localValue }}</p>
  <InputText
    ref="inputRef"
    :pt="{
      root: 'well-cell-input',
    }"
    :model-value="localValue"
    @update:model-value="update"
    @blur="() => commit(true)"
    @keydown="onKeydown"
  />
</template>
