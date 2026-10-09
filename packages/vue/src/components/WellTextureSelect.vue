<script setup lang="ts">
/**
 * Lithology texture picker: a filterable Select of texture codes with
 * thumbnails. `v-model` is the texture code.
 *
 * - `options` defaults to the FGDC catalogue (`FGDC_TEXTURES_OPTIONS`).
 * - Options flagged `pending` are hidden until the footer toggle is checked;
 *   the toggle renders only when `labels.showPending` is given.
 * - `pt` is shallow-merged over the built-in pass-through per section (two
 *   objects merge; otherwise the given value wins). Other attrs (`disabled`,
 *   `invalid`, `@keydown`, `@hide`…) pass through to the PrimeVue Select.
 * - `show()` / `hide()` are exposed to open the overlay programmatically.
 */
import {
  FGDC_TEXTURES_OPTIONS,
  type TextureCode,
  type TextureOption,
} from '@welldot/core';
import Checkbox from 'primevue/checkbox';
import Select from 'primevue/select';
import { computed, ref, useId } from 'vue';
import { useWellText } from '../composables/useWellText';
import type { WellTextureSelectLabels } from '../types';
import WellTextureThumbnail from './WellTextureThumbnail.vue';

const props = withDefaults(
  defineProps<{
    options?: readonly TextureOption[];
    labels?: WellTextureSelectLabels;
    appendTo?: string | HTMLElement;
    filter?: boolean;
    pt?: Record<string, unknown>;
  }>(),
  {
    options: () => FGDC_TEXTURES_OPTIONS,
    labels: () => ({}),
    appendTo: 'body',
    filter: true,
    pt: undefined,
  },
);

defineOptions({ inheritAttrs: false });

const model = defineModel<TextureCode | null | undefined>();

const text = useWellText();
const toggleId = useId();
const selectRef = ref<InstanceType<typeof Select> | null>(null);
const showPending = ref(false);

const showPendingLabel = computed(() => text(props.labels.showPending));

const filteredOptions = computed(() =>
  showPending.value
    ? props.options
    : props.options.filter(option => !option.pending),
);

const DEFAULT_PT: Record<string, unknown> = {
  label: 'flex items-center',
  option: 'p-1',
  overlay: { class: 'min-w-[340px]' },
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const mergedPt = computed(() => {
  const merged: Record<string, unknown> = { ...DEFAULT_PT };
  for (const [key, value] of Object.entries(props.pt ?? {})) {
    const base = merged[key];
    merged[key] =
      isPlainObject(base) && isPlainObject(value)
        ? { ...base, ...value }
        : value;
  }
  return merged;
});

defineExpose({
  show: () => selectRef.value?.show(),
  hide: () => selectRef.value?.hide(),
});
</script>

<template>
  <Select
    v-bind="$attrs"
    ref="selectRef"
    v-model="model"
    :options="filteredOptions as TextureOption[]"
    option-label="label"
    option-value="code"
    :filter="props.filter"
    :filter-fields="['label', 'code']"
    :placeholder="text(props.labels.placeholder)"
    :append-to="props.appendTo"
    :pt="mergedPt"
  >
    <template #option="{ option }: { option: TextureOption }">
      <div class="flex items-center gap-2.5 py-0.5">
        <WellTextureThumbnail :code="option.code" :size="48" />
        <div class="flex flex-col min-w-0">
          <span class="font-mono text-[13px] font-semibold leading-tight">{{
            option.code
          }}</span>
          <span class="text-[11px] opacity-65 truncate max-w-60">{{
            option.label
          }}</span>
        </div>
      </div>
    </template>
    <template #value="{ value: selectedCode, placeholder }">
      <div v-if="selectedCode != null" class="flex items-center gap-1.5">
        <WellTextureThumbnail
          :code="selectedCode as string | number"
          :size="28"
        />
        <span class="font-mono text-[11px]">{{ selectedCode }}</span>
      </div>
      <span v-else class="text-content-400 text-[11px]">{{ placeholder }}</span>
    </template>
    <template v-if="showPendingLabel" #footer>
      <div class="flex items-center gap-1 px-2 py-1">
        <Checkbox
          v-model="showPending"
          binary
          size="small"
          :input-id="toggleId"
        />
        <label
          :for="toggleId"
          class="text-[10px] text-content-400 cursor-pointer select-none"
        >
          {{ showPendingLabel }}
        </label>
      </div>
    </template>
  </Select>
</template>
