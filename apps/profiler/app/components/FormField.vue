<script setup lang="ts">
defineProps<{
  label?: string;
  orientation?: 'vertical' | 'horizontal';
  info?: string;
}>();

const slots = defineSlots<{
  default(): unknown;
  info?(): unknown;
}>();
</script>

<template>
  <div
    v-if="label"
    class="flex flex-col gap-1"
    :class="orientation === 'horizontal' ? 'sm:flex-row sm:items-center' : ''"
  >
    <div class="flex items-center gap-1">
      <label
        class="text-[10px] font-semibold tracking-widest uppercase text-content-400"
      >
        {{ label }}
      </label>
      <InfoPopover v-if="info || slots.info" :info="info">
        <template v-if="slots.info" #default>
          <slot name="info" />
        </template>
      </InfoPopover>
    </div>
    <slot />
  </div>
</template>
