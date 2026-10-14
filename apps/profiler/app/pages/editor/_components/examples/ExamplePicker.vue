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
        class="h-14 rounded-lg bg-surface-100 animate-pulse"
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
          <Icon
            :name="
              loadingSlug === example.slug
                ? 'ph:spinner-gap'
                : example.well_type === 'hand_dug'
                  ? 'ph:circle-dashed-duotone'
                  : 'ph:drop-duotone'
            "
            class="size-4.5 shrink-0 mt-0.5 text-primary-500"
            :class="{ 'animate-spin': loadingSlug === example.slug }"
          />
          <span class="flex flex-col gap-0.5 min-w-0">
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
