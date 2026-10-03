import {
  flowFromCanonical,
  metersToFeet,
  mmToInches,
  powerFromCanonical,
} from '@welldot/core';
import { formatNumber } from '@welldot/utils';
import {
  resolveDiameterUnitLabel,
  resolveFlowUnitLabel,
} from '~/utils/unitLabel';
import type { PdfExportOptions } from './types';

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
  lengthUnit: PdfExportOptions['lengthUnit'];
  diameterUnit: PdfExportOptions['diameterUnit'];
}

/**
 * Plain (non-composable) equivalent of `useUnitFormat` for use in pure
 * `pdfExport` builder functions, which must not depend on Vue/Pinia context.
 */
export function createPdfFormatters(
  options: Pick<
    PdfExportOptions,
    'lengthUnit' | 'diameterUnit' | 'locale' | 'flowUnit' | 'powerUnit'
  >,
): PdfFormatters {
  const { lengthUnit, diameterUnit, locale } = options;
  const flowUnit = options.flowUnit ?? 'm3/h';
  const powerUnit = options.powerUnit ?? 'kW';

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
    if (lengthUnit === 'ft') {
      return formatNumber(volumeM3 * 35.3147, {
        fractionDigits,
        suffix: 'ft³',
      });
    }
    return formatNumber(volumeM3, { fractionDigits, suffix: 'm³' });
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
    formatLength,
    formatDiameter,
    formatVolume,
    formatFlow,
    formatPower,
    lengthUnit,
    diameterUnit,
  };
}
