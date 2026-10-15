<script setup lang="ts">
/**
 * Info icon that opens a popover on hover, focus or click. The popover body is
 * `info` (resolved for the configured locale) or the default slot.
 *
 * The trigger is a swappable part (`components.trigger`, contract
 * `WellInfoTriggerProps`); it gets the resolved `label` and the size, and
 * must let the hover/focus/click listeners fall through to its root.
 */
import type { LanguageTextInput } from '@welldot/core';
import Popover from 'primevue/popover';
import { computed, onBeforeUnmount, ref, type Component } from 'vue';
import { useWellText } from '../composables/useWellText';
import { resolvePart, useWelldotConfig } from '../config';
import WellInfoTrigger from './parts/WellInfoTrigger.vue';

const props = withDefaults(
  defineProps<{
    info?: LanguageTextInput;
    /** Accessible label of the trigger. Not rendered when omitted. */
    label?: LanguageTextInput;
    size?: 'sm' | 'md';
    components?: { trigger?: Component };
  }>(),
  { info: undefined, label: undefined, size: 'sm', components: undefined },
);

defineSlots<{
  default?(): unknown;
}>();

const config = useWelldotConfig();
const text = useWellText();
const popover = ref<InstanceType<typeof Popover> | null>(null);

const trigger = computed(() =>
  resolvePart('trigger', props.components?.trigger, WellInfoTrigger, config),
);

// Small delay so the pointer can travel from the icon into the popover
const HIDE_DELAY = 150;
let hideTimer: ReturnType<typeof setTimeout> | undefined;

function cancelHide() {
  clearTimeout(hideTimer);
}

function show(event: Event) {
  cancelHide();
  popover.value?.show(event, (event.currentTarget as HTMLElement) ?? undefined);
}

function scheduleHide() {
  cancelHide();
  hideTimer = setTimeout(() => popover.value?.hide(), HIDE_DELAY);
}

onBeforeUnmount(cancelHide);
</script>

<template>
  <component
    :is="trigger"
    :label="text(props.label)"
    :size="props.size"
    @mouseenter="show"
    @mouseleave="scheduleHide"
    @focus="show"
    @blur="scheduleHide"
    @click="show"
  />

  <Popover
    ref="popover"
    :pt="{ root: { onMouseenter: cancelHide, onMouseleave: scheduleHide } }"
  >
    <div class="max-w-sm text-sm text-content-300">
      <slot>
        <p class="m-0">
          {{ text(props.info) }}
        </p>
      </slot>
    </div>
  </Popover>
</template>
