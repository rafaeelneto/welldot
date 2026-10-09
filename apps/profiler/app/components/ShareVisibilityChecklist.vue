<script setup lang="ts">
import { SECTION_KEYS, VISIBILITY_TREE } from '@welldot/core';
import type { TreeNode } from 'primevue/treenode';
import {
  fromSelectionKeys,
  toSelectionKeys,
  type TreeSelectionKeys,
} from '~/utils/visibility';

const { t } = useI18n();
const shareVisibilityStore = useShareVisibilityStore();

/** Sections with their redactable fields as children (`history` and `water_quality` are single toggles). */
const nodes = computed<TreeNode[]>(() =>
  SECTION_KEYS.map(section => ({
    key: section,
    label: t(`editor.shareVisibility.sections.${section}`),
    children: VISIBILITY_TREE[section].map(field => ({
      key: field,
      label: t(`editor.shareVisibility.fields.${field}`),
    })),
  })),
);

const selectionKeys = computed(() =>
  toSelectionKeys(shareVisibilityStore.visibility),
);

// Open the sections that are partly hidden, so the hidden fields show up.
const expandedKeys = ref<Record<string, boolean>>(
  Object.fromEntries(
    Object.entries(selectionKeys.value)
      .filter(([, state]) => state.partialChecked)
      .map(([key]) => [key, true]),
  ),
);

/** Hiding everything is refused: the tree keeps showing the store state. */
function onSelectionChange(keys: TreeSelectionKeys | undefined): void {
  shareVisibilityStore.setVisibility(fromSelectionKeys(keys));
}
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <Tree
      :value="nodes"
      selection-mode="checkbox"
      :selection-keys="selectionKeys"
      :expanded-keys="expandedKeys"
      class="w-full !p-0 !bg-transparent text-sm"
      @update:selection-keys="onSelectionChange"
      @update:expanded-keys="keys => (expandedKeys = keys)"
    />
    <p
      v-if="shareVisibilityStore.visibleCount === 1"
      class="text-xs text-content-400"
    >
      {{ t('editor.shareVisibility.lastVisibleHint') }}
    </p>
  </div>
</template>
