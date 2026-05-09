import { Constructive, HoleFill, Reduction, Well } from '@welldot/core';

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
export function calculateCilindricVolume(
  diameter: number,
  height: number,
): number {
  return Math.PI * (diameter / 1000 / 2) ** 2 * height;
}

/**
 * Calculates the net annular volume occupied by a specific hole-fill type,
 * accounting for the space taken by casings and screens inside the fill zone.
 *
 * For each hole-fill segment of the requested type, the gross cylindrical
 * volume of the fill annulus is computed first. Any well-case or well-screen
 * section that overlaps the fill interval is then subtracted to yield the true
 * net fill volume.
 *
 * The result is in **cubic meters (m³)** — diameters are converted from mm
 * internally via {@link calculateCilindricVolume}.
 *
 * @param type - Fill category to sum: `'gravel_pack'` or `'seal'`.
 * @param profile - The well whose fill volumes are being calculated.
 * @returns Total net volume (m³) of all fill segments matching `type`.
 */
export function calculateHoleFillVolume(
  type: HoleFill['type'],
  profile: Well,
): number {
  let volume = 0;

  const { well_case: wellCase, well_screen: wellScreen } = profile;

  const holeFillType = profile.hole_fill.filter(el => el.type === type);

  holeFillType.forEach(el => {
    let outerVolume = calculateCilindricVolume(el.diameter, el.to - el.from);

    for (let i = 0; i < wellCase.length; i++) {
      const wC = wellCase[i] as DepthRange;

      if (!(wC.from > el.to || wC.to < el.from)) {
        let { from, to } = el;
        if (wC.from > el.from) from = wC.from;
        if (wC.to < el.to) to = wC.to;

        outerVolume -= calculateCilindricVolume(wC.diameter, to - from);
      }
    }

    for (let i = 0; i < wellScreen.length; i++) {
      const wS = wellScreen[i] as DepthRange;

      if (!(wS.from > el.to || wS.to < el.from)) {
        let { from, to } = el;
        if (wS.from > el.from) from = wS.from;
        if (wS.to < el.to) to = wS.to;

        outerVolume -= calculateCilindricVolume(wS.diameter, to - from);
      }
    }

    volume += outerVolume;
  });

  return volume;
}
