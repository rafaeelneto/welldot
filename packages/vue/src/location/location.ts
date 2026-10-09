// Shared constants and types of `@welldot/vue/location`. Kept outside the
// SFCs so they can be exported from the subpath entry.
import type { LanguageTextInput } from '@welldot/core';
import type { CoordFormat } from '@welldot/utils';

export type { CoordFormat } from '@welldot/utils';

/** Which coordinate a `WellCoordinateInput` edits. */
export type CoordinateAxis = 'lat' | 'lng';

/**
 * Built-in, locale-independent placeholder examples, one per axis and format.
 * They are valid inputs and round-trip through `parseToDd`/`formatCoord`.
 */
export const COORDINATE_PLACEHOLDERS: Readonly<
  Record<CoordinateAxis, Readonly<Record<CoordFormat, string>>>
> = Object.freeze({
  lat: Object.freeze({ DD: '-23.512533', DMS: `23°30'45.12"S` }),
  lng: Object.freeze({ DD: '-48.503900', DMS: `48°30'14.04"W` }),
});

/** Default tile layer of `WellLocationMap` (OpenStreetMap). */
export const DEFAULT_TILE_URL =
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

/** Attribution matching {@link DEFAULT_TILE_URL}. */
export const DEFAULT_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** Text of `WellLocationPicker`. An omitted label is not rendered. */
export interface WellLocationPickerLabels {
  /** Label above the DD/DMS toggle. */
  coordinates?: LanguageTextInput;
  latitude?: LanguageTextInput;
  longitude?: LanguageTextInput;
  /** Elevation label; the length unit is appended, e.g. `Elevation (m)`. */
  elevation?: LanguageTextInput;
  /** Hint above the map, e.g. "Click the map or drag the pin". */
  hint?: LanguageTextInput;
}

export type WellLocationPickerLabelKey = keyof WellLocationPickerLabels;

/** Props of `WellCoordinateInput` (besides `v-model`). */
export interface WellCoordinateInputProps {
  axis: CoordinateAxis;
  /** Display format. Falls back to `createWelldot({ coordinateFormat })`. */
  format?: CoordFormat;
  /** Overrides the built-in example ({@link COORDINATE_PLACEHOLDERS}). */
  placeholder?: LanguageTextInput;
}

/** Props of `WellLocationMap` (besides `v-model:lat` / `v-model:lng`). */
export interface WellLocationMapProps {
  /** Display only: no pin dragging or click-to-place. */
  readonly?: boolean;
  /** Tile URL template. Read once on mount. Default OpenStreetMap. */
  tileUrl?: string;
  /** Tile attribution HTML. Read once on mount. */
  attribution?: string;
  /** CSS height of the map. Default `16rem`. */
  height?: string;
}

/** Props of `WellLocationPicker` (besides its models). */
export interface WellLocationPickerProps {
  /** Shows the elevation input. Default `true`. */
  showElevation?: boolean;
  labels?: WellLocationPickerLabels;
}

/**
 * Inline SVG pin for the leaflet `divIcon`. Its fill follows the theme's
 * primary colour through the `.well-location-marker` styles of
 * `WellLocationMap`; the tip is at the bottom centre (12, 36 of 24×36).
 */
export const MARKER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="28" height="42" aria-hidden="true" focusable="false">' +
  '<path class="well-location-marker__pin" d="M12 0C5.37 0 0 5.37 0 12c0 8.4 10.2 22.2 10.63 22.78a1.7 1.7 0 0 0 2.74 0C13.8 34.2 24 20.4 24 12 24 5.37 18.63 0 12 0Z"/>' +
  '<circle class="well-location-marker__dot" cx="12" cy="12" r="4.5"/>' +
  '</svg>';

/** `[width, height]` of the marker and the anchor at the pin's tip. */
export const MARKER_SIZE: [number, number] = [28, 42];
export const MARKER_ANCHOR: [number, number] = [14, 41];
