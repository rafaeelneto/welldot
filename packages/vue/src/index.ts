// ── Configuration ────────────────────────────────────────────────────────────
export {
  DEFAULT_COORDINATE_FORMAT,
  DEFAULT_WELLDOT_LOCALE,
  DEFAULT_WELLDOT_UNITS,
  WELLDOT_CONFIG_KEY,
  createWelldot,
  resolvePart,
  resolveWelldotConfig,
  useWelldotConfig,
} from './config';
export type {
  ResolvedWelldotConfig,
  WelldotComponents,
  WelldotConfig,
  WelldotPartName,
  WelldotUnits,
} from './config';

// ── Composables ──────────────────────────────────────────────────────────────
export {
  LOCALE_MAP,
  useWellNumberFormat,
} from './composables/useWellNumberFormat';
export { useWellText } from './composables/useWellText';
export { useWellUnits } from './composables/useWellUnits';
export type { DisplayUnitType } from './composables/useWellUnits';

// ── Components ───────────────────────────────────────────────────────────────
export { default as WellChip } from './components/WellChip.vue';
export { default as WellInfoPopover } from './components/WellInfoPopover.vue';
export { default as WellInputNumber } from './components/WellInputNumber.vue';
export { default as WellLabeledField } from './components/WellLabeledField.vue';
export { default as WellTagSelect } from './components/WellTagSelect.vue';
export { default as WellTextureSelect } from './components/WellTextureSelect.vue';
export { default as WellTextureThumbnail } from './components/WellTextureThumbnail.vue';
export { default as WellUnitInput } from './components/WellUnitInput.vue';

// ── Part contracts & shared types ────────────────────────────────────────────
export type {
  WellAddButtonProps,
  WellDeleteButtonProps,
  WellDragHandleProps,
  WellIconProps,
  WellInfoTriggerProps,
  WellTagOption,
  WellTextureSelectLabels,
} from './types';
