// High-level API
export { buildDefaultPdfFilename, createWellPdf } from './createWellPdf';

// Document assembly
export {
  PDF_SECTION_BUILDERS,
  buildDocDefinition,
  toPdfContext,
} from './buildDocDefinition';
export {
  PDF_SECTION_KEYS,
  resolvePdfContext,
  resolvePdfPage,
  resolvePdfUnits,
} from './context';

// Profile SVG (browser only)
export {
  A4_SVG_HEIGHT,
  PDF_CONTENT_WIDTH,
  PDF_MARGINS,
  buildSvgProfiles,
  computeFirstPageAvailableHeight,
  computePageHeights,
  computePageSvgHeight,
  computeProfileWidth,
  computeTotalSvgHeight,
} from './svg/buildSvgProfiles';

// Runtime
export { loadPdfMake } from './runtime/pdfmake';
export { loadDefaultPdfFonts, registerPdfFonts } from './runtime/registerFonts';

// Sections
export { buildHistoryLogSection } from './sections/historyLogTable';
export { buildHydrodynamicEventsSection } from './sections/hydrodynamicEventsTable';
export {
  buildMetadataTable,
  packLabelValueRows,
} from './sections/metadataTable';
export { buildMeterSection } from './sections/meterTable';
export { buildOperatingRegimeSection } from './sections/operatingRegimeTable';
export { buildPermitSection } from './sections/permitTable';
export { buildProductionSection } from './sections/productionTable';
export { buildPumpInstallationSection } from './sections/pumpInstallationTable';
export { buildSectionTables } from './sections/sectionTables';
export { buildWaterSampleSection } from './sections/waterSampleTable';

// Layout
export { buildFooterContent } from './layout/footer';
export { buildHeaderContent } from './layout/header';
export {
  buildEntryDivider,
  buildRule,
  headerCell,
  lightLinesLayout,
  rightCell,
  withTableTitle,
} from './layout/tables';
export { buildImageWatermark, buildTextWatermark } from './layout/watermark';

// Configs
export { WELLDOT_LOGO_SVG } from './assets/welldotLogo';
export { DEFAULT_BASE_URL, WELLDOT_BRANDING } from './configs/branding.configs';
export { PDF_LABELS } from './configs/labels.configs';
export { resolvePdfLabels } from './configs/labels.utils';
export {
  DEFAULT_PDF_MARGIN,
  DEFAULT_PDF_THEME,
  PDF_PAGE_SIZES,
} from './configs/theme.configs';
export { createPdfFormatters } from './formatters';

export type {
  PdfDefaultLabel,
  PdfLabelPack,
  PdfLabelTree,
} from './configs/labels.configs';
export type { ResolvedPdfLabels } from './configs/labels.utils';
export type { CreateWellPdfOptions, WellPdf } from './createWellPdf';
export type { PdfFormatters } from './formatters';
export type { BuildSvgProfilesResult } from './svg/buildSvgProfiles';
export type {
  CoordinateFormat,
  PdfBranding,
  PdfContext,
  PdfDateFormats,
  PdfExportOptions,
  PdfFontsConfig,
  PdfFooterOptions,
  PdfHeaderOptions,
  PdfLabelOverrides,
  PdfLabels,
  PdfLocalizedText,
  PdfLogo,
  PdfPageContentFn,
  PdfPageOptions,
  PdfPageSizeName,
  PdfProfileOptions,
  PdfSectionKey,
  PdfSectionsOptions,
  PdfTheme,
  PdfThemeColors,
  PdfThemeFontSizes,
  PdfThemeFonts,
  PdfUnits,
  PdfWatermark,
  RenderedSvg,
  ResolvedInfoItem,
  ResolvedPdfPage,
} from './types/options.types';
export type {
  Content,
  ContentTable,
  PdfMakeStatic,
  TCreatedPdf,
  TDocumentDefinition,
  TFontDictionary,
  Watermark,
} from './types/pdfmake.types';
