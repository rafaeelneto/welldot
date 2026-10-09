<script setup lang="ts">
import type { Well } from '@welldot/core';
import { CONSTRUCTION_MATERIALS } from '@welldot/core';
import type { WellGridColumn } from '@welldot/vue/grid';

const { t } = useI18n();
const { vocabOptions } = useVocab();
const profileStore = useProfileStore();

const wellCaseTypeOptions = computed(() =>
  vocabOptions(CONSTRUCTION_MATERIALS),
);

const wellCaseColumns = computed<WellGridColumn[]>(() => [
  {
    prop: 'from',
    label: t('editor.construction.wellCase.from'),
    unitType: 'length',
    size: 130,
  },
  {
    prop: 'to',
    label: t('editor.construction.wellCase.to'),
    unitType: 'length',
    size: 130,
  },
  {
    prop: 'diameter',
    label: t('editor.construction.wellCase.diameter'),
    unitType: 'diameter',
    size: 150,
  },
  {
    prop: 'type',
    label: t('editor.construction.wellCase.type'),
    info: t('editor.construction.wellCase.typeInfo'),
    infoHighlight: t('editor.construction.wellCase.typeFreeText'),
    type: 'combo',
    options: wellCaseTypeOptions.value,
    stretch: true,
    minSize: 200,
  },
]);

function addWellCase() {
  profileStore.well.well_case.push({ from: 0, to: 0, diameter: 0, type: '' });
}

function deleteWellCase(index: number) {
  profileStore.well.well_case.splice(index, 1);
}

function updateWellCase(index: number, prop: string, value: unknown) {
  (profileStore.well.well_case[index] as Record<string, unknown>)[prop] = value;
}

function reorderWellCase(from: number, to: number) {
  const items = [...profileStore.well.well_case];
  const [moved] = items.splice(from, 1);
  if (!moved) return;
  items.splice(to, 0, moved);
  profileStore.updateWell((draft: Well) => {
    draft.well_case.splice(0, draft.well_case.length, ...items);
  });
}
</script>

<template>
  <section class="flex flex-col gap-5">
    <div class="flex items-baseline justify-between">
      <h3
        class="font-serif text-[22px] font-medium tracking-[-0.015em] text-content-0 m-0"
      >
        {{ t('editor.construction.wellCase.title') }}
      </h3>
      <span
        class="font-mono text-[10px] tracking-[0.08em] uppercase text-content-500"
      >
        {{ t('editor.construction.wellCase.tag') }}
      </span>
    </div>
    <WellDataGrid
      :rows="[...profileStore.well.well_case]"
      :columns="wellCaseColumns"
      :add-label="t('editor.construction.wellCase.addRow')"
      :delete-label="t('editor.deleteRow')"
      :labels="{
        showPendingTextures: t('editor.showPendingTextures'),
        columnInfo: t('editor.fieldInfo'),
      }"
      @add="addWellCase"
      @delete="deleteWellCase"
      @change="updateWellCase"
      @reorder="reorderWellCase"
    />
  </section>
</template>
