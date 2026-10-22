<script setup lang="ts">
import type { Well } from '@welldot/core';
import {
  normalizeSiagasCode,
  type RimasMode,
  type SiagasWarning,
} from '@welldot/utils/siagas';

/** The code or link typed (the dialog fills it when one is pasted). */
const code = defineModel<string>({ default: '' });

const { t, locale } = useI18n();
const store = useProfileStore();
const { openText } = useOpenWellFile();
const { formatNumber } = useNumberFormat();

interface SiagasResponse {
  json: string;
  warnings: SiagasWarning[];
  source: { url: string; rimas_url?: string; fetched_at: string };
}

const rimas = ref<RimasMode>('monthly');
const media = ref(true);
const loading = ref(false);
const opening = ref(false);
const copied = ref(false);
const error = ref<string | null>(null);
const result = ref<(SiagasResponse & { well: Well }) | null>(null);
const inputRef = ref<{ $el: HTMLInputElement } | null>(null);

const normalized = computed(() => normalizeSiagasCode(code.value));
const showInvalid = computed(
  () => code.value.trim() !== '' && !normalized.value,
);

const rimasOptions = computed(() =>
  (['none', 'monthly', 'all'] as const).map(value => ({
    value,
    label: t(`editor.newWell.siagas.rimas.${value}`),
  })),
);

// A result belongs to the code and options it was imported with.
watch([normalized, rimas, media], () => {
  result.value = null;
  error.value = null;
});

function errorMessage(e: unknown): string {
  const status = (e as { statusCode?: number } | null)?.statusCode;
  const key =
    status === 400
      ? 'invalid'
      : status === 404
        ? 'notFound'
        : status === 429
          ? 'rateLimit'
          : status === 504
            ? 'timeout'
            : status === 502
              ? 'upstream'
              : 'generic';
  return t(`editor.newWell.siagas.errors.${key}`);
}

async function runImport() {
  if (!normalized.value || loading.value) return;
  loading.value = true;
  error.value = null;
  result.value = null;
  try {
    const res = await $fetch<SiagasResponse>(
      `/api/siagas/${normalized.value}`,
      { query: { rimas: rimas.value, media: media.value ? '1' : '0' } },
    );
    result.value = { ...res, well: JSON.parse(res.json) as Well };
    trackEvent('siagas_import', { status: 'ok', rimas: rimas.value });
  } catch (e) {
    error.value = errorMessage(e);
    // The code is a public SIAGAS registry id: enough to reproduce the failure.
    const fetchError = e as { statusCode?: number; statusMessage?: string };
    trackEvent('siagas_import', {
      status: 'error',
      code: normalized.value,
      rimas: rimas.value,
      media: media.value,
      http_status: fetchError?.statusCode ?? 0,
      message: (fetchError?.statusMessage ?? '').slice(0, 64),
    });
  } finally {
    loading.value = false;
  }
}

const lang = computed(() => (locale.value.startsWith('pt') ? 'pt' : 'en'));

const stats = computed(() => {
  const well = result.value?.well;
  if (!well) return [];
  return [
    {
      key: 'depth',
      value:
        well.well_depth !== undefined
          ? `${formatNumber(well.well_depth, { maximumFractionDigits: 1 })} m`
          : '—',
    },
    { key: 'layers', value: well.lithology.length },
    { key: 'casings', value: well.well_case.length },
    { key: 'screens', value: well.well_screen.length },
    { key: 'events', value: well.hydrodynamic_events?.length ?? 0 },
    { key: 'samples', value: well.water_samples?.length ?? 0 },
    { key: 'attachments', value: well.attachments?.length ?? 0 },
  ];
});

const place = computed(() => {
  const record = (result.value?.well as Record<string, unknown> | undefined)?.[
    'x-siagas'
  ] as
    | { record?: { municipality?: string; uf?: string; code?: string } }
    | undefined;
  const r = record?.record;
  return [r?.municipality, r?.uf].filter(Boolean).join('/');
});

async function copyJson() {
  if (!result.value) return;
  copied.value = await copyToClipboard(result.value.json);
  if (copied.value) setTimeout(() => (copied.value = false), 2000);
}

function download() {
  if (!result.value) return;
  const blob = new Blob([result.value.json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `siagas-${normalized.value}.well`;
  link.click();
  URL.revokeObjectURL(url);
}

async function openWell() {
  if (!result.value) return;
  opening.value = true;
  try {
    // Loading closes the dialog (`profileStore.wellSession`).
    const ok = await openText(result.value.json, 'siagas');
    if (ok === false) {
      error.value = store.errors.root ?? t('editor.newWell.loadError');
    }
  } finally {
    opening.value = false;
  }
}

onMounted(() => inputRef.value?.$el.focus());
</script>

<template>
  <div class="flex flex-col min-h-0 flex-1 px-6 lg:px-10 pt-6 lg:pt-10 pb-6">
    <header class="flex flex-col gap-1 pb-4">
      <span class="kicker">{{ t('editor.newWell.groups.import') }}</span>
      <h2
        class="m-0 text-2xl font-semibold tracking-tight text-content-0 leading-tight"
      >
        {{ t('editor.importSiagas') }}
      </h2>
      <p class="m-0 mt-1 text-sm text-content-400 leading-relaxed max-w-prose">
        {{ t('editor.newWell.siagas.intro') }}
      </p>
    </header>

    <form class="flex flex-col gap-3 shrink-0" @submit.prevent="runImport">
      <label class="flex flex-col gap-1.5">
        <span class="text-sm font-medium text-content-0">
          {{ t('editor.newWell.siagas.codeLabel') }}
        </span>
        <div class="flex gap-2">
          <InputText
            ref="inputRef"
            v-model="code"
            :placeholder="t('editor.newWell.siagas.codePlaceholder')"
            :invalid="showInvalid"
            autocomplete="off"
            spellcheck="false"
            class="flex-1 min-w-0 font-mono"
          />
          <Button
            type="submit"
            :label="t('editor.newWell.siagas.import')"
            :disabled="!normalized"
            :loading="loading"
          >
            <template #icon>
              <Icon name="ph:download-simple-bold" class="size-4 shrink-0" />
            </template>
          </Button>
        </div>
        <span v-if="showInvalid" class="text-xs text-error-600">
          {{ t('editor.newWell.siagas.invalidCode') }}
        </span>
      </label>

      <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div class="flex flex-col gap-1.5">
          <span class="text-sm font-medium text-content-0">
            {{ t('editor.newWell.siagas.rimasLabel') }}
          </span>
          <SelectButton
            v-model="rimas"
            :options="rimasOptions"
            option-label="label"
            option-value="value"
            :allow-empty="false"
            size="small"
          />
        </div>
        <label class="flex items-center gap-2 cursor-pointer self-end pb-1">
          <Checkbox v-model="media" binary />
          <span class="text-sm text-content-0">
            {{ t('editor.newWell.siagas.media') }}
          </span>
        </label>
      </div>
      <span class="text-xs text-content-400">
        {{ t('editor.newWell.siagas.rimasHint') }}
      </span>
    </form>

    <Message v-if="error" severity="error" class="mt-4 shrink-0">
      {{ error }}
    </Message>

    <section
      v-if="result"
      class="flex flex-col gap-4 min-h-0 flex-1 mt-5 pt-5 border-t border-surface-200"
    >
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <h3 class="m-0 text-lg font-semibold text-content-0 leading-tight">
          {{ result.well.name }}
          <span v-if="place" class="font-normal text-content-400">
            · {{ place }}
          </span>
        </h3>
        <a
          :href="result.source.url"
          target="_blank"
          rel="noopener"
          class="text-sm text-primary-600 hover:underline flex items-center gap-1"
        >
          {{ t('editor.newWell.siagas.source') }}
          <Icon name="ph:arrow-square-out" class="size-4" />
        </a>
      </div>

      <dl class="m-0 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        <div
          v-for="stat in stats"
          :key="stat.key"
          class="flex flex-col gap-0.5 px-3 py-2 rounded-lg border border-surface-200 bg-surface-0"
        >
          <dt class="text-xs text-content-400 truncate">
            {{ t(`editor.newWell.siagas.stats.${stat.key}`) }}
          </dt>
          <dd class="m-0 font-mono text-sm text-content-0">
            {{ stat.value }}
          </dd>
        </div>
      </dl>

      <div class="flex flex-col gap-2 min-h-0 flex-1 overflow-y-auto">
        <details
          :open="result.warnings.length > 0 && result.warnings.length <= 6"
          class="rounded-lg border border-surface-200 bg-surface-0 shrink-0"
        >
          <summary
            class="px-3 py-2 text-sm font-medium text-content-0 cursor-pointer flex items-center gap-2"
          >
            <Icon
              :name="
                result.warnings.length
                  ? 'ph:warning-duotone'
                  : 'ph:check-circle-duotone'
              "
              class="size-4 shrink-0"
              :class="
                result.warnings.length ? 'text-warning-600' : 'text-success-600'
              "
            />
            {{
              result.warnings.length
                ? t('editor.newWell.siagas.warnings', {
                    count: result.warnings.length,
                  })
                : t('editor.newWell.siagas.noWarnings')
            }}
          </summary>
          <ul
            v-if="result.warnings.length"
            class="m-0 px-3 pb-3 pl-9 flex flex-col gap-1.5 text-sm text-content-300 leading-snug"
          >
            <li v-for="(w, i) in result.warnings" :key="i">
              {{ w.message[lang] }}
            </li>
          </ul>
        </details>

        <details class="rounded-lg border border-surface-200 bg-surface-0">
          <summary
            class="px-3 py-2 text-sm font-medium text-content-0 cursor-pointer flex items-center gap-2"
          >
            <Icon name="ph:brackets-curly-duotone" class="size-4 shrink-0" />
            {{ t('editor.newWell.siagas.json') }}
            <span class="font-mono text-xs text-content-400">
              {{
                formatNumber(result.json.length / 1024, {
                  maximumFractionDigits: 1,
                })
              }}
              KB
            </span>
          </summary>
          <pre
            class="m-0 px-3 pb-3 max-h-96 overflow-auto font-mono text-xs leading-relaxed text-content-300 whitespace-pre"
            >{{ result.json }}</pre
          >
        </details>
      </div>

      <div class="flex flex-wrap items-center justify-end gap-2 shrink-0">
        <Button
          :label="
            copied
              ? t('editor.newWell.siagas.copied')
              : t('editor.newWell.siagas.copy')
          "
          severity="secondary"
          outlined
          @click="copyJson"
        >
          <template #icon>
            <Icon
              :name="copied ? 'ph:check-bold' : 'ph:copy-duotone'"
              class="size-4 shrink-0"
            />
          </template>
        </Button>
        <Button
          :label="t('editor.newWell.siagas.download')"
          severity="secondary"
          outlined
          @click="download"
        >
          <template #icon>
            <Icon name="ph:file-arrow-down-duotone" class="size-4 shrink-0" />
          </template>
        </Button>
        <Button
          :label="t('editor.newWell.siagas.open')"
          :loading="opening"
          @click="openWell"
        >
          <template #icon>
            <Icon name="ph:arrow-right-bold" class="size-4 shrink-0" />
          </template>
        </Button>
      </div>
    </section>
  </div>
</template>
