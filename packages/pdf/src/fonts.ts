// `@welldot/pdf/fonts` — the default font set (JetBrains Mono, Space Grotesk,
// IBM Plex Serif) as base64 TTFs (~1.7 MB). Kept on its own subpath so the
// main entry stays light; `createWellPdf` lazy-loads it when no custom
// `fonts` are given.
import vfsFontsData from './fonts/vfsFontsData';
import type { PdfFontsConfig } from './types/options.types';

/** Default pdfmake fonts: pass to `registerPdfFonts` or `createWellPdf({ fonts })`. */
export const WELLDOT_PDF_FONTS: PdfFontsConfig = {
  vfs: vfsFontsData,
  fonts: {
    jetBrainsMono: {
      normal: 'JetBrainsMono-Regular.ttf',
      bold: 'JetBrainsMono-Bold.ttf',
      italics: 'JetBrainsMono-Italic.ttf',
      bolditalics: 'JetBrainsMono-BoldItalic.ttf',
    },
    spaceGrotesk: {
      normal: 'SpaceGrotesk-Regular.ttf',
      bold: 'SpaceGrotesk-Bold.ttf',
      italics: 'SpaceGrotesk-Regular.ttf',
      bolditalics: 'SpaceGrotesk-Bold.ttf',
    },
    ibmPlexSerif: {
      normal: 'IBMPlexSerif-Regular.ttf',
      bold: 'IBMPlexSerif-Bold.ttf',
      italics: 'IBMPlexSerif-Italic.ttf',
      bolditalics: 'IBMPlexSerif-BoldItalic.ttf',
    },
  },
};

export default WELLDOT_PDF_FONTS;
