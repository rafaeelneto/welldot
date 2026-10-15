import type { PdfFontsConfig } from '../types/options.types';
import type { PdfMakeStatic } from '../types/pdfmake.types';

const registered = new WeakMap<PdfMakeStatic, Set<PdfFontsConfig>>();

/**
 * Loads the default font set from the `@welldot/pdf/fonts` entry (~1.7 MB, lazy).
 * Imported through the package's own subpath (external in the build) so the
 * font data never gets inlined into the main bundle.
 */
export async function loadDefaultPdfFonts(): Promise<PdfFontsConfig> {
  const { WELLDOT_PDF_FONTS } = await import('@welldot/pdf/fonts');
  return WELLDOT_PDF_FONTS;
}

/**
 * Registers fonts with a `pdfmake` instance's virtual file system.
 * Defaults to the Welldot font set. Idempotent per instance and config.
 */
export async function registerPdfFonts(
  pdfMake: PdfMakeStatic,
  fonts?: PdfFontsConfig,
): Promise<void> {
  const config = fonts ?? (await loadDefaultPdfFonts());
  let seen = registered.get(pdfMake);
  if (!seen) {
    seen = new Set();
    registered.set(pdfMake, seen);
  }
  if (seen.has(config)) return;

  pdfMake.addVirtualFileSystem(config.vfs);
  pdfMake.addFonts(config.fonts);
  seen.add(config);
}
