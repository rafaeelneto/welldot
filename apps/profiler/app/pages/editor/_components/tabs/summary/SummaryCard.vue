<script setup lang="ts">
import { summaryNavigateKey, type EditorTabKey } from './navigate';

defineProps<{
  title: string;
  icon: string;
  tag?: string;
  /** Tab opened by the footer link. */
  tab?: EditorTabKey;
  linkLabel?: string;
}>();

const navigate = inject(summaryNavigateKey, () => {});
</script>

<template>
  <section
    class="flex flex-col gap-3 rounded-xl border border-surface-200 bg-surface-0 p-4"
  >
    <header class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-2 min-w-0">
        <Icon :name="icon" class="size-4.5 shrink-0 text-primary-500" />
        <h4
          class="m-0 truncate font-serif text-[17px] font-medium tracking-[-0.01em] text-content-0"
        >
          {{ title }}
        </h4>
      </div>
      <slot name="aside">
        <span
          v-if="tag"
          class="shrink-0 font-mono text-[9.5px] tracking-[0.08em] uppercase text-content-500"
        >
          {{ tag }}
        </span>
      </slot>
    </header>

    <div class="flex flex-1 flex-col gap-3">
      <slot />
    </div>

    <footer v-if="tab && linkLabel" class="flex justify-end">
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-primary-600 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-primary-500 dark:text-primary-400 dark:hover:bg-primary-500/10"
        @click="navigate(tab)"
      >
        {{ linkLabel }}
        <Icon name="ph:arrow-right" class="size-3.5" />
      </button>
    </footer>
  </section>
</template>
