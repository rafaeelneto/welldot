// ─── Public column-definition interface ──────────────────────────────────────
// Consumers import these types to declare columns for any well feature array.

export type WellGridColumnBase = {
  /** Object key on the row model */
  prop: string;
  /** Pre-translated header label */
  label: string;
  /** Pre-translated help text, shown in an info popover next to the header label */
  info?: string;
  /** Pre-translated note rendered as a highlighted callout below `info` */
  infoHighlight?: string;
  /** Column width in px (default 150) */
  size?: number;
  /** Prevent editing */
  readonly?: boolean;
  /** Override the RevoGrid editor key */
  editor?: string;
  /** Unit-aware column — auto-converts to/from canonical units (m ↔ ft, mm ↔ inches) */
  unitType?: 'length' | 'diameter' | 'flow' | 'power';
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
      options: Array<{ label: string; value: string }>;
    })
  | (WellGridColumnBase & {
      type: 'select-button';
      options: Array<{ label: string; value: string }>;
    })
  | (WellGridColumnBase & {
      /** Suggested values with translated labels, but any free text is accepted and stored as-is. */
      type: 'combo';
      options: Array<{ label: string; value: string }>;
    })
  | (WellGridColumnBase & { type: 'texture' });
