import type { PermitHistoryEntry } from '@welldot/core';
import { useConfirm } from 'primevue/useconfirm';

/**
 * Adds, edits, completes and removes the administrative steps of a permit
 * (`permits[].history`, .well v2.3) directly in the store — used by the
 * read-only permit view, outside the permit dialog.
 */
export function usePermitHistory() {
  const { t } = useI18n();
  const confirm = useConfirm();
  const profileStore = useProfileStore();

  function upsertHistoryEntry(permitId: string, entry: PermitHistoryEntry) {
    profileStore.updateWell(draft => {
      const permit = draft.permits?.find(p => p.id === permitId);
      if (!permit) return;
      if (!permit.history) permit.history = [];
      const idx = permit.history.findIndex(h => h.id === entry.id);
      if (idx === -1) permit.history.push(entry);
      else permit.history[idx] = entry;
    });
  }

  function setHistoryDone(permitId: string, entryId: string, done: boolean) {
    profileStore.updateWell(draft => {
      const entry = draft.permits
        ?.find(p => p.id === permitId)
        ?.history?.find(h => h.id === entryId);
      if (!entry) return;
      entry.done = done;
      entry.updated_at = new Date().toISOString();
    });
  }

  /** Asks for confirmation, then removes the entry. */
  function removeHistoryEntry(permitId: string, entryId: string) {
    confirm.require({
      icon: 'ph:warning-duotone',
      header: t('editor.operation.permit.history.deleteConfirm'),
      message: t('editor.operation.permit.history.deleteConfirm'),
      acceptLabel: t('editor.confirmClear.accept'),
      rejectLabel: t('editor.confirmClear.reject'),
      acceptProps: { severity: 'danger' },
      rejectProps: { text: true, severity: 'secondary' },
      defaultFocus: 'reject',
      accept: () => {
        profileStore.updateWell(draft => {
          const permit = draft.permits?.find(p => p.id === permitId);
          if (!permit?.history) return;
          permit.history = permit.history.filter(h => h.id !== entryId);
          if (!permit.history.length) delete permit.history;
        });
      },
    });
  }

  return { upsertHistoryEntry, setHistoryDone, removeHistoryEntry };
}
