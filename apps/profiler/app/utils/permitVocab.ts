// Permit helpers live in @welldot/utils and the closed status list in
// @welldot/core; re-exported for auto-import. UI-only maps stay here.
export { PERMIT_ADMINISTRATIVE_STATUS_VALUES } from '@welldot/core';
export { getActivePermit, permitLabel } from '@welldot/utils';

/** Icon per recommended history `type`; others use a generic one. */
export const PERMIT_HISTORY_TYPE_ICON: Record<string, string> = {
  filing: 'ph:file-arrow-up-duotone',
  process: 'ph:arrows-clockwise-duotone',
  notification: 'ph:bell-ringing-duotone',
  fee: 'ph:receipt-duotone',
  inspection: 'ph:magnifying-glass-duotone',
  decision: 'ph:gavel-duotone',
  renewal: 'ph:arrow-counter-clockwise-duotone',
};

/** PrimeVue `Tag` severity for each derived permit status. */
export const PERMIT_STATUS_SEVERITY: Record<string, string> = {
  requested: 'info',
  suspended: 'warn',
  revoked: 'danger',
  denied: 'danger',
  withdrawn: 'secondary',
  active: 'success',
  active_pending_renewal: 'warn',
  not_yet_valid: 'info',
  expired: 'danger',
  superseded: 'secondary',
};

/** PrimeVue `Tag` severity for each derived condition deadline status. */
export const DEADLINE_STATUS_SEVERITY: Record<string, string> = {
  fulfilled: 'success',
  fulfilled_late: 'warn',
  upcoming: 'info',
  overdue: 'danger',
};
