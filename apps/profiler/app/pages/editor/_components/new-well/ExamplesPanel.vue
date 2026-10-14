<script setup lang="ts">
import type { WellExample } from '~/composables/useWellExamples';

const { t } = useI18n();
const {
  examples,
  categories,
  failed,
  loadingSlug,
  openExample,
  exampleText,
  thumbnailUrl,
} = useWellExamples();
const { formatNumber } = useNumberFormat();

/** Selected category id; null shows every example. Kept for the session. */
const category = useState<string | null>('new-well-category', () => null);

const shown = computed(() => {
  const list = examples.value ?? [];
  const id = category.value;
  return id ? list.filter(e => e.categories.includes(id)) : list;
});

// Loading a well closes the dialog (`profileStore.wellSession`).
function pick(example: WellExample) {
  if (loadingSlug.value) return;
  openExample(example);
}
</script>

<template>
  <div class="flex flex-col min-h-0 flex-1">
    <header class="flex flex-col gap-1 px-6 lg:px-10 pt-6 lg:pt-10 pb-5">
      <span class="kicker">{{ t('editor.newWell.examples.kicker') }}</span>
      <h2
        class="m-0 text-2xl font-semibold tracking-tight text-content-0 leading-tight"
      >
        {{ t('editor.newWell.examples.heading') }}
      </h2>
      <div
        v-if="categories.length"
        class="flex gap-2 mt-4 -mx-6 px-6 lg:mx-0 lg:px-0 overflow-x-auto lg:flex-wrap pb-1"
      >
        <WellChip
          :label="t('editor.newWell.examples.all')"
          :active="category === null"
          class="shrink-0"
          @click="category = null"
        />
        <WellChip
          v-for="c in categories"
          :key="c.id"
          :label="exampleText(c.title)"
          :active="category === c.id"
          class="shrink-0"
          @click="category = c.id"
        />
      </div>
    </header>

    <div class="flex-1 min-h-0 overflow-y-auto px-6 lg:px-10 pb-6">
      <p
        v-if="failed"
        class="m-0 text-sm text-content-400 flex items-center gap-1.5"
      >
        <Icon name="ph:warning-duotone" class="size-4 shrink-0" />
        {{ t('editor.examples.loadError') }}
      </p>

      <div
        v-else-if="!examples"
        class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"
        :aria-label="t('editor.examples.loading')"
      >
        <div
          v-for="n in 8"
          :key="n"
          class="h-80 rounded-xl bg-surface-100 animate-pulse"
        />
      </div>

      <ul
        v-else
        class="m-0 p-0 list-none grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        <li v-for="example in shown" :key="example.slug">
          <button
            type="button"
            :title="exampleText(example.summary)"
            class="group w-full h-full text-left flex flex-col rounded-xl border border-surface-200 bg-surface-0 overflow-hidden cursor-pointer transition-[border-color,box-shadow] duration-150 hover:border-primary-400 hover:shadow-md focus-visible:border-primary-500 focus-visible:outline-none disabled:cursor-wait"
            :disabled="!!loadingSlug"
            @click="pick(example)"
          >
            <!-- Profile drawn by @welldot/render (examples/thumbs) -->
            <span
              class="relative flex justify-center h-40 md:h-56 pt-4 bg-surface-50 border-b border-surface-200 overflow-hidden"
            >
              <img
                :src="thumbnailUrl(example)"
                alt=""
                loading="lazy"
                decoding="async"
                class="w-24 md:w-32 h-auto self-start mask-b-from-70%"
              />
              <span
                class="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-900 text-surface-0 text-xs font-medium opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity"
              >
                {{ t('editor.newWell.examples.open') }}
                <Icon name="ph:arrow-right-bold" class="size-3" />
              </span>
              <span
                v-if="loadingSlug === example.slug"
                class="absolute inset-0 flex items-center justify-center bg-surface-0/70"
              >
                <Icon
                  name="ph:spinner-gap"
                  class="size-6 text-primary-500 animate-spin"
                />
              </span>
            </span>
            <span class="flex flex-col gap-1.5 p-3 md:p-4 flex-1 min-w-0">
              <span
                class="text-sm md:text-base font-medium text-content-0 leading-snug line-clamp-2"
              >
                {{ exampleText(example.title) }}
              </span>
              <span
                class="mt-auto font-mono text-xs tracking-wider uppercase text-content-400 truncate"
              >
                {{ example.place }} ·
                {{
                  formatNumber(example.well_depth, {
                    maximumFractionDigits: 1,
                  })
                }}
                m
              </span>
            </span>
          </button>
        </li>
      </ul>
    </div>

    <footer
      class="shrink-0 px-6 lg:px-10 py-4 border-t border-surface-200 text-xs text-content-400 leading-snug"
    >
      {{ t('editor.examples.disclaimer') }}
    </footer>
  </div>
</template>
