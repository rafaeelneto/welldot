/** Why a SIAGAS import failed. */
export type SiagasErrorKind =
  /** The input is not a 10-digit SIAGAS code or detail URL. */
  | 'invalid_code'
  /** SIAGAS has no well with this code. */
  | 'not_found'
  /** The SGB server could not be reached or answered with an error. */
  | 'upstream'
  /** The page did not have the expected structure. */
  | 'parse'
  /** The converted well did not validate (a converter bug). */
  | 'conversion';

/** Error thrown by the SIAGAS importer; `kind` tells the cause. */
export class SiagasError extends Error {
  readonly kind: SiagasErrorKind;
  readonly details?: unknown;

  constructor(kind: SiagasErrorKind, message: string, details?: unknown) {
    super(message);
    this.name = 'SiagasError';
    this.kind = kind;
    this.details = details;
  }
}
