import type { VocabEntry } from '@welldot/core';
import {
  flowFromCanonical,
  formatVocabList,
  getVocabLabel,
  metersToFeet,
  mmToInches,
  powerFromCanonical,
  volumeFromCanonical,
} from '@welldot/core';
import {
  formatNumber,
  resolveDiameterUnitLabel,
  resolveFlowUnitLabel,
  resolveVolumeUnitLabel,
} from '@welldot/utils';
import type { PdfContext } from './types/options.types';

export interface PdfFormatters {
  formatLength(
    _value: number | null | undefined,
    _fractionDigits?: number,
  ): string;
  formatDiameter(
    _value: number | null | undefined,
    _fractionDigits?: number,
  ): string;
  formatVolume(
    _volumeM3: number | null | undefined,
    _fractionDigits?: number,
  ): string;
  formatFlow(
    _value: number | null | undefined,
    _fractionDigits?: number,
  ): string;
  formatPower(
    _value: number | null | undefined,
    _fractionDigits?: number,
  ): string;
  lengthUnit: PdfContext['units']['length'];
  diameterUnit: PdfContext['units']['diameter'];
  /** Display label of the resolved volume unit (`m³`, `L`, `ft³`, `gal`). */
  volumeUnitLabel: string;
  /** Export locale the labels resolve in. */
  locale: string;
  /** Label of a core/utils vocabulary value in the export locale. */
  vocab(_vocab: readonly VocabEntry[], _value: string): string;
  /** Comma-separated labels of a multi-valued vocabulary field. */
  vocabList(
    _vocab: readonly VocabEntry[],
    _values: readonly string[] | undefined,
  ): string;
}

/**
 * Unit/vocabulary formatters bound to the context's display units and locale.
 */
export function createPdfFormatters(
  ctx: Pick<PdfContext, 'units' | 'locale'>,
): PdfFormatters {
  const { locale } = ctx;
  const {
    length: lengthUnit,
    diameter: diameterUnit,
    flow: flowUnit,
    power: powerUnit,
    volume: volumeUnit,
  } = ctx.units;
  const volumeUnitLabel = resolveVolumeUnitLabel(volumeUnit);

  function formatLength(
    value: number | null | undefined,
    fractionDigits = 2,
  ): string {
    if (value == null) return '—';
    const displayValue = lengthUnit === 'ft' ? metersToFeet(value) : value;
    return formatNumber(displayValue, { fractionDigits, suffix: lengthUnit });
  }

  function formatDiameter(
    value: number | null | undefined,
    fractionDigits = 1,
  ): string {
    if (value == null) return '—';
    const displayValue = diameterUnit === 'inches' ? mmToInches(value) : value;
    return formatNumber(displayValue, {
      fractionDigits,
      suffix: resolveDiameterUnitLabel(diameterUnit, locale),
    });
  }

  function formatVolume(
    volumeM3: number | null | undefined,
    fractionDigits = 2,
  ): string {
    if (volumeM3 == null) return '—';
    return formatNumber(volumeFromCanonical(volumeM3, volumeUnit), {
      fractionDigits,
      suffix: volumeUnitLabel,
    });
  }

  function formatFlow(
    value: number | null | undefined,
    fractionDigits = 1,
  ): string {
    if (value == null) return '—';
    return formatNumber(flowFromCanonical(value, flowUnit), {
      fractionDigits,
      suffix: resolveFlowUnitLabel(flowUnit),
    });
  }

  function formatPower(
    value: number | null | undefined,
    fractionDigits = 2,
  ): string {
    if (value == null) return '—';
    return formatNumber(powerFromCanonical(value, powerUnit), {
      maximumFractionDigits: fractionDigits,
      suffix: powerUnit,
    });
  }

  return {
    locale,
    vocab: (vocab, value) => getVocabLabel(vocab, value, locale),
    vocabList: (vocab, values) => formatVocabList(vocab, values, locale),
    formatLength,
    formatDiameter,
    formatVolume,
    formatFlow,
    formatPower,
    lengthUnit,
    diameterUnit,
    volumeUnitLabel,
  };
}
