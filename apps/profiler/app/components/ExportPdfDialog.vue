<script setup lang="ts">
import { isWellEmpty } from '@welldot/core';

const visible = defineModel<boolean>({ default: false });

const { t } = useI18n();
const pdfExportStore = usePdfExportStore();
const profileStore = useProfileStore();

const draftContainerRef = ref<HTMLElement | null>(null);
const { previewUrl, isGenerating, error, download, print } =
  usePdfExport(draftContainerRef);

const isEmpty = computed(() => isWellEmpty(profileStore.well));
const actionsDisabled = computed(
  () => isEmpty.value || isGenerating.value || !!error.value,
);

const kickerClass =
  'text-[10px] font-semibold tracking-widest uppercase text-content-400';

const metadataPositionOptions = computed(() => [
  {
    label: t('editor.exportPdfDialog.metadataSection.before'),
    value: 'before',
  },
  { label: t('editor.exportPdfDialog.metadataSection.after'), value: 'after' },
  { label: t('editor.exportPdfDialog.metadataSection.hide'), value: 'none' },
]);

const metadataPositionModel = computed({
  get: () => pdfExportStore.metadataPosition ?? 'none',
  set: (value: string) =>
    (pdfExportStore.metadataPosition =
      value === 'none' ? null : (value as 'before' | 'after')),
});

const headingInfoCount = computed(() =>
  t(
    'editor.exportPdfDialog.initialInfo.sections',
    pdfExportStore.headingInfo.length,
    { count: pdfExportStore.headingInfo.length },
  ),
);
const endInfoCount = computed(() =>
  t(
    'editor.exportPdfDialog.finalInfo.sections',
    pdfExportStore.endInfo.length,
    { count: pdfExportStore.endInfo.length },
  ),
);
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    :show-header="false"
    :style="{
      width: '100vw',
      height: '100dvh',
      maxWidth: '100vw',
      maxHeight: '100dvh',
      margin: 0,
      borderRadius: 0,
    }"
    :pt="{ content: { class: 'p-0! h-full overflow-hidden' } }"
  >
    <div class="flex flex-col lg:flex-row h-full overflow-hidden bg-surface-0">
      <!-- ─── Options panel ──────────────────────────────────────────── -->
      <aside
        class="flex flex-col w-full lg:w-[500px] shrink-0 h-full overflow-y-auto overflow-x-hidden lg:border-r border-surface-200"
      >
        <!-- Panel header -->
        <div class="flex items-center justify-between gap-3 px-6 pt-6 pb-5">
          <h2
            class="font-serif text-2xl font-semibold text-content-0 tracking-tight"
          >
            {{ t('editor.exportPdfDialog.title') }}
          </h2>
          <button
            type="button"
            class="size-8 rounded-full flex items-center justify-center shrink-0 border-none bg-transparent text-content-400 hover:text-content-0 hover:bg-surface-100 transition-colors cursor-pointer"
            :aria-label="t('editor.exportPdfDialog.close')"
            @click="visible = false"
          >
            <Icon name="ph:x-bold" class="size-4" />
          </button>
        </div>

        <!-- Primary actions -->
        <div class="flex items-center gap-2 px-6 pb-6">
          <Button
            :label="t('editor.exportPdfDialog.download')"
            class="flex-1"
            :disabled="actionsDisabled"
            @click="download"
          >
            <template #icon>
              <Icon name="ph:download-simple-bold" class="size-4 shrink-0" />
            </template>
          </Button>
          <Button
            :label="t('editor.exportPdfDialog.print')"
            severity="secondary"
            outlined
            :disabled="actionsDisabled"
            @click="print"
          >
            <template #icon>
              <Icon name="ph:printer-duotone" class="size-4 shrink-0" />
            </template>
          </Button>
        </div>

        <div class="flex flex-col gap-6 px-6 pb-10">
          <!-- Header -->
          <section class="flex flex-col gap-3">
            <span :class="kickerClass">{{
              t('editor.exportPdfDialog.header')
            }}</span>
            <InputText v-model="pdfExportStore.header" class="w-full" />
          </section>

          <!-- Page breaks -->
          <section class="flex flex-col gap-3">
            <span :class="kickerClass">{{
              t('editor.exportPdfDialog.pageBreaks.title')
            }}</span>
            <label
              class="flex items-center gap-2.5 text-sm text-content-0 cursor-pointer"
            >
              <Checkbox v-model="pdfExportStore.breakPages" binary />
              {{ t('editor.exportPdfDialog.pageBreaks.split') }}
            </label>
          </section>

          <!-- Metadata section placement -->
          <section class="flex flex-col gap-3">
            <span :class="kickerClass">{{
              t('editor.exportPdfDialog.metadataSection.title')
            }}</span>
            <SelectButton
              v-model="metadataPositionModel"
              :options="metadataPositionOptions"
              option-label="label"
              option-value="value"
              :allow-empty="false"
              class="w-full *:flex-1"
            />
          </section>

          <!-- What to share -->
          <section class="flex flex-col gap-3">
            <span :class="kickerClass">{{
              t('editor.exportPdfDialog.visibilitySection.title')
            }}</span>
            <div class="flex items-center justify-between">
              <label
                for="pdf-use-custom-visibility"
                class="text-sm text-content-0 cursor-pointer"
              >
                {{ t('editor.exportPdfDialog.visibilitySection.toggle') }}
              </label>
              <ToggleSwitch
                v-model="pdfExportStore.useCustomVisibility"
                input-id="pdf-use-custom-visibility"
              />
            </div>
            <ShareVisibilityChecklist
              v-if="pdfExportStore.useCustomVisibility"
            />
          </section>

          <!-- Scale -->
          <section class="flex flex-col gap-3">
            <span :class="kickerClass">{{
              t('editor.exportPdfDialog.scale.title')
            }}</span>
            <div class="flex flex-col items-end gap-6">
              <div class="flex items-center gap-3 w-full">
                <Slider
                  v-model="pdfExportStore.scale"
                  :min="1"
                  :max="850"
                  class="flex-1"
                />
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <span class="font-mono text-xs text-content-400">1 :</span>
                <InputNumber
                  v-model="pdfExportStore.scale"
                  :min="1"
                  :max="850"
                  :use-grouping="false"
                  input-class="font-mono text-xs w-full max-w-20"
                />
              </div>
            </div>
          </section>

          <!-- Initial information -->
          <section class="flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <span :class="kickerClass">{{
                t('editor.exportPdfDialog.initialInfo.title')
              }}</span>
              <span class="text-[10px] font-medium text-content-400">{{
                headingInfoCount
              }}</span>
            </div>
            <PdfInfoItemsList
              v-model:items="pdfExportStore.headingInfo"
              :empty-message="t('editor.exportPdfDialog.initialInfo.empty')"
              :add-label="t('editor.exportPdfDialog.initialInfo.add')"
              :metadata-button-label="
                t('editor.exportPdfDialog.initialInfo.metadataButton')
              "
              :label-placeholder="t('editor.exportPdfDialog.labelPlaceholder')"
              :value-placeholder="t('editor.exportPdfDialog.valuePlaceholder')"
              :synced-tooltip="t('editor.exportPdfDialog.syncedTooltip')"
              :delete-label="t('editor.exportPdfDialog.deleteItem')"
            />
          </section>

          <!-- Final information -->
          <section class="flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <span :class="kickerClass">{{
                t('editor.exportPdfDialog.finalInfo.title')
              }}</span>
              <span class="text-[10px] font-medium text-content-400">{{
                endInfoCount
              }}</span>
            </div>
            <PdfInfoItemsList
              v-model:items="pdfExportStore.endInfo"
              :empty-message="t('editor.exportPdfDialog.finalInfo.empty')"
              :add-label="t('editor.exportPdfDialog.finalInfo.add')"
              :metadata-button-label="
                t('editor.exportPdfDialog.finalInfo.metadataButton')
              "
              :label-placeholder="t('editor.exportPdfDialog.labelPlaceholder')"
              :value-placeholder="t('editor.exportPdfDialog.valuePlaceholder')"
              :synced-tooltip="t('editor.exportPdfDialog.syncedTooltip')"
              :delete-label="t('editor.exportPdfDialog.deleteItem')"
            />
          </section>
        </div>
      </aside>

      <!-- ─── Preview pane (desktop only) ────────────────────────────── -->
      <div class="hidden lg:flex flex-1 flex-col overflow-hidden bg-surface-50">
        <!-- Canvas -->
        <div class="flex-1 overflow-hidden flex items-center justify-center">
          <div
            v-if="isEmpty"
            class="flex flex-col items-center gap-2 text-center max-w-xs"
          >
            <Icon
              name="ph:file-dashed-duotone"
              class="size-8 text-content-400"
            />
            <span class="font-mono text-xs text-content-400">
              {{ t('editor.exportPdfDialog.preview.empty') }}
            </span>
          </div>
          <Message v-else-if="error" severity="error" class="max-w-sm">
            <template #icon>
              <Icon name="ph:warning-circle-duotone" class="size-4 shrink-0" />
            </template>
            {{ t('editor.exportPdfDialog.preview.error') }}
          </Message>
          <div
            v-else-if="isGenerating && !previewUrl"
            class="bg-surface-0 w-full h-full animate-pulse"
          />
          <iframe
            v-else-if="previewUrl"
            :src="previewUrl"
            :title="t('editor.exportPdfDialog.preview.label')"
            class="w-full h-full bg-surface-0"
          />
        </div>
      </div>
    </div>

    <div v-show="false" ref="draftContainerRef" />
  </Dialog>
</template>
