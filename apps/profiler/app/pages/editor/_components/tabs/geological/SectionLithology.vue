<script setup lang="ts">
import type { WellGridColumn } from '@welldot/vue/grid';

const { t } = useI18n();
const profileStore = useProfileStore();
const { formatLength } = useUnitFormat();

const lithologyColumns = computed<WellGridColumn[]>(() => [
  {
    prop: 'from',
    label: t('editor.geological.lithology.from'),
    unitType: 'length',
    size: 130,
  },
  {
    prop: 'to',
    label: t('editor.geological.lithology.to'),
    unitType: 'length',
    size: 130,
  },
  {
    prop: 'color',
    label: t('editor.geological.lithology.color'),
    type: 'color',
    size: 110,
  },
  {
    prop: 'texture',
    label: t('editor.geological.lithology.texture'),
    type: 'texture',
    size: 160,
  },
  {
    prop: 'geologic_unit',
    label: t('editor.geological.lithology.geologicUnit'),
    type: 'text',
    size: 140,
  },
  {
    prop: 'aquifer_unit',
    label: t('editor.geological.lithology.aquiferUnit'),
    type: 'text',
    size: 140,
  },
  {
    prop: 'description',
    label: t('editor.geological.lithology.description'),
    type: 'text',
    stretch: true,
    minSize: 200,
  },
]);

const lithologyRows = computed(() =>
  profileStore.well.lithology.map(layer => ({
    ...layer,
    texture: layer.texture?.code,
  })),
);

function addLithology() {
  profileStore.addWellFeature('lithology', {
    from: 0,
    to: 10,
    description: '',
    color: '#cccccc',
    texture: { code: 612, vocabulary: 'fgdc' },
    geologic_unit: '',
    aquifer_unit: '',
  });
}

function deleteLithology(index: number) {
  profileStore.well.lithology.splice(index, 1);
}

function updateLithology(index: number, prop: string, value: unknown) {
  const v =
    prop === 'texture'
      ? { code: value as string | number, vocabulary: 'fgdc' }
      : value;
  profileStore.updateWellFeature('lithology', index, prop, v);
}

function reorderLithology(from: number, to: number) {
  profileStore.reorderWellFeature('lithology', from, to);
}

const geologicUnitSummary = computed(() => {
  const groups: { name: string; color: string; thickness: number }[] = [];
  for (const layer of profileStore.well.lithology) {
    const name = layer.geologic_unit || '—';
    const last = groups[groups.length - 1];
    const thickness = layer.to - layer.from;
    if (last && last.name === name) {
      last.thickness += thickness;
    } else {
      groups.push({ name, color: layer.color, thickness });
    }
  }
  return groups.map(group => ({
    ...group,
    displayLabel: formatLength(group.thickness, 1),
  }));
});
</script>

<template>
  <section class="flex flex-col gap-5">
    <div class="flex items-baseline justify-between">
      <h3
        class="font-serif text-[22px] font-medium tracking-[-0.015em] text-content-0 m-0"
      >
        {{ t('editor.geological.lithology.title') }}
      </h3>
      <span
        class="font-mono text-[10px] tracking-[0.08em] uppercase text-content-500"
      >
        {{ t('editor.geological.lithology.tag') }}
      </span>
    </div>

    <div v-if="geologicUnitSummary.length" class="flex flex-wrap gap-2">
      <span
        v-for="group in geologicUnitSummary"
        :key="group.name"
        class="inline-flex items-center gap-1.5 rounded-full border border-surface-200 bg-surface-50 px-3 py-1 font-mono text-[11px] text-content-300"
      >
        <span
          class="h-2 w-2 rounded-full"
          :style="{ backgroundColor: group.color }"
        />
        {{ group.name }}
        <span class="text-content-500">{{ group.displayLabel }}</span>
      </span>
    </div>

    <WellDataGrid
      :rows="lithologyRows"
      :columns="lithologyColumns"
      :add-label="t('editor.geological.lithology.addRow')"
      :delete-label="t('editor.deleteRow')"
      :labels="{
        showPendingTextures: t('editor.showPendingTextures'),
        columnInfo: t('editor.fieldInfo'),
      }"
      @add="addLithology"
      @delete="deleteLithology"
      @change="updateLithology"
      @reorder="reorderLithology"
    />
  </section>
</template>
