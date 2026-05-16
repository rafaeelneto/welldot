// Types
export type {
  AirliftEvent,
  AquiferAnalysis,
  Attachment,
  BoreHole,
  Cave,
  CementPad,
  ConstantRateEvent,
  Constructive,
  Fracture,
  Geologic,
  HistoryLogEntry,
  HoleFill,
  HydrodynamicEvent,
  HydrodynamicEventBase,
  LevelReading,
  Lithology,
  Location,
  LocationProperties,
  PumpingStep,
  RecoveryOnlyEvent,
  RecoveryPhase,
  Reduction,
  SpotMeasurementEvent,
  StepDrawdownEvent,
  SurfaceCase,
  Texture,
  Well,
  WellCase,
  WellId,
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
  AirliftEventSchema,
  AquiferAnalysisSchema,
  AttachmentSchema,
  BoreHoleSchema,
  CaveSchema,
  CementPadSchema,
  ConstantRateEventSchema,
  FractureSchema,
  HistoryLogEntrySchema,
  HoleFillSchema,
  HydrodynamicEventBaseSchema,
  HydrodynamicEventSchema,
  LevelReadingSchema,
  LithologySchema,
  LocationPropertiesSchema,
  LocationSchema,
  PumpingStepSchema,
  RecoveryOnlyEventSchema,
  RecoveryPhaseSchema,
  ReductionSchema,
  SpotMeasurementEventSchema,
  StepDrawdownEventSchema,
  SurfaceCaseSchema,
  TextureSchema,
  WellCaseSchema,
  WellIdSchema,
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

export type { TextureCode, Texture as TextureType } from './types/textures';
export { FGDC_TEXTURES_OPTIONS } from './utils/fgdc.textures';

// Backward-compat alias for app migration
export type { Well as Profile } from './types/well.types';

// Units conversion utilities
export type { DmsCoordinate } from './utils/units';
export {
  cubicMeterPerHourToLitersPerSecond,
  cubicMeterPerHourToUsGallonsPerMinute,
  decimalDegreesToDms,
  dmsToDecimalDegrees,
  feetToMeters,
  hoursToMinutes,
  inchesToMm,
  kilopascalToPsi,
  litersPerSecondToCubicMeterPerHour,
  metersToFeet,
  minutesToHours,
  mmToInches,
  mmToSlotNumber,
  psiToKilopascal,
  slotNumberToMm,
  squareMeterPerDayToSquareMeterPerSecond,
  squareMeterPerSecondToSquareMeterPerDay,
  usGallonsPerMinuteToCubicMeterPerHour,
} from './utils/units';
