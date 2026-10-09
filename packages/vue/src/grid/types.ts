// ─── Public column-definition interface ──────────────────────────────────────
// Consumers import these types to declare columns for any well feature array.

import type { LanguageTextInput } from '@welldot/core';
import type { Component } from 'vue';
import type { DisplayUnitType } from '../composables/useWellUnits';

/**
 * A choice of a `select`, `select-button` or `combo` column. A core
 * vocabulary (`VocabEntry[]`) fits as-is; `deprecated` entries are still
 * displayed but not offered by the editors.
 */
export interface WellGridOption {
  value: string;
  label: LanguageTextInput;
  deprecated?: boolean;
}

export type WellGridColumnBase = {
  /** Object key on the row model */
  prop: string;
  /** Header label, resolved for the configured locale */
  label: LanguageTextInput;
  /** Help text, shown in an info popover next to the header label */
  info?: LanguageTextInput;
  /** Note rendered as a highlighted callout below `info` */
  infoHighlight?: LanguageTextInput;
  /** Column width in px (auto-sized when omitted) */
  size?: number;
  /** Prevent editing */
  readonly?: boolean;
  /**
   * Override the built-in editor key: `text`, `number`, `color`, `unit`,
   * `select`, `combo`, `texture` or `noop`.
   */
  editor?: string;
  /**
   * Unit-aware column: values are stored canonical (SI) and shown/edited in
   * the configured display unit, with the unit appended to the header.
   */
  unitType?: DisplayUnitType;
  /** Display-only formatter — bypasses the editor */
  formatter?: (value: unknown, row: Record<string, unknown>) => string;
  pin?: 'colPinStart' | 'colPinEnd';
  /** Stretch this column to absorb all remaining grid width */
  stretch?: boolean;
  /** Minimum width (px) for a stretch column (default 50) */
  minSize?: number;
};

export type WellGridColumn =
  | (WellGridColumnBase & { type?: 'text' | 'number' | 'color' | 'checkbox' })
  | (WellGridColumnBase & {
      type: 'select';
      options: readonly WellGridOption[];
    })
  | (WellGridColumnBase & {
      type: 'select-button';
      options: readonly WellGridOption[];
    })
  | (WellGridColumnBase & {
      /** Suggested values with labels, but any free text is accepted and stored as-is. */
      type: 'combo';
      options: readonly WellGridOption[];
    })
  | (WellGridColumnBase & { type: 'texture' });

export type WellGridColumnType = NonNullable<WellGridColumn['type']>;

/** Grid-internal text of `WellDataGrid`. Every entry is optional. */
export interface WellDataGridLabels {
  /** Placeholder of the texture editor. */
  texturePlaceholder?: LanguageTextInput;
  /** "Show pending textures" toggle of the texture editor; hidden without it. */
  showPendingTextures?: LanguageTextInput;
  /** Accessible label of the info trigger in column headers. */
  columnInfo?: LanguageTextInput;
}

/**
 * Swappable parts of `WellDataGrid` (`components` prop). Contracts:
 * `WellAddButtonProps`, `WellDeleteButtonProps`, `WellDragHandleProps`.
 */
export interface WellDataGridComponents {
  addButton?: Component;
  deleteButton?: Component;
  dragHandle?: Component;
}

/** An option with its label resolved for the configured locale. */
export interface ResolvedGridOption {
  value: string;
  label: string;
  deprecated?: boolean;
}
