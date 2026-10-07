<script setup lang="ts">
/**
 * Multi-value picker: selected values render as removable chips above a
 * single Select; picking an option appends it and clears the Select. Values
 * absent from `options` (e.g. unresolved ids) still show, as their raw value.
 */
const model = defineModel<string[]>({ default: () => [] });

const props = defineProps<{
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  /** Accessible label for each chip's remove button. */
  removeLabel?: string;
  filter?: boolean;
}>();

const selected = computed(() =>
  model.value.map(value => ({
    value,
    label: props.options.find(o => o.value === value)?.label ?? value,
  })),
);

const available = computed(() =>
  props.options.filter(o => !model.value.includes(o.value)),
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
      <AppChip
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
      :placeholder="props.placeholder"
      :filter="props.filter"
      :disabled="!available.length"
      class="w-full"
      @update:model-value="add"
    />
  </div>
</template>
