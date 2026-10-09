<script setup lang="ts">
defineProps<{
  title: string;
  path: string;
  href: string;
  linkLabel: string;
}>();
</script>

<template>
  <a
    :href="href"
    target="_blank"
    rel="noopener"
    class="glass rounded-3.5 p-5.5 block hover:-translate-y-0.5 transition-transform duration-200"
  >
    <div
      class="font-mono text-[10px] tracking-[0.12em] text-primary-500 mb-1.5"
    >
      {{ path }}
    </div>
    <h3
      class="font-serif text-[20px] font-medium tracking-[-0.01em] text-content-0 mb-1.5"
    >
      {{ title }}
    </h3>
    <p class="font-display text-[14px] leading-normal text-content-400 mb-3">
      <slot />
    </p>
    <span
      class="font-mono text-[11px] tracking-[0.04em] text-primary-500 inline-flex items-center gap-1"
    >
      <Icon name="ph:github-logo-duotone" size="14" />
      {{ linkLabel }}
    </span>
  </a>
</template>
