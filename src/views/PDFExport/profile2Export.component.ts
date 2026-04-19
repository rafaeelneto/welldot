


// eslint-disable-next-line import/namespace
import { innerRenderPdf, printPdf, downloadPdf } from './pdfGenerate';


import {
  getProfileLastItemsDepths,
  getProfileDiamValues,
  checkIfProfileIsEmpty,
} from '../../utils/profile.utils';
import { DiameterUnits, LengthUnits, CoordFormat } from '@/src/store/ui.store';

import { infoType } from '../../../src_old/types/profile2Export.types';


import {
  Well,
} from '@/src/lib/@types/well.types';


const profile2Export = (
  header: string,
  headingInfo: infoType[],
  endInfo: infoType[],
  profile: Well,
  breakPages: boolean,
  zoomLevel: number,
  iframeId?: string,
  print?: boolean,
  lengthUnits: LengthUnits = 'm',
  diameterUnits: DiameterUnits = 'mm',
  metadataPosition: 'before' | 'after' | null = null,
) => {
  if (checkIfProfileIsEmpty(profile)) return;

  if (iframeId) {
    console.log('Rendering PDF in iframe with id:', iframeId);
    innerRenderPdf(
      profile,
      headingInfo,
      endInfo, 
      breakPages,
      zoomLevel,
      iframeId,
      header,
      lengthUnits,
      diameterUnits,
      metadataPosition,
    );
  } else if (print) {
    printPdf(profile, headingInfo, endInfo, breakPages, zoomLevel, header, lengthUnits, diameterUnits, metadataPosition);
  } else {
    downloadPdf(profile, headingInfo, endInfo,breakPages, zoomLevel, header, lengthUnits, diameterUnits, metadataPosition);
  }
};

export default profile2Export;
