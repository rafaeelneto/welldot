<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    info?: string;
    label?: string;
    size?: 'sm' | 'md';
  }>(),
  { info: undefined, label: undefined, size: 'sm' },
);

defineSlots<{
  default?(): unknown;
}>();

const { t } = useI18n();
const popover = ref();
const trigger = ref();

// Small delay so the pointer can travel from the icon into the popover
const HIDE_DELAY = 150;
let hideTimer: ReturnType<typeof setTimeout> | undefined;

function cancelHide() {
  clearTimeout(hideTimer);
}

function show(event: Event) {
  cancelHide();
  popover.value?.show(event, trigger.value?.$el ?? event.currentTarget);
}

function scheduleHide() {
  cancelHide();
  hideTimer = setTimeout(() => popover.value?.hide(), HIDE_DELAY);
}

onBeforeUnmount(cancelHide);
</script>

<template>
  <Button
    ref="trigger"
    unstyled
    type="button"
    :aria-label="props.label ?? t('editor.fieldInfo')"
    :pt="{
      root: [
        'rounded-full flex items-center justify-center text-content-300 hover:text-content-500 transition-colors cursor-pointer',
        size === 'md' ? 'size-6 hover:bg-surface-100' : 'size-4',
      ],
    }"
    @mouseenter="show"
    @mouseleave="scheduleHide"
    @focus="show"
    @blur="scheduleHide"
    @click="show"
  >
    <template #icon>
      <Icon name="ph:info" :class="size === 'md' ? 'size-4' : 'size-3.5'" />
    </template>
  </Button>

  <Popover
    ref="popover"
    :pt="{ root: { onMouseenter: cancelHide, onMouseleave: scheduleHide } }"
  >
    <div class="max-w-sm text-sm text-content-300">
      <slot>
        <p class="m-0">{{ info }}</p>
      </slot>
    </div>
  </Popover>
</template>
