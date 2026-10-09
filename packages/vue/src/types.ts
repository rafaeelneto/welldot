/**
 * Props contracts of the swappable parts (`components` prop / the
 * `createWelldot({ components })` map). A custom part receives exactly these
 * props; text arrives already resolved for the active locale, so a custom
 * part owns its own aria-label wording but never resolves `LanguageText`.
 *
 * Event listeners (`onClick`, `onFocus`, …) are passed as attrs: a part must
 * let them fall through to its root element (the default for a single-root
 * component).
 */

import type { LanguageTextInput } from '@welldot/core';

/** `WellInfoPopover` trigger (`components.trigger`). Must be focusable. */
export interface WellInfoTriggerProps {
  /** Accessible label, resolved. Absent when the popover got no `label`. */
  label?: string;
  size: 'sm' | 'md';
}

/** Renders a string icon name (`components.icon`), e.g. `WellChip`'s `icon`. */
export interface WellIconProps {
  /** Icon name as passed by the consumer (e.g. `ph:drop`). */
  name: string;
}

/** `WellDataGrid` add-row button (`components.addButton`). Emits `click`. */
export interface WellAddButtonProps {
  /** Resolved label. Absent when the grid got no `addLabel`. */
  label?: string;
}

/** `WellDataGrid` delete-row button (`components.deleteButton`). Emits `click`. */
export interface WellDeleteButtonProps {
  index: number;
  row: Record<string, unknown>;
  /** Resolved label. Absent when the grid got no `deleteLabel`. */
  label?: string;
}

/** `WellDataGrid` drag handle (`components.dragHandle`). Visual only. */
export type WellDragHandleProps = Record<string, never>;

/** Option shape of `WellTagSelect`; `VocabEntry[]` fits as-is. */
export interface WellTagOption {
  value: string;
  label: LanguageTextInput;
}

/** Text of `WellTextureSelect`. */
export interface WellTextureSelectLabels {
  placeholder?: LanguageTextInput;
  /** Label of the "show pending textures" toggle; the toggle is hidden without it. */
  showPending?: LanguageTextInput;
}
