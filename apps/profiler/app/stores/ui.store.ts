import type {
  DiameterUnits,
  FlowUnits,
  LengthUnits,
  PowerUnits,
  VolumeUnits,
} from '@welldot/core';
import { defineStore } from 'pinia';

export type CoordinateFormat = 'DD' | 'DMS';

export const useUiStore = defineStore(
  'ui',
  () => {
    const lengthUnit = ref<LengthUnits>('m');
    const diameterUnit = ref<DiameterUnits>('mm');
    const flowUnit = ref<FlowUnits>('m3/h');
    const powerUnit = ref<PowerUnits>('kW');
    const volumeUnit = ref<VolumeUnits>('m3');
    const coordinateFormat = ref<CoordinateFormat>('DD');
    // Ids of startup tips the user chose not to see again.
    const dismissedTips = ref<string[]>([]);
    const waterQualityLimitSet = ref<string | null>(null);

    return {
      lengthUnit,
      diameterUnit,
      flowUnit,
      powerUnit,
      volumeUnit,
      coordinateFormat,
      dismissedTips,
      waterQualityLimitSet,
    };
  },
  {
    persist: { key: 'welldot_ui' },
  },
);
