import type { InjectionKey } from 'vue';

/**
 * Editor tab keys (see pages/editor/index.vue). Also the URL hash of the
 * active tab, so they are part of shareable/reloadable URLs — keep them stable.
 */
export const EDITOR_TAB = {
  summary: 'summary',
  general: 'general',
  construction: 'construction',
  geological: 'geological',
  historyLog: 'history',
  hydrodynamicEvents: 'hydrodynamic',
  operation: 'operation',
  permits: 'permits',
  waterQuality: 'water-quality',
} as const;

export type EditorTabKey = (typeof EDITOR_TAB)[keyof typeof EDITOR_TAB];

const TAB_KEYS = new Set<string>(Object.values(EDITOR_TAB));

export function isEditorTabKey(value: string): value is EditorTabKey {
  return TAB_KEYS.has(value);
}

/** Provided by TabSummary: switches the editor to another tab. */
export const summaryNavigateKey: InjectionKey<(_tab: EditorTabKey) => void> =
  Symbol('summaryNavigate');
