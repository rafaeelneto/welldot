import {
  Constructive,
  Geologic,
  Lithology,
  Location,
  Well,
} from '../types/well.types';
import { mergeWell } from '../validators/well.validators';

// ─── Types ───────────────────────────────────────────────────────────────────

type RawJSON = Record<string, unknown>;

// ─── Constants ───────────────────────────────────────────────────────────────

const WELL_FORMAT_VERSION = 2;
const INCHES_TO_MM = 25.4;

const EMPTY_WELL: Well = {
  version: 2,
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

function normalizeLithology(items: RawJSON[]): Lithology[] {
  return items.map(item => {
    const base = { aquifer_unit: '', ...item };
    // v1 fgdc_texture → texture object
    if ('fgdc_texture' in base && !('texture' in base)) {
      const { fgdc_texture, ...rest } = base as Record<string, unknown>;
      return {
        ...rest,
        texture: { code: fgdc_texture, vocabulary: 'fgdc' },
      } as Lithology;
    }
    return base as Lithology;
  });
}

function normalizeWellScreens(items: RawJSON[]): Well['well_screen'] {
  return items.map(item => {
    if ('screen_slot_mm' in item && !('screen_slot' in item)) {
      const { screen_slot_mm, ...rest } = item;
      return {
        ...rest,
        screen_slot: screen_slot_mm,
      } as Well['well_screen'][number];
    }
    return item as Well['well_screen'][number];
  });
}

function decodeV1Well(raw: RawJSON): Well {
  // v1→v2 normalizations for deserialize path
  const lat = raw.lat as number | undefined;
  const lng = raw.lng as number | undefined;
  const elevation = raw.elevation as number | undefined;
  const hasCoords =
    lat !== undefined || lng !== undefined || elevation !== undefined;

  const location: Location | undefined =
    hasCoords && lat !== undefined && lng !== undefined
      ? { lat, lng, ...(elevation !== undefined && { elevation }) }
      : undefined;

  const rawScreens = (raw.well_screen as RawJSON[] | undefined) ?? [];

  const decoded: Well = {
    ...createEmptyWell(),
    ...(raw.well_type !== undefined && { well_type: raw.well_type as string }),
    ...(raw.name !== undefined && { name: raw.name as string }),
    ...(raw.well_driller !== undefined && {
      well_driller: raw.well_driller as string,
    }),
    ...(raw.construction_date !== undefined && {
      construction_date: raw.construction_date as string,
    }),
    ...(lat !== undefined && { lat }),
    ...(lng !== undefined && { lng }),
    ...(elevation !== undefined && { elevation }),
    ...(location !== undefined && { location }),
    ...(raw.obs !== undefined && { obs: raw.obs as string }),
    bore_hole: (raw.bore_hole as Well['bore_hole']) ?? [],
    well_case: (raw.well_case as Well['well_case']) ?? [],
    reduction: (raw.reduction as Well['reduction']) ?? [],
    well_screen: normalizeWellScreens(rawScreens),
    surface_case: (raw.surface_case as Well['surface_case']) ?? [],
    hole_fill: (raw.hole_fill as Well['hole_fill']) ?? [],
    ...(raw.cement_pad
      ? { cement_pad: raw.cement_pad as Well['cement_pad'] }
      : {}),
    lithology: normalizeLithology((raw.lithology as RawJSON[]) ?? []),
    fractures: (raw.fractures as Well['fractures']) ?? [],
    caves: (raw.caves as Well['caves']) ?? [],
  };
  return mergeWell(decoded, raw) as Well;
}

function decodeV2Well(raw: RawJSON): Well {
  const rawScreens = (raw.well_screen as RawJSON[] | undefined) ?? [];

  const decoded: Well = {
    ...createEmptyWell(),
    ...(raw.version !== undefined && { version: raw.version as number }),
    ...(raw['@context'] !== undefined && {
      '@context': raw['@context'] as Well['@context'],
    }),
    ...(raw.well_id !== undefined && {
      well_id: raw.well_id as Well['well_id'],
    }),
    ...(raw.location !== undefined && {
      location: raw.location as Well['location'],
    }),
    ...(raw.profiles !== undefined && {
      profiles: raw.profiles as Well['profiles'],
    }),
    ...(raw.well_type !== undefined && { well_type: raw.well_type as string }),
    ...(raw.name !== undefined && { name: raw.name as string }),
    ...(raw.well_driller !== undefined && {
      well_driller: raw.well_driller as string,
    }),
    ...(raw.construction_date !== undefined && {
      construction_date: raw.construction_date as string,
    }),
    ...(raw.obs !== undefined && { obs: raw.obs as string }),
    bore_hole: (raw.bore_hole as Well['bore_hole']) ?? [],
    well_case: (raw.well_case as Well['well_case']) ?? [],
    reduction: (raw.reduction as Well['reduction']) ?? [],
    well_screen: normalizeWellScreens(rawScreens),
    surface_case: (raw.surface_case as Well['surface_case']) ?? [],
    hole_fill: (raw.hole_fill as Well['hole_fill']) ?? [],
    ...(raw.cement_pad
      ? { cement_pad: raw.cement_pad as Well['cement_pad'] }
      : {}),
    lithology: normalizeLithology((raw.lithology as RawJSON[]) ?? []),
    fractures: (raw.fractures as Well['fractures']) ?? [],
    caves: (raw.caves as Well['caves']) ?? [],
    ...(raw.hydrodynamic_events !== undefined && {
      hydrodynamic_events:
        raw.hydrodynamic_events as Well['hydrodynamic_events'],
    }),
    ...(raw.aquifer_analysis !== undefined && {
      aquifer_analysis: raw.aquifer_analysis as Well['aquifer_analysis'],
    }),
    ...(raw.history_logs !== undefined && {
      history_logs: raw.history_logs as Well['history_logs'],
    }),
  };
  return mergeWell(decoded, raw) as Well;
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

// "bole_hole" is a typo present in older saved profiles; kept for compatibility
function normalizeConstructive(src: RawJSON): Partial<Constructive> {
  const boreHoleData = (src.bole_hole ?? src.bore_hole ?? []) as (RawJSON & {
    diam_pol?: number;
  })[];

  const rawScreens = convertLegacyDiameters(
    (src.well_screen ?? []) as (RawJSON & { diam_pol?: number })[],
  ) as RawJSON[];

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
    well_screen: normalizeWellScreens(rawScreens),
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
    ...(well['@context'] !== undefined && { '@context': well['@context'] }),
    ...(well.well_id !== undefined && { well_id: well.well_id }),
    ...(well.location !== undefined && { location: well.location }),
    ...(well.profiles !== undefined && { profiles: well.profiles }),
    ...(well.well_type !== undefined && { well_type: well.well_type }),
    ...(well.name !== undefined && { name: well.name }),
    ...(well.well_driller !== undefined && { well_driller: well.well_driller }),
    ...(well.construction_date !== undefined && {
      construction_date: well.construction_date,
    }),
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
    ...(well.hydrodynamic_events !== undefined && {
      hydrodynamic_events: well.hydrodynamic_events,
    }),
    ...(well.aquifer_analysis !== undefined && {
      aquifer_analysis: well.aquifer_analysis,
    }),
    ...(well.history_logs !== undefined && { history_logs: well.history_logs }),
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
 * - Versioned format v1 and v2
 * - Legacy format with `constructive` / `geologic` sub-objects
 * - Legacy `diam_pol` inch diameters → `diameter` mm conversion
 * - Typo `bole_hole` → `bore_hole` compatibility
 * - v1→v2 normalizations: `fgdc_texture`, `screen_slot_mm`, `lat/lng/elevation → location`
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

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('Invalid profile format');
  }

  if (typeof raw.version === 'number') {
    if (raw.version === 2) return decodeV2Well(raw);
    if (raw.version === 1) return decodeV1Well(raw);
    throw new Error(`Unsupported .well format version: ${raw.version}`);
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
