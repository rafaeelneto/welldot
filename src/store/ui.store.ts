import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Units = 'metric' | 'imperial';
export type DiameterUnits = 'mm' | 'inches';
export type LengthUnits = 'm' | 'ft';

interface IUIState {
  units: Units;
  diameter_units: DiameterUnits;
  length_units: LengthUnits;
  pdf_header: string;
  pdf_break_pages: boolean;
  pdf_zoom_value: number;
  pdf_metadata_position: 'before' | 'after' | null;
  setUnits: (units: Units) => void;
  setDiameterUnits: (diameter_units: DiameterUnits) => void;
  setLengthUnits: (length_units: LengthUnits) => void;
  setPdfHeader: (pdf_header: string) => void;
  setPdfBreakPages: (pdf_break_pages: boolean) => void;
  setPdfZoomValue: (pdf_zoom_value: number) => void;
  setPdfMetadataPosition: (pdf_metadata_position: 'before' | 'after' | null) => void;
  reset: () => void;
}

export const DEFAULT_PDF_HEADER = 'PERFIL GEOLÓGICO';

const defaultState = {
  units: 'metric' as Units,
  diameter_units: 'inches' as DiameterUnits,
  length_units: 'm' as LengthUnits,
  pdf_header: DEFAULT_PDF_HEADER,
  pdf_break_pages: false,
  pdf_zoom_value: 500,
  pdf_metadata_position: 'before' as 'before' | 'after' | null,
};

export const useUIStore = create<IUIState>()(
  persist(
    (set) => ({
      ...defaultState,
      setUnits: (units: Units) => set({ units }),
      setDiameterUnits: (diameter_units: DiameterUnits) => set({ diameter_units }),
      setLengthUnits: (length_units: LengthUnits) => set({ length_units }),
      setPdfHeader: (pdf_header: string) => set({ pdf_header }),
      setPdfBreakPages: (pdf_break_pages: boolean) => set({ pdf_break_pages }),
      setPdfZoomValue: (pdf_zoom_value: number) => set({ pdf_zoom_value }),
      setPdfMetadataPosition: (pdf_metadata_position: 'before' | 'after' | null) => set({ pdf_metadata_position }),
      reset: () => set(defaultState),
    }),
    {
      name: 'ui-preferences',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);