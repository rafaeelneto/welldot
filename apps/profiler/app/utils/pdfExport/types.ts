import type {
  DiameterUnits,
  FlowUnits,
  LengthUnits,
  PowerUnits,
} from '@welldot/core';
import type { CoordinateFormat } from '~/stores/ui.store';

/** `useI18n().t`, narrowed to what the pure `pdfExport` builders need. */
export type PdfTranslate = (_key: string) => string;

export interface ResolvedInfoItem {
  label: string;
  /** Already resolved via `useWellMetadataFields().resolveMetadataValue` when the source item had `profileField` set. */
  value: string;
}

export interface PdfExportOptions {
  header: string;
  breakPages: boolean;
  /** 1:N scale ratio, matches `pdfExportStore.scale`. */
  scale: number;
  metadataPosition: 'before' | 'after' | null;
  headingInfo: ResolvedInfoItem[];
  endInfo: ResolvedInfoItem[];
  lengthUnit: LengthUnits;
  diameterUnit: DiameterUnits;
  /** Display unit for flow rates. Defaults to `m3/h`. */
  flowUnit?: FlowUnits;
  /** Display unit for power. Defaults to `kW`. */
  powerUnit?: PowerUnits;
  coordinateFormat: CoordinateFormat;
  /** Active app locale (`useI18n().locale.value`) — drives the diameter unit symbol (`in.`/`"`) and the embedded profile SVG's language. */
  locale: string;
  /** Origin the PDF is being generated from (e.g. `useRequestURL().origin`). Footer QR/branding fall back to this when there's no `shareUrl`. */
  baseUrl: string;
  /** Share link for the exported profile. Falls back to the `baseUrl` QR when absent. */
  shareUrl?: string;
  /** ISO timestamp the share expires at; shown as "valid until" next to the footer QR when `shareUrl` is set. */
  shareExpiresAt?: string;
  /** True when the PDF is redacting sections — tells the footer to drop the QR/tagline entirely instead of falling back to `baseUrl`. */
  omitShareBlock?: boolean;
}

export interface RenderedSvg {
  /** `outerHTML` of the rendered `<svg>` element. */
  markup: string;
  width: number;
  height: number;
}
