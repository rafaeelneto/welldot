// Shapes taken by ChartFrame. Values are in data units; ChartFrame maps them
// to pixels.

export type AxisKind = 'linear' | 'log';

export type ChartPoint = {
  x: number;
  y: number;
  /** Extra tooltip line for this point (e.g. the drawdown of a level). */
  note?: string;
};

export type ChartSeries = {
  id: string;
  label: string;
  /** Muted text after the label in the legend. */
  detail?: string;
  points: ChartPoint[];
  /** A CSS color, always a token: `var(--chart-series-1)`, `var(--color-content-400)`… */
  color: string;
  dashed?: boolean;
  /** Draw a dot on every point (a single-point series always gets one). */
  markers?: boolean;
  /** Draw the dots only, without the connecting line. */
  noLine?: boolean;
  /** Recessive context series (thinner, lower opacity). */
  muted?: boolean;
};

export type ChartHLine = { y: number; label: string; color?: string };

/** Vertical reference line; labelled ones are drawn dashed and stronger. */
export type ChartVLine = { x: number; label?: string };

/** X range shaded behind the data; every other band is tinted. */
export type ChartBand = { x0: number; x1: number; label?: string };

/** Categorical color of step `index` (0-based), in fixed order. */
export function stepColor(index: number): string {
  return `var(--chart-series-${(index % 8) + 1})`;
}
