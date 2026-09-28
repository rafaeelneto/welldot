<script setup lang="ts">
import Popover from 'primevue/popover';
import { SketchPicker, tinycolor } from 'vue-color';
import 'vue-color/style.css';

const props = defineProps<{
  val?: unknown;
  save: (value: any, preventFocus?: boolean) => void;
  close: (focusNext?: boolean) => void;
}>();

const triggerRef = ref<HTMLElement | null>(null);
const popoverRef = ref<InstanceType<typeof Popover> | null>(null);

// vue-color echoes back the format of the value it was given (and can drift
// to HSV objects), so normalize everything to `#rrggbb` on the way in and out.
function toHex(value: unknown): string {
  const color = tinycolor(value as string);
  return color.isValid() ? color.toHexString() : '#cccccc';
}

const localValue = ref(toHex(props.val));

onMounted(() => {
  nextTick(() => {
    popoverRef.value?.show(
      { currentTarget: triggerRef.value } as unknown as Event,
      triggerRef.value,
    );
  });
  document.addEventListener('keydown', onKeydown, true);
});

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown, true);
});

function onChange(value: unknown) {
  const hex = toHex(value);
  localValue.value = hex;
  props.save(hex, true);
}

function onHide() {
  props.close();
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === 'Escape') {
    e.stopPropagation();
    popoverRef.value?.hide();
  }
}
</script>

<template>
  <div
    ref="triggerRef"
    class="well-cell-color-trigger"
    tabindex="-1"
    @keydown="onKeydown"
  >
    <span
      class="well-cell-color-swatch"
      :style="{ backgroundColor: localValue }"
    />
    <span class="well-cell-color-hex">{{ localValue }}</span>
  </div>

  <Popover
    ref="popoverRef"
    :pt="{
      content: 'p-0',
    }"
    @hide="onHide"
  >
    <div @mousedown.stop @click.stop @keydown="onKeydown">
      <SketchPicker
        :model-value="localValue"
        disable-alpha
        @update:model-value="onChange"
      />
    </div>
  </Popover>
</template>
