import type { ConditionFulfillment } from '@welldot/core';
import { useConfirm } from 'primevue/useconfirm';

/**
 * Records and removes the fulfillment of a permit condition deadline
 * (`permits[].conditions[].fulfillments`, .well v2.3). Shared by the permit
 * cards and the read-only permit view.
 */
export function usePermitFulfillments() {
  const { t } = useI18n();
  const confirm = useConfirm();
  const profileStore = useProfileStore();

  function addFulfillment(
    permitId: string,
    conditionId: string,
    fulfillment: ConditionFulfillment,
  ) {
    profileStore.updateWell(draft => {
      const condition = draft.permits
        ?.find(p => p.id === permitId)
        ?.conditions?.find(c => c.id === conditionId);
      if (!condition) return;
      if (!condition.fulfillments) condition.fulfillments = [];
      condition.fulfillments.push(fulfillment);
    });
  }

  /** Asks for confirmation, then removes the fulfillment. */
  function removeFulfillment(
    permitId: string,
    conditionId: string,
    fulfillmentId: string,
  ) {
    confirm.require({
      icon: 'ph:warning-duotone',
      header: t('editor.operation.permit.conditions.undoConfirm'),
      message: t('editor.operation.permit.conditions.undoConfirm'),
      acceptLabel: t('editor.confirmClear.accept'),
      rejectLabel: t('editor.confirmClear.reject'),
      acceptProps: { severity: 'danger' },
      rejectProps: { text: true, severity: 'secondary' },
      defaultFocus: 'reject',
      accept: () => {
        profileStore.updateWell(draft => {
          const condition = draft.permits
            ?.find(p => p.id === permitId)
            ?.conditions?.find(c => c.id === conditionId);
          if (!condition?.fulfillments) return;
          condition.fulfillments = condition.fulfillments.filter(
            f => f.id !== fulfillmentId,
          );
          if (!condition.fulfillments.length) delete condition.fulfillments;
        });
      },
    });
  }

  return { addFulfillment, removeFulfillment };
}
