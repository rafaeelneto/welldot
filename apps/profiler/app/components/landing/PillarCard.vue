<script setup lang="ts">
defineProps<{
  icon: string
  title: string
}>()
</script>

<template>
  <div class="glass rounded-[14px] p-[22px]">
    <div
      class="w-8 h-8 rounded-[8px] flex items-center justify-center font-mono text-[13px] font-semibold mb-[14px] text-primary-500"
      style="background: linear-gradient(135deg, var(--w-primary-50), var(--w-primary-100)); box-shadow: 0 1px 0 rgba(255,255,255,.8) inset, 0 4px 10px -4px oklch(48% 0.13 235 / 0.25);"
    >
      {{ icon }}
    </div>
    <h3 class="font-serif text-[22px] font-medium tracking-[-0.01em] text-content-0 mb-1.5">{{ title }}</h3>
    <p class="font-display text-[14px] leading-[1.5] text-content-400"><slot /></p>
  </div>
</template>
