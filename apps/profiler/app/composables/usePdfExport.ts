import type { Well } from '@welldot/core';
import {
  deserializeWell,
  isWellEmpty,
  redactWell,
  serializeWell,
} from '@welldot/core';
import type {
  CreateWellPdfOptions,
  ResolvedInfoItem,
  TCreatedPdf,
} from '@welldot/pdf';
import { buildDefaultPdfFilename, createWellPdf } from '@welldot/pdf';
import type { Ref } from 'vue';
import type { PdfInfoItem } from '~/stores/pdfExport.store';

/**
 * Orchestrates PDF preview generation (debounced, client-only), download,
 * and print through `createWellPdf` from `@welldot/pdf` — all from the same
 * document, so preview/download/print are always byte-identical.
 *
 * `draftContainer` must resolve to a mounted, hidden element scoped to the
 * caller's own lifecycle — the profile SVGs are drawn into it.
 */
export function usePdfExport(draftContainer: Ref<HTMLElement | null>) {
  const { locale } = useI18n();
  const profileStore = useProfileStore();
  const pdfExportStore = usePdfExportStore();
  const shareVisibilityStore = useShareVisibilityStore();
  const uiStore = useUiStore();
  const { resolveMetadataValue } = useWellMetadataFields();

  const previewUrl = ref<string | null>(null);
  const isGenerating = ref(false);
  const error = ref<string | null>(null);

  let lastPdfDoc: TCreatedPdf | null = null;
  let renderToken = 0;

  function resolveInfoItems(items: PdfInfoItem[]): ResolvedInfoItem[] {
    return items.map(item => ({
      label: item.label,
      value: item.profileField
        ? resolveMetadataValue(profileStore.well, item.profileField)
        : item.value,
    }));
  }

  /** Defensive v1→v2 normalization round-trip, mirroring legacy's fix for stale `fgdc_texture` data. */
  function normalizeWell(well: Well): Well {
    return (deserializeWell(serializeWell(well)) as Well | null) ?? well;
  }

  function clearPreview(): void {
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = null;
    lastPdfDoc = null;
  }

  async function generate(): Promise<TCreatedPdf | null> {
    const container = draftContainer.value;
    const exportableWell = profileStore.getExportableWell();

    if (!container || !exportableWell || isWellEmpty(exportableWell)) {
      clearPreview();
      error.value = null;
      return null;
    }

    renderToken += 1;
    const token = renderToken;
    isGenerating.value = true;

    try {
      const applyRedaction =
        pdfExportStore.useCustomVisibility && shareVisibilityStore.hasHidden;

      const well = normalizeWell(
        applyRedaction
          ? redactWell(exportableWell, shareVisibilityStore.visibility)
          : exportableWell,
      );
      const baseUrl = useRequestURL().origin;
      // A redacted PDF never fetches or displays a share link — it would
      // point to the full, non-redacted profile via the footer QR.
      const share = applyRedaction
        ? null
        : await useProfileShare()
            .getShare()
            .catch(() => null);
      const options: CreateWellPdfOptions = {
        container,
        title: pdfExportStore.header,
        breakPages: pdfExportStore.breakPages,
        scale: pdfExportStore.scale,
        metadataPosition: pdfExportStore.metadataPosition,
        headingInfo: resolveInfoItems(pdfExportStore.headingInfo),
        endInfo: resolveInfoItems(pdfExportStore.endInfo),
        units: {
          length: uiStore.lengthUnit,
          diameter: uiStore.diameterUnit,
          flow: uiStore.flowUnit,
          power: uiStore.powerUnit,
          volume: uiStore.volumeUnit,
        },
        coordinateFormat: uiStore.coordinateFormat,
        waterQualityLimitSet: uiStore.waterQualityLimitSet,
        locale: locale.value,
        baseUrl,
        shareUrl: share ? `${baseUrl}/editor?share=${share.id}` : undefined,
        shareExpiresAt: share?.expiresAt,
        omitShareBlock: applyRedaction,
        isCancelled: () => token !== renderToken,
      };

      const result = await createWellPdf(well, options);
      if (!result || token !== renderToken) return null;

      const pdfDoc = result.pdf;
      const blob = await result.getBlob();
      if (token !== renderToken) return null;

      if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
      previewUrl.value = URL.createObjectURL(blob);
      lastPdfDoc = pdfDoc;
      error.value = null;
      return pdfDoc;
    } catch (err) {
      if (token !== renderToken) return null;
      console.error('[usePdfExport] PDF generation failed:', err);
      clearPreview();
      error.value = err instanceof Error ? err.message : String(err);
      return null;
    } finally {
      if (token === renderToken) isGenerating.value = false;
    }
  }

  async function ensureCurrentPdf(): Promise<TCreatedPdf | null> {
    if (lastPdfDoc && !error.value) return lastPdfDoc;
    return generate();
  }

  async function download(): Promise<void> {
    const pdfDoc = await ensureCurrentPdf();
    if (!pdfDoc) return;
    await pdfDoc.download(
      buildDefaultPdfFilename(profileStore.getExportableWell()),
    );
  }

  async function print(): Promise<void> {
    const pdfDoc = await ensureCurrentPdf();
    if (!pdfDoc) return;
    await pdfDoc.print();
  }

  onMounted(() => {
    watchDebounced(
      () => ({
        well: profileStore.well,
        header: pdfExportStore.header,
        breakPages: pdfExportStore.breakPages,
        scale: pdfExportStore.scale,
        metadataPosition: pdfExportStore.metadataPosition,
        headingInfo: pdfExportStore.headingInfo,
        endInfo: pdfExportStore.endInfo,
        useCustomVisibility: pdfExportStore.useCustomVisibility,
        visibility: shareVisibilityStore.visibility,
        units: {
          length: uiStore.lengthUnit,
          diameter: uiStore.diameterUnit,
          flow: uiStore.flowUnit,
          power: uiStore.powerUnit,
          volume: uiStore.volumeUnit,
        },
        coordinateFormat: uiStore.coordinateFormat,
        waterQualityLimitSet: uiStore.waterQualityLimitSet,
      }),
      () => {
        void generate();
      },
      { debounce: 500, deep: true, immediate: true },
    );
  });

  onUnmounted(() => {
    renderToken += 1;
    clearPreview();
  });

  return { previewUrl, isGenerating, error, download, print };
}
