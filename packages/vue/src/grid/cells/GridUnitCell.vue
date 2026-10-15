<script setup lang="ts">
/**
 * Unit-aware cell: the value is canonical (SI); it is shown converted to
 * the configured display unit, with the unit as suffix.
 */
import { computed } from 'vue';
import { useWellNumberFormat } from '../../composables/useWellNumberFormat';
import {
  useWellUnits,
  type DisplayUnitType,
} from '../../composables/useWellUnits';
import { useUnitSuffix } from '../composables/useUnitSuffix';

const props = defineProps<{
  value?: unknown;
  unitType: DisplayUnitType;
}>();

defineOptions({ inheritAttrs: false });

const { toDisplay } = useWellUnits(() => props.unitType);
const suffix = useUnitSuffix(() => props.unitType);
const { formatNumber } = useWellNumberFormat();

const display = computed((): string => {
  const raw = props.value;
  if (raw === null || raw === undefined || raw === '') return '—';
  const canonical = Number(raw);
  if (isNaN(canonical)) return '—';
  return formatNumber(toDisplay(canonical), {
    maximumFractionDigits: 4,
    suffix: suffix.value,
  });
});
</script>

<template>
  <span class="flex h-full w-full items-center justify-end">{{ display }}</span>
</template>
