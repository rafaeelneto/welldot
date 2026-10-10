<script setup lang="ts">
/**
 * Editable Select for open fields: the options are suggestions and any typed
 * text is kept as the value. `hint` opens the overlay with a short note
 * saying so (e.g. "Suggestions — you can also type your own value").
 *
 * Every other attribute (`v-model`, `options`, `option-label`, `show-clear`,
 * `invalid`, `pt`…) and slot is forwarded to PrimeVue's `Select`.
 */
import type { LanguageTextInput } from '@welldot/core';
import Select from 'primevue/select';
import { computed } from 'vue';
import IconPencilSimpleLine from '~icons/ph/pencil-simple-line';
import { useWellText } from '../composables/useWellText';

const props = defineProps<{
  /** Note shown at the top of the overlay; omitted when not set. */
  hint?: LanguageTextInput;
}>();

defineOptions({ inheritAttrs: false });

const text = useWellText();
const hintText = computed(() => text(props.hint));
</script>

<template>
  <Select v-bind="$attrs" editable>
    <template v-if="hintText" #header>
      <div
        role="note"
        class="well-combo-select-hint flex items-center gap-1.5 px-3 pt-2 pb-1 font-display text-xs text-content-300"
      >
        <IconPencilSimpleLine class="size-3.5 shrink-0" aria-hidden="true" />
        {{ hintText }}
      </div>
    </template>
    <template v-for="(_, name) in $slots" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps ?? {}" />
    </template>
  </Select>
</template>
