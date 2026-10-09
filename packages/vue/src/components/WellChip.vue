<script setup lang="ts">
/**
 * Compact pill chip — the single chip style (filters, selected values).
 *
 * - Default: renders a `<button>`; listen to `@click` for toggle/filter use.
 * - `removable`: renders a static `<span>` with a trailing × button that
 *   emits `remove` (used for displaying selected values).
 *
 * `icon` is a component, or a string name rendered through the
 * `createWelldot({ components: { icon } })` part (`WellIconProps`); without
 * that part a string icon is ignored.
 */
import type { LanguageTextInput } from '@welldot/core';
import { computed, markRaw, toRaw, type Component } from 'vue';
import IconX from '~icons/ph/x';
import { useWellText } from '../composables/useWellText';
import { useWelldotConfig } from '../config';

const props = defineProps<{
  label?: LanguageTextInput;
  /** Component, or an icon name rendered by the configured `icon` part. */
  icon?: string | Component;
  /** Highlighted/selected state (primary tint). */
  active?: boolean;
  removable?: boolean;
  /** Accessible label for the remove button. */
  removeLabel?: LanguageTextInput;
}>();

defineEmits<{
  remove: [];
}>();

const config = useWelldotConfig();
const text = useWellText();

const iconComponent = computed<Component | undefined>(() =>
  typeof props.icon === 'string'
    ? config.components.icon
    : props.icon && markRaw(toRaw(props.icon)),
);
const iconName = computed(() =>
  typeof props.icon === 'string' ? props.icon : undefined,
);
</script>

<template>
  <component
    :is="props.removable ? 'span' : 'button'"
    :type="props.removable ? undefined : 'button'"
    class="app-chip"
    :class="{ active: props.active, 'app-chip--static': props.removable }"
  >
    <component
      :is="iconComponent"
      v-if="iconComponent"
      v-bind="iconName ? { name: iconName } : {}"
      class="size-3.5"
    />
    <slot>{{ text(props.label) }}</slot>
    <button
      v-if="props.removable"
      type="button"
      class="app-chip-remove"
      :aria-label="text(props.removeLabel)"
      @click.stop="$emit('remove')"
    >
      <IconX class="size-3" />
    </button>
  </component>
</template>

<style scoped>
.app-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid var(--color-surface-200);
  background: var(--color-surface-50);
  color: var(--color-content-300);
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 500;
  line-height: 1.4;
  cursor: pointer;
  transition:
    background 120ms ease,
    color 120ms ease,
    border-color 120ms ease;
}

.app-chip:not(.app-chip--static, .active):hover {
  background: var(--color-surface-100);
  color: var(--color-content-100);
  border-color: var(--color-surface-300);
}

.app-chip.active {
  background: var(--color-primary-50);
  color: var(--color-primary-600);
  border-color: var(--color-primary-200);
}

.app-chip.active:not(.app-chip--static):hover {
  background: var(--color-primary-100);
  color: var(--color-primary-700);
  border-color: var(--color-primary-300);
}

.app-chip--static {
  cursor: default;
  padding-right: 6px;
}

.app-chip-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 1px;
  padding: 2px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: inherit;
  opacity: 0.6;
  cursor: pointer;
  transition:
    opacity 120ms ease,
    background 120ms ease;
}

.app-chip-remove:hover {
  opacity: 1;
  background: color-mix(in srgb, currentColor 12%, transparent);
}

.app-chip:focus-visible,
.app-chip-remove:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px
    color-mix(in srgb, var(--color-primary-500) 25%, transparent);
}
</style>
