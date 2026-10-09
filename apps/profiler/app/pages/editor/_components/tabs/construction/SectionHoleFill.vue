<script setup lang="ts">
import type { WellGridColumn } from '@welldot/vue/grid';

const { t } = useI18n();
const profileStore = useProfileStore();

const holeFillTypeOptions = computed(() => [
  {
    label: t('editor.construction.holeFill.typeOptions.gravelPack'),
    value: 'gravel_pack',
  },
  { label: t('editor.construction.holeFill.typeOptions.seal'), value: 'seal' },
]);

const holeFillColumns = computed<WellGridColumn[]>(() => [
  {
    prop: 'from',
    label: t('editor.construction.holeFill.from'),
    unitType: 'length',
    size: 130,
  },
  {
    prop: 'to',
    label: t('editor.construction.holeFill.to'),
    unitType: 'length',
    size: 130,
  },
  {
    prop: 'diameter',
    label: t('editor.construction.holeFill.diameter'),
    unitType: 'diameter',
    size: 150,
  },
  {
    prop: 'type',
    label: t('editor.construction.holeFill.type'),
    info: t('editor.construction.holeFill.typeInfo'),
    type: 'select-button',
    size: 220,
    options: holeFillTypeOptions.value,
  },
  {
    prop: 'description',
    label: t('editor.construction.holeFill.description'),
    info: t('editor.construction.holeFill.descriptionInfo'),
    type: 'text',
    stretch: true,
    minSize: 200,
  },
]);

function addHoleFill() {
  profileStore.addWellFeature('hole_fill', {
    from: 0,
    to: 10,
    diameter: 0,
    type: 'gravel_pack',
    description: '',
  });
}

function deleteHoleFill(index: number) {
  profileStore.well.hole_fill.splice(index, 1);
}

function updateHoleFill(index: number, prop: string, value: unknown) {
  profileStore.updateWellFeature('hole_fill', index, prop, value);
}

function reorderHoleFill(from: number, to: number) {
  profileStore.reorderWellFeature('hole_fill', from, to);
}
</script>

<template>
  <section class="flex flex-col gap-5">
    <div class="flex items-baseline justify-between">
      <h3
        class="font-serif text-[22px] font-medium tracking-[-0.015em] text-content-0 m-0"
      >
        {{ t('editor.construction.holeFill.title') }}
      </h3>
      <span
        class="font-mono text-[10px] tracking-[0.08em] uppercase text-content-500"
      >
        {{ t('editor.construction.holeFill.tag') }}
      </span>
    </div>
    <WellDataGrid
      :rows="[...profileStore.well.hole_fill]"
      :columns="holeFillColumns"
      :add-label="t('editor.construction.holeFill.addRow')"
      :delete-label="t('editor.deleteRow')"
      :labels="{
        showPendingTextures: t('editor.showPendingTextures'),
        columnInfo: t('editor.fieldInfo'),
      }"
      @add="addHoleFill"
      @delete="deleteHoleFill"
      @change="updateHoleFill"
      @reorder="reorderHoleFill"
    />
  </section>
</template>
