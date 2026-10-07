import type { Permit, Well } from '@welldot/core';
import {
  getPermitIdentifier,
  getPermitStartDate,
  getPermitStatus,
  todayCalendarDate,
} from '@welldot/utils';

/** Closed vocabulary of the stored administrative `status` (spec v2.3). */
export const PERMIT_ADMINISTRATIVE_STATUS_VALUES = [
  'requested',
  'granted',
  'suspended',
  'revoked',
  'denied',
  'withdrawn',
] as const;

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

/**
 * Short display label of a permit: authority plus `identifier`, else
 * `request_identifier`. Falls back to `fallback` (e.g. an unresolved id).
 */
export function permitLabel(permit: Permit | undefined, fallback = ''): string {
  if (!permit) return fallback;
  return [permit.authority, getPermitIdentifier(permit)]
    .filter(Boolean)
    .join(' ');
}

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

/**
 * The permit production compliance is judged by: among the `active` /
 * `active_pending_renewal` permits on `today`, the one with the latest start.
 */
export function getActivePermit(
  well: Well,
  today: string = todayCalendarDate(),
): Permit | undefined {
  return (well.permits ?? [])
    .filter(p => {
      const status = getPermitStatus(well, p, today);
      return status === 'active' || status === 'active_pending_renewal';
    })
    .sort((a, b) =>
      (getPermitStartDate(b) ?? '').localeCompare(getPermitStartDate(a) ?? ''),
    )[0];
}
