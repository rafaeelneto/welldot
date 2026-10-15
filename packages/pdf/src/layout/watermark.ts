import type { PdfContext } from '../types/options.types';
import type {
  Content,
  TDocumentDefinition,
  Watermark,
} from '../types/pdfmake.types';

const DEFAULT_OPACITY = 0.08;

/** pdfmake's native text watermark, or `undefined` when there is no text watermark. */
export function buildTextWatermark(ctx: PdfContext): Watermark | undefined {
  const wm = ctx.watermark;
  if (!wm || !wm.text) return undefined;
  return {
    text: wm.text,
    color: wm.color ?? ctx.theme.colors.text,
    opacity: wm.opacity ?? DEFAULT_OPACITY,
    bold: wm.bold ?? true,
    italics: wm.italics ?? false,
    font: wm.font ?? ctx.theme.fonts.heading,
    ...(wm.fontSize !== undefined ? { fontSize: wm.fontSize } : {}),
    ...(wm.angle !== undefined ? { angle: wm.angle } : {}),
  };
}

/**
 * Page `background` drawing the image watermark centered on each page,
 * or `undefined` when there is no image watermark.
 */
export function buildImageWatermark(
  ctx: PdfContext,
): TDocumentDefinition['background'] {
  const wm = ctx.watermark;
  if (!wm || !wm.image) return undefined;
  const image = wm.image;
  const opacity = wm.opacity ?? DEFAULT_OPACITY;

  return (_currentPage, pageSize): Content => {
    const width = wm.imageWidth ?? pageSize.width / 2;
    return {
      image,
      fit: [width, width],
      opacity,
      absolutePosition: {
        x: (pageSize.width - width) / 2,
        y: (pageSize.height - width) / 2,
      },
    };
  };
}
