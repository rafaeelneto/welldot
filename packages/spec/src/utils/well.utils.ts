import { Constructive, Geologic, Lithology, Well } from '../types/well.types';

// ─── Types ───────────────────────────────────────────────────────────────────

type RawJSON = Record<string, unknown>;

// ─── Constants ───────────────────────────────────────────────────────────────

const WELL_FORMAT_VERSION = 1;
const INCHES_TO_MM = 25.4;

const EMPTY_WELL: Well = {
  bore_hole: [],
  well_case: [],
  reduction: [],
  well_screen: [],
  surface_case: [],
  hole_fill: [],
  cement_pad: { type: '', width: 0, thickness: 0, length: 0 },
  lithology: [],
  fractures: [],
  caves: [],
};

// ─── Internal helpers ────────────────────────────────────────────────────────

function createEmptyWell(): Well {
  return JSON.parse(JSON.stringify(EMPTY_WELL)) as Well;
}

function decodeV1Well(raw: RawJSON): Well {
  return {
    ...createEmptyWell(),
    ...(raw.well_type !== undefined && { well_type: raw.well_type as string }),
    ...(raw.name !== undefined && { name: raw.name as string }),
    ...(raw.well_driller !== undefined && {
      well_driller: raw.well_driller as string,
    }),
    ...(raw.construction_date !== undefined && {
      construction_date: raw.construction_date as string,
    }),
    ...(raw.lat !== undefined && { lat: raw.lat as number }),
    ...(raw.lng !== undefined && { lng: raw.lng as number }),
    ...(raw.elevation !== undefined && { elevation: raw.elevation as number }),
    ...(raw.obs !== undefined && { obs: raw.obs as string }),
    bore_hole: (raw.bore_hole as Well['bore_hole']) ?? [],
    well_case: (raw.well_case as Well['well_case']) ?? [],
    reduction: (raw.reduction as Well['reduction']) ?? [],
    well_screen: (raw.well_screen as Well['well_screen']) ?? [],
    surface_case: (raw.surface_case as Well['surface_case']) ?? [],
    hole_fill: (raw.hole_fill as Well['hole_fill']) ?? [],
    ...(raw.cement_pad
      ? { cement_pad: raw.cement_pad as Well['cement_pad'] }
      : {}),
    lithology: (raw.lithology as Well['lithology']) ?? [],
    fractures: (raw.fractures as Well['fractures']) ?? [],
    caves: (raw.caves as Well['caves']) ?? [],
  };
}

function convertLegacyDiameters(
  items: (RawJSON & { diam_pol?: number })[],
): RawJSON[] {
  if (!items?.length) return items ?? [];
  if (!items.some(item => item.diam_pol !== undefined)) return items;

  return items.map(({ diam_pol, ...rest }) => ({
    ...rest,
    diameter: (diam_pol || 0) * INCHES_TO_MM,
  }));
}

function normalizeLithology(items: RawJSON[]): Lithology[] {
  return items.map(item => ({ aquifer_unit: '', ...item })) as Lithology[];
}

// "bole_hole" is a typo present in older saved profiles; kept for compatibility
function normalizeConstructive(src: RawJSON): Partial<Constructive> {
  const boreHoleData = (src.bole_hole ?? src.bore_hole ?? []) as (RawJSON & {
    diam_pol?: number;
  })[];

  return {
    bore_hole: convertLegacyDiameters(boreHoleData) as Well['bore_hole'],
    hole_fill: convertLegacyDiameters(
      (src.hole_fill ?? []) as (RawJSON & { diam_pol?: number })[],
    ) as Well['hole_fill'],
    surface_case: convertLegacyDiameters(
      (src.surface_case ?? []) as (RawJSON & { diam_pol?: number })[],
    ) as Well['surface_case'],
    well_case: convertLegacyDiameters(
      (src.well_case ?? []) as (RawJSON & { diam_pol?: number })[],
    ) as Well['well_case'],
    well_screen: convertLegacyDiameters(
      (src.well_screen ?? []) as (RawJSON & { diam_pol?: number })[],
    ) as Well['well_screen'],
    reduction: (src.reduction ?? []) as Well['reduction'],
    ...(src.cement_pad
      ? { cement_pad: src.cement_pad as Well['cement_pad'] }
      : {}),
  };
}

function normalizeGeologic(raw: RawJSON): Geologic {
  const lithologySource = (raw.lithology ?? raw.geologic ?? []) as RawJSON[];

  return {
    lithology: normalizeLithology(lithologySource),
    fractures: (raw.fractures ?? []) as Well['fractures'],
    caves: (raw.caves ?? []) as Well['caves'],
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Serializes a {@link Well} object into a versioned JSON string suitable for
 * storage or transmission.
 *
 * @param well - The well profile to serialize.
 * @returns A JSON string containing the versioned well payload.
 */
export function serializeWell(well: Well): string {
  const payload: Record<string, unknown> = {
    version: WELL_FORMAT_VERSION,
    ...(well.well_type !== undefined && { well_type: well.well_type }),
    ...(well.name !== undefined && { name: well.name }),
    ...(well.well_driller !== undefined && { well_driller: well.well_driller }),
    ...(well.construction_date !== undefined && {
      construction_date: well.construction_date,
    }),
    ...(well.lat !== undefined && { lat: well.lat }),
    ...(well.lng !== undefined && { lng: well.lng }),
    ...(well.elevation !== undefined && { elevation: well.elevation }),
    ...(well.obs !== undefined && { obs: well.obs }),
    bore_hole: well.bore_hole,
    well_case: well.well_case,
    reduction: well.reduction,
    well_screen: well.well_screen,
    surface_case: well.surface_case,
    hole_fill: well.hole_fill,
    ...(well.cement_pad && { cement_pad: well.cement_pad }),
    lithology: well.lithology,
    fractures: well.fractures,
    caves: well.caves,
  };

  return JSON.stringify(payload);
}

/**
 * Returns `true` when the well has no meaningful data — all constructive and
 * geologic arrays are empty and no legacy nested structure is present.
 *
 * @param well - The well profile to check. Accepts `null` / `undefined`
 *   (both treated as empty).
 * @returns `true` if the well is considered empty, `false` otherwise.
 */
export function isWellEmpty(well: Well | null | undefined): boolean {
  if (!well) return true;

  const raw = well as RawJSON;
  if (raw.constructive || raw.geologic) return false;

  return (
    well.lithology?.length === 0 &&
    well.fractures?.length === 0 &&
    well.caves?.length === 0 &&
    well.bore_hole?.length === 0 &&
    well.hole_fill?.length === 0 &&
    well.well_case?.length === 0 &&
    well.well_screen?.length === 0
  );
}

/**
 * Parses a JSON string produced by {@link serializeWell} (or older legacy
 * formats) and returns a normalized {@link Well} object.
 *
 * Handles:
 * - Versioned format (v1)
 * - Legacy format with `constructive` / `geologic` sub-objects
 * - Legacy `diam_pol` inch diameters → `diameter` mm conversion
 * - Typo `bole_hole` → `bore_hole` compatibility
 *
 * @param jsonString - Raw JSON string to parse.
 * @returns A normalized {@link Well}, or `null` if the parsed data is empty.
 * @throws {Error} If `jsonString` is not valid JSON.
 * @throws {Error} If the `version` field is present but not supported.
 */
export function deserializeWell(jsonString: string): Well | null {
  let raw: RawJSON;
  try {
    raw = JSON.parse(jsonString) as RawJSON;
  } catch {
    throw new Error('Invalid profile format');
  }

  if (typeof raw.version === 'number') {
    if (raw.version !== 1)
      throw new Error(`Unsupported .well format version: ${raw.version}`);
    return decodeV1Well(raw);
  }

  if (isWellEmpty(raw as unknown as Well)) return null;

  const constructiveSource = (raw.constructive ?? raw) as RawJSON;

  const metadata: Partial<Well> = {
    ...(raw.well_type !== undefined && { well_type: raw.well_type as string }),
    ...(raw.name !== undefined && { name: raw.name as string }),
    ...(raw.well_driller !== undefined && {
      well_driller: raw.well_driller as string,
    }),
    ...(raw.construction_date !== undefined && {
      construction_date: raw.construction_date as string,
    }),
    ...(raw.lat !== undefined && { lat: raw.lat as number }),
    ...(raw.lng !== undefined && { lng: raw.lng as number }),
    ...(raw.elevation !== undefined && { elevation: raw.elevation as number }),
    ...(raw.obs !== undefined && { obs: raw.obs as string }),
  };

  return {
    ...createEmptyWell(),
    ...metadata,
    ...normalizeConstructive(constructiveSource),
    ...normalizeGeologic(raw),
  };
}

// ─── Backward-compat aliases ─────────────────────────────────────────────────

/** @deprecated Use {@link serializeWell} */
export const profileToWell = serializeWell;
/** @deprecated Use {@link isWellEmpty} */
export const checkIfProfileIsEmpty = isWellEmpty;
/** @deprecated Use {@link deserializeWell} */
export const convertProfileFromJSON = deserializeWell;
