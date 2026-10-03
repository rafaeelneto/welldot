import type {
  DiameterUnits,
  FlowUnits,
  LengthUnits,
  PowerUnits,
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
    const coordinateFormat = ref<CoordinateFormat>('DD');
    // Ids of startup tips the user chose not to see again.
    const dismissedTips = ref<string[]>([]);

    return {
      lengthUnit,
      diameterUnit,
      flowUnit,
      powerUnit,
      coordinateFormat,
      dismissedTips,
    };
  },
  {
    persist: { key: 'welldot_ui' },
  },
);
