<script setup lang="ts">
import type { WellGridColumn } from '@welldot/vue/grid';

const { t } = useI18n();
const profileStore = useProfileStore();

const surfaceCaseColumns = computed<WellGridColumn[]>(() => [
  {
    prop: 'from',
    label: t('editor.construction.surfaceCase.from'),
    unitType: 'length',
    size: 100,
  },
  {
    prop: 'to',
    label: t('editor.construction.surfaceCase.to'),
    unitType: 'length',
    size: 100,
  },
  {
    prop: 'diameter',
    label: t('editor.construction.surfaceCase.diameter'),
    unitType: 'diameter',
    stretch: true,
  },
]);

function addSurfaceCase() {
  profileStore.addWellFeature('surface_case', { from: 0, to: 10, diameter: 0 });
}

function deleteSurfaceCase(index: number) {
  profileStore.well.surface_case.splice(index, 1);
}

function updateSurfaceCase(index: number, prop: string, value: unknown) {
  profileStore.updateWellFeature('surface_case', index, prop, value);
}

function reorderSurfaceCase(from: number, to: number) {
  profileStore.reorderWellFeature('surface_case', from, to);
}
</script>

<template>
  <!-- @[700px]:w-2/5 @[700px]:shrink-0: layout constraints from the parent side-by-side flex row in TabConstruction -->
  <section class="flex flex-col gap-5 @[700px]:w-2/5 @[700px]:shrink-0">
    <div class="flex items-baseline justify-between">
      <h3
        class="font-serif text-[22px] font-medium tracking-[-0.015em] text-content-0 m-0"
      >
        {{ t('editor.construction.surfaceCase.title') }}
      </h3>
      <span
        class="font-mono text-[10px] tracking-[0.08em] uppercase text-content-500"
      >
        {{ t('editor.construction.surfaceCase.tag') }}
      </span>
    </div>
    <WellDataGrid
      :rows="[...profileStore.well.surface_case]"
      :columns="surfaceCaseColumns"
      :add-label="t('editor.construction.surfaceCase.addRow')"
      :delete-label="t('editor.deleteRow')"
      :labels="{
        showPendingTextures: t('editor.showPendingTextures'),
        columnInfo: t('editor.fieldInfo'),
      }"
      @add="addSurfaceCase"
      @delete="deleteSurfaceCase"
      @change="updateSurfaceCase"
      @reorder="reorderSurfaceCase"
    />
  </section>
</template>
