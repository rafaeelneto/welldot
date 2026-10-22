import { hasWellData } from '@welldot/core';

/**
 * Opening a `.well` from outside the app: the file picker, a dropped file or
 * pasted text. Each one asks first when the current well has unsaved changes
 * and resolves to true when a well was loaded, false when it could not be
 * read (the reason is in `profileStore.errors.root`) and null when the user
 * cancelled.
 */
export function useOpenWellFile() {
  const { t } = useI18n();
  const store = useProfileStore();
  const persistence = useFilePersistence();
  const confirm = useConfirm();

  /** Resolves to true when nothing would be lost or the user accepts. */
  function confirmDiscard(): Promise<boolean> {
    if (!store.isDirty || !hasWellData(store.well))
      return Promise.resolve(true);
    return new Promise(resolve => {
      confirm.require({
        icon: 'ph:warning-duotone',
        header: t('editor.confirmOpen.header'),
        message: t('editor.confirmOpen.message'),
        acceptLabel: t('editor.confirmOpen.accept'),
        rejectLabel: t('editor.confirmOpen.reject'),
        defaultFocus: 'reject',
        rejectProps: { text: true, severity: 'secondary' },
        accept: () => resolve(true),
        reject: () => resolve(false),
        onHide: () => resolve(false),
      });
    });
  }

  /** A file picked through a plain `<input type="file">`. */
  function pickFile(): Promise<File | null> {
    return new Promise(resolve => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.well,.json';
      input.addEventListener('change', () => resolve(input.files?.[0] ?? null));
      input.addEventListener('cancel', () => resolve(null));
      input.click();
    });
  }

  /** Load text that did not come through a file handle: Save must ask for a
   *  name. The handle is kept when the text cannot be loaded. */
  function _loadUnbound(text: string): boolean {
    if (!store.loadWell(text)) return false;
    persistence.clearHandle();
    return true;
  }

  /** Records a successful load under the way the well came in. */
  function _tracked(loaded: boolean | null, source: string) {
    if (loaded) trackEvent('well_open', { source });
    return loaded;
  }

  /** Pick a file and load it. */
  async function openFile(): Promise<boolean | null> {
    if (!(await confirmDiscard())) return null;
    if (persistence.hasFileSystemAccess) {
      const text = await persistence.open();
      return _tracked(text === null ? null : store.loadWell(text), 'file');
    }
    const file = await pickFile();
    return _tracked(
      file === null ? null : _loadUnbound(await file.text()),
      'file',
    );
  }

  /** Load a file dropped on the page. */
  async function openDroppedFile(file: File): Promise<boolean | null> {
    if (!(await confirmDiscard())) return null;
    return _tracked(_loadUnbound(await file.text()), 'drop');
  }

  /** Load `.well` text: pasted, or another source named by `source`. */
  async function openText(
    text: string,
    source: 'paste' | 'siagas' = 'paste',
  ): Promise<boolean | null> {
    if (!(await confirmDiscard())) return null;
    return _tracked(_loadUnbound(text), source);
  }

  return { openFile, openDroppedFile, openText };
}
