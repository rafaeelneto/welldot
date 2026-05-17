import type { Well } from '@welldot/core';
import {
  WellSchema,
  deserializeWell,
  isWellEmpty,
} from '@welldot/core';
import type { RenderableWell } from '@welldot/render';
import {
  calculateHoleFillVolume,
  getLatestAquiferAnalysisField,
  getLatestStaticLevel,
  getProfileDiamValues,
  getProfileLastItemsDepths,
} from '@welldot/utils';
import type { Draft } from 'immer';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

// ─── Stable render-key registry ──────────────────────────────────────────────
// WeakMap maps each feature object instance → a stable UUID.
// Immer returns new objects for mutated elements and preserves identity for
// untouched ones, so: modified elements → new key (new D3 DOM node),
// unmodified elements → same key (stable D3 DOM node).
// The map is module-scoped and session-only — never serialised.
const _keyRegistry = new WeakMap<object, string>();

function getOrCreateKey(el: object): string {
  if (!_keyRegistry.has(el)) _keyRegistry.set(el, crypto.randomUUID());
  return _keyRegistry.get(el)!;
}

function withKeys<T extends object>(items: T[]): (T & { key: string })[] {
  return items.map(el => ({ ...el, key: getOrCreateKey(el) }));
}

/** Strip any runtime render key from a feature array before serialisation. */
function stripKeys<T extends object>(items: T[]): T[] {
  return items.map(item => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { key: _key, ...rest } = item as T & { key?: unknown };
    return rest as T;
  });
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useProfileStore = defineStore(
  'profile',
  () => {
    // ── Core state ─────────────────────────────────────────────────────────
    const {
      state: well,
      update: _update,
      reset: _reset,
      undo,
      redo,
      canUndo,
      canRedo,
      historySize,
    } = useImmer<Well | null>(null);

    const errors = ref<Record<string, string>>({});
    const isDirty = ref(false);

    // ── Renderable well (runtime-only, never persisted) ────────────────────
    // Keys are attached using the WeakMap registry so they stay stable across
    // edits: unmodified elements keep their key, modified ones get a new one.
    const renderableWell = computed<RenderableWell | null>(() => {
      const w = well.value;
      if (!w) return null;
      return {
        ...w,
        lithology: withKeys(w.lithology),
        fractures: withKeys(w.fractures),
        caves: withKeys(w.caves),
        bore_hole: withKeys(w.bore_hole),
        well_case: withKeys(w.well_case),
        well_screen: withKeys(w.well_screen),
        hole_fill: withKeys(w.hole_fill),
        surface_case: withKeys(w.surface_case),
        reduction: withKeys(w.reduction),
      };
    });

    // ── Measurements — lazy computed, never blocking ───────────────────────

    // Depth
    const maxDepth = computed(() => {
      if (!well.value) return 0;
      return Math.max(0, ...getProfileLastItemsDepths(well.value));
    });

    // Geologic counts
    const lithologyCount = computed(() => well.value?.lithology.length ?? 0);
    const fractureCount = computed(() => well.value?.fractures.length ?? 0);
    const caveCount = computed(() => well.value?.caves.length ?? 0);
    const totalGeologicLayers = computed(
      () => lithologyCount.value + fractureCount.value + caveCount.value,
    );

    // Per-unit thickness (from, to, thickness, description)
    const lithologyThicknesses = computed(() =>
      (well.value?.lithology ?? []).map(l => ({
        from: l.from,
        to: l.to,
        thickness: l.to - l.from,
        description: l.description,
        geologic_unit: l.geologic_unit,
        aquifer_unit: l.aquifer_unit,
      })),
    );

    // Constructive counts
    const boreHoleCount = computed(() => well.value?.bore_hole.length ?? 0);
    const wellCaseCount = computed(() => well.value?.well_case.length ?? 0);
    const wellScreenCount = computed(() => well.value?.well_screen.length ?? 0);
    const holeFillCount = computed(() => well.value?.hole_fill.length ?? 0);
    const reductionCount = computed(() => well.value?.reduction.length ?? 0);
    const surfaceCaseCount = computed(
      () => well.value?.surface_case.length ?? 0,
    );
    const totalConstructiveLayers = computed(
      () =>
        boreHoleCount.value +
        wellCaseCount.value +
        wellScreenCount.value +
        holeFillCount.value +
        reductionCount.value +
        surfaceCaseCount.value,
    );

    // Diameters
    const diameterValues = computed(() =>
      well.value ? getProfileDiamValues(well.value) : [],
    );
    const maxDiameter = computed(() =>
      diameterValues.value.length ? Math.max(...diameterValues.value) : 0,
    );
    const minDiameter = computed(() => {
      const positive = diameterValues.value.filter(d => d > 0);
      return positive.length ? Math.min(...positive) : 0;
    });

    // Fill volumes (m³)
    const gravelPackVolume = computed(() =>
      well.value ? calculateHoleFillVolume('gravel_pack', well.value) : 0,
    );
    const sealVolume = computed(() =>
      well.value ? calculateHoleFillVolume('seal', well.value) : 0,
    );

    // Hydrodynamic derived values
    const latestStaticLevel = computed(() =>
      well.value ? getLatestStaticLevel(well.value) : undefined,
    );
    const latestTransmissivity = computed(() =>
      well.value
        ? getLatestAquiferAnalysisField(well.value, 'transmissivity')
        : undefined,
    );
    const latestSpecificCapacity = computed(() =>
      well.value
        ? getLatestAquiferAnalysisField(well.value, 'specific_capacity')
        : undefined,
    );

    // ── Actions ────────────────────────────────────────────────────────────

    /** Load a well from a JSON string (v1 or v2 format). Resets history. */
    function loadWell(json: string): boolean {
      try {
        const parsed = deserializeWell(json);
        if (!parsed || isWellEmpty(parsed)) {
          errors.value = { root: 'Well data is empty or could not be read' };
          return false;
        }
        _reset(parsed);
        errors.value = {};
        isDirty.value = false;
        return true;
      } catch (e) {
        errors.value = {
          root: e instanceof Error ? e.message : 'Failed to parse well file',
        };
        return false;
      }
    }

    /** Apply an Immer recipe to the current well. Tracked in undo/redo history. */
    function updateWell(recipe: (draft: Draft<Well>) => void): void {
      if (!well.value) return;
      _update(draft => {
        if (draft) recipe(draft as Draft<Well>);
      });
      isDirty.value = true;
    }

    /**
     * Replace the entire well with a new object.
     * Records a history entry so the replacement is undoable.
     */
    function setWell(next: Well): void {
      _update(() => next);
      isDirty.value = true;
    }

    /**
     * Validate the current well against the v2 schema.
     * Populates `errors` on failure; clears it on success.
     */
    function validate(): boolean {
      if (!well.value) {
        errors.value = {};
        return true;
      }
      const exportable = getExportableWell();
      if (!exportable) return true;

      const result = WellSchema.safeParse(exportable);
      if (result.success) {
        errors.value = {};
        return true;
      }

      const errs: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.length ? issue.path.join('.') : 'root';
        errs[path] = issue.message;
      }
      errors.value = errs;
      return false;
    }

    /**
     * Return a Well with render keys stripped from all feature arrays.
     * Keys should never reach `well` state, but this guards against any
     * accidental bleed-through before the object hits serialisation.
     */
    function getExportableWell(): Well | null {
      const w = well.value;
      if (!w) return null;
      return {
        ...w,
        lithology: stripKeys(w.lithology),
        fractures: stripKeys(w.fractures),
        caves: stripKeys(w.caves),
        bore_hole: stripKeys(w.bore_hole),
        well_case: stripKeys(w.well_case),
        well_screen: stripKeys(w.well_screen),
        hole_fill: stripKeys(w.hole_fill),
        surface_case: stripKeys(w.surface_case),
        reduction: stripKeys(w.reduction),
      };
    }

    /** Clear the current profile and reset all state. */
    function clear(): void {
      _reset(null);
      errors.value = {};
      isDirty.value = false;
    }

    return {
      // ── Core state
      well,
      errors,
      isDirty,

      // ── Renderable (keys attached, runtime-only)
      renderableWell,

      // ── History
      canUndo,
      canRedo,
      historySize,
      undo,
      redo,

      // ── Measurements: depth
      maxDepth,

      // ── Measurements: geologic
      lithologyCount,
      fractureCount,
      caveCount,
      totalGeologicLayers,
      lithologyThicknesses,

      // ── Measurements: constructive
      boreHoleCount,
      wellCaseCount,
      wellScreenCount,
      holeFillCount,
      reductionCount,
      surfaceCaseCount,
      totalConstructiveLayers,

      // ── Measurements: diameter
      diameterValues,
      maxDiameter,
      minDiameter,

      // ── Measurements: fill volumes
      gravelPackVolume,
      sealVolume,

      // ── Measurements: hydrodynamic
      latestStaticLevel,
      latestTransmissivity,
      latestSpecificCapacity,

      // ── Actions
      loadWell,
      updateWell,
      setWell,
      validate,
      getExportableWell,
      clear,
    };
  },
  {
    persist: {
      key: 'welldot_profile',
      // Only persist the well data — errors, isDirty, and history are
      // transient session state and must not survive page reload.
      pick: ['well'],
    },
  },
);
