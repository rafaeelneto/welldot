<script setup lang="ts">
/**
 * Small uppercase label above (or beside) a form control, with an optional
 * info popover. Text props are `LanguageTextInput`; an omitted `label`
 * renders the control alone.
 */
import type { LanguageTextInput } from '@welldot/core';
import { computed } from 'vue';
import { useWellText } from '../composables/useWellText';
import WellInfoPopover from './WellInfoPopover.vue';

const props = defineProps<{
  label?: LanguageTextInput;
  orientation?: 'vertical' | 'horizontal';
  info?: LanguageTextInput;
  /** Accessible label of the info trigger. */
  infoLabel?: LanguageTextInput;
}>();

const slots = defineSlots<{
  default(): unknown;
  info?(): unknown;
}>();

const text = useWellText();
const labelText = computed(() => text(props.label));
const hasInfo = computed(() => !!text(props.info) || !!slots.info);
</script>

<template>
  <div
    class="flex flex-col gap-1"
    :class="orientation === 'horizontal' ? 'sm:flex-row sm:items-center' : ''"
  >
    <div v-if="labelText" class="flex items-center gap-1">
      <label
        class="text-[10px] font-semibold tracking-widest uppercase text-content-400"
      >
        {{ labelText }}
      </label>
      <WellInfoPopover v-if="hasInfo" :info="info" :label="infoLabel">
        <template v-if="slots.info" #default>
          <slot name="info" />
        </template>
      </WellInfoPopover>
    </div>
    <slot />
  </div>
</template>
