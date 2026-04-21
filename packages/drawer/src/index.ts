export { WellDrawer } from './wellDrawer/WellDrawer';
export { drawWellLegend } from './wellDrawer/drawer.legend';
export type {
  DrawerRenderConfig,
  CssVarsConfig,
  LegendRenderConfig,
  SvgInstance,
  ComponentsClassNames,
  TooltipKey,
  DeepPartial,
} from './types/drawer.types';
export { INTERACTIVE_RENDER_CONFIG } from './wellDrawer/drawer.configs';
export { formatLength, formatDiameter, getLengthUnit, getDiameterUnit } from './utils/format.utils';
export {
  getProfileLastItemsDepths,
  getProfileDiamValues,
  getConstructivePropertySummary,
  checkIfProfileIsEmpty,
  numberFormater,
  calculateCilindricVolume,
  calculateHoleFillVolume,
} from './utils/well.utils';
// WellDrawerPDF intentionally not exported — pending removal of src_old dependency
