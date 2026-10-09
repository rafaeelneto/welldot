import { WELLDOT_LOGO_SVG } from '../assets/welldotLogo';
import type { PdfContext } from '../types/options.types';

/** Default branding: Welldot logo, name and site. */
export const WELLDOT_BRANDING: PdfContext['branding'] = {
  logo: { svg: WELLDOT_LOGO_SVG, width: 22, height: 22 },
  name: 'Welldot',
  subtitle: 'welldot.org',
};

export const DEFAULT_BASE_URL = 'https://welldot.org';
