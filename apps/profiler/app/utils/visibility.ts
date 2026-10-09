import type { SectionKey, VisibilityKey, WellVisibility } from '@welldot/core';
import {
  SECTION_KEYS,
  VISIBILITY_LEAF_KEYS,
  VISIBILITY_TREE,
} from '@welldot/core';

/** Leaf-level visibility: one boolean per `VISIBILITY_LEAF_KEYS` entry. */
export type LeafVisibility = Record<VisibilityKey, boolean>;

/** Tree checkbox state, as PrimeVue `Tree` `selectionKeys` expects it. */
export type TreeSelectionKeys = Record<
  string,
  { checked: boolean; partialChecked: boolean }
>;

/** Every leaf visible. */
export function allVisible(): LeafVisibility {
  return Object.fromEntries(
    VISIBILITY_LEAF_KEYS.map(k => [k, true]),
  ) as LeafVisibility;
}

/**
 * Normalizes any stored visibility (current leaf shape, or the pre-tree
 * per-section shape) to one boolean per leaf. A leaf is hidden when it, or
 * its section, is stored as `false`; unknown or missing leaves are visible.
 */
export function normalizeVisibility(
  stored: WellVisibility | null | undefined,
): LeafVisibility {
  const out = allVisible();
  if (!stored) return out;
  for (const section of SECTION_KEYS) {
    const fields = VISIBILITY_TREE[section];
    const leaves: VisibilityKey[] = fields.length ? [...fields] : [section];
    for (const leaf of leaves) {
      if (stored[leaf] === false || stored[section] === false)
        out[leaf] = false;
    }
  }
  return out;
}

/** Number of visible leaves. */
export function countVisible(visibility: LeafVisibility): number {
  return VISIBILITY_LEAF_KEYS.filter(k => visibility[k]).length;
}

/** Leaves of a section (its fields, or the section itself when it has none). */
export function sectionLeaves(section: SectionKey): VisibilityKey[] {
  const fields = VISIBILITY_TREE[section];
  return fields.length ? [...fields] : [section];
}

/** Builds PrimeVue `Tree` checkbox keys, with parents checked/partial from their leaves. */
export function toSelectionKeys(visibility: LeafVisibility): TreeSelectionKeys {
  const keys: TreeSelectionKeys = {};
  for (const section of SECTION_KEYS) {
    const leaves = sectionLeaves(section);
    const visible = leaves.filter(k => visibility[k]).length;
    for (const leaf of leaves) {
      if (visibility[leaf])
        keys[leaf] = { checked: true, partialChecked: false };
    }
    if (VISIBILITY_TREE[section].length && visible > 0) {
      keys[section] = {
        checked: visible === leaves.length,
        partialChecked: visible > 0 && visible < leaves.length,
      };
    }
  }
  return keys;
}

/** Reads leaf visibility back from PrimeVue `Tree` checkbox keys. */
export function fromSelectionKeys(
  keys: Record<string, { checked?: boolean }> | null | undefined,
): LeafVisibility {
  return Object.fromEntries(
    VISIBILITY_LEAF_KEYS.map(k => [k, keys?.[k]?.checked === true]),
  ) as LeafVisibility;
}
