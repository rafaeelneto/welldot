<script setup lang="ts">
const { t } = useI18n();
const profileStore = useProfileStore();
const uiStore = useUiStore();

const widthLabel = computed(
  () => `${t('editor.construction.wellhead.width')} (${uiStore.lengthUnit})`,
);
const lengthLabel = computed(
  () => `${t('editor.construction.wellhead.length')} (${uiStore.lengthUnit})`,
);
const thicknessLabel = computed(
  () =>
    `${t('editor.construction.wellhead.thickness')} (${uiStore.lengthUnit})`,
);

const hasCementPad = computed(
  () => (profileStore.well.cement_pad?.thickness ?? 0) > 0,
);

function toggleCementPad(enabled: boolean) {
  if (enabled) {
    profileStore.well.cement_pad = {
      type: '',
      width: 2.5,
      thickness: 0.25,
      length: 2.5,
    };
  } else {
    profileStore.well.cement_pad = {
      type: '',
      width: 0,
      thickness: 0,
      length: 0,
    };
  }
}

const cementPadTypeOptions = computed(() => [
  {
    label: t('editor.construction.wellhead.typeOptions.concrete'),
    value: 'Concreto',
  },
  {
    label: t('editor.construction.wellhead.typeOptions.reinforcedConcrete'),
    value: 'Concreto Armado',
  },
  {
    label: t('editor.construction.wellhead.typeOptions.cement'),
    value: 'Cimento',
  },
  {
    label: t('editor.construction.wellhead.typeOptions.mortar'),
    value: 'Argamassa',
  },
]);
</script>

<template>
  <section class="flex flex-col gap-5">
    <div class="flex items-baseline justify-between">
      <h3
        class="font-serif text-[22px] font-medium tracking-[-0.015em] text-content-0 m-0"
      >
        {{ t('editor.construction.wellhead.title') }}
      </h3>
      <span
        class="font-mono text-[10px] tracking-[0.08em] uppercase text-content-500"
      >
        {{ t('editor.construction.wellhead.tag') }}
      </span>
    </div>

    <div class="flex items-center gap-3">
      <Checkbox
        :model-value="hasCementPad"
        binary
        input-id="cement-pad-toggle"
        @update:model-value="toggleCementPad"
      />
      <label
        for="cement-pad-toggle"
        class="font-medium cursor-pointer select-none"
      >
        {{ t('editor.construction.wellhead.cementPad') }}
      </label>
    </div>

    <template v-if="hasCementPad">
      <LabeledField :label="t('editor.construction.wellhead.type')">
        <Select
          v-model="profileStore.well.cement_pad!.type"
          :options="cementPadTypeOptions"
          option-label="label"
          option-value="value"
          class="w-full"
        />
      </LabeledField>

      <div class="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4">
        <LabeledField :label="widthLabel">
          <UnitInput
            v-model="profileStore.well.cement_pad!.width"
            unit-type="length"
            :min="0"
            class="w-full"
            :pt="{ pcInput: { root: 'w-full font-mono text-sm' } }"
          />
        </LabeledField>
        <LabeledField :label="lengthLabel">
          <UnitInput
            v-model="profileStore.well.cement_pad!.length"
            unit-type="length"
            :min="0"
            class="w-full"
            :pt="{ pcInput: { root: 'w-full font-mono text-sm' } }"
          />
        </LabeledField>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <LabeledField :label="thicknessLabel">
          <UnitInput
            v-model="profileStore.well.cement_pad!.thickness"
            unit-type="length"
            :min="0"
            class="w-full"
            :pt="{ pcInput: { root: 'w-full font-mono text-sm' } }"
          />
        </LabeledField>
      </div>
    </template>
  </section>
</template>
