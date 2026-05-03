import textures from 'textures';

import { Lithology } from '@welldot/core';
import { Conflict, SvgSelection } from '~/types/render.types';
import { importFgdcTextures } from '~/utils/fgdcTextures';

// Re-exports so consumers and tests can still import from this single barrel.
export { filterByDepth, getYAxisFunctions } from './d3.utils';
export { makeSeededPrng, ptsToSmoothPath, wavyContact } from './geometry.utils';
export { populateTooltips } from './tooltips.utils';

let _fgdcTextures: Record<string, string> = {};
let _fgdcTexturesPromise: Promise<void> | null = null;

export const preloadFgdcTextures = (): Promise<void> => {
  if (!_fgdcTexturesPromise) {
    _fgdcTexturesPromise = importFgdcTextures().then(t => {
      _fgdcTextures = t;
    });
  }
  return _fgdcTexturesPromise;
};

export type LithologyTextureOptions = {
  size: number;
  strokeWidth: number;
  stroke: string;
};

/** Returns a map from "texture.from" keys to textures.js fill objects for each lithology entry. */
export const getLithologicalFillList = (
  data: Lithology[],
  opts: LithologyTextureOptions,
) => {
  const uniqueTextureCodes = [...new Set(data.map(d => d.fgdc_texture))];
  const texturesLoaded = Object.fromEntries(
    uniqueTextureCodes
      .filter(code => _fgdcTextures[code])
      .map(code => [code, _fgdcTextures[code]]),
  );

  return Object.fromEntries(
    data.map(d => [
      `${d.fgdc_texture}.${d.from}`,
      textures
        .paths()
        .d(() => texturesLoaded[d.fgdc_texture])
        .size(opts.size)
        .strokeWidth(opts.strokeWidth)
        .stroke(opts.stroke)
        .background(d.color),
    ]),
  );
};

/** Returns a fill-value function for a lithology datum, registering texture patterns on the SVG as needed. */
export const getLithologyFill = (
  geologyData: Lithology[],
  svg: SvgSelection,
  opts: LithologyTextureOptions,
) => {
  const lithologicalFill = getLithologicalFillList(geologyData, opts);
  return (d: Lithology) => {
    const fill = lithologicalFill[`${d.fgdc_texture}.${d.from}`];
    if (!fill.url) return fill;
    svg.call(fill as unknown as (selection: SvgSelection) => void);
    return fill.url();
  };
};

/** Returns all overlapping depth intervals between two arrays of depth-ranged items, carrying the max diameter of each pair. */
export const getConflictAreas = (
  array1: Conflict[],
  array2: Conflict[],
): Conflict[] =>
  array1.flatMap(item1 =>
    array2
      .filter(item2 => item2.from < item1.to && item2.to > item1.from)
      .map(item2 => ({
        from: Math.max(item2.from, item1.from),
        to: Math.min(item2.to, item1.to),
        diameter: Math.max(item1.diameter, item2.diameter),
      })),
  );

/** Merges overlapping or near-adjacent conflict segments (within `buffer` units) into single spans. */
export const mergeConflicts = (
  conflicts: Conflict[],
  buffer: number,
): Conflict[] => {
  if (conflicts.length === 0) return [];

  return [...conflicts]
    .sort((a, b) => a.from - b.from)
    .reduce<Conflict[]>((merged, current) => {
      const last = merged[merged.length - 1];
      if (last && current.from <= last.to + buffer) {
        last.to = Math.max(last.to, current.to);
        return merged;
      }
      merged.push({ ...current });
      return merged;
    }, []);
};

/**
 * Breaks `text` into lines of at most `maxChars` characters on word boundaries.
 * Always returns at least one element.
 */
export function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}
