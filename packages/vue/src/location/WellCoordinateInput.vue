<script setup lang="ts">
/**
 * Text input for one coordinate, bound to decimal degrees. The text is a
 * local buffer: it is parsed (DD or DMS), clamped (lat ±90, lng ±180) and
 * reformatted in `format` on blur or Enter. Invalid text reverts to the
 * formatted model. External model/format changes reformat the buffer.
 *
 * Attrs pass through to PrimeVue `InputText`.
 */
import {
  clampLat,
  clampLng,
  formatCoord,
  parseToDd,
  type CoordFormat,
} from '@welldot/utils';
import InputText from 'primevue/inputtext';
import { computed, ref, watch } from 'vue';
import { useWellText } from '../composables/useWellText';
import { useWelldotConfig } from '../config';
import {
  COORDINATE_PLACEHOLDERS,
  type WellCoordinateInputProps,
} from './location';

const props = defineProps<WellCoordinateInputProps>();
const model = defineModel<number>();
const config = useWelldotConfig();
const text = useWellText();

const isLat = computed(() => props.axis === 'lat');
const activeFormat = computed<CoordFormat>(
  () => props.format ?? config.coordinateFormat,
);
const placeholderText = computed(
  () =>
    text(props.placeholder) ??
    COORDINATE_PLACEHOLDERS[props.axis][activeFormat.value],
);

function display(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value)
    ? ''
    : formatCoord(value, activeFormat.value, isLat.value);
}

const raw = ref('');

watch([model, activeFormat, isLat], () => (raw.value = display(model.value)), {
  immediate: true,
});

function commit() {
  // Untouched text (focus + blur, Enter on the shown value): reparsing the
  // rounded display would rewrite the exact model.
  if (raw.value === display(model.value)) return;
  const parsed = parseToDd(raw.value);
  if (isNaN(parsed)) {
    raw.value = display(model.value);
    return;
  }
  const clamped = isLat.value ? clampLat(parsed) : clampLng(parsed);
  model.value = clamped;
  // A parent-bound model only updates on the next render; format the value
  // just committed rather than the (still stale) prop.
  raw.value = display(clamped);
}
</script>

<template>
  <InputText
    v-model="raw"
    class="w-full font-mono"
    :placeholder="placeholderText"
    @blur="commit"
    @keydown.enter="commit"
  />
</template>
