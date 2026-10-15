<script setup lang="ts">
/**
 * Texture editor: `WellTextureSelect` opened on mount, committing on select
 * and closing on Escape. Its overlay lives in `body`, so it carries the
 * focus guard that keeps RevoGrid from ending the edit on overlay clicks.
 */
import type { LanguageTextInput, TextureCode } from '@welldot/core';
import { nextTick, onMounted, ref } from 'vue';
import WellTextureSelect from '../../components/WellTextureSelect.vue';
import { useGridOverlayFocusGuard } from '../composables/useGridOverlayFocusGuard';

const props = defineProps<{
  val?: unknown;
  save: (value: unknown, preventFocus?: boolean) => void;
  close: (focusNext?: boolean) => void;
  placeholder?: LanguageTextInput;
  /** Label of the pending-textures toggle; hidden without it. */
  showPending?: LanguageTextInput;
}>();

defineOptions({ inheritAttrs: false });

const selectRef = ref<InstanceType<typeof WellTextureSelect> | null>(null);
const overlayFocusGuard = useGridOverlayFocusGuard();

onMounted(() => nextTick(() => selectRef.value?.show()));

function onSelect(value: unknown) {
  props.save(value);
  props.close();
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.stopPropagation();
    props.close();
  }
}
</script>

<template>
  <WellTextureSelect
    ref="selectRef"
    :model-value="(val ?? null) as TextureCode | null"
    :labels="{ placeholder, showPending }"
    append-to="body"
    :pt="{
      root: 'well-cell-select well-cell-texture-select',
      overlay: overlayFocusGuard,
    }"
    @update:model-value="onSelect"
    @keydown="onKeydown"
  />
</template>
