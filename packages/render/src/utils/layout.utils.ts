import type { Fracture, Lithology } from '@welldot/core';

/**
 * Depth window `[from, to]` of each panel. When every panel has a
 * `depthRange` those are used as they are; otherwise the depth `[0, total]`
 * is split in proportion to the panel heights, back to back.
 */
export function resolvePanelWindows(
  panels: { height: number; depthRange?: [number, number] }[],
  totalDepth: number,
): [number, number][] {
  if (panels.length > 0 && panels.every(p => p.depthRange)) {
    return panels.map(p => [p.depthRange![0], p.depthRange![1]]);
  }
  if (panels.length === 1) return [[0, totalDepth]];

  const totalHeight = panels.reduce((s, p) => s + p.height, 0) || 1;
  const metersPerPx = totalDepth / totalHeight;
  let current = 0;
  return panels.map(p => {
    const from = current;
    current = from + p.height * metersPerPx;
    return [from, current];
  });
}

/** X positions (SVG coordinates) of the column titles. */
export type ColumnHeaderPositions = {
  /** Right edge of the depth title, over the axis tick labels. */
  depth: number;
  /** Center of the lithology column. */
  lithology: number;
  /** Center of the construction column. */
  construction: number;
  /** Left edge of the description column, when annotations are drawn. */
  description?: number;
};

/**
 * Column title positions from the panel geometry. `geoXLeft`, `geoXRight`
 * and `pocoCenterX` are in geologic-group coordinates (offset by
 * `marginLeft`), like the renderers use them.
 */
export function getColumnHeaderPositions(geometry: {
  marginLeft: number;
  geoXLeft: number;
  geoXRight: number;
  pocoCenterX: number;
  descriptionX?: number;
}): ColumnHeaderPositions {
  const { marginLeft, geoXLeft, geoXRight, pocoCenterX, descriptionX } =
    geometry;
  return {
    depth: marginLeft - 2,
    lithology: marginLeft + (geoXLeft + geoXRight) / 2,
    construction: marginLeft + pocoCenterX,
    ...(descriptionX != null ? { description: marginLeft + descriptionX } : {}),
  };
}

/** A lithology marker: the layer's 1-based index and its visible depths. */
export type LithologyMarker = { index: number; from: number; to: number };

/**
 * One marker per lithology layer visible in `[depthFrom, depthTo]`,
 * numbered by the layer's position in the whole list (so a layer keeps its
 * number on every panel it crosses).
 */
export function getLithologyMarkers(
  lithology: Pick<Lithology, 'from' | 'to'>[],
  depthFrom: number,
  depthTo: number,
): LithologyMarker[] {
  const markers: LithologyMarker[] = [];
  lithology.forEach((layer, i) => {
    const from = Math.max(layer.from, depthFrom);
    const to = Math.min(layer.to, depthTo);
    if (to > from) markers.push({ index: i + 1, from, to });
  });
  return markers;
}

/**
 * `F{n}` marker for each fracture in `[depthFrom, depthTo)`, numbered by
 * position in the whole list.
 */
export function getFractureMarkers(
  fractures: Pick<Fracture, 'depth'>[],
  depthFrom: number,
  depthTo: number,
): { label: string; depth: number }[] {
  const markers: { label: string; depth: number }[] = [];
  fractures.forEach((f, i) => {
    if (f.depth >= depthFrom && f.depth < depthTo) {
      markers.push({ label: `F${i + 1}`, depth: f.depth });
    }
  });
  return markers;
}

/**
 * Maps depths onto the overview column: `[0, totalDepth]` → `[0, height]`.
 * `window` is the y/height of the panel's `[depthFrom, depthTo]`.
 */
export function getOverviewGeometry(
  totalDepth: number,
  height: number,
  depthFrom: number,
  depthTo: number,
): { y: (depth: number) => number; window: { y: number; height: number } } {
  const ratio = totalDepth > 0 ? height / totalDepth : 0;
  const y = (depth: number) => Math.min(height, Math.max(0, depth * ratio));
  return {
    y,
    window: { y: y(depthFrom), height: Math.max(1, y(depthTo) - y(depthFrom)) },
  };
}

/** Replaces `{range}` in an overlap label template. */
export function formatOverlapLabel(template: string, range: string): string {
  return template.replace('{range}', range);
}
