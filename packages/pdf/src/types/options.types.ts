import type {
  DiameterUnits,
  FlowUnits,
  LanguageText,
  LengthUnits,
  PowerUnits,
  VolumeUnits,
} from '@welldot/core';
import type { DeepPartial, RenderConfig, WellTheme } from '@welldot/render';
import type { PdfLabelPack } from '../configs/labels.configs';
import type { Content, TFontDictionary } from './pdfmake.types';

/** Coordinate display format: decimal degrees or degrees/minutes/seconds. */
export type CoordinateFormat = 'DD' | 'DMS';

/** Localized text: a plain string, or a `LanguageText` resolved by `locale`. */
export type PdfLocalizedText = LanguageText | string;

/** Looks up a label by its dot path in the resolved label pack (e.g. `general.name`). Returns the key itself when missing. */
export type PdfTranslate = (_key: string) => string;

/** Partial, per-leaf override of {@link PdfLabelPack}. Leaves accept a plain string or a `LanguageText`. */
export type PdfLabelOverrides<T = PdfLabelPack> = {
  [K in keyof T]?: T[K] extends { en: string; pt: string }
    ? PdfLocalizedText
    : PdfLabelOverrides<T[K]>;
};

/** One label/value cell of the heading or end info grid. */
export interface ResolvedInfoItem {
  label: string;
  value: string;
}

/** Content sections, in their default order. */
export type PdfSectionKey =
  | 'construction'
  | 'hydrodynamicEvents'
  | 'historyLog'
  | 'pumpInstallations'
  | 'meters'
  | 'operatingRegimes'
  | 'production'
  | 'permits'
  | 'waterSamples';

/** A page renderer callback, used to replace the built-in header or footer. */
export type PdfPageContentFn = (
  _currentPage: number,
  _pageCount: number,
) => Content | Content[] | undefined;

/** Display units of the report. Values are always stored canonically (m, mm, m³/h, kW, m³). */
export interface PdfUnits {
  /** Defaults to `m`. */
  length?: LengthUnits;
  /** Defaults to `inches`. */
  diameter?: DiameterUnits;
  /** Defaults to `m3/h`. */
  flow?: FlowUnits;
  /** Defaults to `kW`. */
  power?: PowerUnits;
  /** Defaults to `ft3` when `length` is `ft`, else `m3`. */
  volume?: VolumeUnits;
}

// ---------------------------------------------------------------------------
// Customization groups
// ---------------------------------------------------------------------------

/** Logo drawn at the left of the page header. Give `svg` markup or an `image` data URL. */
export interface PdfLogo {
  svg?: string;
  /** Data URL of a PNG/JPEG (`data:image/png;base64,…`). Used when `svg` is not set. */
  image?: string;
  width?: number;
  height?: number;
}

export interface PdfBranding {
  /** `false` hides the logo. Defaults to the Welldot logo. */
  logo?: PdfLogo | false;
  /** Brand name next to the logo. `false` hides it. Defaults to `Welldot`. */
  name?: string | false;
  /** Line under the brand name. `false` hides it. Defaults to `welldot.org`. */
  subtitle?: string | false;
}

/** Watermark drawn behind the content of every page. Give `text` or an `image` data URL. */
export interface PdfWatermark {
  text?: string;
  /** Data URL of a PNG/JPEG image, centered on the page. */
  image?: string;
  /** Image width in points (keeps the aspect ratio). Defaults to half the page width. */
  imageWidth?: number;
  color?: string;
  /** 0–1. Defaults to `0.08`. */
  opacity?: number;
  /** Text rotation in degrees. Defaults to the page diagonal. */
  angle?: number;
  fontSize?: number;
  bold?: boolean;
  italics?: boolean;
  /** Font family name registered with pdfmake. Defaults to the theme heading font. */
  font?: string;
}

export type PdfPageSizeName = 'A4' | 'A3' | 'LETTER' | 'LEGAL';

export interface PdfPageOptions {
  /** Named size or explicit size in points. Defaults to `A4`. */
  size?: PdfPageSizeName | { width: number; height: number };
  /** Defaults to `portrait`. */
  orientation?: 'portrait' | 'landscape';
  /** Page margin in points: one value, or `[left, top, right, bottom]`. Defaults to `30`. */
  margins?: number | [number, number, number, number];
}

export interface PdfThemeFonts {
  /** Default text and profile labels. */
  body: string;
  /** Document title and section titles. */
  heading: string;
  /** Table headers, metadata, footer and construction labels in the profile. */
  label: string;
}

export interface PdfThemeColors {
  text: string;
  title: string;
  tableHeader: string;
  tableRule: string;
  pageRule: string;
  divider: string;
  footerText: string;
  exceedance: string;
  brandName: string;
  brandSubtitle: string;
}

export interface PdfThemeFontSizes {
  body: number;
  title: number;
  sectionTitle: number;
  tableHeader: number;
  metadataLabel: number;
  metadataValue: number;
  footer: number;
}

export interface PdfTheme {
  fonts: PdfThemeFonts;
  colors: PdfThemeColors;
  fontSizes: PdfThemeFontSizes;
}

export interface PdfHeaderOptions {
  /** Document title. Defaults to the `document.title` label in the active locale. */
  title?: string;
  /** Show the `Page X/Y` counter. Defaults to `true`. */
  showPageNumbers?: boolean;
  /** Replaces the whole built-in header. */
  content?: PdfPageContentFn;
  /** `false` removes the header entirely. */
  enabled?: boolean;
}

export interface PdfFooterOptions {
  /** Left-hand footer text. Defaults to `.well v2 - <yyyy-MM-dd>`. */
  text?: string;
  /** Show the QR code and tagline. Defaults to `true` (ignored when `omitShareBlock`). */
  showQr?: boolean;
  /** URL the QR encodes. Defaults to `shareUrl ?? baseUrl`. */
  qrUrl?: string;
  /** Show the host of `baseUrl` in the middle column. Defaults to `true`. */
  showHost?: boolean;
  /** Replaces the whole built-in footer. */
  content?: PdfPageContentFn;
  /** `false` removes the footer entirely. */
  enabled?: boolean;
}

export interface PdfSectionsOptions {
  /** Turn individual sections on/off. All are on by default (empty sections are always skipped). */
  include?: Partial<Record<PdfSectionKey, boolean>>;
  /** Custom section order. Sections left out are appended in default order. */
  order?: PdfSectionKey[];
}

export interface PdfDateFormats {
  /** date-fns pattern for calendar dates. Defaults to `dd/MM/yyyy`. */
  date?: string;
  /** date-fns pattern for date-times. Defaults to `dd/MM/yyyy HH:mm`. */
  dateTime?: string;
}

export interface PdfProfileOptions {
  renderConfig?: DeepPartial<RenderConfig>;
  theme?: DeepPartial<WellTheme>;
}

/** Custom pdfmake fonts: a virtual file system and the families that use it. */
export interface PdfFontsConfig {
  vfs: Record<string, string>;
  fonts: TFontDictionary;
}

// ---------------------------------------------------------------------------
// Public options
// ---------------------------------------------------------------------------

/** Options for building a well PDF. Every field is optional. */
export interface PdfExportOptions {
  /** BCP 47 locale for labels, vocabularies and the profile SVG. Defaults to `pt`. */
  locale?: string;
  /** Document title. Shortcut for `header.title`. */
  title?: string;
  /** `true`: fixed-height pages with a footer on each. `false`: one auto-height page. Defaults to `true`. */
  breakPages?: boolean;
  /** 1:N profile scale. Defaults to `500`. */
  scale?: number;
  /** Where the general-info table goes relative to the profile. Defaults to `before`. */
  metadataPosition?: 'before' | 'after' | null;
  headingInfo?: ResolvedInfoItem[];
  endInfo?: ResolvedInfoItem[];
  /** Display units. Missing entries use their defaults. */
  units?: PdfUnits;
  /** Defaults to `DD`. */
  coordinateFormat?: CoordinateFormat;
  /** Water quality limit set id (`getLimitSet` of `@welldot/core`). Exceedances are marked only when set. */
  waterQualityLimitSet?: string | null;
  /** Origin shown in the footer and encoded in the fallback QR. Defaults to `https://welldot.org`. */
  baseUrl?: string;
  /** Share link of the profile; encoded in the footer QR. */
  shareUrl?: string;
  /** ISO timestamp the share expires at. */
  shareExpiresAt?: string;
  /** Drop the footer QR/tagline entirely (e.g. when the PDF is redacted). */
  omitShareBlock?: boolean;

  branding?: PdfBranding;
  /** `false` (default) for none. */
  watermark?: PdfWatermark | false;
  page?: PdfPageOptions;
  theme?: {
    fonts?: Partial<PdfThemeFonts>;
    colors?: Partial<PdfThemeColors>;
    fontSizes?: Partial<PdfThemeFontSizes>;
  };
  header?: PdfHeaderOptions;
  footer?: PdfFooterOptions;
  sections?: PdfSectionsOptions;
  dateFormats?: PdfDateFormats;
  labels?: PdfLabelOverrides;
  /** Extra `WellRenderer` settings for the profile SVG, merged over the PDF defaults (zoom/pan/animation stay off). */
  profile?: PdfProfileOptions;
  /** pdfmake document metadata (`info`). `title` defaults to the document title. */
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
    creator?: string;
  };
}

/** Resolved page geometry, in points. */
export interface ResolvedPdfPage {
  width: number;
  /** Fixed page height (used for `breakPages`). */
  height: number;
  orientation: 'portrait' | 'landscape';
  /** `[left, top, right, bottom]`. */
  margins: [number, number, number, number];
  /** `width - left - right`. */
  contentWidth: number;
}

/**
 * Fully resolved options passed to every builder: defaults applied, labels
 * resolved for `locale`, page geometry computed. Build it with
 * `resolvePdfContext(options)`.
 */
export interface PdfContext {
  locale: string;
  /** Label lookup in the resolved label pack. */
  t: PdfTranslate;
  title: string;
  breakPages: boolean;
  scale: number;
  metadataPosition: 'before' | 'after' | null;
  headingInfo: ResolvedInfoItem[];
  endInfo: ResolvedInfoItem[];
  /** Display units, every entry resolved. */
  units: Required<PdfUnits>;
  coordinateFormat: CoordinateFormat;
  waterQualityLimitSet?: string | null;
  baseUrl: string;
  shareUrl?: string;
  shareExpiresAt?: string;
  omitShareBlock: boolean;
  branding: {
    logo: PdfLogo | false;
    name: string | false;
    subtitle: string | false;
  };
  watermark: PdfWatermark | false;
  page: ResolvedPdfPage;
  theme: PdfTheme;
  header: Required<Pick<PdfHeaderOptions, 'showPageNumbers' | 'enabled'>> &
    Pick<PdfHeaderOptions, 'content'>;
  footer: Required<Pick<PdfFooterOptions, 'showQr' | 'showHost' | 'enabled'>> &
    Pick<PdfFooterOptions, 'text' | 'qrUrl' | 'content'>;
  sections: {
    include: Record<PdfSectionKey, boolean>;
    order: PdfSectionKey[];
  };
  dateFormats: Required<PdfDateFormats>;
  profile: PdfProfileOptions;
  metadata: NonNullable<PdfExportOptions['metadata']>;
}

export interface RenderedSvg {
  /** `outerHTML` of the rendered `<svg>` element. */
  markup: string;
  width: number;
  height: number;
}
