<script setup lang="ts">
import type { Map, Marker } from 'leaflet';

const lat = defineModel<number>('lat', { required: true });
const lng = defineModel<number>('lng', { required: true });

const props = withDefaults(
  defineProps<{
    /** Display only: no pin dragging or click-to-place. */
    readonly?: boolean;
  }>(),
  { readonly: false },
);

const mapEl = useTemplateRef<HTMLElement>('mapEl');
let map: Map | null = null;
let marker: Marker | null = null;
let resizeObserver: ResizeObserver | null = null;

function updateCoordinate(coord: 'lat' | 'lng', value: number) {
  if (coord === 'lat') lat.value = clampLat(value);
  else lng.value = clampLng(value);
}

onMounted(async () => {
  const L = await import('leaflet');
  await import('leaflet/dist/leaflet.css');

  // Fix default marker icon paths broken by bundlers
  delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)
    ._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });

  const isDefault = lat.value === 0 && lng.value === 0;
  const initialLat = clampLat(lat.value);
  const initialLng = clampLng(lng.value);
  map = L.map(mapEl.value!, {
    zoomControl: true,
    maxBounds: L.latLngBounds([-90, -180], [90, 180]),
    maxBoundsViscosity: 1.0,
    minZoom: 2,
  }).setView([initialLat, initialLng], isDefault ? 2 : 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    noWrap: true,
  }).addTo(map);

  marker = L.marker([initialLat, initialLng], {
    draggable: !props.readonly,
  }).addTo(map);

  if (!props.readonly) registerEditHandlers(L);

  resizeObserver = new ResizeObserver(() => {
    map?.invalidateSize();
  });
  resizeObserver.observe(mapEl.value!);
});

function registerEditHandlers(L: typeof import('leaflet')) {
  marker!.on('dragend', () => {
    const pos = marker!.getLatLng();
    updateCoordinate('lat', pos.lat);
    updateCoordinate('lng', pos.lng);
  });

  map!.on('click', async e => {
    const clampedLatLng = L.latLng(
      clampLat(e.latlng.lat),
      clampLng(e.latlng.lng),
    );
    marker!.setLatLng(clampedLatLng);
    updateCoordinate('lat', clampedLatLng.lat);
    updateCoordinate('lng', clampedLatLng.lng);
  });
}

onUnmounted(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  map?.remove();
  map = null;
  marker = null;
});

watch([lat, lng], ([newLat, newLng]) => {
  const clampedLat = clampLat(newLat);
  const clampedLng = clampLng(newLng);
  marker?.setLatLng([clampedLat, clampedLng]);
  map?.setView([clampedLat, clampedLng], map.getZoom());
});
</script>

<template>
  <div
    ref="mapEl"
    class="w-full h-64 rounded-lg overflow-hidden border border-surface-200 dark:border-surface-700"
  />
</template>
