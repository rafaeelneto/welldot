import {
  HISTORY_LOG_CATEGORIES,
  HISTORY_LOG_SEVERITIES,
  getVocabLabel,
} from '@welldot/core';
import { vocabOptions } from '~/utils/vocab';

const CATEGORY_ICONS: Record<string, string> = {
  maintenance: 'ph:wrench-duotone',
  inspection: 'ph:eye-duotone',
  incident: 'ph:warning-duotone',
  event: 'ph:flag-duotone',
  status_change: 'ph:traffic-signal-duotone',
  change_of_use: 'ph:swap-duotone',
};

export function useHistoryLogCategories() {
  const { locale } = useI18n();

  const categoryOptions = computed(() =>
    vocabOptions(HISTORY_LOG_CATEGORIES, locale.value).map(o => ({
      ...o,
      icon: CATEGORY_ICONS[o.value]!,
    })),
  );

  const severityOptions = computed(() =>
    vocabOptions(HISTORY_LOG_SEVERITIES, locale.value),
  );

  function categoryIcon(category: string): string {
    return CATEGORY_ICONS[category] ?? 'ph:dot-duotone';
  }

  function categoryLabel(category: string): string {
    return getVocabLabel(HISTORY_LOG_CATEGORIES, category, locale.value);
  }

  function categorySeverity(category: string): string {
    const map: Record<string, string> = {
      maintenance: 'warn',
      inspection: 'info',
      incident: 'danger',
      event: 'secondary',
      status_change: 'info',
      change_of_use: 'secondary',
    };
    return map[category] ?? 'secondary';
  }

  function severityLabel(severity: string): string {
    return getVocabLabel(HISTORY_LOG_SEVERITIES, severity, locale.value);
  }

  function severityToChip(severity: string): string {
    if (severity === 'low') return 'success';
    if (severity === 'medium') return 'warn';
    if (severity === 'high' || severity === 'critical') return 'danger';
    return 'secondary';
  }

  return {
    categoryOptions,
    severityOptions,
    categoryIcon,
    categoryLabel,
    categorySeverity,
    severityLabel,
    severityToChip,
  };
}
