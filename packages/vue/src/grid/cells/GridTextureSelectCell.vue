<script setup lang="ts">
import { computed } from 'vue';
import WellTextureThumbnail from '../../components/WellTextureThumbnail.vue';

const props = defineProps<{
  value?: unknown;
}>();

defineOptions({ inheritAttrs: false });

const typedValue = computed(() => props.value as string | number | undefined);
</script>

<template>
  <span class="flex h-full w-full items-center gap-1.5">
    <WellTextureThumbnail :code="typedValue" :size="28" />
    <span class="font-mono text-[11px]">{{ typedValue }}</span>
  </span>
</template>
