import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Units = 'metric' | 'imperial';
export type DiameterUnits = 'mm' | 'inches';
export type LengthUnits = 'm' | 'ft';

interface IUIState {
  units: Units;
  diameter_units: DiameterUnits;
  length_units: LengthUnits;
  setUnits: (units: Units) => void;
  setDiameterUnits: (diameter_units: DiameterUnits) => void;
  setLengthUnits: (length_units: LengthUnits) => void;
  reset: () => void;
}

const defaultState = {
  units: 'metric' as Units,
  diameter_units: 'inches' as DiameterUnits,
  length_units: 'm' as LengthUnits,
};

export const useUIStore = create<IUIState>()(
  persist(
    (set) => ({
      ...defaultState,
      setUnits: (units: Units) => set({ units }),
      setDiameterUnits: (diameter_units: DiameterUnits) => set({ diameter_units }),
      setLengthUnits: (length_units: LengthUnits) => set({ length_units }),
      reset: () => set(defaultState),
    }),
    {
      name: 'ui-preferences',
    },
  ),
);