// Types
export type {
  BoreHole,
  Cave,
  CementPad,
  Constructive,
  Fracture,
  Geologic,
  HoleFill,
  Lithology,
  Reduction,
  SurfaceCase,
  Well,
  WellCase,
  WellScreen,
} from './types/well.types';

export type {
  DiameterUnits,
  LengthUnits,
  Units,
  UnitsTypes,
} from './types/units.types';

// Validators
export {
  BoreHoleSchema,
  CaveSchema,
  CementPadSchema,
  FractureSchema,
  HoleFillSchema,
  LithologySchema,
  ReductionSchema,
  SurfaceCaseSchema,
  WellCaseSchema,
  WellSchema,
  WellScreenSchema,
  parseWell,
} from './validators/well.validators';

// Format utilities (serialise/deserialise .well format only)
export {
  checkIfProfileIsEmpty,
  convertProfileFromJSON,
  deserializeWell,
  isWellEmpty,
  profileToWell,
  serializeWell,
} from './utils/well.utils';

// Backward-compat alias for app migration
export type { Well as Profile } from './types/well.types';
