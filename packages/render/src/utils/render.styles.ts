import { WellTheme } from '~/types/render.types';

export function buildSvgStyleBlock(theme: WellTheme): string {
  return [
    `.wp-lithology-depth-tip{background:white;border:0.5px solid ${theme.lithology.stroke};border-radius:2px;font-size:${theme.labels.fontSize}px;font-family:sans-serif;color:${theme.labels.color};padding:1px 2px;line-height:1;white-space:nowrap;display:inline-block;box-sizing:border-box}`,
    `.wp-annotation-label{font-size:${theme.labels.fontSize}px;line-height:1.35;color:${theme.labels.color};font-family:sans-serif;word-break:break-word;overflow:hidden;box-sizing:border-box}`,
    `.wp-annotation-header{font-weight:600;font-family:${theme.labels.headerFont};margin-bottom:1px}`,
    `.wp-annotation-body{font-weight:400;color:${theme.labels.bodyColor}}`,
  ].join('');
}
