<script lang="ts">
// vue-color's stylesheet is imported dynamically, on the client only. A
// static `import 'vue-color/style.css'` stays in `dist/` (vue-color is
// external), so Node would fail to load `@welldot/vue/grid` during plain-Vite
// SSR unless the app set `ssr.noExternal`. Editors only mount in the browser,
// and loading at module evaluation means the CSS is there before one opens.
if (typeof window !== 'undefined') void import('vue-color/style.css');
</script>

<script setup lang="ts">
import Popover from 'primevue/popover';
import { SketchPicker, tinycolor } from 'vue-color';
import { nextTick, onMounted, onUnmounted, ref } from 'vue';

const props = defineProps<{
  val?: unknown;
  save: (value: unknown, preventFocus?: boolean) => void;
  close: (focusNext?: boolean) => void;
}>();

defineOptions({ inheritAttrs: false });

const triggerRef = ref<HTMLElement | null>(null);
const popoverRef = ref<InstanceType<typeof Popover> | null>(null);

// vue-color echoes back the format of the value it was given (and can drift
// to HSV objects), so normalize everything to `#rrggbb` on the way in and out.
function toHex(value: unknown): string {
  const color = tinycolor(value as string);
  return color.isValid() ? color.toHexString() : '#cccccc';
}

const localValue = ref(toHex(props.val));

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === 'Escape') {
    e.stopPropagation();
    popoverRef.value?.hide();
  }
}

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
