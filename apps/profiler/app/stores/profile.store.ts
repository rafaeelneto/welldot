import type { Well } from '@welldot/core';
import { WellSchema, deserializeWell, isWellEmpty } from '@welldot/core';
import type { RenderableWell } from '@welldot/render';
import {
  calculateHoleFillVolume,
  getLatestAquiferAnalysisField,
  getLatestStaticLevel,
  getProfileDiamValues,
  getProfileLastItemsDepths,
  isFlowingArtesian,
} from '@welldot/utils';
import type { Draft } from 'immer';
import { defineStore } from 'pinia';
import { computed, markRaw, ref } from 'vue';
import { makeDeepProxy } from '~/utils/state';
import { calculatedWellDepth } from '~/utils/wellDepth';

// ─── Chained-depth types ─────────────────────────────────────────────────────

type WellArrayKey =
  | 'bore_hole'
  | 'well_case'
  | 'reduction'
  | 'well_screen'
  | 'surface_case'
  | 'hole_fill'
  | 'lithology'
  | 'fractures'
  | 'caves';

const CHAINING_KEYS = new Set<WellArrayKey>([
  'bore_hole',
  'surface_case',
  'hole_fill',
  'lithology',
]);

/** Recalculate from/to so items are contiguous from 0, preserving each item's thickness. */
function rechainDepths(items: Array<{ from: number; to: number }>): void {
  let cursor = 0;
  for (const item of items) {
    const thickness = item.to - item.from;
    item.from = cursor;
    item.to = cursor + thickness;
    cursor = item.to;
  }
}

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
    const { key: _key, ...rest } = item as T & { key?: unknown };
    return rest as T;
  });
}

function emptyWell(): Well {
  return {
    version: 2,
    location: { lat: 0, lng: 0, elevation: 0 },
    bore_hole: [],
    well_case: [],
    reduction: [],
    well_screen: [],
    surface_case: [],
    hole_fill: [],
    lithology: [],
    fractures: [],
    caves: [],
    hydrodynamic_events: [],
    aquifer_analysis: [],
    history_logs: [],
  };
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useProfileStore = defineStore(
  'profile',
  () => {
    // ── Core state ─────────────────────────────────────────────────────────
    const {
      state: _well,
      update: _update,
      reset: _reset,
      undo,
      redo,
      canUndo,
      canRedo,
      historySize,
    } = useImmer<Well>(emptyWell());

    const errors = ref<Record<string, string>>({});
    const isDirty = ref(false);

    // ── Renderable well (runtime-only, never persisted) ────────────────────
    // Keys are attached using the WeakMap registry so they stay stable across
    // edits: unmodified elements keep their key, modified ones get a new one.
    const renderableWell = computed<RenderableWell | null>(() => {
      const w = _well.value;
      if (!w) return emptyWell() as RenderableWell;
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

    const well = computed<Well>(() => {
      const w = _well.value;
      if (!w) return {} as Well;
      return markRaw(makeDeepProxy(w, [], updateWell));
    });

    // ── Measurements — lazy computed, never blocking ───────────────────────

    // Depth
    const maxDepth = computed(() => {
      if (!_well.value) return 0;
      return Math.max(0, ...getProfileLastItemsDepths(_well.value));
    });

    // Geologic counts
    const lithologyCount = computed(() => _well.value?.lithology.length ?? 0);
    const fractureCount = computed(() => _well.value?.fractures.length ?? 0);
    const caveCount = computed(() => _well.value?.caves.length ?? 0);
    const totalGeologicLayers = computed(
      () => lithologyCount.value + fractureCount.value + caveCount.value,
    );

    // Per-unit thickness (from, to, thickness, description)
    const lithologyThicknesses = computed(() =>
      (_well.value?.lithology ?? []).map(l => ({
        from: l.from,
        to: l.to,
        thickness: l.to - l.from,
        description: l.description,
        geologic_unit: l.geologic_unit,
        aquifer_unit: l.aquifer_unit,
      })),
    );

    // Constructive counts
    const boreHoleCount = computed(() => _well.value?.bore_hole.length ?? 0);
    const wellCaseCount = computed(() => _well.value?.well_case.length ?? 0);
    const wellScreenCount = computed(
      () => _well.value?.well_screen.length ?? 0,
    );
    const holeFillCount = computed(() => _well.value?.hole_fill.length ?? 0);
    const reductionCount = computed(() => _well.value?.reduction.length ?? 0);
    const surfaceCaseCount = computed(
      () => _well.value?.surface_case.length ?? 0,
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
      _well.value ? getProfileDiamValues(_well.value) : [],
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
      _well.value ? calculateHoleFillVolume('gravel_pack', _well.value) : 0,
    );
    const sealVolume = computed(() =>
      _well.value ? calculateHoleFillVolume('seal', _well.value) : 0,
    );

    // Hydrodynamic derived values
    const latestStaticLevel = computed(() =>
      _well.value ? getLatestStaticLevel(_well.value) : undefined,
    );
    const flowingArtesian = computed(() =>
      _well.value ? isFlowingArtesian(_well.value) : false,
    );
    const latestTransmissivity = computed(() =>
      _well.value
        ? getLatestAquiferAnalysisField(_well.value, 'transmissivity')
        : undefined,
    );
    const latestSpecificCapacity = computed(() =>
      _well.value
        ? getLatestAquiferAnalysisField(_well.value, 'specific_capacity')
        : undefined,
    );

    // ── Actions ────────────────────────────────────────────────────────────

    /**
     * Bumped whenever a different well starts being edited (`loadWell`,
     * `clear`) — not by edits. Session-only (not persisted); lets the UI
     * reset per-well view state such as the active editor tab.
     */
    const wellSession = ref(0);

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
        wellSession.value++;
        return true;
      } catch (e) {
        errors.value = {
          root: e instanceof Error ? e.message : 'Failed to parse well file',
        };
        return false;
      }
    }

    /**
     * Apply an Immer recipe to the current well. Tracked in undo/redo history.
     *
     * Also keeps `well_depth` tracking the calculated constructive depth
     * (`calculatedWellDepth` — deliberately narrower than `maxDepth`, which
     * includes geology for the render scale), in the same transaction as the
     * triggering edit (same pattern as `rechainDepths` below): only while
     * it's unset or still equal to the pre-edit calculated depth. Once the
     * user manually diverges it, further edits to the constructive data no
     * longer touch it — they'd need to click "sync" to re-link it.
     */
    function updateWell(recipe: (draft: Draft<Well>) => void): void {
      if (!_well.value) return;
      const previousDepth = calculatedWellDepth(_well.value);
      _update(draft => {
        if (!draft) return;
        recipe(draft as Draft<Well>);
        const nextDepth = calculatedWellDepth(draft as Well);
        if (
          nextDepth !== previousDepth &&
          (draft.well_depth == null || draft.well_depth === previousDepth)
        ) {
          draft.well_depth = nextDepth;
        }
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
      if (!_well.value) {
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
      const w = _well.value;
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
      _reset(emptyWell());
      errors.value = {};
      isDirty.value = false;
      wellSession.value++;
    }

    function markClean(): void {
      isDirty.value = false;
    }

    /**
     * Move a feature from `fromIdx` to `toIdx` within its array.
     * For chaining types (bore_hole, surface_case, hole_fill, lithology),
     * depths are recalculated to remain contiguous from 0 after the move.
     */
    function reorderWellFeature(
      key: WellArrayKey,
      fromIdx: number,
      toIdx: number,
    ): void {
      updateWell(draft => {
        const arr = draft[key] as Array<{ from: number; to: number }>;
        const [moved] = arr.splice(fromIdx, 1);
        if (!moved) return;
        arr.splice(toIdx, 0, moved);
        if (CHAINING_KEYS.has(key)) rechainDepths(arr);
      });
    }

    /**
     * Append a new item to a feature array.
     * For chaining types, `from`/`to` are overridden so the item starts exactly
     * where the last existing item ends, preserving the passed-in thickness.
     */
    function addWellFeature<K extends WellArrayKey>(
      key: K,
      item: Well[K][number],
    ): void {
      updateWell(draft => {
        const arr = draft[key] as Array<{ from: number; to: number }>;
        if (CHAINING_KEYS.has(key)) {
          const raw = item as unknown as { from: number; to: number };
          const lastTo = arr.length > 0 ? arr[arr.length - 1]!.to : 0;
          const thickness = raw.to - raw.from > 0 ? raw.to - raw.from : 10;
          arr.push({
            ...(item as object),
            from: lastTo,
            to: lastTo + thickness,
          } as {
            from: number;
            to: number;
          });
        } else {
          arr.push(item as unknown as { from: number; to: number });
        }
      });
    }

    /**
     * Update a single field on a feature item.
     * For chaining types, editing `from` or `to` recalculates all subsequent
     * items to remain contiguous without changing their thicknesses.
     */
    function updateWellFeature(
      key: WellArrayKey,
      index: number,
      prop: string,
      value: unknown,
    ): void {
      updateWell(draft => {
        const arr = draft[key] as Array<
          Record<string, unknown> & { from: number; to: number }
        >;
        (arr[index] as Record<string, unknown>)[prop] = value;
        if (CHAINING_KEYS.has(key) && (prop === 'from' || prop === 'to')) {
          rechainDepths(arr);
        }
      });
    }

    return {
      // ── State (raw ref — persistence only, prefer `well` in components)
      _well,

      // ── Well (renderable read / Immer-recipe write)
      well,
      renderableWell,
      errors,
      isDirty,

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
      flowingArtesian,
      latestTransmissivity,
      latestSpecificCapacity,

      wellSession,

      // ── Actions
      loadWell,
      updateWell,
      setWell,
      validate,
      getExportableWell,
      clear,
      markClean,
      reorderWellFeature,
      addWellFeature,
      updateWellFeature,
    };
  },
  {
    persist: {
      key: 'welldot_profile',
      pick: ['_well'],
      storage: piniaPluginPersistedstate.localStorage(),
      afterHydrate(ctx) {
        const w = ctx.store._well as Well | null;
        if (w && !isWellEmpty(w)) {
          ctx.store.isDirty = true;
        }
      },
    },
  },
);
