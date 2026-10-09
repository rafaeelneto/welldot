// `@welldot/vue/location` — coordinate input, leaflet map and location picker.
// `leaflet` is an optional peer dependency, loaded on mount by the map.
export { default as WellCoordinateInput } from './WellCoordinateInput.vue';
export { default as WellLocationMap } from './WellLocationMap.vue';
export { default as WellLocationPicker } from './WellLocationPicker.vue';

export {
  COORDINATE_PLACEHOLDERS,
  DEFAULT_TILE_ATTRIBUTION,
  DEFAULT_TILE_URL,
} from './location';
export type {
  CoordFormat,
  CoordinateAxis,
  WellCoordinateInputProps,
  WellLocationMapProps,
  WellLocationPickerLabelKey,
  WellLocationPickerLabels,
  WellLocationPickerProps,
} from './location';
