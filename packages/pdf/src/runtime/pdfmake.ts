import type { PdfMakeStatic } from '../types/pdfmake.types';

/** Dynamically imports pdfmake's browser build (keeps it out of SSR/server bundles). */
export async function loadPdfMake(): Promise<PdfMakeStatic> {
  const mod = (await import('pdfmake/build/pdfmake')) as unknown as {
    default?: PdfMakeStatic;
  } & PdfMakeStatic;
  return mod.default ?? mod;
}
