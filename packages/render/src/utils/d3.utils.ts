import type { BaseType, Selection, Transition } from 'd3';

import type { SvgSelection } from '~/types/render.types';

/**
 * Type-safe wrapper for D3's enter+merge pattern.
 * D3's native `.merge()` widens the element type to `GElement | GElement2`;
 * this helper casts the update selection to match the enter element type
 * so the merged result preserves the concrete element type for subsequent `.attr()` and `.transition()` calls.
 */
export function mergeEnter<GEl extends Element, Datum>(
  enter: Selection<GEl, Datum, BaseType, unknown>,
  update: Selection<BaseType, Datum, BaseType, unknown>,
): Selection<GEl, Datum, BaseType, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (enter as any).merge(update) as Selection<
    GEl,
    Datum,
    BaseType,
    unknown
  >;
}

/**
 * Type-safe wrapper for applying a shared `Transition` to a typed `Selection`.
 * D3's `Selection.transition(t)` requires the transition's element type to extend
 * the selection's element type; since `DrawContext.transition` uses the broad `BaseType`,
 * a direct call fails the TypeScript check. This helper contains the single cast.
 */
export function withTransition<GEl extends Element, Datum>(
  selection: Selection<GEl, Datum, BaseType, unknown>,
  transition: Transition<BaseType, unknown, null, undefined>,
): Transition<GEl, Datum, BaseType, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (selection as any).transition(transition) as Transition<
    GEl,
    Datum,
    BaseType,
    unknown
  >;
}

/**
 * Casts a loose `SvgSelection` to a typed SVG element selection.
 * Used when calling D3 behaviors (zoom, axis) that require a concrete element type.
 */
export function asSvgElement<GEl extends SVGElement>(
  sel: SvgSelection,
): Selection<GEl, unknown, HTMLElement, unknown> {
  return sel as unknown as Selection<GEl, unknown, HTMLElement, unknown>;
}

/** Returns clamped `getHeight` and `getYPos` helpers bound to a D3 scale and optional depth clamp range. */
export const getYAxisFunctions = (
  yScale: (value: number) => number,
  clamp?: { from: number; to: number },
) => {
  const clampFrom = clamp?.from ?? -Infinity;
  const clampTo = clamp?.to ?? Infinity;
  return {
    getHeight: ({ from, to }: { from: number; to: number }) =>
      Math.max(
        0,
        yScale(Math.min(to, clampTo)) - yScale(Math.max(from, clampFrom)),
      ),
    getYPos: ({ from }: { from: number }) => yScale(Math.max(from, clampFrom)),
  };
};

/** Returns a predicate that tests whether an interval overlaps the window [depthFrom, depthTo]. */
export function filterByDepth(
  depthFrom: number,
  depthTo: number,
): (l: { from: number; to: number }) => boolean {
  return l => !(l.to <= depthFrom || l.from >= depthTo);
}
