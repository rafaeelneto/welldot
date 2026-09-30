<script setup lang="ts">
const { t } = useI18n();
const uiStore = useUiStore();

const lat = defineModel<number>('lat', {
  required: true,
  default: 0,
});
const lng = defineModel<number>('lng', {
  required: true,
  default: 0,
});
const elevation = defineModel<number>('elevation', {
  required: true,
  default: 0,
});

const rawLat = ref('');
const rawLng = ref('');

watch(
  [() => lat.value, () => uiStore.coordinateFormat],
  ([newLat, fmt]) => {
    rawLat.value = formatCoord(newLat, fmt, true);
  },
  { immediate: true },
);

watch(
  [() => lng.value, () => uiStore.coordinateFormat],
  ([newLng, fmt]) => {
    rawLng.value = formatCoord(newLng, fmt, false);
  },
  { immediate: true },
);

function commitLat() {
  const parsed = parseToDd(rawLat.value);
  if (!isNaN(parsed)) {
    lat.value = clampLat(parsed);
    rawLat.value = formatCoord(lat.value, uiStore.coordinateFormat, true);
  } else {
    rawLat.value = formatCoord(lat.value, uiStore.coordinateFormat, true);
  }
}

function commitLng() {
  const parsed = parseToDd(rawLng.value);
  if (!isNaN(parsed)) {
    lng.value = clampLng(parsed);
    rawLng.value = formatCoord(lng.value, uiStore.coordinateFormat, false);
  } else {
    rawLng.value = formatCoord(lng.value, uiStore.coordinateFormat, false);
  }
}

const latPlaceholder = computed(() =>
  uiStore.coordinateFormat === 'DMS'
    ? t('editor.general.latPlaceholderDms')
    : t('editor.general.latPlaceholderDd'),
);

const lngPlaceholder = computed(() =>
  uiStore.coordinateFormat === 'DMS'
    ? t('editor.general.lngPlaceholderDms')
    : t('editor.general.lngPlaceholderDd'),
);

const elevationLabel = computed(
  () => `${t('editor.general.elevation')} (${uiStore.lengthUnit})`,
);
</script>

<template>
  <div class="flex flex-col gap-5">
    <LabeledField :label="t('editor.general.coordinatesLabel')">
      <div class="flex items-center">
        <SelectButton
          v-model="uiStore.coordinateFormat"
          :options="[
            { label: t('editor.general.dd'), value: 'DD' },
            { label: t('editor.general.dms'), value: 'DMS' },
          ]"
          option-label="label"
          option-value="value"
          class="w-auto h-8 gap-0!"
          :pt="{
            pcToggleButton: {
              root: 'font-mono text-xs h-7 p-0 border-none bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1',
              content: 'px-2 py-0 rounded-full',
            },
          }"
          size="small"
        />
      </div>
    </LabeledField>

    <div class="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
      <LabeledField :label="t('editor.general.latitude')">
        <InputText
          v-model="rawLat"
          class="w-full font-mono"
          :placeholder="latPlaceholder"
          @blur="commitLat"
          @keydown.enter="commitLat"
        />
      </LabeledField>

      <LabeledField :label="t('editor.general.longitude')">
        <InputText
          v-model="rawLng"
          class="w-full font-mono"
          :placeholder="lngPlaceholder"
          @blur="commitLng"
          @keydown.enter="commitLng"
        />
      </LabeledField>

      <LabeledField :label="elevationLabel">
        <UnitInput
          v-model="elevation"
          unit-type="length"
          class="w-full"
          :max-fraction-digits="3"
        />
      </LabeledField>
    </div>

    <div class="flex flex-col gap-1">
      <span
        class="text-[10px] font-semibold tracking-widest uppercase text-content-400"
      >
        {{ t('editor.general.clickOrDragPin') }}
      </span>
      <ClientOnly>
        <LocationMap v-model:lat="lat" v-model:lng="lng" />
      </ClientOnly>
    </div>
  </div>
</template>
