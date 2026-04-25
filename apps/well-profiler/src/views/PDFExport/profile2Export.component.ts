// eslint-disable-next-line import/namespace
import { downloadPdf, innerRenderPdf, printPdf } from './pdfGenerate';

import { DiameterUnits, LengthUnits } from '@/src/store/ui.store';
import { checkIfProfileIsEmpty } from '../../utils/profile.utils';

import { infoType } from '../../../src_old/types/profile2Export.types';

import { Profile } from '@/src/types/profile.types';
import { DeepPartial, RenderConfig } from '@welldot/render';

const profile2Export = (
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
  renderConfig?: DeepPartial<RenderConfig>,
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
      renderConfig,
    );
  } else if (print) {
    printPdf(
      profile,
      headingInfo,
      endInfo,
      breakPages,
      zoomLevel,
      header,
      lengthUnits,
      diameterUnits,
      metadataPosition,
      renderConfig,
    );
  } else {
    downloadPdf(
      profile,
      headingInfo,
      endInfo,
      breakPages,
      zoomLevel,
      header,
      lengthUnits,
      diameterUnits,
      metadataPosition,
      renderConfig,
    );
  }
};

export default profile2Export;
