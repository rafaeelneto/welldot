import { max as d3max, select as d3select } from 'd3';

import { getProfileLastItemsDepths } from '@welldot/utils';

import { Profile } from '@/src/types/profile.types';
import { SvgInfo } from '../../../src_old/types/profile2Export.types';

export const A4_SVG_HEIGHT = 480 * 1.33;

export const PDF_MARGINS = {
  top: 15,
  right: 30,
  bottom: 30,
  left: 20,
} as const;

// A4 width (595.28pt) minus pdfmake page margins (30pt each side) minus SVG internal margins
export const PDF_CONTENT_WIDTH =
  595.28 - 30 - 30 - PDF_MARGINS.left - PDF_MARGINS.right; // 485.28

export function buildSvgProfiles(props: {
  profile: Profile;
  breakPages?: boolean;
  zoomLevel?: number;
  firstPageAvailableHeight?: number;
}) {
  const {
    profile,
    breakPages = false,
    zoomLevel = 1,
    firstPageAvailableHeight,
  } = props;

  const depthValues = getProfileLastItemsDepths(profile);
  const maxYValues = d3max(depthValues) || 0;

  // Total SVG height encoding the desired scale (pt → px conversion: 1pt = 1.33px)
  const svgTotalHeight =
    ((1 / zoomLevel) * Number(maxYValues) * 1000 * 72) / 25.4;
  const svgs: SvgInfo[] = [];

  if (breakPages) {
    let heightLeft = svgTotalHeight;
    let index = 1;
    while (heightLeft > 0) {
      const pageHeight =
        index === 1 && firstPageAvailableHeight != null
          ? Math.max(firstPageAvailableHeight, 50)
          : A4_SVG_HEIGHT;
      svgs.push({
        id: `svgCanvas${index}`,
        height: heightLeft > pageHeight ? pageHeight : heightLeft,
      });
      heightLeft -= pageHeight;
      index += 1;
    }
  } else {
    svgs.push({ id: 'svgCanvas1', height: svgTotalHeight });
  }

  const divContainer = d3select('#svgDraftContainer');
  divContainer.selectAll('svg').remove();
  svgs.forEach(svgInfo => {
    divContainer.append('svg').attr('id', svgInfo.id);
  });

  return svgs;
}
