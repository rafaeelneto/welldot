import type { Well } from '@welldot/core';
import { format } from 'date-fns';
import { buildDocDefinition } from './buildDocDefinition';
import { resolvePdfContext } from './context';
import {
  measureCompactContentHeight,
  measureCompactSideSplit,
  measureLegendBreak,
  measureProfileStart,
} from './layout/measureProfileStart';
import { loadPdfMake } from './runtime/pdfmake';
import { registerPdfFonts } from './runtime/registerFonts';
import {
  buildSvgProfiles,
  computePageSvgHeight,
  PDF_MARGINS,
} from './svg/buildSvgProfiles';
import { FIT_EPSILON, MIN_FIRST_PANEL_HEIGHT } from './svg/planDetailedPanels';
import type {
  PdfExportOptions,
  PdfFontsConfig,
  PdfRenderedExtras,
} from './types/options.types';
import type {
  PdfMakeStatic,
  TCreatedPdf,
  TDocumentDefinition,
} from './types/pdfmake.types';

export interface CreateWellPdfOptions extends PdfExportOptions {
  /**
   * Attached element the profile SVGs are drawn into. When omitted, a hidden
   * element is appended to `document.body` and removed afterwards.
   */
  container?: HTMLElement;
  /** pdfmake instance. Defaults to a dynamic import of `pdfmake/build/pdfmake`. */
  pdfMake?: PdfMakeStatic;
  /** Fonts to register. Defaults to `@welldot/pdf/fonts`. Theme font names must match. */
  fonts?: PdfFontsConfig;
  /** Last chance to edit the document definition before pdfmake renders it. */
  transformDocDefinition?: (_doc: TDocumentDefinition) => TDocumentDefinition;
  /** Called between async steps; return `true` to stop (e.g. a newer render started). Resolves to `null` when cancelled. */
  isCancelled?: () => boolean;
}

export interface WellPdf {
  docDefinition: TDocumentDefinition;
  pdf: TCreatedPdf;
  getBlob(): Promise<Blob>;
  /** Downloads the PDF, by default as {@link buildDefaultPdfFilename}. */
  download(_filename?: string): Promise<void>;
  print(): Promise<void>;
}

/**
 * `welldot_<name>_<dd_MM_yyyy_HH_mm>.pdf`, with the name lowercased and
 * spaces turned into underscores (`well` when unnamed).
 */
export function buildDefaultPdfFilename(
  well: Pick<Well, 'name'> | null | undefined,
  date: Date = new Date(),
  prefix = 'welldot',
): string {
  const name = (well?.name || 'well').trim().replace(/\s+/g, '_').toLowerCase();
  return `${prefix}_${name}_${format(date, 'dd_MM_yyyy_HH_mm')}.pdf`;
}

function createHiddenContainer(): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('aria-hidden', 'true');
  el.style.cssText =
    'position:absolute;left:-10000px;top:0;width:0;height:0;overflow:hidden;visibility:hidden;';
  document.body.appendChild(el);
  return el;
}

/**
 * One-call export in the browser: loads pdfmake and fonts, measures where
 * the profile starts, renders the profile SVGs to fill each page, builds
 * the document and returns the created PDF with blob/download/print helpers.
 *
 * Pass a well already prepared for export (normalized, redacted if needed).
 *
 * @example
 * const pdf = await createWellPdf(well, {
 *   locale: 'en',
 *   branding: { logo: { image: myLogoDataUrl }, name: 'ACME Drilling', subtitle: false },
 *   watermark: { text: 'DRAFT' },
 * });
 * await pdf?.download();
 */
export async function createWellPdf(
  well: Well,
  options: CreateWellPdfOptions = {},
): Promise<WellPdf | null> {
  const { container, pdfMake, fonts, transformDocDefinition, isCancelled } =
    options;
  const cancelled = () => isCancelled?.() ?? false;
  const ctx = resolvePdfContext(options);

  const instance = pdfMake ?? (await loadPdfMake());
  await registerPdfFonts(instance, fonts);
  if (cancelled()) return null;

  // Lay out what precedes the profile first, so its first panel fills
  // exactly the space left on that page.
  const start = await measureProfileStart(well, ctx, instance);
  if (cancelled()) return null;

  // Profile sized to the compact tables beside it, or to the space left on
  // one page (the next page's body when too little is left on this one).
  let drawingHeight: number | undefined;
  const padding = PDF_MARGINS.top + PDF_MARGINS.bottom;
  if (ctx.profileFit === 'content') {
    const height = await measureCompactContentHeight(well, ctx, instance);
    if (height != null) drawingHeight = height - padding;
  } else if (ctx.profileFit === 'page') {
    const onePage =
      start ??
      (await measureProfileStart(well, { ...ctx, breakPages: true }, instance));
    if (onePage) {
      const room = onePage.remaining - FIT_EPSILON - padding;
      drawingHeight =
        room >= MIN_FIRST_PANEL_HEIGHT
          ? room
          : computePageSvgHeight(ctx.page) - padding;
    }
  }
  if (cancelled()) return null;

  const target = container ?? createHiddenContainer();
  let svgResult;
  try {
    svgResult = await buildSvgProfiles(well, target, ctx, {
      firstPageRemaining: start?.remaining,
      startPage: start?.pageNumber,
      drawingHeight,
    });
  } finally {
    if (!container) target.remove();
  }
  if (cancelled()) return null;

  const extras: PdfRenderedExtras = {
    lithologySwatches: svgResult.lithologySwatches,
  };
  // Compact: the tables that start after the profile ends take the full
  // width instead of leaving the profile column empty.
  extras.compactSideSplit = await measureCompactSideSplit(
    well,
    svgResult.svgs,
    svgResult.legendItems,
    ctx,
    instance,
    extras,
  );
  if (cancelled()) return null;

  // Whatever would run into the legend strip at the foot of the first
  // profile page starts on the next page instead.
  extras.legendBreak = await measureLegendBreak(
    well,
    svgResult.svgs,
    svgResult.legendItems,
    ctx,
    instance,
    extras,
  );
  if (cancelled()) return null;

  const built = buildDocDefinition(
    well,
    svgResult.svgs,
    svgResult.legendItems,
    ctx,
    extras,
  );
  const docDefinition = transformDocDefinition?.(built) ?? built;
  const pdf = instance.createPdf(docDefinition);

  return {
    docDefinition,
    pdf,
    getBlob: () => pdf.getBlob(),
    download: filename =>
      pdf.download(filename ?? buildDefaultPdfFilename(well)),
    print: () => pdf.print(),
  };
}
