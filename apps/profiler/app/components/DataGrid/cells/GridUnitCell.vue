<script setup lang="ts">
import type { DiameterUnits } from '@welldot/core';

const props = defineProps<{
  value?: unknown;
  unitType: 'length' | 'diameter';
}>();

const { unit, toDisplay } = useUnitDisplay(props.unitType);
const { formatNumber } = useNumberFormat();
const { locale } = useI18n();

const suffix = computed(() =>
  props.unitType === 'diameter'
    ? resolveDiameterUnitLabel(unit.value as DiameterUnits, locale.value)
    : unit.value,
);

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
