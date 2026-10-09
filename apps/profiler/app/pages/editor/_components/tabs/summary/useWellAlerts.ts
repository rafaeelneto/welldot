import { getLimitSet } from '@welldot/core';
import {
  getCurrentWellStatus,
  getCurrentWellStatusEntry,
  getExceedances,
  getOperationWarnings,
  getOverduePermitHistory,
  getPermitIdentifier,
  getPermitStatus,
  getPermitWarnings,
  getPumpInstallationWarnings,
  getWaterSampleWarnings,
  todayCalendarDate,
  type OperationWarningCode,
  type PermitWarningCode,
} from '@welldot/utils';
import { resolveWellStatusLabel } from '~/utils/operationVocab';
import {
  daysBetween,
  getLatestWellSample,
  getPendingConditions,
  getSummaryPermit,
} from './derive';
import { EDITOR_TAB, type EditorTabKey } from './navigate';

/** A permit expiring within this many days raises an alert. */
export const PERMIT_EXPIRY_WARNING_DAYS = 90;

/** Warnings about the well's situation, not about data consistency. */
const OPERATIONAL_OPERATION_CODES: readonly OperationWarningCode[] = [
  'regime_exceeds_permit',
];
const OPERATIONAL_PERMIT_CODES: readonly PermitWarningCode[] = [
  'monthly_above_max',
];

/** Operation warnings about history log entries (shown in the History tab). */
const LOG_WARNING_CODES: readonly OperationWarningCode[] = [
  'log_category_field_mismatch',
  'log_reference_unresolved',
  'log_after_decommission',
  'missing_maintenance_type',
  'missing_status',
];

export type WellAlert = {
  key: string;
  severity: 'danger' | 'warn';
  icon: string;
  message: string;
  tab: EditorTabKey;
};

export type DataIssueGroup = {
  key: string;
  label: string;
  tab: EditorTabKey;
  messages: string[];
};

/**
 * Summary alerts: the operational situation of the well (permit expiry,
 * overdue conditions, regime above the grant, water quality exceedances,
 * well status) and, separately, data consistency issues grouped by domain.
 */
export function useWellAlerts() {
  const { t } = useI18n();
  const profileStore = useProfileStore();
  const uiStore = useUiStore();

  const today = todayCalendarDate();

  const alerts = computed<WellAlert[]>(() => {
    const well = profileStore.well;
    const out: WellAlert[] = [];

    // ── Permit ──
    const permit = getSummaryPermit(well, today);
    if (permit) {
      const status = getPermitStatus(well, permit, today);
      const number = getPermitIdentifier(permit) ?? permit.authority;
      const until = permit.valid_until;
      if (status === 'suspended' || status === 'revoked') {
        out.push({
          key: 'permit-halted',
          severity: 'danger',
          icon: 'ph:prohibit-duotone',
          message: t(`editor.summary.alerts.permit_${status}`, { number }),
          tab: EDITOR_TAB.permits,
        });
      } else if (status === 'expired' && until) {
        out.push({
          key: 'permit-expired',
          severity: 'danger',
          icon: 'ph:seal-warning-duotone',
          message: t('editor.summary.alerts.permitExpired', {
            number,
            date: formatCalendarDate(until),
          }),
          tab: EDITOR_TAB.permits,
        });
      } else if (status === 'active_pending_renewal' && until) {
        out.push({
          key: 'permit-renewal',
          severity: 'warn',
          icon: 'ph:seal-warning-duotone',
          message: t('editor.summary.alerts.permitPendingRenewal', {
            number,
            date: formatCalendarDate(until),
          }),
          tab: EDITOR_TAB.permits,
        });
      } else if (status === 'active' && until) {
        const days = daysBetween(today, until);
        if (days <= PERMIT_EXPIRY_WARNING_DAYS) {
          out.push({
            key: 'permit-expiring',
            severity: 'warn',
            icon: 'ph:hourglass-medium-duotone',
            message: t('editor.summary.alerts.permitExpiring', {
              number,
              date: formatCalendarDate(until),
              n: days,
            }),
            tab: EDITOR_TAB.permits,
          });
        }
      }

      if (status !== 'superseded') {
        for (const c of getPendingConditions(well, permit, today)) {
          if (!c.overdue.length) continue;
          out.push({
            key: `condition-${c.id}`,
            severity: 'danger',
            icon: 'ph:calendar-x-duotone',
            message:
              c.overdue.length > 1
                ? t('editor.summary.alerts.conditionOverdueMany', {
                    description: c.description,
                    n: c.overdue.length,
                    date: formatCalendarDate(c.overdue[0]),
                  })
                : t('editor.summary.alerts.conditionOverdue', {
                    description: c.description,
                    date: formatCalendarDate(c.overdue[0]),
                  }),
            tab: EDITOR_TAB.permits,
          });
        }
      }
    }

    // ── Permit administrative steps past due ──
    for (const p of well.permits ?? []) {
      const status = getPermitStatus(well, p, today);
      if (
        status === 'superseded' ||
        status === 'denied' ||
        status === 'withdrawn'
      ) {
        continue;
      }
      const overdue = getOverduePermitHistory(p, today);
      if (!overdue.length) continue;
      out.push({
        key: `permit-history-${p.id}`,
        severity: 'warn',
        icon: 'ph:clock-countdown-duotone',
        message: t('editor.summary.alerts.permitStepsOverdue', {
          number: getPermitIdentifier(p) ?? p.authority,
          n: overdue.length,
          description: overdue[0]!.description,
        }),
        tab: EDITOR_TAB.permits,
      });
    }

    // ── Operation vs. grant ──
    for (const code of new Set(
      getOperationWarnings(well)
        .map(w => w.code)
        .filter(c => OPERATIONAL_OPERATION_CODES.includes(c)),
    )) {
      out.push({
        key: `op-${code}`,
        severity: 'warn',
        icon: 'ph:gauge-duotone',
        message: t(`editor.operation.warnings.${code}`),
        tab: EDITOR_TAB.operation,
      });
    }
    for (const code of new Set(
      getPermitWarnings(well, today)
        .map(w => w.code)
        .filter(c => OPERATIONAL_PERMIT_CODES.includes(c)),
    )) {
      out.push({
        key: `permit-${code}`,
        severity: 'warn',
        icon: 'ph:gauge-duotone',
        message: t(`editor.operation.permit.warnings.${code}`),
        tab: EDITOR_TAB.permits,
      });
    }

    // ── Water quality ──
    const sample = getLatestWellSample(well);
    const limitSet = uiStore.waterQualityLimitSet
      ? getLimitSet(uiStore.waterQualityLimitSet)
      : undefined;
    if (sample && limitSet) {
      const n = new Set(
        getExceedances(sample, limitSet).map(e => e.result_index),
      ).size;
      if (n > 0) {
        out.push({
          key: 'water-exceedances',
          severity: 'warn',
          icon: 'ph:flask-duotone',
          message: t('editor.summary.alerts.waterExceedances', {
            n,
            set: limitSet.name,
            date: formatDate(sample.datetime, 'dd/MM/yyyy'),
          }),
          tab: EDITOR_TAB.waterQuality,
        });
      }
    }

    // ── Well status ──
    const wellStatus = getCurrentWellStatus(well);
    if (wellStatus && wellStatus !== 'active') {
      const entry = getCurrentWellStatusEntry(well);
      out.push({
        key: 'well-status',
        severity: wellStatus === 'maintenance' ? 'warn' : 'danger',
        icon: 'ph:traffic-signal-duotone',
        message: t('editor.summary.alerts.wellStatus', {
          status: resolveWellStatusLabel(wellStatus, t),
          date: entry ? formatDate(entry.datetime, 'dd/MM/yyyy') : '—',
        }),
        tab: EDITOR_TAB.historyLog,
      });
    }

    return out.sort(
      (a, b) =>
        Number(b.severity === 'danger') - Number(a.severity === 'danger'),
    );
  });

  const dataIssues = computed<DataIssueGroup[]>(() => {
    const well = profileStore.well;
    const group = (
      key: string,
      tab: EditorTabKey,
      codes: string[],
      prefix: string,
    ): DataIssueGroup => ({
      key,
      tab,
      label: t(`editor.summary.activity.domains.${key}`),
      messages: [...new Set(codes.map(c => t(`${prefix}.${c}`)))],
    });

    const operation = getOperationWarnings(well).filter(
      w => !OPERATIONAL_OPERATION_CODES.includes(w.code),
    );
    return [
      group(
        'permits',
        EDITOR_TAB.permits,
        getPermitWarnings(well, today)
          .map(w => w.code)
          .filter(c => !OPERATIONAL_PERMIT_CODES.includes(c)),
        'editor.operation.permit.warnings',
      ),
      group(
        'pump',
        EDITOR_TAB.operation,
        getPumpInstallationWarnings(well).map(w => w.code),
        'editor.operation.pump.warnings',
      ),
      group(
        'operation',
        EDITOR_TAB.operation,
        operation
          .filter(w => !LOG_WARNING_CODES.includes(w.code))
          .map(w => w.code),
        'editor.operation.warnings',
      ),
      group(
        'historyLog',
        EDITOR_TAB.historyLog,
        operation
          .filter(w => LOG_WARNING_CODES.includes(w.code))
          .map(w => w.code),
        'editor.operation.warnings',
      ),
      group(
        'waterQuality',
        EDITOR_TAB.waterQuality,
        getWaterSampleWarnings(well).map(w => w.code),
        'editor.waterQuality.warnings',
      ),
    ].filter(g => g.messages.length > 0);
  });

  const dataIssuesCount = computed(() =>
    dataIssues.value.reduce((sum, g) => sum + g.messages.length, 0),
  );

  return { alerts, dataIssues, dataIssuesCount };
}
