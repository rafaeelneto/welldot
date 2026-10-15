import type { LimitSet, WaterQualityResult, WaterSample } from '@welldot/core';
import {
  SAMPLING_DEVICES,
  SAMPLING_METHODS,
  SAMPLING_POINT_TYPES,
} from '@welldot/core';
import {
  getExceedances,
  getHoldingTimes,
  getHydrochemicalFacies,
  getIonBalance,
  getPurgeStabilization,
  getReceivedTemperatureCompliance,
  getRelativePercentDifferences,
  getSampleDepth,
  isFormationWater,
} from '@welldot/utils';
import type { MaybeRefOrGetter } from 'vue';
import { pumpInstallationLabel } from '~/utils/operationVocab';
import {
  BLANK_SAMPLE_TYPES,
  PARENT_SAMPLE_TYPES,
  formatResultValue,
  parameterUnitSymbol,
  resolveParameterLabel,
} from '~/utils/waterQualityVocab';
import type { SampleWarning } from './resultDraft';

export type DerivedChip = {
  key: string;
  label: string;
  severity: string;
  info?: string;
};

/**
 * Display derivations of one water sample shared by the sample card and the
 * sample view: header severity, sampling point / lab lines, exceedances
 * against a limit set, the derived chip strip and warning messages.
 */
export function useSampleDerived(
  sampleSource: MaybeRefOrGetter<WaterSample | undefined>,
  limitSetSource: MaybeRefOrGetter<LimitSet | undefined>,
  warningsSource: MaybeRefOrGetter<SampleWarning[]>,
) {
  const { t, locale } = useI18n();
  const { vocabLabel } = useVocab();
  const profileStore = useProfileStore();
  const { formatLength } = useUnitFormat();
  const { formatNumber } = useNumberFormat();

  const fmt = (n: number, digits = 4) =>
    formatNumber(n, { maximumFractionDigits: digits });

  const sample = computed(() => toValue(sampleSource));

  // ─── Header ─────────────────────────────────────────────────────────────────

  const typeSeverity = computed(() => {
    const type = sample.value?.sample_type;
    if (!type) return 'secondary';
    return type === 'routine'
      ? 'info'
      : PARENT_SAMPLE_TYPES.includes(type) || BLANK_SAMPLE_TYPES.includes(type)
        ? 'warn'
        : 'secondary';
  });

  const parent = computed(() =>
    sample.value?.parent_sample_id
      ? profileStore.well.water_samples?.find(
          s => s.id === sample.value!.parent_sample_id,
        )
      : undefined,
  );

  /** "15/09/2026 09:30 · #2". */
  const dateLine = computed(() => {
    const s = sample.value;
    if (!s) return '';
    const date = formatDate(s.datetime, 'dd/MM/yyyy HH:mm');
    return s.sequence != null ? `${date} · #${s.sequence}` : date;
  });

  // ─── Sampling point / lab ───────────────────────────────────────────────────

  const depthText = computed(() => {
    const s = sample.value;
    if (!s) return null;
    const p = s.sampling_point;
    const depth = getSampleDepth(profileStore.well, s);
    if (depth?.kind === 'point') {
      return `${formatLength(depth.depth)}${
        p?.depth === undefined && p?.pump_installation_id
          ? ` (${t('editor.waterQuality.card.pumpIntake')})`
          : ''
      }`;
    }
    if (depth?.kind === 'interval') {
      return `${formatLength(depth.from)} – ${formatLength(depth.to)}`;
    }
    return null;
  });

  const pumpText = computed(() => {
    const id = sample.value?.sampling_point?.pump_installation_id;
    if (!id) return null;
    const pump = profileStore.well.pump_installations?.find(i => i.id === id);
    return pump ? pumpInstallationLabel(pump, locale.value) : id;
  });

  const pointLine = computed(() => {
    const s = sample.value;
    const p = s?.sampling_point;
    return [
      p?.type ? vocabLabel(SAMPLING_POINT_TYPES, p.type) : null,
      p?.device ? vocabLabel(SAMPLING_DEVICES, p.device) : null,
      depthText.value,
      pumpText.value,
      s?.sampling_method
        ? vocabLabel(SAMPLING_METHODS, s.sampling_method)
        : null,
    ]
      .filter(Boolean)
      .join(' · ');
  });

  const formation = computed(() =>
    sample.value
      ? isFormationWater(profileStore.well, sample.value)
      : undefined,
  );

  const receivedAtText = computed(() => {
    const l = sample.value?.laboratory;
    if (!l?.received_at) return null;
    return formatDate(
      l.received_at,
      l.received_at_resolution === 'day' ? 'dd/MM/yyyy' : 'dd/MM/yyyy HH:mm',
    );
  });

  const labLine = computed(() => {
    const l = sample.value?.laboratory;
    if (!l) return '';
    return [
      l.name,
      l.report_number
        ? `${t('editor.waterQuality.laboratory.reportNumber')} ${l.report_number}`
        : null,
      receivedAtText.value
        ? `${t('editor.waterQuality.laboratory.receivedAt')} ${receivedAtText.value}`
        : null,
    ]
      .filter(Boolean)
      .join(' · ');
  });

  // ─── Results ────────────────────────────────────────────────────────────────

  /** Exceedances per result index for the selected limit set. */
  const exceedances = computed(() => {
    const map = new Map<number, string[]>();
    const s = sample.value;
    const limitSet = toValue(limitSetSource);
    if (!s || !limitSet) return map;
    for (const e of getExceedances(s, limitSet)) {
      const r = s.results[e.result_index];
      const unit = r ? parameterUnitSymbol(r) : '';
      const text =
        e.kind === 'presence'
          ? t('editor.waterQuality.exceedsPresence')
          : e.kind === 'above_max'
            ? t('editor.waterQuality.exceedsMax', {
                limit: `${fmt(e.limit.max ?? 0, 6)} ${unit}`.trim(),
              })
            : t('editor.waterQuality.exceedsMin', {
                limit: `${fmt(e.limit.min ?? 0, 6)} ${unit}`.trim(),
              });
      const list = map.get(e.result_index) ?? [];
      list.push(
        `${limitSet.name}: ${text}${e.limit.note ? ` (${e.limit.note})` : ''}`,
      );
      map.set(e.result_index, list);
    }
    return map;
  });

  function valueText(r: WaterQualityResult): string {
    return formatResultValue(r, t, n => fmt(n, 6));
  }

  function isRejected(r: WaterQualityResult): boolean {
    return r.validation?.status === 'rejected';
  }

  // ─── Derived strip ──────────────────────────────────────────────────────────

  const derived = computed<DerivedChip[]>(() => {
    const chips: DerivedChip[] = [];
    const s = sample.value;
    if (!s) return chips;

    const ion = getIonBalance(s);
    if (ion) {
      const bad = Math.abs(ion.error_pct) > 10;
      chips.push({
        key: 'ion',
        label: t('editor.waterQuality.derived.ionBalance', {
          pct: fmt(ion.error_pct, 1),
        }),
        severity: bad ? 'warn' : 'success',
        info: t('editor.waterQuality.derived.ionBalanceInfo', {
          cations: fmt(ion.cations_meq, 2),
          anions: fmt(ion.anions_meq, 2),
        }),
      });
    }

    if (s.parent_sample_id) {
      const rpds = getRelativePercentDifferences(profileStore.well, s.id);
      if (rpds.length) {
        const worst = rpds.reduce((a, b) => (b.rpd_pct > a.rpd_pct ? b : a));
        chips.push({
          key: 'rpd',
          label: t('editor.waterQuality.derived.rpd', {
            pct: fmt(worst.rpd_pct, 1),
            name: resolveParameterLabel(worst.parameter, t),
          }),
          severity: worst.rpd_pct > 20 ? 'warn' : 'success',
          info: rpds
            .map(
              r =>
                `${resolveParameterLabel(r.parameter, t)}: ${fmt(r.rpd_pct, 1)}%`,
            )
            .join('\n'),
        });
      }
    }

    const holding = getHoldingTimes(s);
    if (holding.length) {
      const longest = holding.reduce((a, b) => (b.hours > a.hours ? b : a));
      const hoursText = (h: { hours: number; resolution?: string }) =>
        h.resolution === 'day'
          ? t('editor.waterQuality.derived.days', { n: fmt(h.hours / 24, 0) })
          : t('editor.waterQuality.derived.hours', { n: fmt(h.hours, 1) });
      chips.push({
        key: 'holding',
        label: t('editor.waterQuality.derived.holdingTime', {
          time: hoursText(longest),
        }),
        severity: 'secondary',
        info: holding
          .map(h => {
            const r = s.results[h.result_index];
            return `${r ? resolveParameterLabel(r.parameter, t) : h.key}: ${hoursText(h)}`;
          })
          .join('\n'),
      });
    }

    const temp = getReceivedTemperatureCompliance(s);
    if (temp !== undefined) {
      chips.push({
        key: 'temp',
        label: temp
          ? t('editor.waterQuality.derived.receivedTempOk')
          : t('editor.waterQuality.derived.receivedTempHigh'),
        severity: temp ? 'success' : 'warn',
        info:
          s.laboratory?.received_temperature != null
            ? `${fmt(s.laboratory.received_temperature, 1)} °C`
            : undefined,
      });
    }

    const purge = s.purge ? getPurgeStabilization(s.purge) : undefined;
    if (purge) {
      const unstable = purge.parameters.filter(p => !p.stabilized);
      chips.push({
        key: 'purge',
        label: purge.stabilized
          ? t('editor.waterQuality.derived.purgeStabilized')
          : t('editor.waterQuality.derived.purgeNotStabilized'),
        severity: purge.stabilized ? 'success' : 'warn',
        info: unstable.length
          ? unstable
              .map(p =>
                resolveParameterLabel(
                  { code: p.key, vocabulary: 'welldot' },
                  t,
                ),
              )
              .join(', ')
          : undefined,
      });
    }

    const facies = getHydrochemicalFacies(s);
    if (facies) {
      const ionLabel = (code: string) =>
        t(`editor.waterQuality.derived.faciesIons.${code}`);
      chips.push({
        key: 'facies',
        label: t('editor.waterQuality.derived.facies', {
          facies: `${ionLabel(facies.cation)} – ${ionLabel(facies.anion)}`,
        }),
        severity: 'info',
      });
    }

    return chips;
  });

  // ─── Warnings ───────────────────────────────────────────────────────────────

  const warningMessages = computed(() => {
    const s = sample.value;
    const seen = new Set<string>();
    return toValue(warningsSource).flatMap(w => {
      const r =
        w.result_index !== undefined ? s?.results[w.result_index] : undefined;
      const msg = t(`editor.waterQuality.warnings.${w.code}`);
      const text = r ? `${resolveParameterLabel(r.parameter, t)}: ${msg}` : msg;
      if (seen.has(text)) return [];
      seen.add(text);
      return [text];
    });
  });

  return {
    fmt,
    typeSeverity,
    parent,
    dateLine,
    depthText,
    pumpText,
    pointLine,
    formation,
    receivedAtText,
    labLine,
    exceedances,
    valueText,
    isRejected,
    derived,
    warningMessages,
  };
}
