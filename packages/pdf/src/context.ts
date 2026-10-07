import { DEFAULT_BASE_URL, WELLDOT_BRANDING } from './configs/branding.configs';
import { createPdfTranslate, resolvePdfLabels } from './configs/labels.utils';
import {
  DEFAULT_PDF_MARGIN,
  DEFAULT_PDF_THEME,
  PDF_PAGE_SIZES,
} from './configs/theme.configs';
import type {
  PdfContext,
  PdfExportOptions,
  PdfPageOptions,
  PdfSectionKey,
  PdfUnits,
  ResolvedPdfPage,
} from './types/options.types';

/** Default section order. */
export const PDF_SECTION_KEYS: readonly PdfSectionKey[] = [
  'construction',
  'hydrodynamicEvents',
  'historyLog',
  'pumpInstallations',
  'meters',
  'operatingRegimes',
  'production',
  'permits',
  'waterSamples',
];

/** Resolves page size, orientation and margins into points. */
export function resolvePdfPage(page: PdfPageOptions = {}): ResolvedPdfPage {
  const base =
    typeof page.size === 'object'
      ? page.size
      : PDF_PAGE_SIZES[page.size ?? 'A4'];
  const orientation = page.orientation ?? 'portrait';
  const [short, long] = [
    Math.min(base.width, base.height),
    Math.max(base.width, base.height),
  ];
  // A custom size keeps its own proportions unless an orientation is given.
  const { width, height } =
    typeof page.size === 'object' && !page.orientation
      ? base
      : orientation === 'landscape'
        ? { width: long, height: short }
        : { width: short, height: long };

  const m = page.margins ?? DEFAULT_PDF_MARGIN;
  const margins: [number, number, number, number] =
    typeof m === 'number' ? [m, m, m, m] : m;

  return {
    width,
    height,
    orientation: width > height ? 'landscape' : 'portrait',
    margins,
    contentWidth: width - margins[0] - margins[2],
  };
}

/** Fills in default display units. Without `volume`, it follows the length system (`ft` → `ft3`). */
export function resolvePdfUnits(units: PdfUnits = {}): Required<PdfUnits> {
  const length = units.length ?? 'm';
  return {
    length,
    diameter: units.diameter ?? 'inches',
    flow: units.flow ?? 'm3/h',
    power: units.power ?? 'kW',
    volume: units.volume ?? (length === 'ft' ? 'ft3' : 'm3'),
  };
}

function resolveSectionOrder(order?: PdfSectionKey[]): PdfSectionKey[] {
  const picked = (order ?? []).filter(
    (k, i, arr) => PDF_SECTION_KEYS.includes(k) && arr.indexOf(k) === i,
  );
  return [...picked, ...PDF_SECTION_KEYS.filter(k => !picked.includes(k))];
}

/**
 * Applies every default to `options`, resolves the label pack for the
 * locale and computes page geometry. The result is what each builder takes.
 */
export function resolvePdfContext(options: PdfExportOptions = {}): PdfContext {
  const locale = options.locale ?? 'pt';
  const t = createPdfTranslate(resolvePdfLabels(locale, options.labels));
  const theme = options.theme ?? {};

  const title = options.header?.title ?? options.title ?? t('document.title');

  const include = Object.fromEntries(
    PDF_SECTION_KEYS.map(k => [k, options.sections?.include?.[k] ?? true]),
  ) as Record<PdfSectionKey, boolean>;

  const branding = options.branding ?? {};

  return {
    locale,
    t,
    title,
    breakPages: options.breakPages ?? true,
    scale: options.scale ?? 500,
    metadataPosition:
      options.metadataPosition === undefined
        ? 'before'
        : options.metadataPosition,
    headingInfo: options.headingInfo ?? [],
    endInfo: options.endInfo ?? [],
    units: resolvePdfUnits(options.units),
    coordinateFormat: options.coordinateFormat ?? 'DD',
    waterQualityLimitSet: options.waterQualityLimitSet,
    baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
    shareUrl: options.shareUrl,
    shareExpiresAt: options.shareExpiresAt,
    omitShareBlock: options.omitShareBlock ?? false,
    branding: {
      logo:
        branding.logo === false
          ? false
          : branding.logo
            ? {
                ...branding.logo,
                width: branding.logo.width ?? 22,
                height: branding.logo.height ?? 22,
              }
            : WELLDOT_BRANDING.logo,
      name: branding.name ?? WELLDOT_BRANDING.name,
      subtitle: branding.subtitle ?? WELLDOT_BRANDING.subtitle,
    },
    watermark: options.watermark ?? false,
    page: resolvePdfPage(options.page),
    theme: {
      fonts: { ...DEFAULT_PDF_THEME.fonts, ...theme.fonts },
      colors: { ...DEFAULT_PDF_THEME.colors, ...theme.colors },
      fontSizes: { ...DEFAULT_PDF_THEME.fontSizes, ...theme.fontSizes },
    },
    header: {
      enabled: options.header?.enabled ?? true,
      showPageNumbers: options.header?.showPageNumbers ?? true,
      content: options.header?.content,
    },
    footer: {
      enabled: options.footer?.enabled ?? true,
      showQr: options.footer?.showQr ?? true,
      showHost: options.footer?.showHost ?? true,
      text: options.footer?.text,
      qrUrl: options.footer?.qrUrl,
      content: options.footer?.content,
    },
    sections: {
      include,
      order: resolveSectionOrder(options.sections?.order),
    },
    dateFormats: {
      date: options.dateFormats?.date ?? 'dd/MM/yyyy',
      dateTime: options.dateFormats?.dateTime ?? 'dd/MM/yyyy HH:mm',
    },
    profile: { ...options.profile },
    metadata: { ...options.metadata },
  };
}
