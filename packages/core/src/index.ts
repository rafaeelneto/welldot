// Types
export type {
  AirliftEvent,
  AquiferAnalysis,
  Attachment,
  BoreHole,
  Cave,
  CementPad,
  Centralizer,
  ConditionFulfillment,
  ConstantRateEvent,
  Constructive,
  DeclaredVolume,
  Filtration,
  Fracture,
  Geologic,
  HistoryLogEntry,
  HoleFill,
  HydrodynamicEvent,
  HydrodynamicEventBase,
  Laboratory,
  LevelReading,
  Lithology,
  Location,
  LocationProperties,
  Meter,
  MeterReading,
  MonthlyGrant,
  OperatingRegime,
  Parameter,
  Permit,
  PermitAdministrativeStatus,
  PermitCondition,
  PermitHistoryEntry,
  ProductionEntry,
  ProductionEntryBase,
  PumpElectrical,
  PumpInstallation,
  PumpingStep,
  Purge,
  PurgeReading,
  RecoveryOnlyEvent,
  RecoveryPhase,
  Reduction,
  ResultQualifier,
  ResultValidation,
  SamplingPoint,
  SectionKey,
  SectionVisibility,
  SpotMeasurementEvent,
  StepDrawdownEvent,
  SurfaceCase,
  Texture,
  TimeResolution,
  VisibilityFieldKey,
  VisibilityKey,
  VolumeLimit,
  WaterQualityResult,
  WaterSample,
  Well,
  WellCase,
  WellId,
  WellScreen,
  WellStatus,
  WellVisibility,
} from './types/well.types';

export type {
  DiameterUnits,
  FlowUnits,
  LengthUnits,
  PowerUnits,
  Units,
  UnitsTypes,
  VolumeUnits,
} from './types/units.types';

// Validators
export {
  AirliftEventSchema,
  AquiferAnalysisSchema,
  AttachmentSchema,
  BoreHoleSchema,
  CaveSchema,
  CementPadSchema,
  CentralizerSchema,
  ConditionFulfillmentSchema,
  ConstantRateEventSchema,
  DeclaredVolumeSchema,
  FiltrationSchema,
  FractureSchema,
  HistoryLogEntrySchema,
  HoleFillSchema,
  HydrodynamicEventBaseSchema,
  HydrodynamicEventSchema,
  LaboratorySchema,
  LevelReadingSchema,
  LithologySchema,
  LocationPropertiesSchema,
  LocationSchema,
  MeterReadingSchema,
  MeterSchema,
  MonthlyGrantSchema,
  OperatingRegimeSchema,
  ParameterSchema,
  PermitAdministrativeStatusSchema,
  PermitConditionSchema,
  PermitHistoryEntrySchema,
  PermitSchema,
  ProductionEntryBaseSchema,
  ProductionEntrySchema,
  PumpElectricalSchema,
  PumpInstallationSchema,
  PumpingStepSchema,
  PurgeReadingSchema,
  PurgeSchema,
  RecoveryOnlyEventSchema,
  RecoveryPhaseSchema,
  ReductionSchema,
  ResultQualifierSchema,
  ResultValidationSchema,
  SamplingPointSchema,
  SpotMeasurementEventSchema,
  StepDrawdownEventSchema,
  SurfaceCaseSchema,
  TextureSchema,
  TimeResolutionSchema,
  VolumeLimitSchema,
  WaterQualityResultSchema,
  WaterSampleSchema,
  WellCaseSchema,
  WellIdSchema,
  WellSchema,
  WellScreenSchema,
  WellStatusSchema,
  parseWell,
} from './validators/well.validators';

// Format utilities (serialise/deserialise .well format only)
export {
  SECTION_KEYS,
  VISIBILITY_LEAF_KEYS,
  VISIBILITY_TREE,
  checkIfProfileIsEmpty,
  convertProfileFromJSON,
  deserializeWell,
  isWellEmpty,
  profileToWell,
  redactWell,
  serializeWell,
} from './utils/well.utils';

export type { TextureCode, TextureOption } from './types/textures';
export { FGDC_TEXTURES_OPTIONS } from './utils/fgdc.textures';

// Water quality vocabulary and limit sets (since v2.3)
export {
  BR_GM_MS_888_2021,
  EU_2020_2184,
  NEPHELOMETRIC_TURBIDITY_CODES,
  WATER_QUALITY_LIMIT_SETS,
  WHO_GDWQ_2022,
  getLimitSet,
} from './vocab/waterQuality.limits';
export type { Limit, LimitBasis, LimitSet } from './vocab/waterQuality.limits';
export {
  WATER_QUALITY_PARAMETERS,
  WATER_QUALITY_UNITS,
  WATER_QUALITY_VOCABULARY_VERSION,
  getParameterDefinition,
  isKnownParameter,
  parameterKey,
} from './vocab/waterQuality.vocab';
export type {
  ParameterDefinition,
  ParameterForm,
  ParameterGroup,
  ParameterUnit,
} from './vocab/waterQuality.vocab';

// Localized text (BCP 47-keyed labels)
export type { LanguageText, LanguageTextInput } from './types/language.types';
export { resolveLanguageText } from './utils/language.utils';

// Recommended vocabularies of open (free-text) fields, with en/pt labels
export {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_SUGGESTIONS,
} from './vocab/attachment.vocab';
export type {
  AttachmentDocumentType,
  DocumentTypeContext,
} from './vocab/attachment.vocab';
export {
  CEMENT_PAD_TYPES,
  CENTRALIZER_TYPES,
  CONSTRUCTION_MATERIALS,
  DRILLING_METHODS,
} from './vocab/construction.vocab';
export type {
  CementPadType,
  CentralizerType,
  ConstructionMaterial,
  DrillingMethod,
} from './vocab/construction.vocab';
export { WELL_PURPOSES, WELL_TYPES } from './vocab/general.vocab';
export type { WellPurpose, WellType } from './vocab/general.vocab';
export {
  HISTORY_LOG_CATEGORIES,
  HISTORY_LOG_SEVERITIES,
} from './vocab/history.vocab';
export type {
  HistoryLogCategory,
  HistoryLogSeverity,
} from './vocab/history.vocab';
export {
  AQUIFER_ANALYSIS_METHODS,
  HYDRODYNAMIC_EVENT_TYPES,
  MEASUREMENT_METHODS,
} from './vocab/hydrodynamic.vocab';
export type {
  AquiferAnalysisMethod,
  MeasurementMethod,
} from './vocab/hydrodynamic.vocab';
export {
  DECLARED_METHODS,
  MAINTENANCE_TYPES,
  METER_TYPES,
  POWER_SOURCES,
  PUMP_TYPES,
  READING_SOURCES,
} from './vocab/operation.vocab';
export type {
  DeclaredMethod,
  MaintenanceType,
  MeterType,
  PowerSource,
  PumpType,
  ReadingSource,
} from './vocab/operation.vocab';
export {
  CONDITION_CATEGORIES,
  PERMIT_HISTORY_TYPES,
  PERMIT_TYPES,
  WATER_USES,
} from './vocab/permit.vocab';
export type {
  ConditionCategory,
  PermitHistoryType,
  PermitType,
  WaterUse,
} from './vocab/permit.vocab';
export {
  getVocabEntry,
  getVocabLabel,
  isVocabValue,
  vocabValues,
} from './vocab/vocab';
export type { OpenVocab, VocabEntry } from './vocab/vocab';
export {
  SAMPLE_TYPES,
  SAMPLING_DEVICES,
  SAMPLING_METHODS,
  SAMPLING_POINT_TYPES,
} from './vocab/waterSample.vocab';
export type {
  SampleType,
  SamplingDevice,
  SamplingMethod,
  SamplingPointType,
} from './vocab/waterSample.vocab';

// Backward-compat alias for app migration
export type { Well as Profile } from './types/well.types';

// Units conversion utilities
export {
  concentrationFromCanonical,
  concentrationToCanonical,
  cubicFeetToCubicMeters,
  cubicMeterPerHourToLitersPerSecond,
  cubicMeterPerHourToUsGallonsPerMinute,
  cubicMetersToCubicFeet,
  cubicMetersToLiters,
  cubicMetersToUsGallons,
  cvToKilowatts,
  decimalDegreesToDms,
  dmsToDecimalDegrees,
  expandedToStandardUncertainty,
  feetToMeters,
  flowFromCanonical,
  flowToCanonical,
  hoursToMinutes,
  hpToKilowatts,
  inchesToMm,
  kilopascalToPsi,
  kilowattsToCv,
  kilowattsToHp,
  litersPerSecondToCubicMeterPerHour,
  litersToCubicMeters,
  metersToFeet,
  milliSiemensPerCmToMicroSiemensPerCm,
  milliSiemensPerMeterToMicroSiemensPerCm,
  minutesToHours,
  mmToInches,
  mmToSlotNumber,
  normalizeColorUnit,
  powerFromCanonical,
  powerToCanonical,
  psiToKilopascal,
  slotNumberToMm,
  squareMeterPerDayToSquareMeterPerSecond,
  squareMeterPerSecondToSquareMeterPerDay,
  turbidityCodeForUnit,
  usGallonsPerMinuteToCubicMeterPerHour,
  usGallonsToCubicMeters,
  volumeFromCanonical,
  volumeToCanonical,
} from './utils/units';
export type { ConcentrationUnits, DmsCoordinate } from './utils/units';
