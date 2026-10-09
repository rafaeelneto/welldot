<script setup lang="ts">
import type { Well } from '@welldot/core';
import type { WellGridColumn } from '@welldot/vue/grid';

const { t } = useI18n();
const profileStore = useProfileStore();

const fractureColumns = computed<WellGridColumn[]>(() => [
  {
    prop: 'depth',
    label: t('editor.geological.fractures.depth'),
    unitType: 'length',
    size: 130,
  },
  {
    prop: 'dip',
    label: `${t('editor.geological.fractures.dip')} (°)`,
    type: 'number',
    size: 110,
  },
  {
    prop: 'azimuth',
    label: `${t('editor.geological.fractures.azimuth')} (°)`,
    type: 'number',
    size: 110,
  },
  {
    prop: 'water_intake',
    label: t('editor.geological.fractures.waterIntake'),
    type: 'checkbox',
    size: 100,
  },
  {
    prop: 'description',
    label: t('editor.geological.fractures.description'),
    type: 'text',
    stretch: true,
    minSize: 200,
  },
]);

function addFracture() {
  profileStore.well.fractures.push({
    depth: 0,
    water_intake: false,
    description: '',
    swarm: false,
    azimuth: 0,
    dip: 0,
  });
}

function deleteFracture(index: number) {
  profileStore.well.fractures.splice(index, 1);
}

function updateFracture(index: number, prop: string, value: unknown) {
  (profileStore.well.fractures[index] as Record<string, unknown>)[prop] = value;
}

function reorderFracture(from: number, to: number) {
  const items = [...profileStore.well.fractures];
  const [moved] = items.splice(from, 1);
  if (!moved) return;
  items.splice(to, 0, moved);
  profileStore.updateWell((draft: Well) => {
    draft.fractures.splice(0, draft.fractures.length, ...items);
  });
}
</script>

<template>
  <section class="flex flex-col gap-5">
    <div class="flex items-baseline justify-between">
      <h3
        class="font-serif text-[22px] font-medium tracking-[-0.015em] text-content-0 m-0"
      >
        {{ t('editor.geological.fractures.title') }}
      </h3>
      <span
        class="font-mono text-[10px] tracking-[0.08em] uppercase text-content-500"
      >
        {{ t('editor.geological.fractures.tag') }}
      </span>
    </div>
    <WellDataGrid
      :rows="[...profileStore.well.fractures]"
      :columns="fractureColumns"
      :add-label="t('editor.geological.fractures.addRow')"
      :delete-label="t('editor.deleteRow')"
      :labels="{
        showPendingTextures: t('editor.showPendingTextures'),
        columnInfo: t('editor.fieldInfo'),
      }"
      @add="addFracture"
      @delete="deleteFracture"
      @change="updateFracture"
      @reorder="reorderFracture"
    />
  </section>
</template>
