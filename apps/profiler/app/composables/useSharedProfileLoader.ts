import type { Well } from '@welldot/core';
import { hasWellData } from '@welldot/core';
import { watch } from 'vue';

/**
 * Watches `?share={id}` on the current route and loads the shared profile
 * into the store — confirming first if there are unsaved changes — showing a
 * distinct error when the link is invalid/expired vs. when loading it just
 * failed. Always clears the query param afterward, whatever the outcome.
 *
 * Side-effect only (no state to expose); call once from the editor page.
 */
export function useSharedProfileLoader() {
  const { t } = useI18n();
  const route = useRoute();
  const router = useRouter();
  const profileStore = useProfileStore();
  const confirm = useConfirm();

  function clearShareQuery() {
    const { share: _share, ...rest } = route.query;
    router.replace({ query: rest });
  }

  function loadShared(well: Well) {
    profileStore.loadWell(JSON.stringify(well));
  }

  watch(
    () => route.query.share,
    async id => {
      if (typeof id !== 'string' || !id) return;

      try {
        const { well } = await $fetch<{ well: Well }>(`/api/share/${id}`);

        if (profileStore.isDirty && hasWellData(profileStore.well)) {
          confirm.require({
            icon: 'ph:warning-duotone',
            header: t('editor.confirmLoadShared.header'),
            message: t('editor.confirmLoadShared.message'),
            acceptLabel: t('editor.confirmLoadShared.accept'),
            rejectLabel: t('editor.confirmLoadShared.reject'),
            defaultFocus: 'reject',
            rejectProps: { text: true, severity: 'secondary' },
            accept: () => loadShared(well),
          });
        } else {
          loadShared(well);
        }
      } catch (err) {
        const statusCode = (err as { statusCode?: number } | undefined)
          ?.statusCode;
        const isNotFound = statusCode === 400 || statusCode === 404;
        confirm.require({
          icon: 'ph:warning-duotone',
          header: isNotFound
            ? t('editor.shareNotFound.header')
            : t('editor.shareLoadFailed.header'),
          message: isNotFound
            ? t('editor.shareNotFound.message')
            : t('editor.shareLoadFailed.message'),
          acceptLabel: t('editor.shareNotFound.accept'),
          rejectProps: { style: { display: 'none' } },
          accept: () => {},
        });
      } finally {
        clearShareQuery();
      }
    },
    { immediate: true },
  );
}
