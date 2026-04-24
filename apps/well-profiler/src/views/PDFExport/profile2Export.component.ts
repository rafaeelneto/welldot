


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
  Profile,
} from '@/src/types/profile.types';


const profile2Export = async (
  header: string,
  headingInfo: infoType[],
  endInfo: infoType[],
  profile: Profile,
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
    await innerRenderPdf(
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
    await printPdf(profile, headingInfo, endInfo, breakPages, zoomLevel, header, lengthUnits, diameterUnits, metadataPosition);
  } else {
    await downloadPdf(profile, headingInfo, endInfo, breakPages, zoomLevel, header, lengthUnits, diameterUnits, metadataPosition);
  }
};

export default profile2Export;
