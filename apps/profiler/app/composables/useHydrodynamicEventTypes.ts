import {
  BAROMETRIC_COMPENSATIONS,
  HYDRODYNAMIC_EVENT_TYPES,
  MEASUREMENT_METHODS,
  READING_AGGREGATIONS,
  getVocabLabel,
  type HydrodynamicEvent,
  type LoggerSeriesEvent,
} from '@welldot/core';
import { vocabOptions } from '~/utils/vocab';

const EVENT_TYPE_ICONS: Record<string, string> = {
  spot_measurement: 'ph:drop-duotone',
  constant_rate: 'ph:clock-duotone',
  step_drawdown: 'ph:chart-bar-duotone',
  airlift: 'ph:fan-duotone',
  recovery_only: 'ph:arrow-up-duotone',
  logger_series: 'ph:chart-line-duotone',
};

/** `logger_series` is shown but never edited: no form rewrites its readings. */
export function isLoggerSeries(
  event: HydrodynamicEvent,
): event is LoggerSeriesEvent {
  return event.type === 'logger_series';
}

export function useHydrodynamicEventTypes() {
  const { locale, t } = useI18n();

  const typeOptions = computed(() =>
    vocabOptions(HYDRODYNAMIC_EVENT_TYPES, locale.value).map(o => ({
      ...o,
      icon: EVENT_TYPE_ICONS[o.value]!,
    })),
  );

  /** Types the event form can create; `logger_series` is view-only. */
  const editableTypeOptions = computed(() =>
    typeOptions.value.filter(o => o.value !== 'logger_series'),
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
      logger_series: 'info',
    };
    return map[type] ?? 'secondary';
  }

  function measurementMethodLabel(method?: string): string {
    return method
      ? getVocabLabel(MEASUREMENT_METHODS, method, locale.value)
      : '';
  }

  /** Summary facts of a logger series (labels from the core vocabularies). */
  function loggerSeriesFacts(
    event: LoggerSeriesEvent,
  ): { label: string; value: string; mono?: boolean }[] {
    const readings = event.readings ?? [];
    const first = readings[0]?.datetime;
    const last = readings[readings.length - 1]?.datetime;
    const facts: { label: string; value?: string | null; mono?: boolean }[] = [
      {
        label: t('editor.hydrodynamicEvents.stats.readings'),
        value: String(readings.length),
        mono: true,
      },
      {
        label: t('editor.hydrodynamicEvents.fields.firstReading'),
        value: first ? formatDate(first, 'dd/MM/yyyy HH:mm') : null,
        mono: true,
      },
      {
        label: t('editor.hydrodynamicEvents.fields.lastReading'),
        value: last ? formatDate(last, 'dd/MM/yyyy HH:mm') : null,
        mono: true,
      },
      {
        label: t('editor.hydrodynamicEvents.fields.sensorDepth'),
        value: event.sensor_depth != null ? `${event.sensor_depth} m` : null,
        mono: true,
      },
      {
        label: t('editor.hydrodynamicEvents.fields.interval'),
        value: event.interval != null ? `${event.interval} min` : null,
        mono: true,
      },
      {
        label: t('editor.hydrodynamicEvents.fields.barometricCompensation'),
        value: event.barometric_compensation
          ? getVocabLabel(
              BAROMETRIC_COMPENSATIONS,
              event.barometric_compensation,
              locale.value,
            )
          : null,
      },
      {
        label: t('editor.hydrodynamicEvents.fields.aggregation'),
        value: event.aggregation
          ? getVocabLabel(READING_AGGREGATIONS, event.aggregation, locale.value)
          : null,
      },
    ];
    return facts.filter(
      (f): f is { label: string; value: string; mono?: boolean } => !!f.value,
    );
  }

  return {
    typeOptions,
    editableTypeOptions,
    loggerSeriesFacts,
    measurementMethodOptions,
    eventTypeLabel,
    eventTypeSeverity,
    measurementMethodLabel,
  };
}
