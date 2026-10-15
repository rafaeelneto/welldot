<script setup lang="ts">
/**
 * Default `WellInfoPopover` trigger: a small round icon button. Listeners
 * from the popover (`mouseenter`, `focus`, `click`, …) fall through to it.
 */
import Button from 'primevue/button';
import IconInfo from '~icons/ph/info';

defineProps<{
  label?: string;
  size: 'sm' | 'md';
}>();
</script>

<template>
  <Button
    unstyled
    type="button"
    :aria-label="label"
    :pt="{
      root: [
        'rounded-full flex items-center justify-center text-content-300 hover:text-content-500 transition-colors cursor-pointer',
        size === 'md' ? 'size-6 hover:bg-surface-100' : 'size-4',
      ],
    }"
  >
    <template #icon>
      <IconInfo :class="size === 'md' ? 'size-4' : 'size-3.5'" />
    </template>
  </Button>
</template>
