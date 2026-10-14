<script setup lang="ts">
import type { WellExample } from '~/composables/useWellExamples';

const emit = defineEmits<{ loaded: [example: WellExample] }>();

const { t } = useI18n();
const {
  examples,
  failed,
  loadingSlug,
  fetchExamples,
  openExample,
  exampleText,
  thumbnailUrl,
} = useWellExamples();
const { formatNumber } = useNumberFormat();

onMounted(fetchExamples);

async function pick(example: WellExample) {
  if (loadingSlug.value) return;
  if (await openExample(example)) emit('loaded', example);
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <p
      v-if="failed"
      class="m-0 text-xs text-content-400 flex items-center gap-1.5"
    >
      <Icon name="ph:warning-duotone" class="size-4 shrink-0" />
      {{ t('editor.examples.loadError') }}
    </p>

    <div
      v-else-if="!examples"
      class="flex flex-col gap-2"
      :aria-label="t('editor.examples.loading')"
    >
      <div
        v-for="n in 4"
        :key="n"
        class="h-28 rounded-lg bg-surface-100 animate-pulse"
      />
    </div>

    <ul v-else class="m-0 p-0 list-none flex flex-col gap-1.5">
      <li v-for="example in examples" :key="example.slug">
        <button
          type="button"
          class="w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-lg border border-surface-200 bg-surface-0 hover:border-primary-400 hover:bg-surface-50 transition-colors duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
          :disabled="!!loadingSlug"
          @click="pick(example)"
        >
          <!-- Profile drawn by @welldot/render (examples/thumbs) -->
          <span
            class="relative shrink-0 w-12 h-24 rounded-md overflow-hidden border border-surface-200 bg-surface-0"
          >
            <img
              :src="thumbnailUrl(example)"
              alt=""
              loading="lazy"
              decoding="async"
              class="size-full object-cover object-top"
            />
            <span
              v-if="loadingSlug === example.slug"
              class="absolute inset-0 flex items-center justify-center bg-surface-0/70"
            >
              <Icon
                name="ph:spinner-gap"
                class="size-5 text-primary-500 animate-spin"
              />
            </span>
          </span>
          <span class="flex flex-col gap-0.5 min-w-0 py-0.5">
            <span class="text-sm font-medium text-content-0 leading-snug">
              {{ exampleText(example.title) }}
            </span>
            <span
              class="font-mono text-[10px] tracking-[0.08em] uppercase text-content-400"
            >
              {{ example.place }} ·
              {{
                formatNumber(example.well_depth, { maximumFractionDigits: 1 })
              }}
              m
            </span>
            <span class="text-xs text-content-400 leading-snug line-clamp-2">
              {{ exampleText(example.summary) }}
            </span>
          </span>
        </button>
      </li>
    </ul>

    <p class="m-0 text-[11px] text-content-400 leading-snug">
      {{ t('editor.examples.disclaimer') }}
    </p>
  </div>
</template>
