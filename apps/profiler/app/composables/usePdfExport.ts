import type { Well } from '@welldot/core';
import {
  deserializeWell,
  isWellEmpty,
  redactWell,
  serializeWell,
} from '@welldot/core';
import { format } from 'date-fns';
import type { Ref } from 'vue';
import type { PdfInfoItem } from '~/stores/pdfExport.store';
import { buildDocDefinition } from '~/utils/pdfExport/buildDocDefinition';
import {
  buildSvgProfiles,
  computeFirstPageAvailableHeight,
} from '~/utils/pdfExport/buildSvgProfiles';
import { registerPdfFonts } from '~/utils/pdfExport/pdfFonts';
import type { TCreatedPdf } from '~/utils/pdfExport/pdfmake.types';
import type {
  PdfExportOptions,
  ResolvedInfoItem,
} from '~/utils/pdfExport/types';

/**
 * Orchestrates PDF preview generation (debounced, client-only), download,
 * and print — all built from the same `buildDocDefinition` document, so
 * preview/download/print are always byte-identical.
 *
 * `draftContainer` must resolve to a mounted, hidden element scoped to the
 * caller's own lifecycle — `buildSvgProfiles` draws into `<svg>` children
 * appended to it.
 */
export function usePdfExport(draftContainer: Ref<HTMLElement | null>) {
  const { t, locale } = useI18n();
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
      const options: PdfExportOptions = {
        header: pdfExportStore.header,
        breakPages: pdfExportStore.breakPages,
        scale: pdfExportStore.scale,
        metadataPosition: pdfExportStore.metadataPosition,
        headingInfo: resolveInfoItems(pdfExportStore.headingInfo),
        endInfo: resolveInfoItems(pdfExportStore.endInfo),
        lengthUnit: uiStore.lengthUnit,
        diameterUnit: uiStore.diameterUnit,
        flowUnit: uiStore.flowUnit,
        powerUnit: uiStore.powerUnit,
        volumeUnit: uiStore.volumeUnit,
        coordinateFormat: uiStore.coordinateFormat,
        locale: locale.value,
        baseUrl,
        shareUrl: share ? `${baseUrl}/editor?share=${share.id}` : undefined,
        shareExpiresAt: share?.expiresAt,
        omitShareBlock: applyRedaction,
      };

      const firstPageAvailableHeight = computeFirstPageAvailableHeight({
        headingInfoCount: options.headingInfo.length,
        metadataPosition: options.metadataPosition,
      });

      const { svgs, legendSvg } = await buildSvgProfiles(well, container, {
        breakPages: options.breakPages,
        scale: options.scale,
        firstPageAvailableHeight,
        units: {
          length: options.lengthUnit,
          diameter: options.diameterUnit,
          power: options.powerUnit,
        },
        locale: options.locale,
      });
      if (token !== renderToken) return null;

      const { default: pdfMake } = await import('pdfmake/build/pdfmake');
      await registerPdfFonts(pdfMake);
      if (token !== renderToken) return null;

      const docDefinition = buildDocDefinition(
        well,
        svgs,
        legendSvg,
        options,
        t,
      );
      const pdfDoc = pdfMake.createPdf(docDefinition);
      const blob = await pdfDoc.getBlob();
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
    const name = profileStore.getExportableWell()?.name || 'well';
    const filename = `welldot_${name.trim().replace(/\s+/g, '_').toLowerCase()}_${format(new Date(), 'dd_MM_yyyy_HH_mm')}.pdf`;
    await pdfDoc.download(filename);
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
        lengthUnit: uiStore.lengthUnit,
        diameterUnit: uiStore.diameterUnit,
        flowUnit: uiStore.flowUnit,
        powerUnit: uiStore.powerUnit,
        volumeUnit: uiStore.volumeUnit,
        coordinateFormat: uiStore.coordinateFormat,
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
