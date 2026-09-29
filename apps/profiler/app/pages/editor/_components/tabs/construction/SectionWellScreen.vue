<script setup lang="ts">
import type { WellGridColumn } from '~/components/DataGrid/types';
import { materialOptions } from '~/utils/materialOptions';

const { t } = useI18n();
const profileStore = useProfileStore();

const screenTypeOptions = computed(() => materialOptions(t));

const wellScreenColumns = computed<WellGridColumn[]>(() => [
  {
    prop: 'from',
    label: t('editor.construction.wellScreen.from'),
    unitType: 'length',
    size: 130,
  },
  {
    prop: 'to',
    label: t('editor.construction.wellScreen.to'),
    unitType: 'length',
    size: 130,
  },
  {
    prop: 'diameter',
    label: t('editor.construction.wellScreen.diameter'),
    unitType: 'diameter',
    size: 150,
  },
  {
    prop: 'screen_slot',
    label: t('editor.construction.wellScreen.screenSlot'),
    type: 'number',
    size: 130,
  },
  {
    prop: 'type',
    label: t('editor.construction.wellScreen.type'),
    info: t('editor.construction.wellScreen.typeInfo'),
    infoHighlight: t('editor.construction.wellScreen.typeFreeText'),
    type: 'combo',
    options: screenTypeOptions.value,
    stretch: true,
    minSize: 200,
  },
]);

function addWellScreen() {
  profileStore.well.well_screen.push({
    from: 0,
    to: 0,
    diameter: 0,
    screen_slot: 0,
    type: '',
  });
}

function deleteWellScreen(index: number) {
  profileStore.well.well_screen.splice(index, 1);
}

function updateWellScreen(index: number, prop: string, value: unknown) {
  (profileStore.well.well_screen[index] as Record<string, unknown>)[prop] =
    value;
}

function reorderWellScreen(from: number, to: number) {
  const items = [...profileStore.well.well_screen];
  const [moved] = items.splice(from, 1);
  if (!moved) return;
  items.splice(to, 0, moved);
  profileStore.updateWell(draft => {
    draft.well_screen.splice(0, draft.well_screen.length, ...items);
  });
}
</script>

<template>
  <section class="flex flex-col gap-5">
    <div class="flex items-baseline justify-between">
      <h3
        class="font-serif text-[22px] font-medium tracking-[-0.015em] text-content-0 m-0"
      >
        {{ t('editor.construction.wellScreen.title') }}
      </h3>
      <span
        class="font-mono text-[10px] tracking-[0.08em] uppercase text-content-500"
      >
        {{ t('editor.construction.wellScreen.tag') }}
      </span>
    </div>
    <WellDataGrid
      :rows="[...profileStore.well.well_screen]"
      :columns="wellScreenColumns"
      :add-label="t('editor.construction.wellScreen.addRow')"
      @add="addWellScreen"
      @delete="deleteWellScreen"
      @change="updateWellScreen"
      @reorder="reorderWellScreen"
    />
  </section>
</template>
