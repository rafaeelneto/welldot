import {
  AquiferAnalysis,
  Centralizer,
  Constructive,
  HoleFill,
  HydrodynamicEvent,
  LevelReading,
  PumpInstallation,
  PumpingStep,
  Reduction,
  Well,
} from '@welldot/core';

import { getRetractedIds } from './shared.utils';

type DepthPoint = { depth: number };
type DepthInterval = { to: number };
type DepthRange = { from: number; to: number; diameter: number };

function getLowestPoint(item: DepthPoint | DepthInterval): number {
  return 'depth' in item ? item.depth : item.to;
}

function getLowestPointFromList(data: (DepthPoint | DepthInterval)[]): number {
  if (data.length === 0) return 0;
  return getLowestPoint(data[data.length - 1]);
}

/**
 * Returns the deepest recorded depth for each component array in a well profile.
 *
 * For point-based components (fractures) the last item's `depth` field is used;
 * for interval-based components (bore hole, casing, etc.) the last item's `to`
 * field is used. Returns `0` for any empty array.
 *
 * @param profile - The well to inspect.
 * @returns Array of maximum depths in the same order as the well's component
 *   arrays: lithology, fractures, caves, bore_hole, hole_fill, reduction,
 *   surface_case, well_case, well_screen.
 */
export function getProfileLastItemsDepths(profile: Well): number[] {
  return [
    getLowestPointFromList(profile.lithology),
    getLowestPointFromList(profile.fractures),
    getLowestPointFromList(profile.caves),
    getLowestPointFromList(profile.bore_hole),
    getLowestPointFromList(profile.hole_fill),
    getLowestPointFromList(profile.reduction),
    getLowestPointFromList(profile.surface_case),
    getLowestPointFromList(profile.well_case),
    getLowestPointFromList(profile.well_screen),
  ];
}

/**
 * Collects every diameter value present in a well's constructive section.
 *
 * Includes diameters from bore holes, hole fills, surface casings, well screens,
 * well casings, and both ends of each reducer (`diam_from` and `diam_to`).
 * Useful for computing the overall diameter range when scaling a cross-section
 * diagram.
 *
 * @param constructionData - The constructive section of a well.
 * @returns Flat array of all diameter values (in millimeters), in component
 *   order: bore_hole → hole_fill → surface_case → well_screen → well_case →
 *   reduction (diam_from, diam_to pairs).
 */
export function getProfileDiamValues(constructionData: Constructive): number[] {
  return [
    ...constructionData.bore_hole.map(d => d.diameter),
    ...constructionData.hole_fill.map(d => d.diameter),
    ...constructionData.surface_case.map(d => d.diameter),
    ...constructionData.well_screen.map(d => d.diameter),
    ...constructionData.well_case.map(d => d.diameter),
    ...constructionData.reduction.flatMap((d: Reduction) => [
      d.diam_from,
      d.diam_to,
    ]),
  ];
}

/**
 * Extracts the value of an arbitrary property from every item in all
 * constructive component arrays (bore_hole, hole_fill, surface_case,
 * well_screen, well_case, reduction).
 *
 * Useful for gathering a summary list of a single attribute — e.g. all `type`
 * strings or all `description` values — across the entire constructive section
 * in one pass.
 *
 * @template T - Expected type of the extracted property values.
 * @param constructionData - The constructive section of a well. Accepts a
 *   partial so callers can pass incomplete objects safely.
 * @param property - Name of the property to extract from each item.
 * @returns Flat array of the extracted values in component order.
 */
export function getConstructivePropertySummary<T>(
  constructionData: Partial<Constructive>,
  property: string,
): T[] {
  const sections = [
    constructionData.bore_hole,
    constructionData.hole_fill,
    constructionData.surface_case,
    constructionData.well_screen,
    constructionData.well_case,
    constructionData.reduction,
  ];
  return sections.flatMap(section =>
    (section ?? []).map(d => (d as Record<string, unknown>)[property] as T),
  );
}

/**
 * Calculates the volume of a cylinder with the given diameter and height.
 *
 * The diameter is treated as an outer diameter in **millimeters** and is
 * converted to meters internally before computing the volume, so the result is
 * in **cubic meters (m³)**.
 *
 * Formula: `π × (diameter_m / 2)² × height`
 *
 * @param diameter - Outer diameter in millimeters.
 * @param height - Height (or depth span) in meters.
 * @returns Volume in cubic meters (m³).
 */
export function calculateCylindricVolume(
  diameter: number,
  height: number,
): number {
  return Math.PI * (diameter / 1000 / 2) ** 2 * height;
}

/**
 * Calculates the net annular volume of a single hole-fill segment, accounting
 * for the space taken by casings and screens that overlap it.
 *
 * The gross cylindrical volume of the fill annulus is computed first. Any
 * well-case or well-screen section that overlaps the fill interval is then
 * subtracted (clipped to the overlapping length) to yield the true net volume.
 *
 * The result is in **cubic meters (m³)** — diameters are converted from mm
 * internally via {@link calculateCylindricVolume}.
 *
 * @param fill - The hole-fill segment to compute the volume of.
 * @param profile - The well providing the well_case/well_screen sections to
 *   subtract.
 * @returns Net volume (m³) of `fill`, possibly negative if its diameter is
 *   smaller than an overlapping casing/screen.
 */
export function calculateHoleFillSegmentVolume(
  fill: HoleFill,
  profile: Well,
): number {
  const { well_case: wellCase, well_screen: wellScreen } = profile;

  let outerVolume = calculateCylindricVolume(
    fill.diameter,
    fill.to - fill.from,
  );

  for (let i = 0; i < wellCase.length; i++) {
    const wC = wellCase[i] as DepthRange;

    if (!(wC.from > fill.to || wC.to < fill.from)) {
      let { from, to } = fill;
      if (wC.from > fill.from) from = wC.from;
      if (wC.to < fill.to) to = wC.to;

      outerVolume -= calculateCylindricVolume(wC.diameter, to - from);
    }
  }

  for (let i = 0; i < wellScreen.length; i++) {
    const wS = wellScreen[i] as DepthRange;

    if (!(wS.from > fill.to || wS.to < fill.from)) {
      let { from, to } = fill;
      if (wS.from > fill.from) from = wS.from;
      if (wS.to < fill.to) to = wS.to;

      outerVolume -= calculateCylindricVolume(wS.diameter, to - from);
    }
  }

  return outerVolume;
}

/**
 * Calculates the net annular volume occupied by a specific hole-fill type,
 * accounting for the space taken by casings and screens inside the fill zone.
 *
 * Sums {@link calculateHoleFillSegmentVolume} over every hole-fill segment of
 * the requested type.
 *
 * @param type - Fill category to sum: `'gravel_pack'` or `'seal'`.
 * @param profile - The well whose fill volumes are being calculated.
 * @returns Total net volume (m³) of all fill segments matching `type`.
 */
export function calculateHoleFillVolume(
  type: HoleFill['type'],
  profile: Well,
): number {
  return profile.hole_fill
    .filter(el => el.type === type)
    .reduce(
      (volume, el) => volume + calculateHoleFillSegmentVolume(el, profile),
      0,
    );
}

// ─── Derived hydrodynamic parameter computations ──────────────────────────────

/** Drawdown s at a level reading: readingDepth − staticLevel (m). */
export function calculateDrawdown(
  readingDepth: number,
  staticLevel: number,
): number {
  return readingDepth - staticLevel;
}

/** Specific capacity Q/s (m²/h). Throws RangeError when drawdown is zero. */
export function calculateSpecificCapacity(
  flowRate: number,
  drawdown: number,
): number {
  if (drawdown === 0) throw new RangeError('drawdown must not be zero');
  return flowRate / drawdown;
}

/** Unit drawdown s/Q (h/m²). Throws RangeError when flowRate is zero. */
export function calculateUnitDrawdown(
  drawdown: number,
  flowRate: number,
): number {
  if (flowRate === 0) throw new RangeError('flowRate must not be zero');
  return drawdown / flowRate;
}

/** Formation head loss via Jacob B coefficient: jacobB × flowRate (m). */
export function calculateFormationLoss(
  jacobB: number,
  flowRate: number,
): number {
  return jacobB * flowRate;
}

/** Well head loss via Jacob C coefficient: jacobC × flowRate² (m). */
export function calculateWellLoss(jacobC: number, flowRate: number): number {
  return jacobC * flowRate ** 2;
}

/** Hydraulic conductivity K = transmissivity / aquiferThickness (m/h). Throws RangeError when aquiferThickness is zero. */
export function calculateHydraulicConductivity(
  transmissivity: number,
  aquiferThickness: number,
): number {
  if (aquiferThickness === 0)
    throw new RangeError('aquiferThickness must not be zero');
  return transmissivity / aquiferThickness;
}

// ─── Hydrodynamic event query utilities ──────────────────────────────────────

/**
 * Returns the ids of every hydrodynamic event retracted by another event's
 * `corrects` field (`.well` v2.3 ledger corrections). In a chain (C corrects
 * B, which corrected A) both A and B are retracted; only C counts.
 */
export function getRetractedEventIds(well: Well): Set<string> {
  return getRetractedIds(well.hydrodynamic_events ?? []);
}

/**
 * Returns the hydrodynamic events that count for derivations: every event
 * not retracted by a `corrects` reference. Retracted events stay in the file
 * but are excluded from all derived values. Order is preserved.
 */
export function getEffectiveHydrodynamicEvents(
  well: Well,
): HydrodynamicEvent[] {
  const events = well.hydrodynamic_events ?? [];
  const retracted = getRetractedEventIds(well);
  if (retracted.size === 0) return events;
  return events.filter(e => !retracted.has(e.id));
}

/**
 * Returns the static water level (m) from the most recent hydrodynamic event
 * that carries a `static_level` field. Events retracted via `corrects` are
 * ignored. Events are compared by UTC datetime.
 * Returns `undefined` if no such event exists.
 */
export function getLatestStaticLevel(well: Well): number | undefined {
  const events = getEffectiveHydrodynamicEvents(well);
  if (events.length === 0) return undefined;
  const withLevel = events.filter(
    (e): e is typeof e & { static_level: number } =>
      'static_level' in e &&
      (e as { static_level?: number }).static_level !== undefined,
  );
  if (withLevel.length === 0) return undefined;
  withLevel.sort(
    (a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime(),
  );
  return (withLevel[0] as { static_level: number }).static_level;
}

/**
 * Returns `true` when the most recent static water level is above ground
 * (negative, per the `.well` level sign convention), i.e. the well is flowing
 * artesian. Returns `false` when there is no static level on record.
 *
 * Since `.well` v2.1 this is the canonical way to detect a flowing artesian
 * well; `well_type: "artesian"` is deprecated.
 */
export function isFlowingArtesian(well: Well): boolean {
  const level = getLatestStaticLevel(well);
  return level !== undefined && level < 0;
}

/**
 * Returns the individual centralizer depths (m) described by a
 * {@link Centralizer} entry: `from`, `from + spacing`, … up to `to`.
 *
 * - `from === to` → a single centralizer at that depth.
 * - No usable `spacing` → only the known endpoints `[from, to]`, since the
 *   positions in between are unknown.
 *
 * Positions are rounded to millimeters to absorb floating-point drift.
 */
export function getCentralizerDepths(centralizer: Centralizer): number[] {
  const { from, to, spacing } = centralizer;
  const top = Math.min(from, to);
  const bottom = Math.max(from, to);
  if (top === bottom) return [top];
  if (!spacing || spacing <= 0) return [top, bottom];

  const round = (n: number) => Math.round(n * 1000) / 1000;
  const depths: number[] = [];
  for (let i = 0; ; i++) {
    const depth = round(top + i * spacing);
    if (depth > bottom) break;
    depths.push(depth);
  }
  return depths;
}

/**
 * Returns the value of `field` from the most recent `aquifer_analysis` entry
 * where that field is present. Entries are compared by UTC datetime.
 * Returns `undefined` if no matching entry exists.
 */
export function getLatestAquiferAnalysisField<K extends keyof AquiferAnalysis>(
  well: Well,
  field: K,
): AquiferAnalysis[K] | undefined {
  const entries = well.aquifer_analysis;
  if (!entries || entries.length === 0) return undefined;
  const withField = entries.filter(e => e[field] !== undefined);
  if (withField.length === 0) return undefined;
  withField.sort(
    (a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime(),
  );
  return withField[0][field];
}

// ─── Pump installation utilities (.well v2.3) ────────────────────────────────

const PUMPING_EVENT_TYPES = new Set([
  'spot_measurement',
  'constant_rate',
  'step_drawdown',
]);

function toTime(instant: string): number {
  return new Date(instant).getTime();
}

/**
 * Returns the current pump: the `pump_installations` entry without
 * `removed_at`. When several entries are open (standby pumps, data errors),
 * the most recently installed one is returned. Returns `undefined` when every
 * installation has been removed or none exists.
 */
export function getCurrentPump(well: Well): PumpInstallation | undefined {
  const open = (well.pump_installations ?? []).filter(p => !p.removed_at);
  if (open.length === 0) return undefined;
  return open.reduce((latest, p) =>
    toTime(p.installed_at) > toTime(latest.installed_at) ? p : latest,
  );
}

/**
 * Returns the pump installed in the well at `instant`: the entry with
 * `installed_at <= instant` and no `removed_at` or `removed_at > instant`
 * (latest installed if several overlap). Use it to link a record dated in the
 * past (e.g. a water sample collected at the pump) to the pump in place then.
 *
 * @param well - The well.
 * @param instant - RFC 3339 instant (or a `Date`).
 * @returns The installation in place at `instant`, or `undefined`.
 */
export function getPumpInstalledAt(
  well: Well,
  instant: string | Date,
): PumpInstallation | undefined {
  const t = instant instanceof Date ? instant.getTime() : toTime(instant);
  if (Number.isNaN(t)) return undefined;
  const inPlace = (well.pump_installations ?? []).filter(
    p =>
      toTime(p.installed_at) <= t &&
      (!p.removed_at || toTime(p.removed_at) > t),
  );
  if (inPlace.length === 0) return undefined;
  return inPlace.reduce((latest, p) =>
    toTime(p.installed_at) > toTime(latest.installed_at) ? p : latest,
  );
}

/**
 * Returns the most recent water level (m) measured during pumping: the last
 * reading of the last step of the most recent non-retracted pumping event
 * (`spot_measurement`, `constant_rate`, `step_drawdown`). Airlift events are
 * ignored. Falls back to the most recent `aquifer_analysis[].dynamic_level`
 * when it is newer or no pumping reading exists.
 */
export function getLatestPumpingDynamicLevel(well: Well): number | undefined {
  let latest: { time: number; depth: number } | undefined;

  for (const event of getEffectiveHydrodynamicEvents(well)) {
    if (!PUMPING_EVENT_TYPES.has(event.type)) continue;
    const steps = (event as { steps?: PumpingStep[] }).steps ?? [];
    const lastStep = [...steps].reverse().find(s => s.readings?.length);
    if (!lastStep?.readings) continue;
    const lastReading = lastStep.readings.reduce((a: LevelReading, b) =>
      b.elapsed > a.elapsed ? b : a,
    );
    const time = toTime(event.datetime);
    if (!latest || time > latest.time) {
      latest = { time, depth: lastReading.depth };
    }
  }

  const analyses = (well.aquifer_analysis ?? []).filter(
    a => a.dynamic_level !== undefined,
  );
  for (const analysis of analyses) {
    const time = toTime(analysis.datetime);
    if (!latest || time > latest.time) {
      latest = { time, depth: analysis.dynamic_level as number };
    }
  }

  return latest?.depth;
}

/**
 * Returns the submergence (m) of the current pump: `intake_depth −
 * dynamic_level`, using {@link getLatestPumpingDynamicLevel}. A negative value
 * means the intake is above the water level. Returns `undefined` when there is
 * no current pump, no `intake_depth` or no dynamic level on record.
 */
export function calculateSubmergence(well: Well): number | undefined {
  const intake = getCurrentPump(well)?.intake_depth;
  if (intake === undefined) return undefined;
  const dynamicLevel = getLatestPumpingDynamicLevel(well);
  if (dynamicLevel === undefined) return undefined;
  return intake - dynamicLevel;
}

/**
 * Returns the total time in service, in minutes, of the pump unit identified
 * by `serial`: the sum of the durations of every installation sharing that
 * serial. An open installation counts up to `now`.
 */
export function getPumpServiceTime(
  well: Well,
  serial: string,
  now: Date = new Date(),
): number {
  let total = 0;
  for (const p of well.pump_installations ?? []) {
    if (p.serial !== serial) continue;
    const start = toTime(p.installed_at);
    const end = p.removed_at ? toTime(p.removed_at) : now.getTime();
    if (end > start) total += end - start;
  }
  return total / 60_000;
}

export type PumpInstallationWarningCode =
  | 'intake_below_well_bottom'
  | 'intake_in_screen'
  | 'multiple_open_installations'
  | 'removed_before_installed';

export type PumpInstallationWarning = {
  code: PumpInstallationWarningCode;
  /** `pump_installations[].id` values the warning refers to. */
  ids: string[];
};

/**
 * Returns the validation warnings of the `pump_installations` block defined
 * by `.well` v2.3. Warnings never make a file invalid; they flag data an
 * application should surface to the user:
 *
 * - `intake_below_well_bottom` — `intake_depth` greater than `well_depth` or
 *   below the deepest `bore_hole` interval.
 * - `intake_in_screen` — `intake_depth` inside a `well_screen` interval.
 * - `multiple_open_installations` — more than one entry without `removed_at`.
 * - `removed_before_installed` — `removed_at` earlier than or equal to
 *   `installed_at`.
 */
export function getPumpInstallationWarnings(
  well: Well,
): PumpInstallationWarning[] {
  const pumps = well.pump_installations ?? [];
  const warnings: PumpInstallationWarning[] = [];

  const boreHoleBottom = Math.max(
    0,
    ...(well.bore_hole ?? []).map(b => Math.max(b.from, b.to)),
  );
  const limits = [well.well_depth, boreHoleBottom || undefined].filter(
    (d): d is number => d !== undefined && d > 0,
  );
  const bottom = limits.length ? Math.min(...limits) : undefined;

  for (const p of pumps) {
    if (p.intake_depth !== undefined) {
      if (bottom !== undefined && p.intake_depth > bottom) {
        warnings.push({ code: 'intake_below_well_bottom', ids: [p.id] });
      }
      const inScreen = (well.well_screen ?? []).some(
        s =>
          p.intake_depth! > Math.min(s.from, s.to) &&
          p.intake_depth! < Math.max(s.from, s.to),
      );
      if (inScreen) warnings.push({ code: 'intake_in_screen', ids: [p.id] });
    }
    if (p.removed_at && toTime(p.removed_at) <= toTime(p.installed_at)) {
      warnings.push({ code: 'removed_before_installed', ids: [p.id] });
    }
  }

  const open = pumps.filter(p => !p.removed_at);
  if (open.length > 1) {
    warnings.push({
      code: 'multiple_open_installations',
      ids: open.map(p => p.id),
    });
  }

  return warnings;
}
