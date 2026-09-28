import type { DiameterUnits, LengthUnits } from '@welldot/core';
import { defineStore } from 'pinia';

export type CoordinateFormat = 'DD' | 'DMS';

export const useUiStore = defineStore(
  'ui',
  () => {
    const lengthUnit = ref<LengthUnits>('m');
    const diameterUnit = ref<DiameterUnits>('mm');
    const coordinateFormat = ref<CoordinateFormat>('DD');
    // Ids of startup tips the user chose not to see again.
    const dismissedTips = ref<string[]>([]);

    return { lengthUnit, diameterUnit, coordinateFormat, dismissedTips };
  },
  {
    persist: { key: 'welldot_ui' },
  },
);
