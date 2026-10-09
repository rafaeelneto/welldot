<script setup lang="ts">
/**
 * Multi-value picker: selected values render as removable chips above a
 * single Select; picking an option appends it and clears the Select. Values
 * absent from `options` (e.g. unresolved ids) still show, as their raw value.
 *
 * Option labels are `LanguageTextInput`, so a core `VocabEntry[]` can be
 * passed as `options` directly.
 */
import type { LanguageTextInput } from '@welldot/core';
import Select from 'primevue/select';
import { computed } from 'vue';
import { useWellText } from '../composables/useWellText';
import type { WellTagOption } from '../types';
import WellChip from './WellChip.vue';

const props = defineProps<{
  options: readonly WellTagOption[];
  placeholder?: LanguageTextInput;
  /** Accessible label for each chip's remove button. */
  removeLabel?: LanguageTextInput;
  filter?: boolean;
}>();

const model = defineModel<string[]>({ default: () => [] });

const text = useWellText();

const resolvedOptions = computed(() =>
  props.options.map(o => ({ value: o.value, label: text(o.label) ?? o.value })),
);

const selected = computed(() =>
  model.value.map(value => ({
    value,
    label: resolvedOptions.value.find(o => o.value === value)?.label ?? value,
  })),
);

const available = computed(() =>
  resolvedOptions.value.filter(o => !model.value.includes(o.value)),
);

function add(value: string | null) {
  if (value && !model.value.includes(value)) {
    model.value = [...model.value, value];
  }
}

function remove(value: string) {
  model.value = model.value.filter(v => v !== value);
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div v-if="selected.length" class="flex flex-wrap gap-2">
      <WellChip
        v-for="item in selected"
        :key="item.value"
        :label="item.label"
        removable
        :remove-label="props.removeLabel"
        @remove="remove(item.value)"
      />
    </div>
    <Select
      :model-value="null"
      :options="available"
      option-label="label"
      option-value="value"
      :placeholder="text(props.placeholder)"
      :filter="props.filter"
      :disabled="!available.length"
      class="w-full"
      @update:model-value="add"
    />
  </div>
</template>
