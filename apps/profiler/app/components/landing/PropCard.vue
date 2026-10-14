<script setup lang="ts">
defineProps<{
  num: string;
  title: string;
  /** Small pill next to the number, e.g. "coming soon". */
  badge?: string;
}>();
</script>

<template>
  <div
    class="glass rounded-lg p-4.5 hover:-translate-y-0.5 transition-transform duration-200 cursor-default"
  >
    <div
      class="flex items-center gap-2 font-mono text-[10px] tracking-[0.12em] text-primary-500 mb-1.5"
    >
      {{ num }}
      <span
        v-if="badge"
        class="font-display text-xs font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-surface-100 text-content-400"
        >{{ badge }}</span
      >
    </div>
    <h3
      class="font-serif text-[22px] font-medium tracking-[-0.01em] text-content-0 mb-1.5"
    >
      {{ title }}
    </h3>
    <p class="font-mono text-[11px] leading-[1.55] text-content-400">
      <slot />
    </p>
  </div>
</template>
