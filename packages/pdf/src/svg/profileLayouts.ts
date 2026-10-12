import type { Lithology } from '@welldot/core';
import type { DeepPartial, RenderConfig, WellTheme } from '@welldot/render';
import { createPdfFormatters } from '../formatters';
import type { PdfContext, ResolvedPdfPage } from '../types/options.types';

/** Margins of a profile panel SVG: `[top]` holds the column titles, `[bottom]` the caption. */
export interface PanelMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Vertical margins shared by every panel layout. */
export const PANEL_MARGIN_TOP = 24;
export const PANEL_MARGIN_BOTTOM = 26;

/** Share of the content width the compact profile column takes. */
export const COMPACT_PROFILE_RATIO = 0.32;

/** Gap (pt) between the compact profile column and the tables beside it. */
export const COMPACT_COLUMN_GAP = 14;

/** Side (pt) of the lithology swatches of the compact lithology table. */
export const LITHOLOGY_SWATCH_SIZE = 9;

/** Width of the compact format's profile column for a page. */
export function computeCompactColumnWidth(page: ResolvedPdfPage): number {
  return Math.round(page.contentWidth * COMPACT_PROFILE_RATIO);
}

/**
 * Width of the compact format's side column. Fixed rather than `*`: pdfmake
 * sizes `*` tables inside a `*` column against the whole page and runs them
 * off its right edge.
 */
export function computeCompactSideWidth(page: ResolvedPdfPage): number {
  return (
    page.contentWidth - computeCompactColumnWidth(page) - COMPACT_COLUMN_GAP
  );
}

/** Geometry and renderer settings of one format's profile panels. */
export interface ProfileLayout {
  /** Outer SVG width. */
  width: number;
  margins: PanelMargins;
  /** Layout part of the `WellRenderer` config; merged under `ctx.profile.renderConfig`. */
  renderConfig: DeepPartial<RenderConfig>;
  theme: DeepPartial<WellTheme>;
}

/**
 * Column geometry of a panel: lithology strip, construction column (and,
 * in `detailed`, construction labels and descriptions), turned into the
 * renderer's knobs. Lithology and construction coordinates are relative to
 * the left margin, like the renderer's geologic group; `geologic.xRightInset`
 * and the `layout` ratios are relative to the outer width, as the renderer
 * reads them.
 */
function columnsConfig(geometry: {
  width: number;
  marginLeft: number;
  marginRight: number;
  lithologyWidth: number;
  gap: number;
  constructionWidth: number;
}): Pick<DeepPartial<RenderConfig>, 'geologic' | 'layout'> & {
  constructionRight: number;
  lithologyRight: number;
  inner: number;
} {
  const { width, marginLeft, marginRight, lithologyWidth, gap } = geometry;
  const inner = width - marginLeft - marginRight;
  const xLeft = 4;
  const lithologyRight = xLeft + lithologyWidth;
  const constructionCenter =
    lithologyRight + gap + geometry.constructionWidth / 2;
  return {
    geologic: { xLeft, xRightInset: width - lithologyRight },
    layout: {
      pocoWidthRatio: geometry.constructionWidth / width,
      pocoCenterRatio: (2 * (constructionCenter - inner / 2)) / width,
    },
    lithologyRight,
    constructionRight: constructionCenter + geometry.constructionWidth / 2,
    inner,
  };
}

function profileTheme(ctx: PdfContext): DeepPartial<WellTheme> {
  const { theme } = ctx;
  return {
    columnHeaders: {
      fontFamily: theme.fonts.label,
      color: theme.colors.tableHeader,
      ruleStroke: theme.colors.tableRule,
    },
    markers: { fontFamily: theme.fonts.label },
    overlap: { fontFamily: theme.fonts.body },
  };
}

/**
 * Detailed layout: depth axis, lithology strip, construction column,
 * construction labels on its right and depth-aligned descriptions (unit,
 * description, aquifer) filling the rest. `overview` adds the mini-map in
 * the left margin, `overviewHeight` px tall.
 */
export function buildDetailedLayout(
  ctx: PdfContext,
  width: number,
  options: { overview: boolean; overviewHeight: number },
): ProfileLayout {
  const margins: PanelMargins = {
    top: PANEL_MARGIN_TOP,
    right: 6,
    bottom: PANEL_MARGIN_BOTTOM,
    left: options.overview ? 50 : 32,
  };
  const constructionWidth = Math.round(width * 0.13);
  const labelWidth = Math.round(width * 0.17);
  const cols = columnsConfig({
    width,
    marginLeft: margins.left,
    marginRight: margins.right,
    lithologyWidth: 26,
    gap: 12,
    constructionWidth,
  });
  const descriptionX = cols.constructionRight + 6 + labelWidth + 8;
  const { labels } = ctx;

  return {
    width,
    margins,
    theme: profileTheme(ctx),
    renderConfig: {
      geologic: cols.geologic,
      layout: cols.layout,
      construction: { cementPad: { widthRatio: 1.15 } },
      unitLabels: { active: false },
      constructionLabels: {
        active: true,
        side: 'right',
        xOffset: 6,
        labelMaxWidth: labelWidth,
      },
      labels: {
        active: true,
        lithology: ['description', 'units', 'swatch', 'rules'],
        descriptionXOffset: descriptionX - cols.lithologyRight,
        descriptionMaxWidth: Math.max(60, cols.inner - descriptionX - 2),
        stackingLineHeight: 10,
        continuation: { active: true, prefix: labels.profile.continuation },
      },
      overview: {
        active: options.overview,
        x: 6,
        width: 8,
        height: options.overviewHeight,
      },
      columnHeaders: {
        active: true,
        labels: {
          depth: labels.profile.columns.depth,
          lithology: labels.profile.columns.lithology,
          construction: labels.profile.columns.construction,
          description: labels.profile.columns.description,
        },
      },
      overlap: { label: labels.profile.overlapRepeated },
      markers: { lithology: false, fractures: false },
    },
  };
}

/**
 * Compact layout: depth axis, lithology strip with numbered markers and the
 * well's construction with `F{n}` fracture markers. No annotations — the
 * tables beside the column carry the text.
 */
export function buildCompactLayout(
  ctx: PdfContext,
  width: number,
): ProfileLayout {
  const margins: PanelMargins = {
    top: PANEL_MARGIN_TOP,
    right: 4,
    bottom: PANEL_MARGIN_BOTTOM,
    left: 30,
  };
  const inner = width - margins.left - margins.right;
  const lithologyWidth = 22;
  const gap = 8;
  // Room right of the construction for the `F{n}` markers.
  const markerRoom = 16;
  const constructionWidth = Math.max(
    20,
    Math.min(70, inner - 4 - lithologyWidth - gap - markerRoom),
  );
  const cols = columnsConfig({
    width,
    marginLeft: margins.left,
    marginRight: margins.right,
    lithologyWidth,
    gap,
    constructionWidth,
  });
  const { labels } = ctx;

  return {
    width,
    margins,
    theme: profileTheme(ctx),
    renderConfig: {
      geologic: cols.geologic,
      layout: cols.layout,
      construction: { cementPad: { widthRatio: 1.15 } },
      unitLabels: { active: false },
      constructionLabels: { active: false },
      labels: { active: false },
      overview: { active: false },
      columnHeaders: {
        active: true,
        labels: {
          depth: labels.profile.columns.depth,
          lithology: labels.profile.columns.lithology,
          construction: labels.profile.columns.well,
          description: labels.profile.columns.description,
        },
      },
      markers: { lithology: true, fractures: true },
    },
  };
}

type Plain = Record<string, unknown>;

function isPlainObject(value: unknown): value is Plain {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

/**
 * Deep-merges plain objects left to right (later wins). Arrays, functions
 * and other values are replaced, never merged. Inputs are not mutated.
 */
export function mergeDeep<T>(...sources: (DeepPartial<T> | undefined)[]): T {
  const out: Plain = {};
  for (const source of sources) {
    if (!source) continue;
    for (const [key, value] of Object.entries(source as Plain)) {
      if (value === undefined) continue;
      out[key] =
        isPlainObject(value) && isPlainObject(out[key])
          ? mergeDeep(out[key] as Plain, value)
          : isPlainObject(value)
            ? mergeDeep({}, value)
            : value;
    }
  }
  return out as T;
}

/** Replaces `{name}` placeholders with `values[name]`. */
export function fillTemplate(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}

/** A page break at a lithology contact. */
export interface ContactSnap {
  depth: number;
  /** Unit (or description) of the layer above. */
  above: string;
  /** Unit (or description) of the layer below. */
  below: string;
}

/** Lithology contacts (where one layer ends and the next starts), by depth. */
export function getLithologyContacts(lithology: Lithology[]): ContactSnap[] {
  const name = (layer: Lithology) =>
    layer.geologic_unit || layer.description || '';
  const contacts: ContactSnap[] = [];
  for (let i = 0; i + 1 < lithology.length; i++) {
    const above = lithology[i]!;
    const below = lithology[i + 1]!;
    contacts.push({ depth: above.to, above: name(above), below: name(below) });
  }
  return contacts.sort((a, b) => a.depth - b.depth);
}

/** One caption line drawn in a panel's bottom margin. */
export interface PanelCaption {
  text: string;
  /** `snap` draws the note and a rule in `theme.colors.snapNote`. */
  kind: 'caption' | 'snap';
  align: 'start' | 'end';
}

/** What {@link buildPanelCaptions} needs to know about each panel. */
export interface CaptionPanel {
  depthFrom: number;
  depthTo: number;
  breakBefore: boolean;
  snap?: ContactSnap;
}

/** `1:2.000` / `1:2,000`, rounded to a whole ratio. */
export function formatScale(scale: number, locale: string): string {
  return `1:${new Intl.NumberFormat(locale).format(Math.round(scale))}`;
}

/**
 * Caption of each panel (or `null`).
 * - `compact`: `1:N · continues on p. X ↓` under every panel but the last,
 *   which reads just `1:N`.
 *   `startPage` is the page the profile column starts on.
 * - `detailed`: under every panel but the last, the snap note when the
 *   break sits on a contact, else `continues ↓ to {depth}` for the layer
 *   cut by the break.
 */
export function buildPanelCaptions(
  panels: CaptionPanel[],
  ctx: PdfContext,
  options: { lithology: Lithology[]; scale: number; startPage?: number },
): (PanelCaption | null)[] {
  const caption = ctx.labels.profile.caption;
  const fmt = createPdfFormatters(ctx);
  const last = panels.length - 1;

  if (ctx.format === 'compact') {
    const scaleText = formatScale(options.scale, ctx.locale);
    let page = (options.startPage ?? 1) + (panels[0]?.breakBefore ? 1 : 0);
    return panels.map((_, index) => {
      if (index === last) {
        return { text: scaleText, kind: 'caption', align: 'start' };
      }
      if (panels[index + 1]!.breakBefore) page += 1;
      return {
        text: `${scaleText} · ${fillTemplate(caption.continuesOnPage, { page })}`,
        kind: 'caption',
        align: 'start',
      };
    });
  }

  return panels.map((panel, index) => {
    if (index === last) return null;
    if (panel.snap) {
      return {
        text: fillTemplate(caption.snappedContact, {
          depth: fmt.formatDepth(panel.snap.depth),
          above: panel.snap.above,
          below: panel.snap.below,
        }),
        kind: 'snap',
        align: 'start',
      };
    }
    const cut = options.lithology.find(
      layer => layer.from < panel.depthTo && layer.to > panel.depthTo,
    );
    if (!cut) return null;
    return {
      text: fillTemplate(caption.continuesTo, {
        depth: fmt.formatDepth(cut.to),
      }),
      kind: 'caption',
      align: 'end',
    };
  });
}
