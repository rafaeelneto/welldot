<script setup lang="ts">
/**
 * PrimeVue `InputNumber` with the locale taken from the welldot
 * configuration (`en` → `en-US`, `pt` → `pt-BR`). All attrs pass through.
 */
import InputNumber from 'primevue/inputnumber';
import { useWellNumberFormat } from '../composables/useWellNumberFormat';

defineOptions({ inheritAttrs: false });

const { resolvedLocale } = useWellNumberFormat();
</script>

<template>
  <InputNumber v-bind="$attrs" :locale="resolvedLocale" />
</template>
