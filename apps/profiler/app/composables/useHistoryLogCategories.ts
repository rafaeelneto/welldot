export function useHistoryLogCategories() {
  const { t } = useI18n();

  const categoryOptions = computed(() => [
    {
      label: t('editor.historyLog.logs.categories.maintenance'),
      value: 'maintenance',
      icon: 'ph:wrench-duotone',
    },
    {
      label: t('editor.historyLog.logs.categories.inspection'),
      value: 'inspection',
      icon: 'ph:eye-duotone',
    },
    {
      label: t('editor.historyLog.logs.categories.incident'),
      value: 'incident',
      icon: 'ph:warning-duotone',
    },
    {
      label: t('editor.historyLog.logs.categories.event'),
      value: 'event',
      icon: 'ph:flag-duotone',
    },
    {
      label: t('editor.historyLog.logs.categories.status_change'),
      value: 'status_change',
      icon: 'ph:traffic-signal-duotone',
    },
  ]);

  const severityOptions = computed(() => [
    { label: t('editor.historyLog.logs.severity.low'), value: 'low' },
    { label: t('editor.historyLog.logs.severity.medium'), value: 'medium' },
    { label: t('editor.historyLog.logs.severity.high'), value: 'high' },
    { label: t('editor.historyLog.logs.severity.critical'), value: 'critical' },
  ]);

  function categoryIcon(category: string): string {
    return (
      categoryOptions.value.find(o => o.value === category)?.icon ??
      'ph:dot-duotone'
    );
  }

  function categoryLabel(category: string): string {
    return (
      categoryOptions.value.find(o => o.value === category)?.label ?? category
    );
  }

  function categorySeverity(category: string): string {
    const map: Record<string, string> = {
      maintenance: 'warn',
      inspection: 'info',
      incident: 'danger',
      event: 'secondary',
      status_change: 'info',
    };
    return map[category] ?? 'secondary';
  }

  function severityLabel(severity: string): string {
    return (
      severityOptions.value.find(o => o.value === severity)?.label ?? severity
    );
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
