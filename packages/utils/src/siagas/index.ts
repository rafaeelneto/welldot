/**
 * `@welldot/utils/siagas` — imports wells from SIAGAS, the Brazilian
 * groundwater registry of the Geological Survey (SGB), and from its
 * monitoring network RIMAS.
 *
 * Unlike the rest of `@welldot/utils`, `importSiagasWell` does network I/O
 * (the global `fetch`, or one passed in). The parsing and conversion steps
 * are pure and can be used on pages fetched elsewhere.
 */
export { SIAGAS_PAGE_URL, siagasToWell } from './convert';
export type {
  RimasMode,
  SiagasConversion,
  SiagasToWellOptions,
} from './convert';
export { SiagasError } from './errors';
export type { SiagasErrorKind } from './errors';
export {
  importSiagasWell,
  normalizeSiagasCode,
  rimasUrl,
  siagasUrl,
} from './import';
export type { ImportSiagasOptions, SiagasImport } from './import';
export {
  parseDuration,
  parseInches,
  parseSiagasDate,
  parseSiagasNumber,
  parseSiagasPage,
} from './parse';
export type { SiagasDiameterRow, SiagasPipeRow, SiagasRecord } from './parse';
export { RIMAS_PAGE_URL, monthlyRimasReadings, parseRimasPage } from './rimas';
export type { RimasMedia, RimasPage, RimasReading } from './rimas';
export { siagasWarning } from './warnings';
export type { SiagasWarning, SiagasWarningCode } from './warnings';
