import type { PdfPageSizeName, PdfTheme } from '../types/options.types';

/** Default theme. Font names match the families registered by `@welldot/pdf/fonts`. */
export const DEFAULT_PDF_THEME: PdfTheme = {
  fonts: {
    body: 'jetBrainsMono',
    heading: 'ibmPlexSerif',
    label: 'spaceGrotesk',
  },
  colors: {
    text: '#3d3d3d',
    title: '#001537',
    tableHeader: '#555555',
    tableRule: '#3d3d3d',
    pageRule: '#cccccc',
    divider: '#e5e5e5',
    footerText: '#494949',
    exceedance: '#b91c1c',
    brandName: '#1a1a2e',
    brandSubtitle: '#888888',
  },
  fontSizes: {
    body: 11,
    title: 12,
    sectionTitle: 13,
    tableHeader: 9,
    metadataLabel: 8,
    metadataValue: 10,
    footer: 7,
  },
};

/** Portrait page sizes in points. */
export const PDF_PAGE_SIZES: Record<
  PdfPageSizeName,
  { width: number; height: number }
> = {
  A4: { width: 595.28, height: 841.89 },
  A3: { width: 841.89, height: 1190.55 },
  LETTER: { width: 612, height: 792 },
  LEGAL: { width: 612, height: 1008 },
};

export const DEFAULT_PDF_MARGIN = 30;
