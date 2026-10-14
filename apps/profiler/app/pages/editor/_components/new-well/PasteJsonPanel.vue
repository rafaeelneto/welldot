<script setup lang="ts">
import { deserializeWell, isWellEmpty } from '@welldot/core';
import { useDebounceFn } from '@vueuse/core';

/** The pasted text. The dialog fills it when the user pastes anywhere. */
const text = defineModel<string>({ default: '' });

const { t } = useI18n();
const store = useProfileStore();
const { openText } = useOpenWellFile();
const { examples, fetchExampleText } = useWellExamples();
const { formatNumber } = useNumberFormat();

/** Example offered by "Paste example": small, but fills most blocks. */
const SAMPLE_SLUG = 'sao-gabriel-rs-cacimba';

type Status =
  | { kind: 'idle' }
  | { kind: 'valid'; name: string; depth: number }
  | { kind: 'error'; message: string };

const status = ref<Status>({ kind: 'idle' });
const opening = ref(false);
const loadingSample = ref(false);
const textareaRef = ref<{ $el: HTMLTextAreaElement } | null>(null);

function validate(value: string): Status {
  if (!value.trim()) return { kind: 'idle' };
  try {
    JSON.parse(value);
  } catch (e) {
    return {
      kind: 'error',
      message: t('editor.newWell.paste.invalidJson', {
        detail: e instanceof Error ? e.message : '',
      }),
    };
  }
  try {
    const well = deserializeWell(value);
    if (!well || isWellEmpty(well)) {
      return { kind: 'error', message: t('editor.newWell.paste.empty') };
    }
    return {
      kind: 'valid',
      name: well.name?.trim() || t('editor.newWell.paste.unnamed'),
      depth: well.well_depth ?? 0,
    };
  } catch (e) {
    return {
      kind: 'error',
      message: t('editor.newWell.paste.invalidWell', {
        detail: e instanceof Error ? e.message : '',
      }),
    };
  }
}

const validateDebounced = useDebounceFn((value: string) => {
  status.value = validate(value);
}, 300);

watch(text, value => validateDebounced(value), { immediate: true });

const canOpen = computed(() => status.value.kind === 'valid' && !opening.value);

async function openWell() {
  // Validate now: the debounced status may lag behind the latest keystroke.
  status.value = validate(text.value);
  if (status.value.kind !== 'valid') return;
  opening.value = true;
  try {
    const ok = await openText(text.value);
    // Loading closes the dialog (`profileStore.wellSession`).
    if (ok === false) {
      status.value = {
        kind: 'error',
        message: store.errors.root ?? t('editor.newWell.loadError'),
      };
    }
  } finally {
    opening.value = false;
  }
}

async function pasteSample() {
  const sample =
    examples.value?.find(e => e.slug === SAMPLE_SLUG) ?? examples.value?.[0];
  if (!sample) return;
  loadingSample.value = true;
  try {
    text.value = await fetchExampleText(sample);
  } catch {
    status.value = { kind: 'error', message: t('editor.examples.loadError') };
  } finally {
    loadingSample.value = false;
  }
}

onMounted(() => textareaRef.value?.$el.focus());

const placeholder = computed(
  () =>
    `${t('editor.newWell.paste.placeholder')} — { "version": 2, "name": … }`,
);
</script>

<template>
  <div class="flex flex-col min-h-0 flex-1 px-6 lg:px-10 pt-6 lg:pt-10 pb-6">
    <header class="flex flex-col gap-1 pb-5">
      <span class="kicker">{{ t('editor.newWell.groups.import') }}</span>
      <h2
        class="m-0 text-2xl font-semibold tracking-tight text-content-0 leading-tight"
      >
        {{ t('editor.newWell.paste.title') }}
      </h2>
    </header>

    <Textarea
      ref="textareaRef"
      v-model="text"
      :placeholder="placeholder"
      :invalid="status.kind === 'error'"
      spellcheck="false"
      autocomplete="off"
      class="flex-1 min-h-48 w-full resize-none font-mono text-sm leading-relaxed"
      @keydown.meta.enter.prevent="openWell"
      @keydown.ctrl.enter.prevent="openWell"
    />

    <div class="flex flex-col sm:flex-row sm:items-center gap-3 pt-4 shrink-0">
      <p
        class="m-0 flex-1 min-w-0 font-mono text-xs leading-snug flex items-start gap-1.5"
        :class="{
          'text-content-400': status.kind === 'idle',
          'text-success-600': status.kind === 'valid',
          'text-error-600': status.kind === 'error',
        }"
        aria-live="polite"
      >
        <template v-if="status.kind === 'idle'">
          {{ t('editor.newWell.paste.waiting') }}
        </template>
        <template v-else-if="status.kind === 'valid'">
          <Icon name="ph:check-circle-duotone" class="size-4 shrink-0" />
          <span class="truncate">
            {{ t('editor.newWell.paste.valid') }} · {{ status.name }}
            <template v-if="status.depth">
              · {{ formatNumber(status.depth, { maximumFractionDigits: 1 }) }}
              m
            </template>
          </span>
        </template>
        <template v-else>
          <Icon name="ph:warning-duotone" class="size-4 shrink-0" />
          <span class="line-clamp-2 break-all">{{ status.message }}</span>
        </template>
      </p>
      <div class="flex items-center gap-2 shrink-0">
        <Button
          :label="t('editor.newWell.paste.sample')"
          severity="secondary"
          outlined
          :loading="loadingSample"
          :disabled="!examples?.length"
          @click="pasteSample"
        />
        <Button
          :label="t('editor.newWell.paste.open')"
          :disabled="!canOpen"
          :loading="opening"
          @click="openWell"
        >
          <template #icon>
            <Icon name="ph:arrow-right-bold" class="size-4 shrink-0" />
          </template>
        </Button>
      </div>
    </div>
  </div>
</template>
