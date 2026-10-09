<script setup lang="ts">
import type { Well } from '@welldot/core';
import type { WellGridColumn } from '@welldot/vue/grid';

const { t } = useI18n();
const profileStore = useProfileStore();

const caveColumns = computed<WellGridColumn[]>(() => [
  {
    prop: 'from',
    label: t('editor.geological.caves.from'),
    unitType: 'length',
    size: 130,
  },
  {
    prop: 'to',
    label: t('editor.geological.caves.to'),
    unitType: 'length',
    size: 130,
  },
  {
    prop: 'water_intake',
    label: t('editor.geological.caves.waterIntake'),
    type: 'checkbox',
    size: 100,
  },
  {
    prop: 'description',
    label: t('editor.geological.caves.description'),
    type: 'text',
    stretch: true,
    minSize: 200,
  },
]);

function addCave() {
  profileStore.well.caves.push({
    from: 0,
    to: 0,
    water_intake: false,
    description: '',
  });
}

function deleteCave(index: number) {
  profileStore.well.caves.splice(index, 1);
}

function updateCave(index: number, prop: string, value: unknown) {
  (profileStore.well.caves[index] as Record<string, unknown>)[prop] = value;
}

function reorderCave(from: number, to: number) {
  const items = [...profileStore.well.caves];
  const [moved] = items.splice(from, 1);
  if (!moved) return;
  items.splice(to, 0, moved);
  profileStore.updateWell((draft: Well) => {
    draft.caves.splice(0, draft.caves.length, ...items);
  });
}
</script>

<template>
  <section class="flex flex-col gap-5">
    <div class="flex items-baseline justify-between">
      <h3
        class="font-serif text-[22px] font-medium tracking-[-0.015em] text-content-0 m-0"
      >
        {{ t('editor.geological.caves.title') }}
      </h3>
      <span
        class="font-mono text-[10px] tracking-[0.08em] uppercase text-content-500"
      >
        {{ t('editor.geological.caves.tag') }}
      </span>
    </div>
    <WellDataGrid
      :rows="[...profileStore.well.caves]"
      :columns="caveColumns"
      :add-label="t('editor.geological.caves.addRow')"
      :delete-label="t('editor.deleteRow')"
      :labels="{
        showPendingTextures: t('editor.showPendingTextures'),
        columnInfo: t('editor.fieldInfo'),
      }"
      @add="addCave"
      @delete="deleteCave"
      @change="updateCave"
      @reorder="reorderCave"
    />
  </section>
</template>
