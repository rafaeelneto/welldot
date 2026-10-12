// High-level API
export { buildDefaultPdfFilename, createWellPdf } from './createWellPdf';

// Document assembly
export {
  COMPACT_COLUMNS_ID,
  LEGEND_STRIP_ID,
  PDF_SECTION_BUILDERS,
  buildCompactBlocks,
  buildCompactSideContent,
  buildDocDefinition,
  buildDocShell,
  buildLeadContent,
  startOnNextPage,
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
  LEGEND_GAP,
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
export {
  OVERLAP_HEIGHT,
  SNAP_RATIO,
  planDetailedPanels,
} from './svg/planDetailedPanels';
export {
  COMPACT_COLUMN_GAP,
  COMPACT_PROFILE_RATIO,
  computeCompactColumnWidth,
  computeCompactSideWidth,
  getLithologyContacts,
} from './svg/profileLayouts';

// Runtime
export { loadPdfMake } from './runtime/pdfmake';
export { loadDefaultPdfFonts, registerPdfFonts } from './runtime/registerFonts';

// Sections
export { buildCaveSection } from './sections/caveTable';
export { buildFractureSection } from './sections/fractureTable';
export { buildHistoryLogSection } from './sections/historyLogTable';
export { buildHydrodynamicEventsSection } from './sections/hydrodynamicEventsTable';
export { buildLithologySection } from './sections/lithologyTable';
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
  LEGEND_COLUMNS,
  LEGEND_ROW_HEIGHT,
  buildLegendStrip,
  buildLegendTable,
  computeLegendStripHeight,
  packLegendRows,
} from './layout/legend';
export {
  COMPACT_SPLIT_MIN_ROOM,
  PROFILE_PROBE_ID,
  SIDE_END_PROBE_ID,
  measureCompactContentHeight,
  measureCompactSideSplit,
  measureLegendBreak,
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
  DetailedPanel,
  PlanDetailedPanelsOptions,
} from './svg/planDetailedPanels';
export type { ContactSnap } from './svg/profileLayouts';
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
  PdfProfileFit,
  PdfProfileFormat,
  PdfProfileOptions,
  PdfRenderedExtras,
  PdfSectionKey,
  PdfSectionsOptions,
  PdfTheme,
  PdfThemeColors,
  PdfThemeFontSizes,
  PdfThemeFonts,
  PdfUnits,
  PdfWatermark,
  RenderedLegendItem,
  RenderedProfilePanel,
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
