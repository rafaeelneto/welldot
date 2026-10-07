import { format } from 'date-fns';
import { enUS, ptBR } from 'date-fns/locale';
import { renderSVG } from 'uqr';
import type { PdfContext } from '../types/options.types';
import type { Content, ContentText } from '../types/pdfmake.types';
import { buildRule } from './tables';

function hostLabel(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function dateFnsLocale(locale: string) {
  return locale.toLowerCase().startsWith('pt') ? ptBR : enUS;
}

function buildTagline(ctx: PdfContext, hasShare: boolean): ContentText {
  const { t, theme, shareExpiresAt } = ctx;
  const base: Omit<ContentText, 'text'> = {
    font: theme.fonts.label,
    fontSize: 6,
    color: theme.colors.footerText,
    alignment: 'right',
    width: 46,
  };
  const tagline = hasShare
    ? t('document.footerTagline')
    : t('document.footerTaglineFallback');

  if (!hasShare || !shareExpiresAt) {
    return { ...base, text: tagline };
  }

  const validUntil = `${t('document.footerValidUntilLabel')} ${format(
    new Date(shareExpiresAt),
    'd MMM yyyy',
    { locale: dateFnsLocale(ctx.locale) },
  )}`;
  return {
    ...base,
    text: [{ text: `${tagline}\n` }, { text: validUntil, fontSize: 5 }],
  };
}

/**
 * Builds the page footer: left text (default `.well v2 - <date>`), host
 * label, and — unless `omitShareBlock` or `footer.showQr: false` — a QR
 * code linking to `footer.qrUrl ?? shareUrl ?? baseUrl`.
 *
 * @param pageMode `true` when rendered as a per-page footer (adds page margins).
 */
export function buildFooterContent(
  ctx: PdfContext,
  pageMode: boolean,
): Content {
  const { baseUrl, shareUrl, omitShareBlock, footer, theme, page } = ctx;
  const hasShare = Boolean(shareUrl);
  const showQr = footer.showQr && !omitShareBlock;
  const qrUrl = footer.qrUrl ?? shareUrl ?? baseUrl;

  const shareColumn: Content | null = showQr
    ? {
        columns: [
          buildTagline(ctx, hasShare),
          {
            svg: renderSVG(qrUrl, { pixelSize: 4 }),
            width: 34,
            height: 34,
          },
        ],
        columnGap: 4,
        width: 84,
      }
    : null;

  const columns: Content[] = [
    {
      text: footer.text ?? `.well v2 - ${format(new Date(), 'yyyy-MM-dd')}`,
      font: theme.fonts.body,
      fontSize: theme.fontSizes.footer,
      color: theme.colors.footerText,
      width: footer.showHost || shareColumn ? 84 : '*',
      alignment: 'left',
    },
  ];
  if (footer.showHost) {
    columns.push({
      text: hostLabel(baseUrl),
      font: theme.fonts.label,
      fontSize: theme.fontSizes.footer,
      color: theme.colors.footerText,
      alignment: shareColumn ? 'center' : 'right',
      width: '*',
    });
  } else if (shareColumn) {
    columns.push({ text: '', width: '*' });
  }
  if (shareColumn) columns.push(shareColumn);

  const [left, , right] = page.margins;
  return {
    stack: [
      buildRule(page.contentWidth, theme.colors.pageRule, [0, 0, 0, 5]),
      { columns },
    ],
    margin: pageMode ? [left, 10, right, 10] : [0, 0, 0, 0],
  };
}
