import { WellTheme } from '~/types/render.types';

export function buildSvgStyleBlock(theme: WellTheme): string {
  return [
    `.wp-annotation-header{font-weight:600;font-family:${theme.labels.headerFont};fill:${theme.labels.color}}`,
    `.wp-annotation-body{font-weight:400;fill:${theme.labels.bodyColor}}`,
    `.wp-depth-tip-text{font-family:sans-serif;fill:${theme.labels.color}}`,
  ].join('');
}
