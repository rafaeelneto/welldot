import type { PdfContext } from '../types/options.types';
import type { Content } from '../types/pdfmake.types';
import { buildRule } from './tables';

/** Logo + brand name/subtitle column, or `null` when branding is fully off. */
function buildBrandColumn(ctx: PdfContext): Content | null {
  const { logo, name, subtitle } = ctx.branding;
  const { fonts, colors } = ctx.theme;

  const parts: Content[] = [];
  if (logo) {
    const width = logo.width ?? 22;
    const height = logo.height ?? 22;
    if (logo.svg) parts.push({ svg: logo.svg, width, height });
    else if (logo.image)
      parts.push({ image: logo.image, fit: [width, height] });
  }

  const text: Content[] = [];
  if (name) {
    text.push({
      text: name,
      font: fonts.label,
      bold: true,
      fontSize: 10,
      color: colors.brandName,
    });
  }
  if (subtitle) {
    text.push({
      text: subtitle,
      font: fonts.label,
      fontSize: 8,
      color: colors.brandSubtitle,
    });
  }
  if (text.length) parts.push({ stack: text, margin: [4, 0, 0, 0] });

  return parts.length ? { columns: parts, width: '*' } : null;
}

/**
 * Page header: brand (logo, name, subtitle), centered document title and
 * the `Page X/Y` counter, over a full-width rule.
 */
export function buildHeaderContent(
  ctx: PdfContext,
  currentPage: number,
  pageCount: number,
): Content {
  const { theme, page, header, labels, title } = ctx;
  // The title keeps its legacy 330pt box on A4 and scales with wider pages.
  const titleWidth = Math.round((page.contentWidth * 330) / 535);

  const columns: Content[] = [
    buildBrandColumn(ctx) ?? { text: '', width: '*' },
    {
      text: title,
      font: theme.fonts.heading,
      alignment: 'center',
      fontSize: theme.fontSizes.title,
      bold: true,
      decoration: 'underline',
      width: titleWidth,
    },
    {
      text: header.showPageNumbers
        ? `${labels.document.page} ${currentPage}/${pageCount}`
        : '',
      alignment: 'right',
      fontSize: 8,
      width: '*',
    },
  ];

  const [left, , right] = page.margins;
  return {
    stack: [
      { columns },
      buildRule(page.contentWidth, theme.colors.pageRule, [0, 3, 0, 0]),
    ],
    margin: [left, 14, right, 0],
  };
}
