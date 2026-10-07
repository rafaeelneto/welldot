import type { Permit, Well } from '@welldot/core';
import {
  getPermitIdentifier,
  getPermitStartDate,
  getPermitStatus,
  todayCalendarDate,
} from '@welldot/utils';

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
