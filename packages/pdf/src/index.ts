// High-level API
export { buildDefaultPdfFilename, createWellPdf } from './createWellPdf';

// Document assembly
export {
  PDF_SECTION_BUILDERS,
  buildDocDefinition,
  buildDocShell,
  buildLeadContent,
  toPdfContext,
} from './buildDocDefinition';
export {
  PAGE_CHROME,
  PDF_SECTION_KEYS,
  resolveBodyMargins,
  resolvePdfContext,
  resolvePdfPage,
  resolvePdfUnits,
} from './context';

// Profile SVG (browser only)
export {
  FIT_EPSILON,
  MIN_FIRST_PANEL_HEIGHT,
  PDF_CONTENT_WIDTH,
  PDF_MARGINS,
  buildSvgProfiles,
  computeFirstPageAvailableHeight,
  computePageSvgHeight,
  computeProfileWidth,
  computeTotalSvgHeight,
  planProfilePanels,
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
export { LEGEND_COLUMNS, buildLegendTable } from './layout/legend';
export {
  PROFILE_PROBE_ID,
  measureProfileStart,
} from './layout/measureProfileStart';
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
export type { ProfileStartPosition } from './layout/measureProfileStart';
export type {
  BuildSvgProfilesOptions,
  BuildSvgProfilesResult,
  PlanProfilePanelsOptions,
  ProfilePanel,
} from './svg/buildSvgProfiles';
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
  RenderedLegendItem,
  RenderedSvg,
  ResolvedInfoItem,
  ResolvedPdfPage,
} from './types/options.types';
export type {
  Content,
  ContentTable,
  NodePosition,
  PageBreakNodeInfo,
  PdfMakeStatic,
  TCreatedPdf,
  TDocumentDefinition,
  TFontDictionary,
  Watermark,
} from './types/pdfmake.types';
