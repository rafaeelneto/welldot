import type { VisibilityKey, WellVisibility } from '@welldot/core';
import { VISIBILITY_LEAF_KEYS } from '@welldot/core';
import { defineStore } from 'pinia';
import type { LeafVisibility } from '~/utils/visibility';
import {
  allVisible,
  countVisible,
  normalizeVisibility,
} from '~/utils/visibility';

/**
 * What gets shared/exported, one boolean per section field
 * (`VISIBILITY_LEAF_KEYS` of `@welldot/core`). Pass `visibility` straight to
 * `redactWell`. Used by share links, `.well` export and the PDF export.
 */
export const useShareVisibilityStore = defineStore(
  'shareVisibility',
  () => {
    const visibility = ref<LeafVisibility>(allVisible());

    const visibleCount = computed(() => countVisible(visibility.value));
    const hasHidden = computed(
      () => visibleCount.value < VISIBILITY_LEAF_KEYS.length,
    );

    /**
     * Replaces the whole visibility. No-ops (returns `false`) if it would
     * hide everything.
     */
    function setVisibility(next: LeafVisibility): boolean {
      if (countVisible(next) === 0) return false;
      visibility.value = { ...next };
      return true;
    }

    /** Sets one leaf. No-ops if it would hide the last visible leaf. */
    function setVisible(key: VisibilityKey, value: boolean): void {
      setVisibility({ ...visibility.value, [key]: value });
    }

    return { visibility, visibleCount, hasHidden, setVisibility, setVisible };
  },
  {
    persist: {
      key: 'welldot_share_visibility',
      // Migrates the pre-tree per-section shape (`{ operation: false, … }`)
      // and fills leaves added later (new sections or fields) as visible.
      afterHydrate(ctx) {
        const normalized = normalizeVisibility(
          ctx.store.visibility as WellVisibility,
        );
        ctx.store.visibility =
          countVisible(normalized) > 0 ? normalized : allVisible();
      },
    },
  },
);
