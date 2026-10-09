import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import WellLocationMap from './WellLocationMap.vue';

const leaflet = vi.hoisted(() => {
  const map = {
    setView: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    remove: vi.fn(),
    invalidateSize: vi.fn(),
    getZoom: vi.fn(() => 13),
  };
  map.setView.mockImplementation(() => map);
  const icon = document.createElement('div');
  const marker = {
    addTo: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    setLatLng: vi.fn(),
    getLatLng: vi.fn(),
    getElement: vi.fn(() => icon),
    dragging: { enable: vi.fn(), disable: vi.fn() },
    options: {} as { draggable?: boolean },
  };
  marker.addTo.mockImplementation(() => marker);
  const L = {
    map: vi.fn(() => map),
    latLngBounds: vi.fn((a: unknown, b: unknown) => ({ bounds: [a, b] })),
    latLng: vi.fn((lat: number, lng: number) => ({ lat, lng })),
    tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
    divIcon: vi.fn((options: Record<string, unknown>) => ({
      kind: 'divIcon',
      options,
    })),
    marker: vi.fn(() => marker),
  };
  return { L, map, marker, icon };
});

// Leaflet is UMD: bundlers expose it as both `default` and named exports.
vi.mock('leaflet', () => ({ ...leaflet.L, default: leaflet.L }));
vi.mock('leaflet/dist/leaflet.css', () => ({}));

const observer = { observe: vi.fn(), disconnect: vi.fn() };

beforeEach(() => {
  vi.clearAllMocks();
  leaflet.marker.options = {};
  leaflet.icon.style.cursor = '';
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = observer.observe;
      disconnect = observer.disconnect;
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

type Props = InstanceType<typeof WellLocationMap>['$props'];

async function mountMap(props: Props) {
  const wrapper = mount(WellLocationMap, { props, attachTo: document.body });
  await vi.waitFor(() => expect(leaflet.L.marker).toHaveBeenCalled());
  return wrapper;
}

function handler(target: { on: ReturnType<typeof vi.fn> }, event: string) {
  const call = target.on.mock.calls.find(([name]) => name === event);
  return call?.[1] as ((e?: unknown) => void) | undefined;
}

describe('WellLocationMap', () => {
  it('draws the pin as an SVG divIcon anchored at its tip', async () => {
    const wrapper = await mountMap({ lat: -23.5, lng: -48.5 });
    expect(leaflet.L.divIcon).toHaveBeenCalledTimes(1);
    const options = leaflet.L.divIcon.mock.calls[0]![0];
    expect(options.className).toBe('well-location-marker');
    expect(options.html).toContain('<svg');
    expect(options.iconSize).toEqual([28, 42]);
    expect(options.iconAnchor).toEqual([14, 41]);

    const [latLng, markerOptions] = leaflet.L.marker.mock
      .calls[0] as unknown as [unknown, { icon: unknown; draggable: boolean }];
    expect(latLng).toEqual([-23.5, -48.5]);
    expect(markerOptions.icon).toBe(leaflet.L.divIcon.mock.results[0]!.value);
    expect(markerOptions.draggable).toBe(true);
    wrapper.unmount();
  });

  it('zooms out to the world for 0,0 and in to 13 otherwise', async () => {
    const world = await mountMap({ lat: 0, lng: 0 });
    expect(leaflet.map.setView).toHaveBeenLastCalledWith([0, 0], 2);
    world.unmount();

    vi.clearAllMocks();
    const local = await mountMap({ lat: 10, lng: 20 });
    expect(leaflet.map.setView).toHaveBeenLastCalledWith([10, 20], 13);
    local.unmount();
  });

  it('uses OpenStreetMap tiles by default and accepts a custom layer', async () => {
    const osm = await mountMap({ lat: 1, lng: 2 });
    expect(leaflet.L.tileLayer.mock.calls[0]).toEqual([
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      expect.objectContaining({
        attribution: expect.stringContaining('OpenStreetMap'),
      }),
    ]);
    osm.unmount();

    vi.clearAllMocks();
    const custom = await mountMap({
      lat: 1,
      lng: 2,
      tileUrl: 'https://tiles.example/{z}/{x}/{y}.png',
      attribution: 'Example',
    });
    expect(leaflet.L.tileLayer.mock.calls[0]).toEqual([
      'https://tiles.example/{z}/{x}/{y}.png',
      expect.objectContaining({ attribution: 'Example' }),
    ]);
    custom.unmount();
  });

  it('moves the pin on click, clamped, and emits both coordinates', async () => {
    const wrapper = await mountMap({ lat: 0, lng: 0 });
    const onClick = handler(leaflet.map, 'click');
    expect(onClick).toBeTypeOf('function');

    onClick!({ latlng: { lat: 95, lng: -200 } });
    expect(leaflet.marker.setLatLng).toHaveBeenCalledWith({
      lat: 90,
      lng: -180,
    });
    expect(wrapper.emitted('update:lat')).toEqual([[90]]);
    expect(wrapper.emitted('update:lng')).toEqual([[-180]]);
    wrapper.unmount();
  });

  it('emits the dragged pin position', async () => {
    const wrapper = await mountMap({ lat: 0, lng: 0 });
    leaflet.marker.getLatLng.mockReturnValue({ lat: -10.5, lng: 30.25 });
    handler(leaflet.marker, 'dragend')!();
    expect(wrapper.emitted('update:lat')).toEqual([[-10.5]]);
    expect(wrapper.emitted('update:lng')).toEqual([[30.25]]);
    wrapper.unmount();
  });

  it('registers no click or drag handlers when readonly', async () => {
    const wrapper = await mountMap({ lat: 1, lng: 2, readonly: true });
    expect(leaflet.map.on).not.toHaveBeenCalledWith('click', expect.anything());
    expect(leaflet.marker.on).not.toHaveBeenCalled();
    const markerOptions = leaflet.L.marker.mock.calls[0] as unknown as [
      unknown,
      { draggable: boolean },
    ];
    expect(markerOptions[1].draggable).toBe(false);
    expect(leaflet.marker.dragging.disable).toHaveBeenCalled();
    expect(leaflet.icon.style.cursor).toBe('default');
    wrapper.unmount();
  });

  it('follows readonly changes after mount', async () => {
    const wrapper = await mountMap({ lat: 1, lng: 2 });
    const onClick = handler(leaflet.map, 'click');
    expect(onClick).toBeTypeOf('function');
    expect(leaflet.marker.dragging.enable).toHaveBeenCalled();
    expect(leaflet.marker.options.draggable).toBe(true);
    expect(leaflet.icon.style.cursor).toBe('');

    vi.clearAllMocks();
    await wrapper.setProps({ readonly: true });
    expect(leaflet.marker.dragging.disable).toHaveBeenCalled();
    expect(leaflet.marker.options.draggable).toBe(false);
    expect(leaflet.map.off).toHaveBeenCalledWith('click', onClick);
    expect(leaflet.marker.off).toHaveBeenCalledWith(
      'dragend',
      expect.any(Function),
    );
    expect(leaflet.map.on).not.toHaveBeenCalled();
    expect(leaflet.marker.on).not.toHaveBeenCalled();
    expect(leaflet.icon.style.cursor).toBe('default');

    vi.clearAllMocks();
    await wrapper.setProps({ readonly: false });
    expect(leaflet.marker.dragging.enable).toHaveBeenCalled();
    expect(leaflet.marker.options.draggable).toBe(true);
    expect(leaflet.icon.style.cursor).toBe('');
    const again = handler(leaflet.map, 'click');
    expect(again).toBeTypeOf('function');
    again!({ latlng: { lat: 5, lng: 6 } });
    expect(wrapper.emitted('update:lat')).toEqual([[5]]);
    leaflet.marker.getLatLng.mockReturnValue({ lat: 7, lng: 8 });
    handler(leaflet.marker, 'dragend')!();
    expect(wrapper.emitted('update:lat')).toEqual([[5], [7]]);
    wrapper.unmount();
  });

  it('follows external coordinate changes', async () => {
    const wrapper = await mountMap({ lat: 1, lng: 2 });
    await wrapper.setProps({ lat: 100, lng: 3 });
    expect(leaflet.marker.setLatLng).toHaveBeenLastCalledWith([90, 3]);
    expect(leaflet.map.setView).toHaveBeenLastCalledWith([90, 3], 13);
    wrapper.unmount();
  });

  it('observes resizes and cleans up on unmount', async () => {
    const wrapper = await mountMap({ lat: 1, lng: 2 });
    expect(observer.observe).toHaveBeenCalledWith(wrapper.element);
    wrapper.unmount();
    expect(observer.disconnect).toHaveBeenCalled();
    expect(leaflet.map.remove).toHaveBeenCalled();
  });

  it('applies the height and passes class through', async () => {
    const wrapper = await mountMap({
      lat: 1,
      lng: 2,
      height: '20rem',
      // @ts-expect-error -- fallthrough attr
      class: 'my-map',
    });
    const el = wrapper.element as HTMLElement;
    expect(el.style.height).toBe('20rem');
    expect(el.classList).toContain('my-map');
    expect(el.classList).toContain('well-location-map');
    wrapper.unmount();
  });

  it('renders an empty div on the server without loading leaflet', async () => {
    const html = await renderToString(
      createSSRApp({ render: () => h(WellLocationMap, { lat: 1, lng: 2 }) }),
    );
    expect(html).toMatch(
      /^<div[^>]*class="well-location-map[^"]*"[^>]*><\/div>$/,
    );
    expect(leaflet.L.map).not.toHaveBeenCalled();
  });
});
