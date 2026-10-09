import type { Well } from '@welldot/core';
import { format } from 'date-fns';
import { buildDocDefinition } from './buildDocDefinition';
import { resolvePdfContext } from './context';
import { loadPdfMake } from './runtime/pdfmake';
import { registerPdfFonts } from './runtime/registerFonts';
import { buildSvgProfiles } from './svg/buildSvgProfiles';
import type { PdfExportOptions, PdfFontsConfig } from './types/options.types';
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
 * One-call export in the browser: renders the profile SVGs, loads pdfmake
 * and fonts, builds the document and returns the created PDF with
 * blob/download/print helpers.
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

  const target = container ?? createHiddenContainer();
  let svgResult;
  try {
    svgResult = await buildSvgProfiles(well, target, ctx);
  } finally {
    if (!container) target.remove();
  }
  if (cancelled()) return null;

  const instance = pdfMake ?? (await loadPdfMake());
  await registerPdfFonts(instance, fonts);
  if (cancelled()) return null;

  const built = buildDocDefinition(
    well,
    svgResult.svgs,
    svgResult.legendSvg,
    ctx,
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
