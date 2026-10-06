import type { InjectionKey } from 'vue';

/** Editor tab keys the summary cards can link to (see pages/editor/index.vue). */
export const EDITOR_TAB = {
  general: '0',
  construction: '1',
  geological: '2',
  historyLog: '4',
  hydrodynamicEvents: '5',
  operation: '6',
  permits: '7',
  waterQuality: '8',
} as const;

export type EditorTabKey = (typeof EDITOR_TAB)[keyof typeof EDITOR_TAB];

/** Provided by TabSummary: switches the editor to another tab. */
export const summaryNavigateKey: InjectionKey<(_tab: EditorTabKey) => void> =
  Symbol('summaryNavigate');
