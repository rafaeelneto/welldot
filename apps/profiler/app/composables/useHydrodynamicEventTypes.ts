import {
  HYDRODYNAMIC_EVENT_TYPES,
  MEASUREMENT_METHODS,
  getVocabLabel,
} from '@welldot/core';
import { vocabOptions } from '~/utils/vocab';

const EVENT_TYPE_ICONS: Record<string, string> = {
  spot_measurement: 'ph:drop-duotone',
  constant_rate: 'ph:clock-duotone',
  step_drawdown: 'ph:chart-bar-duotone',
  airlift: 'ph:fan-duotone',
  recovery_only: 'ph:arrow-up-duotone',
};

export function useHydrodynamicEventTypes() {
  const { locale } = useI18n();

  const typeOptions = computed(() =>
    vocabOptions(HYDRODYNAMIC_EVENT_TYPES, locale.value).map(o => ({
      ...o,
      icon: EVENT_TYPE_ICONS[o.value]!,
    })),
  );

  const measurementMethodOptions = computed(() =>
    vocabOptions(MEASUREMENT_METHODS, locale.value),
  );

  function eventTypeLabel(type: string): string {
    return getVocabLabel(HYDRODYNAMIC_EVENT_TYPES, type, locale.value);
  }

  function eventTypeSeverity(type: string): string {
    const map: Record<string, string> = {
      spot_measurement: 'info',
      constant_rate: 'primary',
      step_drawdown: 'secondary',
      airlift: 'warn',
      recovery_only: 'success',
    };
    return map[type] ?? 'secondary';
  }

  function measurementMethodLabel(method?: string): string {
    return method
      ? getVocabLabel(MEASUREMENT_METHODS, method, locale.value)
      : '';
  }

  return {
    typeOptions,
    measurementMethodOptions,
    eventTypeLabel,
    eventTypeSeverity,
    measurementMethodLabel,
  };
}
