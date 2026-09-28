<script setup lang="ts">
defineProps<{
  /** Formatted "1 : N" engineering scale ratio to display. */
  scaleLabel: string;
  /** True when there's no well data to render — disables every control. */
  disabled: boolean;
}>();

defineEmits<{
  /** Parent should call `wellRenderer.zoomBy(step)`. */
  'zoom-in': [];
  /** Parent should call `wellRenderer.zoomBy(1 / step)`. */
  'zoom-out': [];
  /** Parent should call `wellRenderer.resetZoom()`. */
  fit: [];
  /** Parent should tear down and rebuild the renderer, then redraw. */
  reload: [];
}>();

const { t } = useI18n();

const buttonPt =
  'size-6 rounded-full flex items-center justify-center text-content-600 hover:text-content-900 hover:bg-surface-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-content-600 disabled:hover:bg-transparent';
</script>

<template>
  <div
    class="flex items-center justify-center gap-0.5 py-1 border-t border-surface-200/60"
  >
    <Button
      unstyled
      :disabled="disabled"
      :aria-label="t('editor.zoom.in')"
      :pt="{ root: buttonPt }"
      @click="$emit('zoom-in')"
    >
      <template #icon>
        <Icon name="ph:plus" class="size-3" />
      </template>
    </Button>
    <Button
      unstyled
      :disabled="disabled"
      :aria-label="t('editor.zoom.out')"
      :pt="{ root: buttonPt }"
      @click="$emit('zoom-out')"
    >
      <template #icon>
        <Icon name="ph:minus" class="size-3" />
      </template>
    </Button>
    <Button
      :label="t('editor.zoom.fit')"
      unstyled
      :disabled="disabled"
      :pt="{
        root: 'px-2.5 py-0.5 rounded-full bg-surface-100 text-content-600 text-[10px] font-semibold ml-0.5 transition-colors hover:bg-surface-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
      }"
      @click="$emit('fit')"
    />
    <span class="font-mono text-[10px] text-content-400 px-2 tabular-nums">{{
      scaleLabel
    }}</span>
    <Button
      v-tooltip.top="t('editor.canvas.reload')"
      unstyled
      :disabled="disabled"
      :aria-label="t('editor.canvas.reload')"
      :pt="{ root: buttonPt }"
      @click="$emit('reload')"
    >
      <template #icon>
        <Icon name="ph:arrow-clockwise" class="size-3" />
      </template>
    </Button>
  </div>
</template>
