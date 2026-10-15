import { hasWellData } from '@welldot/core';

export type NewWellSection = 'examples' | 'paste' | 'siagas';

/**
 * The "New well" dialog: start blank, from an example, from a file, from
 * pasted JSON or from a SIAGAS code. One instance lives in the editor
 * header; anything can open it.
 * It opens by itself once per session when the editor starts with an empty
 * well (`openIfEmpty`).
 */
export function useNewWellDialog() {
  const { t } = useI18n();
  const store = useProfileStore();
  const persistence = useFilePersistence();
  const confirm = useConfirm();
  const route = useRoute();

  const visible = useState('new-well-visible', () => false);
  const section = useState<NewWellSection>(
    'new-well-section',
    () => 'examples',
  );
  const autoOpened = useState('new-well-auto-opened', () => false);

  function open(to: NewWellSection = 'examples') {
    section.value = to;
    visible.value = true;
  }

  function close() {
    visible.value = false;
  }

  /** Open on the examples when the editor starts empty, once per session.
   *  Not when a shared link (`?share=`) is about to fill the editor. */
  function openIfEmpty() {
    if (autoOpened.value) return;
    autoOpened.value = true;
    if (route.query.share) return;
    if (!hasWellData(store.well)) open('examples');
  }

  function _startBlank() {
    persistence.clearHandle();
    store.clear();
    close();
  }

  /** Replace the current well with an empty one (asks when it has data). */
  function startBlank() {
    if (!hasWellData(store.well)) return _startBlank();
    confirm.require({
      icon: 'ph:warning-duotone',
      header: t('editor.newWell.confirmBlank.header'),
      message: t(
        store.isDirty
          ? 'editor.newWell.confirmBlank.messageUnsaved'
          : 'editor.newWell.confirmBlank.message',
      ),
      acceptLabel: t('editor.newWell.confirmBlank.accept'),
      rejectLabel: t('editor.newWell.confirmBlank.reject'),
      acceptProps: { severity: 'danger' },
      rejectProps: { text: true, severity: 'secondary' },
      defaultFocus: 'reject',
      accept: _startBlank,
    });
  }

  return { visible, section, open, close, openIfEmpty, startBlank };
}
