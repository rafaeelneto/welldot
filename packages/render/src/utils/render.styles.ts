import sanitizeHtml from 'sanitize-html';
import { WellTheme } from '~/types/render.types';

/** Strips all HTML/CSS-breaking characters from a theme string value before CSS injection. */
const sanitizeCssValue = (v: unknown): string =>
  sanitizeHtml(String(v ?? ''), { allowedTags: [], allowedAttributes: {} });

export function buildSvgStyleBlock(theme: WellTheme): string {
  const { labels, lithology } = theme;
  const s = sanitizeCssValue;
  return [
    `.wp-lithology-depth-tip{border:0.5px solid ${s(lithology.stroke)};font-size:${s(labels.fontSize)}px;color:${s(labels.color)}}`,
    `.wp-annotation-label{font-size:${s(labels.fontSize)}px}`,
    `.wp-annotation-header{font-weight:${s(labels.headerFontWeight ?? 600)};font-family:${s(labels.headerFont)};font-size:${s(labels.fontSize)}px;color:${s(labels.color)}}`,
    `.wp-annotation-body{font-weight:${s(labels.bodyFontWeight ?? 400)};font-family:${s(labels.bodyFont ?? 'sans-serif')};font-size:${s(labels.fontSize)}px;color:${s(labels.bodyColor)}}`,
    `.wp-depth-tip-text{font-family:${s(labels.bodyFont ?? 'sans-serif')};font-size:${s(labels.fontSize)}px;color:${s(labels.color)}}`,
  ].join('');
}
