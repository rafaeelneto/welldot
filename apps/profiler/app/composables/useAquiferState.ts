import type { AquiferAnalysis, HydrodynamicEvent } from '@welldot/core';
import { AQUIFER_ANALYSIS_METHODS, getVocabLabel } from '@welldot/core';
import { getRetractedEventIds } from '@welldot/utils';

type NumericAnalysisField = {
  [K in keyof AquiferAnalysis]-?: NonNullable<AquiferAnalysis[K]> extends number
    ? K
    : never;
}[keyof AquiferAnalysis];

export type AquiferValue = {
  value: number;
  datetime: string;
  method?: string;
};

const byNewest = (a: { datetime: string }, b: { datetime: string }) =>
  new Date(b.datetime).getTime() - new Date(a.datetime).getTime();

/**
 * Current aquifer / well state: the latest static level from the effective
 * hydrodynamic events, and each aquifer parameter taken from the most recent
 * `aquifer_analysis` that reports it.
 */
export function useAquiferState() {
  const profileStore = useProfileStore();

  const events = computed<HydrodynamicEvent[]>(() =>
    [...(profileStore.well.hydrodynamic_events ?? [])].sort(byNewest),
  );

  const analyses = computed<AquiferAnalysis[]>(() =>
    [...(profileStore.well.aquifer_analysis ?? [])].sort(byNewest),
  );

  // Events retracted by a later `corrects` never count (.well v2.3 ledger rule).
  const effectiveEvents = computed(() => {
    const retracted = getRetractedEventIds(profileStore.well);
    return events.value.filter(e => !retracted.has(e.id));
  });

  function latestAnalysisValue(
    field: NumericAnalysisField,
  ): AquiferValue | null {
    const a = analyses.value.find(x => x[field] != null);
    if (!a) return null;
    return {
      value: a[field] as number,
      datetime: a.datetime,
      method: a.method,
    };
  }

  const staticLevel = computed<AquiferValue | null>(() => {
    const e = effectiveEvents.value.find(
      x =>
        'static_level' in x &&
        (x as Record<string, unknown>).static_level != null,
    );
    if (!e) return null;
    return {
      value: (e as Record<string, unknown>).static_level as number,
      datetime: e.datetime,
    };
  });

  const state = computed(() => ({
    ne: staticLevel.value,
    dynamicLevel: latestAnalysisValue('dynamic_level'),
    flowRate: latestAnalysisValue('flow_rate'),
    maxFlowRate: latestAnalysisValue('max_flow_rate'),
    specificCapacity: latestAnalysisValue('specific_capacity'),
    transmissivity: latestAnalysisValue('transmissivity'),
    hydraulicConductivity: latestAnalysisValue('hydraulic_conductivity'),
    storativity: latestAnalysisValue('storativity'),
    aquiferThickness: latestAnalysisValue('aquifer_thickness'),
    wellEfficiency: latestAnalysisValue('well_efficiency_pct'),
  }));

  return {
    state,
    events,
    analyses,
    latestEvent: computed(() => effectiveEvents.value[0] ?? null),
    latestAnalysis: computed(() => analyses.value[0] ?? null),
  };
}

/** Display name of an aquifer analysis method. */
export function aquiferMethodLabel(
  method: string | undefined,
  locale: string,
): string {
  return method ? getVocabLabel(AQUIFER_ANALYSIS_METHODS, method, locale) : '';
}

/** Splits a value into scientific notation parts: `1.2 · 10⁻³`. */
export function scientificParts(val: number): {
  mantissa: string;
  exp: string;
} {
  if (val === 0) return { mantissa: '0', exp: '' };
  const exp = Math.floor(Math.log10(Math.abs(val)));
  return {
    mantissa: (val / Math.pow(10, exp)).toFixed(1),
    exp: String(exp),
  };
}
