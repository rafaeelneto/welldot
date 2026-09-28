<script setup lang="ts">
import type { WellGridColumn } from '~/components/DataGrid/types';
import FormField from '~/components/FormField.vue';
import { calculatedWellDepth } from '~/utils/wellDepth';

const { t } = useI18n();
const profileStore = useProfileStore();
const { unit: lengthUnit, toDisplay } = useUnitDisplay('length');
const { formatNumber } = useNumberFormat();

// Canonical values match the recommended `drilling_method` keys in the
// .well v2 spec (docs/spec/v2/object-schemas.md) — not an enforced
// enumeration, just suggestions. Any free text is stored as-is.
const drillingMethodOptions = computed(() => [
  {
    label: t('editor.construction.boreHole.drillingMethodOptions.rotary'),
    value: 'rotary',
  },
  {
    label: t('editor.construction.boreHole.drillingMethodOptions.percussion'),
    value: 'percussion',
  },
  {
    label: t('editor.construction.boreHole.drillingMethodOptions.cableTool'),
    value: 'cable_tool',
  },
  {
    label: t('editor.construction.boreHole.drillingMethodOptions.auger'),
    value: 'auger',
  },
  {
    label: t('editor.construction.boreHole.drillingMethodOptions.airHammer'),
    value: 'air_hammer',
  },
]);

const boreHoleColumns = computed<WellGridColumn[]>(() => [
  {
    prop: 'from',
    label: t('editor.construction.boreHole.from'),
    unitType: 'length',
    size: 130,
  },
  {
    prop: 'to',
    label: t('editor.construction.boreHole.to'),
    unitType: 'length',
    size: 130,
  },
  {
    prop: 'diameter',
    label: t('editor.construction.boreHole.diameter'),
    unitType: 'diameter',
    size: 150,
  },
  {
    prop: 'drilling_method',
    label: t('editor.construction.boreHole.drillingMethod'),
    type: 'combo',
    options: drillingMethodOptions.value,
    stretch: true,
    minSize: 200,
  },
]);

function addBoreHole() {
  profileStore.addWellFeature('bore_hole', { from: 0, to: 10, diameter: 0 });
}

function deleteBoreHole(index: number) {
  profileStore.well.bore_hole.splice(index, 1);
}

function updateBoreHole(index: number, prop: string, value: unknown) {
  profileStore.updateWellFeature('bore_hole', index, prop, value);
}

function reorderBoreHole(from: number, to: number) {
  profileStore.reorderWellFeature('bore_hole', from, to);
}

const calculatedDepth = computed(() => calculatedWellDepth(profileStore.well));
const calculatedDepthText = computed(
  () =>
    `${formatNumber(toDisplay(calculatedDepth.value), { fractionDigits: 2 })} ${lengthUnit.value}`,
);

function updateWellDepth(value: number | null) {
  profileStore.well.well_depth = value ?? undefined;
}

function syncWellDepth() {
  profileStore.well.well_depth = calculatedDepth.value;
}
</script>

<template>
  <!-- flex-1 min-w-0: layout constraints from the parent side-by-side flex row in TabConstruction -->
  <section class="flex flex-col gap-5 flex-1 min-w-0">
    <div class="flex items-baseline justify-between">
      <h3
        class="font-serif text-[22px] font-medium tracking-[-0.015em] text-content-0 m-0"
      >
        {{ t('editor.construction.boreHole.title') }}
      </h3>
      <span
        class="font-mono text-[10px] tracking-[0.08em] uppercase text-content-500"
      >
        {{ t('editor.construction.boreHole.tag') }}
      </span>
    </div>
    <WellDataGrid
      :rows="[...profileStore.well.bore_hole]"
      :columns="boreHoleColumns"
      :add-label="t('editor.construction.boreHole.addRow')"
      @add="addBoreHole"
      @delete="deleteBoreHole"
      @change="updateBoreHole"
      @reorder="reorderBoreHole"
    />
    <FormField :label="t('editor.construction.boreHole.wellDepth')">
      <UnitInput
        unit-type="length"
        :model-value="profileStore.well.well_depth ?? null"
        :placeholder="calculatedDepthText"
        :suffix="` ${lengthUnit}`"
        :min="0"
        class="w-full"
        :pt="{ pcInput: { root: 'w-full font-mono text-sm' } }"
        @update:model-value="updateWellDepth"
      />
      <div
        v-if="profileStore.well.well_depth != profileStore.maxDepth"
        class="flex items-center gap-2 text-xs text-content-400"
      >
        <span
          >{{ t('editor.construction.boreHole.wellDepthCalculated') }}:
          {{ calculatedDepthText }}</span
        >
        <Button
          :label="t('editor.construction.boreHole.syncDepth')"
          link
          size="small"
          class="p-0! text-xs!"
          @click="syncWellDepth"
        />
      </div>
    </FormField>
  </section>
</template>
