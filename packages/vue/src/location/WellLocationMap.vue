<script setup lang="ts">
/**
 * Leaflet map with a single pin at `lat`/`lng`. Click the map or drag the
 * pin to move it (unless `readonly`, which can change at any time). Leaflet and its CSS are imported
 * dynamically on mount, so server-side rendering outputs an empty `div` and
 * no `<ClientOnly>` is needed. `leaflet` is an optional peer dependency.
 *
 * The pin is an inline SVG (`L.divIcon`) filled with the theme's primary
 * colour; no marker images are fetched.
 */
import { clampLat, clampLng } from '@welldot/utils';
import type { LeafletMouseEvent, Map as LeafletMap, Marker } from 'leaflet';
import { onMounted, onUnmounted, useTemplateRef, watch } from 'vue';
import {
  DEFAULT_TILE_ATTRIBUTION,
  DEFAULT_TILE_URL,
  MARKER_ANCHOR,
  MARKER_SIZE,
  MARKER_SVG,
  type WellLocationMapProps,
} from './location';

type Leaflet = typeof import('leaflet');

const props = withDefaults(defineProps<WellLocationMapProps>(), {
  readonly: false,
  tileUrl: DEFAULT_TILE_URL,
  attribution: DEFAULT_TILE_ATTRIBUTION,
  height: '16rem',
});
const lat = defineModel<number>('lat', { required: true });
const lng = defineModel<number>('lng', { required: true });

const mapEl = useTemplateRef<HTMLElement>('mapEl');
let map: LeafletMap | null = null;
let marker: Marker | null = null;
let resizeObserver: ResizeObserver | null = null;
let unmounted = false;
/** Leaflet namespace, once loaded on mount. */
let leaflet: Leaflet | null = null;

/** Leaflet ships UMD; depending on the bundler the namespace is `default`. */
async function loadLeaflet(): Promise<Leaflet> {
  const mod = (await import('leaflet')) as Leaflet & { default?: Leaflet };
  return mod.default ?? mod;
}

function finite(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function setCoordinates(newLat: number, newLng: number) {
  lat.value = clampLat(newLat);
  lng.value = clampLng(newLng);
}

/** Map click handler while editable (kept to remove it again). */
let onMapClick: ((e: LeafletMouseEvent) => void) | null = null;

function onMarkerDragEnd() {
  if (!marker) return;
  const pos = marker.getLatLng();
  setCoordinates(pos.lat, pos.lng);
}

/**
 * Turns pin dragging and click-to-move on or off. Called on mount and
 * whenever `readonly` changes.
 */
function setEditable(L: Leaflet, editable: boolean) {
  if (!map || !marker) return;
  const m = map;
  const pin = marker;

  pin.options.draggable = editable;
  if (editable) pin.dragging?.enable();
  else pin.dragging?.disable();
  pin.off('dragend', onMarkerDragEnd);
  if (editable) pin.on('dragend', onMarkerDragEnd);

  if (onMapClick) m.off('click', onMapClick);
  onMapClick = null;
  if (editable) {
    onMapClick = e => {
      const clamped = L.latLng(clampLat(e.latlng.lat), clampLng(e.latlng.lng));
      pin.setLatLng(clamped);
      setCoordinates(clamped.lat, clamped.lng);
    };
    m.on('click', onMapClick);
  }

  // Leaflet gives every interactive marker a pointer cursor; a read-only
  // pin does nothing on click or drag.
  pin.getElement()?.style.setProperty('cursor', editable ? '' : 'default');
}

onMounted(async () => {
  const L = await loadLeaflet();
  await import('leaflet/dist/leaflet.css');
  // Unmounted while leaflet was loading.
  if (unmounted || !mapEl.value) return;

  const initialLat = clampLat(finite(lat.value));
  const initialLng = clampLng(finite(lng.value));
  const isDefault = initialLat === 0 && initialLng === 0;

  map = L.map(mapEl.value, {
    zoomControl: true,
    maxBounds: L.latLngBounds([-90, -180], [90, 180]),
    maxBoundsViscosity: 1.0,
    minZoom: 2,
  }).setView([initialLat, initialLng], isDefault ? 2 : 13);

  L.tileLayer(props.tileUrl, {
    attribution: props.attribution,
    maxZoom: 19,
    noWrap: true,
  }).addTo(map);

  const icon = L.divIcon({
    className: 'well-location-marker',
    html: MARKER_SVG,
    iconSize: MARKER_SIZE,
    iconAnchor: MARKER_ANCHOR,
  });

  marker = L.marker([initialLat, initialLng], {
    icon,
    draggable: !props.readonly,
  }).addTo(map);

  leaflet = L;
  setEditable(L, !props.readonly);

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => map?.invalidateSize());
    resizeObserver.observe(mapEl.value);
  }
});

onUnmounted(() => {
  unmounted = true;
  resizeObserver?.disconnect();
  resizeObserver = null;
  map?.remove();
  map = null;
  marker = null;
  onMapClick = null;
});

watch(
  () => props.readonly,
  readonly => {
    if (leaflet) setEditable(leaflet, !readonly);
  },
);

watch([lat, lng], ([newLat, newLng]) => {
  if (!map || !marker) return;
  const clampedLat = clampLat(finite(newLat));
  const clampedLng = clampLng(finite(newLng));
  marker.setLatLng([clampedLat, clampedLng]);
  map.setView([clampedLat, clampedLng], map.getZoom());
});
</script>

<template>
  <div
    ref="mapEl"
    class="well-location-map w-full rounded-lg overflow-hidden border border-surface-200"
    :style="{ height: props.height }"
  />
</template>

<style scoped>
/* Leaflet creates the marker element outside Vue's render, so the scoped
   attribute is only on the map root: reach the marker through `:deep`. */
.well-location-map :deep(.well-location-marker) {
  background: none;
  border: none;
}

.well-location-map :deep(.well-location-marker svg) {
  display: block;
  overflow: visible;
  filter: drop-shadow(0 1px 1.5px rgb(0 0 0 / 0.35));
}

.well-location-map :deep(.well-location-marker__pin) {
  fill: var(--p-primary-color, var(--color-primary-500, #2563eb));
  stroke: rgb(0 0 0 / 0.2);
  stroke-width: 0.75;
}

.well-location-map :deep(.well-location-marker__dot) {
  fill: #fff;
}
</style>
