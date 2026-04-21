export type UnitsTypes = 'metric' | 'imperial';
export type LengthUnits = 'm' | 'ft';
export type DiameterUnits = 'mm' | 'inches';

export type Units = {
  length: LengthUnits;
  diameter: DiameterUnits;
};
