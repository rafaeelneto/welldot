<script setup lang="ts">
/**
 * Location editor: DD/DMS toggle, latitude/longitude text inputs, optional
 * elevation (in the configured length unit) and a map to click or drag the
 * pin. Coordinates are decimal degrees; elevation is canonical metres.
 *
 * `v-model:format` is optional. Unbound, the format follows
 * `createWelldot({ coordinateFormat })` until the user toggles it, after
 * which it is kept as local state (and `update:format` is still emitted).
 *
 * Text comes from `labels`; an omitted label is not rendered. The only
 * built-in text is locale-independent (`DD`/`DMS`, placeholder examples).
 */
import type { CoordFormat } from '@welldot/utils';
import SelectButton from 'primevue/selectbutton';
import { computed } from 'vue';
import WellLabeledField from '../components/WellLabeledField.vue';
import WellUnitInput from '../components/WellUnitInput.vue';
import { useWellText } from '../composables/useWellText';
import { useWellUnits } from '../composables/useWellUnits';
import { useWelldotConfig } from '../config';
import type { WellLocationPickerProps } from './location';
import WellCoordinateInput from './WellCoordinateInput.vue';
import WellLocationMap from './WellLocationMap.vue';

const props = withDefaults(defineProps<WellLocationPickerProps>(), {
  showElevation: true,
  labels: () => ({}),
});
const lat = defineModel<number>('lat', { required: true });
const lng = defineModel<number>('lng', { required: true });
const elevation = defineModel<number | null>('elevation');
/**
 * Bound by the parent: the parent's value wins. Unbound: `defineModel`
 * keeps a local value, `undefined` until the first toggle, so the
 * configured format applies until then.
 */
const formatModel = defineModel<CoordFormat>('format');

const config = useWelldotConfig();
const text = useWellText();
const { unit: lengthUnit } = useWellUnits('length');

const format = computed<CoordFormat>({
  get: () => formatModel.value ?? config.coordinateFormat,
  set: value => {
    if (value) formatModel.value = value;
  },
});

const FORMAT_OPTIONS: Array<{ label: string; value: CoordFormat }> = [
  { label: 'DD', value: 'DD' },
  { label: 'DMS', value: 'DMS' },
];

const elevationLabel = computed(() => {
  const label = text(props.labels.elevation);
  return label ? `${label} (${lengthUnit.value})` : undefined;
});
const hintText = computed(() => text(props.labels.hint));
</script>

<template>
  <div class="flex flex-col gap-5">
    <WellLabeledField :label="labels.coordinates">
      <div class="flex items-center">
        <SelectButton
          v-model="format"
          :options="FORMAT_OPTIONS"
          option-label="label"
          option-value="value"
          :allow-empty="false"
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
    </WellLabeledField>

    <div class="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
      <WellLabeledField :label="labels.latitude">
        <WellCoordinateInput v-model="lat" axis="lat" :format="format" />
      </WellLabeledField>

      <WellLabeledField :label="labels.longitude">
        <WellCoordinateInput v-model="lng" axis="lng" :format="format" />
      </WellLabeledField>

      <WellLabeledField v-if="showElevation" :label="elevationLabel">
        <WellUnitInput
          v-model="elevation"
          unit-type="length"
          class="w-full"
          :max-fraction-digits="3"
        />
      </WellLabeledField>
    </div>

    <div class="flex flex-col gap-1">
      <span
        v-if="hintText"
        class="text-[10px] font-semibold tracking-widest uppercase text-content-400"
      >
        {{ hintText }}
      </span>
      <WellLocationMap v-model:lat="lat" v-model:lng="lng" />
    </div>
  </div>
</template>
