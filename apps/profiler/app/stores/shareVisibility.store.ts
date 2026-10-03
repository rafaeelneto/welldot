import type { SectionKey, SectionVisibility } from '@welldot/core';
import { SECTION_KEYS } from '@welldot/core';
import { defineStore } from 'pinia';

export const useShareVisibilityStore = defineStore(
  'shareVisibility',
  () => {
    const visibility = ref<SectionVisibility>({
      general: true,
      constructive: true,
      geology: true,
      hydrodynamic: true,
      history: true,
      operation: true,
    });

    const visibleCount = computed(
      () => SECTION_KEYS.filter(key => visibility.value[key]).length,
    );
    const hasHidden = computed(() => visibleCount.value < SECTION_KEYS.length);

    /** Sets a section's visibility. No-ops if it would hide the last visible section. */
    function setVisible(key: SectionKey, value: boolean): void {
      if (!value && visibleCount.value <= 1 && visibility.value[key]) return;
      visibility.value[key] = value;
    }

    return { visibility, visibleCount, hasHidden, setVisible };
  },
  {
    persist: {
      key: 'welldot_share_visibility',
      // Sections added after the state was first persisted (e.g. `operation`,
      // .well v2.3) default to visible instead of being silently hidden.
      afterHydrate(ctx) {
        const stored = ctx.store.visibility as Partial<SectionVisibility>;
        for (const key of SECTION_KEYS) {
          if (typeof stored[key] !== 'boolean')
            ctx.store.visibility[key] = true;
        }
      },
    },
  },
);
