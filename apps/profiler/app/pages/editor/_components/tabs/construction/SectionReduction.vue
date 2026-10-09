<script setup lang="ts">
import type { Well } from '@welldot/core';
import { CONSTRUCTION_MATERIALS } from '@welldot/core';
import type { WellGridColumn } from '@welldot/vue/grid';

const { t } = useI18n();
const { vocabOptions } = useVocab();
const profileStore = useProfileStore();

// Fiberglass reducers are uncommon; the rest of the materials are offered.
const reductionTypeOptions = computed(() =>
  vocabOptions(CONSTRUCTION_MATERIALS).filter(o => o.value !== 'fiberglass'),
);

const reductionColumns = computed<WellGridColumn[]>(() => [
  {
    prop: 'from',
    label: t('editor.construction.reduction.from'),
    unitType: 'length',
    size: 130,
  },
  {
    prop: 'to',
    label: t('editor.construction.reduction.to'),
    unitType: 'length',
    size: 130,
  },
  {
    prop: 'diam_from',
    label: t('editor.construction.reduction.diamFrom'),
    unitType: 'diameter',
    size: 150,
  },
  {
    prop: 'diam_to',
    label: t('editor.construction.reduction.diamTo'),
    unitType: 'diameter',
    size: 150,
  },
  {
    prop: 'type',
    label: t('editor.construction.reduction.type'),
    info: t('editor.construction.reduction.typeInfo'),
    infoHighlight: t('editor.construction.reduction.typeFreeText'),
    type: 'combo',
    options: reductionTypeOptions.value,
    stretch: true,
    minSize: 200,
  },
]);

function addReduction() {
  profileStore.well.reduction.push({
    from: 0,
    to: 0,
    diam_from: 0,
    diam_to: 0,
    type: '',
  });
}

function deleteReduction(index: number) {
  profileStore.well.reduction.splice(index, 1);
}

function updateReduction(index: number, prop: string, value: unknown) {
  (profileStore.well.reduction[index] as Record<string, unknown>)[prop] = value;
}

function reorderReduction(from: number, to: number) {
  const items = [...profileStore.well.reduction];
  const [moved] = items.splice(from, 1);
  if (!moved) return;
  items.splice(to, 0, moved);
  profileStore.updateWell((draft: Well) => {
    draft.reduction.splice(0, draft.reduction.length, ...items);
  });
}
</script>

<template>
  <section class="flex flex-col gap-5">
    <div class="flex items-baseline justify-between">
      <h3
        class="font-serif text-[22px] font-medium tracking-[-0.015em] text-content-0 m-0"
      >
        {{ t('editor.construction.reduction.title') }}
      </h3>
      <span
        class="font-mono text-[10px] tracking-[0.08em] uppercase text-content-500"
      >
        {{ t('editor.construction.reduction.tag') }}
      </span>
    </div>
    <WellDataGrid
      :rows="[...profileStore.well.reduction]"
      :columns="reductionColumns"
      :add-label="t('editor.construction.reduction.addRow')"
      :delete-label="t('editor.deleteRow')"
      :labels="{
        showPendingTextures: t('editor.showPendingTextures'),
        columnInfo: t('editor.fieldInfo'),
      }"
      @add="addReduction"
      @delete="deleteReduction"
      @change="updateReduction"
      @reorder="reorderReduction"
    />
  </section>
</template>
