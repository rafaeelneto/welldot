/* eslint-disable @typescript-eslint/no-explicit-any */
import { Profile } from '..';
import { Constructive, Geologic, Lithology, Well } from '../types/well.types';

// ─── Empty well template ─────────────────────────────────────────────────────

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

function getEmptyProfile(): Well {
  return JSON.parse(JSON.stringify(EMPTY_WELL));
}

// ─── .well format (compact keys) ────────────────────────────────────────────

const WELL_FORMAT_VERSION = 1;

export function profileToWell(profile: Well): string {
  const well: Record<string, unknown> = {
    version: WELL_FORMAT_VERSION,
    ...(profile.well_type !== undefined && { well_type: profile.well_type }),
    ...(profile.name !== undefined && { name: profile.name }),
    ...(profile.well_driller !== undefined && {
      well_driller: profile.well_driller,
    }),
    ...(profile.construction_date !== undefined && {
      construction_date: profile.construction_date,
    }),
    ...(profile.lat !== undefined && { lat: profile.lat }),
    ...(profile.lng !== undefined && { lng: profile.lng }),
    ...(profile.elevation !== undefined && { elevation: profile.elevation }),
    ...(profile.obs !== undefined && { obs: profile.obs }),
    bore_hole: profile.bore_hole,
    well_case: profile.well_case,
    reduction: profile.reduction,
    well_screen: profile.well_screen,
    surface_case: profile.surface_case,
    hole_fill: profile.hole_fill,
    ...(profile.cement_pad && { cement_pad: profile.cement_pad }),
    lithology: profile.lithology,
    fractures: profile.fractures,
    caves: profile.caves,
  };

  return JSON.stringify(well);
}

function decodeWell(raw: any): Well {
  return {
    ...getEmptyProfile(),
    ...(raw.well_type !== undefined && { well_type: raw.well_type }),
    ...(raw.name !== undefined && { name: raw.name }),
    ...(raw.well_driller !== undefined && { well_driller: raw.well_driller }),
    ...(raw.construction_date !== undefined && {
      construction_date: raw.construction_date,
    }),
    ...(raw.lat !== undefined && { lat: raw.lat }),
    ...(raw.lng !== undefined && { lng: raw.lng }),
    ...(raw.elevation !== undefined && { elevation: raw.elevation }),
    ...(raw.obs !== undefined && { obs: raw.obs }),
    bore_hole: raw.bore_hole ?? [],
    well_case: raw.well_case ?? [],
    reduction: raw.reduction ?? [],
    well_screen: raw.well_screen ?? [],
    surface_case: raw.surface_case ?? [],
    hole_fill: raw.hole_fill ?? [],
    ...(raw.cement_pad && { cement_pad: raw.cement_pad }),
    lithology: raw.lithology ?? [],
    fractures: raw.fractures ?? [],
    caves: raw.caves ?? [],
  };
}

const INCHES_TO_MM = 25.4;

function inchesToMM(items: { diam_pol?: number }[]): any[] {
  if (!items?.length) return items ?? [];
  if (!items.some(item => item.diam_pol !== undefined)) return items;

  return items.map(({ diam_pol, ...rest }) => ({
    ...rest,
    diameter: (diam_pol || 0) * INCHES_TO_MM,
  }));
}

function normalizeLithology(items: any[]): Lithology[] {
  return items.map(item => ({ aquifer_unit: '', ...item }));
}

// done due a typo in the original spec, to be removed in future versions
function normalizeConstructive(src: any): Partial<Constructive> {
  const boreHoleData = src.bole_hole ?? src.bore_hole ?? [];

  return {
    bore_hole: inchesToMM(boreHoleData),
    hole_fill: inchesToMM(src.hole_fill ?? []),
    surface_case: inchesToMM(src.surface_case ?? []),
    well_case: inchesToMM(src.well_case ?? []),
    well_screen: inchesToMM(src.well_screen ?? []),
    reduction: src.reduction ?? [],
    ...(src.cement_pad && { cement_pad: src.cement_pad }),
  };
}

function normalizeGeologic(raw: any): Geologic {
  const lithologySource: any[] = raw.lithology ?? raw.geologic ?? [];

  return {
    lithology: normalizeLithology(lithologySource),
    fractures: raw.fractures ?? [],
    caves: raw.caves ?? [],
  };
}

export function checkIfProfileIsEmpty(
  profile: Profile | null | undefined,
): boolean {
  if (!profile) return true;

  if ((profile as any).constructive || (profile as any).geologic) {
    return false;
  }

  const noComponent =
    profile.lithology?.length === 0 &&
    profile.fractures?.length === 0 &&
    profile.caves?.length === 0 &&
    profile.bore_hole?.length === 0 &&
    profile.hole_fill?.length === 0 &&
    profile.well_case?.length === 0 &&
    profile.well_screen?.length === 0;

  return noComponent;
}

export function convertProfileFromJSON(jsonString: string): Well | null {
  let raw: any;
  try {
    raw = JSON.parse(jsonString);
  } catch {
    throw new Error('Invalid profile format');
  }

  if (raw && typeof raw.version === 'number') {
    if (raw.version !== 1)
      throw new Error(`Unsupported .well format version: ${raw.version}`);
    return decodeWell(raw);
  }

  if (checkIfProfileIsEmpty(raw)) return null;

  const constructiveSource = raw.constructive ?? raw;

  const {
    constructive: _c,
    geologic: _g,
    info: _i,
    units: _u,
    well_type,
    name,
    well_driller,
    construction_date,
    lat,
    lng,
    elevation,
    obs,
  } = raw;

  const topLevelFields = {
    ...(well_type !== undefined && { well_type }),
    ...(name !== undefined && { name }),
    ...(well_driller !== undefined && { well_driller }),
    ...(construction_date !== undefined && { construction_date }),
    ...(lat !== undefined && { lat }),
    ...(lng !== undefined && { lng }),
    ...(elevation !== undefined && { elevation }),
    ...(obs !== undefined && { obs }),
  };

  return {
    ...getEmptyProfile(),
    ...topLevelFields,
    ...normalizeConstructive(constructiveSource),
    ...normalizeGeologic(raw),
  };
}
