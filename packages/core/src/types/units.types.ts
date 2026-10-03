export type UnitsTypes = 'metric' | 'imperial';
export type LengthUnits = 'm' | 'ft';
export type DiameterUnits = 'mm' | 'inches';
/** Display/input units for volumetric flow. Canonical storage is always `m3/h`. */
export type FlowUnits = 'm3/h' | 'L/s' | 'gpm';
/** Display/input units for power. Canonical storage is always `kW`. */
export type PowerUnits = 'kW' | 'cv' | 'hp';

export type Units = {
  length: LengthUnits;
  diameter: DiameterUnits;
  /** Defaults to `m3/h` when absent. */
  flow?: FlowUnits;
  /** Defaults to `kW` when absent. */
  power?: PowerUnits;
};
