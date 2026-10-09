import { defineStore } from 'pinia';
import type { WellMetadataFieldKey } from '~/composables/useWellMetadataFields';

export const DEFAULT_PDF_HEADER = 'PERFIL GEOLÓGICO';

export interface PdfInfoItem {
  id: string;
  label: string;
  value: string;
  profileField?: WellMetadataFieldKey;
}

export const usePdfExportStore = defineStore(
  'pdfExport',
  () => {
    const header = ref(DEFAULT_PDF_HEADER);
    const breakPages = ref(false);
    const scale = ref(500);
    const metadataPosition = ref<'before' | 'after' | null>('before');
    const headingInfo = ref<PdfInfoItem[]>([]);
    const endInfo = ref<PdfInfoItem[]>([]);
    /** Whether the PDF applies the shared visibility preference (`shareVisibility.store.ts`). Off by default. */
    const useCustomVisibility = ref(false);

    return {
      header,
      breakPages,
      scale,
      metadataPosition,
      headingInfo,
      endInfo,
      useCustomVisibility,
    };
  },
  {
    persist: { key: 'welldot_pdf_export' },
  },
);
