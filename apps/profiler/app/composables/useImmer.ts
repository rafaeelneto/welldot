import {
  applyPatches,
  enablePatches,
  produceWithPatches,
  type Draft,
  type Patch,
} from 'immer';
import { computed, ref, shallowRef } from 'vue';

enablePatches();

export interface UseImmerOptions {
  maxHistory?: number;
}

/**
 * Vue composable wrapping Immer with patch-based undo/redo history.
 *
 * State is held in a shallowRef — Immer always returns a new root object on
 * mutation, so shallow tracking is sufficient and avoids deep reactivity cost.
 *
 * History uses Immer's patch format: only the diff is stored per step,
 * not full copies, keeping memory usage proportional to edit size.
 */
export function useImmer<T>(
  initialValue: T,
  { maxHistory = 50 }: UseImmerOptions = {},
) {
  const state = shallowRef<T>(initialValue);

  // Non-reactive storage for patch pairs — only cursor + length drive reactivity.
  const _patches: [Patch[], Patch[]][] = [];
  const _cursor = ref(-1);
  const _length = ref(0); // mirrors _patches.length reactively

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function update(recipe: (draft: Draft<T>) => any): void {
    // Immer's produceWithPatches overloads don't accept nullable base states;
    // the any cast is intentional and safe — we own T's variance here.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [nextState, forward, inverse] = (produceWithPatches as any)(
      state.value,
      recipe,
    ) as [T, Patch[], Patch[]];

    if (forward.length === 0) return;

    // Discard any redo-able future beyond current position.
    _patches.splice(_cursor.value + 1);
    _patches.push([forward, inverse]);
    _cursor.value++;

    // If we exceeded the cap, drop the oldest entry and correct cursor.
    if (_patches.length > maxHistory) {
      _patches.shift();
      _cursor.value--;
    }

    _length.value = _patches.length;
    state.value = nextState as T;
  }

  function undo(): void {
    if (_cursor.value < 0) return;
    const entry = _patches[_cursor.value]!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    state.value = applyPatches(state.value as any, entry[1]) as T;
    _cursor.value--;
  }

  function redo(): void {
    if (_cursor.value >= _patches.length - 1) return;
    _cursor.value++;
    const entry = _patches[_cursor.value]!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    state.value = applyPatches(state.value as any, entry[0]) as T;
  }

  /** Replace state entirely and clear all history. */
  function reset(newValue: T): void {
    _patches.splice(0);
    _cursor.value = -1;
    _length.value = 0;
    state.value = newValue;
  }

  const canUndo = computed(() => _cursor.value >= 0);
  const canRedo = computed(() => _cursor.value < _length.value - 1);
  const historySize = computed(() => _length.value);

  return { state, update, undo, redo, reset, canUndo, canRedo, historySize };
}
