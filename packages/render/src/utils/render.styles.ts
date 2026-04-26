import { WellTheme } from '~/types/render.types';

export function buildSvgStyleBlock(theme: WellTheme): string {
  const { labels, lithology } = theme;
  return [
    `.wp-lithology-depth-tip{border:0.5px solid ${lithology.stroke};font-size:${labels.fontSize}px;color:${labels.color}}`,
    `.wp-annotation-label{font-size:${labels.fontSize}px}`,
    `.wp-annotation-header{font-weight:${labels.headerFontWeight ?? 600};font-family:${labels.headerFont};font-size:${labels.fontSize}px;color:${labels.color}}`,
    `.wp-annotation-body{font-weight:${labels.bodyFontWeight ?? 400};font-family:${labels.bodyFont ?? 'sans-serif'};font-size:${labels.fontSize}px;color:${labels.bodyColor}}`,
    `.wp-depth-tip-text{font-family:${labels.bodyFont ?? 'sans-serif'};font-size:${labels.fontSize}px;color:${labels.color}}`,
  ].join('');
}
