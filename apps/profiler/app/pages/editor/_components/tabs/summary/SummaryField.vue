<script setup lang="ts">
defineProps<{
  label: string;
  value?: string | null;
  /** Render the value in the monospace numeric style. */
  mono?: boolean;
}>();
</script>

<template>
  <div class="flex min-w-0 flex-col gap-0.5">
    <dt
      class="font-mono text-[9.5px] tracking-[0.08em] uppercase text-content-400"
    >
      {{ label }}
    </dt>
    <dd
      class="m-0 break-words text-sm text-content-0"
      :class="{ 'font-mono tabular-nums text-[13px]': mono }"
    >
      <slot>{{ value || '—' }}</slot>
    </dd>
  </div>
</template>
