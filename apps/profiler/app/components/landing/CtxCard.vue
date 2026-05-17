<script setup lang="ts">
defineProps<{
  icon: string;
  iconStyle?: string;
  title: string;
  meta: string;
  highlight?: boolean;
}>();
</script>

<template>
  <div
    class="flex items-center gap-3.5 px-4.5 py-4 rounded-xl glass transition-shadow duration-200"
    :class="highlight ? 'border-primary-500' : ''"
    :style="
      highlight
        ? 'box-shadow: 0 1px 0 rgba(255,255,255,.7) inset, 0 8px 22px -10px oklch(48% 0.13 235 / 0.4);'
        : ''
    "
  >
    <div
      class="size-10 rounded-2.5 shrink-0 flex items-center justify-center text-primary-500"
      style="
        background: linear-gradient(
          135deg,
          var(--w-primary-50),
          var(--w-primary-100)
        );
      "
      :style="iconStyle"
    >
      <span class="text-lg leading-none">{{ icon }}</span>
    </div>
    <div class="flex flex-col gap-0.5 min-w-0">
      <div class="font-serif text-[17px] font-medium text-content-0">
        {{ title }}
      </div>
      <div class="font-mono text-[11px] text-content-500 tracking-[0.04em]">
        {{ meta }}
      </div>
    </div>
  </div>
</template>
