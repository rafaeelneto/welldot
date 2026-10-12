import type { ContactSnap } from './profileLayouts';

/**
 * Slack (pt) kept under every panel so float rounding never makes pdfmake
 * see a panel as taller than the space left and push it to the next page.
 */
export const FIT_EPSILON = 1;

/**
 * Smallest drawing height (pt) worth starting the profile with under the
 * content that precedes it. With less room left, the profile starts on the
 * next page instead.
 */
export const MIN_FIRST_PANEL_HEIGHT = 120;

/** Drawing height (pt) each detailed page repeats from the previous one. */
export const OVERLAP_HEIGHT = 24;

/**
 * Share of a page's depth span, just above its natural end, inside which a
 * lithology contact pulls the page break onto itself.
 */
export const SNAP_RATIO = 0.15;

/** Most of a page's span the overlap may take. */
const MAX_OVERLAP_RATIO = 0.25;

/** One detailed-format panel: the depths it draws and how it pages. */
export interface DetailedPanel {
  /** Outer height (drawing + padding). */
  height: number;
  breakBefore: boolean;
  depthFrom: number;
  depthTo: number;
  /** Bottom of the band repeated from the previous panel. */
  repeatedTo?: number;
  /** Set when the panel ends on a lithology contact. */
  snap?: ContactSnap;
}

export interface PlanDetailedPanelsOptions {
  /** Deepest depth of the profile (m). */
  totalDepth: number;
  /** Drawing points per metre at the 1:N scale. */
  ptPerMeter: number;
  /** Lithology contacts, by depth. */
  contacts: ContactSnap[];
  breakPages: boolean;
  /** Outer height of a panel filling a whole page. */
  pageHeight: number;
  /** Height left on the page where the profile starts; omitted = top of a page. */
  firstPageRemaining?: number;
  /** Vertical inner margins of a panel. */
  padding: number;
  /** Defaults to {@link OVERLAP_HEIGHT}. */
  overlap?: number;
  /** Defaults to {@link SNAP_RATIO}. */
  snapRatio?: number;
  /** Defaults to {@link MIN_FIRST_PANEL_HEIGHT}. */
  minFirstPanel?: number;
  /**
   * Height (pt) kept free under the first panel, on whichever page it
   * lands (the legend strip). Defaults to `0`.
   */
  firstPanelReserve?: number;
}

/**
 * Splits the detailed profile into page panels at an exact 1:N scale
 * (`height = (depthTo − depthFrom) · ptPerMeter + padding`):
 *
 * - The first panel fills `firstPageRemaining` (less `firstPanelReserve`)
 *   when at least `minFirstPanel` of drawing fits there (or the whole
 *   profile does); otherwise it starts on a new page, still leaving the
 *   reserve free. Every other panel gets a whole page.
 * - A page ends at its natural depth unless a lithology contact lies within
 *   `snapRatio` of its span above that depth; then it ends on the deepest
 *   such contact (`snap`), leaving the rest of the page blank.
 * - Each following panel starts `overlap` pt of drawing (at most a quarter
 *   of a page's span) above the previous break, and `repeatedTo` marks that
 *   repeated band.
 *
 * No panel is taller than `pageHeight`. With `breakPages` off there is one
 * panel for the whole profile.
 */
export function planDetailedPanels(
  options: PlanDetailedPanelsOptions,
): DetailedPanel[] {
  const {
    ptPerMeter,
    contacts,
    breakPages,
    pageHeight,
    firstPageRemaining,
    padding,
    overlap = OVERLAP_HEIGHT,
    snapRatio = SNAP_RATIO,
    minFirstPanel = MIN_FIRST_PANEL_HEIGHT,
    firstPanelReserve = 0,
  } = options;
  const total = Math.max(0, options.totalDepth);
  const single: DetailedPanel = {
    height: total * ptPerMeter + padding,
    breakBefore: false,
    depthFrom: 0,
    depthTo: total,
  };
  if (!breakPages || total === 0 || ptPerMeter <= 0) return [single];

  const fullDrawing = Math.max(1, pageHeight - padding);
  // Sub-point leftovers from float error end the profile rather than
  // spilling a sliver onto a new page.
  const endSlack = 0.5 / ptPerMeter;

  const reserve = Math.max(0, firstPanelReserve);
  let room = Math.max(1, fullDrawing - reserve);
  let breakBefore = false;
  if (firstPageRemaining != null) {
    const first =
      Math.min(firstPageRemaining - FIT_EPSILON, pageHeight) -
      padding -
      reserve;
    if (first >= minFirstPanel || (first > 0 && first >= total * ptPerMeter)) {
      room = first;
    } else {
      breakBefore = true;
    }
  }

  const panels: DetailedPanel[] = [];
  let from = 0;
  let repeatedTo: number | undefined;

  for (;;) {
    const span = room / ptPerMeter;
    const naturalEnd = from + span;
    let to: number;
    let snap: ContactSnap | undefined;

    if (naturalEnd >= total - endSlack) {
      to = total;
    } else {
      const floor = Math.max(naturalEnd - snapRatio * span, repeatedTo ?? from);
      const contact = contacts
        .filter(c => c.depth > floor && c.depth <= naturalEnd)
        .pop();
      to = contact ? contact.depth : naturalEnd;
      snap = contact;
    }

    panels.push({
      height: Math.min(pageHeight, (to - from) * ptPerMeter + padding),
      breakBefore,
      depthFrom: from,
      depthTo: to,
      ...(repeatedTo != null ? { repeatedTo } : {}),
      ...(snap ? { snap } : {}),
    });
    if (to >= total) break;

    const fullSpan = fullDrawing / ptPerMeter;
    const overlapDepth = Math.min(
      overlap / ptPerMeter,
      MAX_OVERLAP_RATIO * fullSpan,
    );
    from = Math.max(0, to - overlapDepth);
    repeatedTo = to;
    room = fullDrawing;
    breakBefore = true;
  }

  return panels;
}
