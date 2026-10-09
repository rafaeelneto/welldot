import { mount } from '@vue/test-utils';
import InputNumber from 'primevue/inputnumber';
import SelectButton from 'primevue/selectbutton';
import { describe, expect, it } from 'vitest';
import type { WelldotConfig } from '../config';
import { welldotGlobal } from '../test/mountOptions';
import WellLocationPicker from './WellLocationPicker.vue';

type Props = InstanceType<typeof WellLocationPicker>['$props'];

function setup(props: Partial<Props> = {}, config: WelldotConfig = {}) {
  const wrapper = mount(WellLocationPicker, {
    props: { lat: -1.5, lng: -48.5, ...props } as Props,
    global: {
      ...welldotGlobal(config),
      // The map is covered by its own test; keep leaflet out of here.
      stubs: { WellLocationMap: true },
    },
  });
  const inputs = () => wrapper.findAll('input[type="text"]');
  return {
    wrapper,
    latText: () => (inputs()[0]!.element as HTMLInputElement).value,
    lngText: () => (inputs()[1]!.element as HTMLInputElement).value,
    toggle: async (label: 'DD' | 'DMS') => {
      const button = wrapper
        .findAll('button')
        .find(b => b.text().trim() === label);
      await button!.trigger('click');
    },
  };
}

const DMS_LAT = `1°30'0.00"S`;
const DD_LAT = '-1.500000';

describe('WellLocationPicker format', () => {
  it('lets a bound v-model:format win over the configuration', async () => {
    const { wrapper, latText, lngText, toggle } = setup(
      { format: 'DMS', 'onUpdate:format': () => {} },
      { coordinateFormat: 'DD' },
    );
    expect(latText()).toBe(DMS_LAT);
    expect(lngText()).toBe(`48°30'0.00"W`);
    expect(wrapper.findComponent(SelectButton).props('modelValue')).toBe('DMS');

    // The parent owns the value: toggling only emits until it updates.
    await toggle('DD');
    expect(wrapper.emitted('update:format')).toEqual([['DD']]);
    expect(latText()).toBe(DMS_LAT);
    await wrapper.setProps({ format: 'DD' });
    expect(latText()).toBe(DD_LAT);
  });

  it('falls back to config.coordinateFormat when unbound', () => {
    expect(setup({}, { coordinateFormat: 'DMS' }).latText()).toBe(DMS_LAT);
    expect(setup({}, { coordinateFormat: 'DD' }).latText()).toBe(DD_LAT);
    expect(setup().latText()).toBe(DD_LAT);
  });

  it('keeps a toggle as local state when unbound', async () => {
    const { wrapper, latText, toggle } = setup({}, { coordinateFormat: 'DD' });
    await toggle('DMS');
    expect(latText()).toBe(DMS_LAT);
    expect(wrapper.findComponent(SelectButton).props('modelValue')).toBe('DMS');
    expect(wrapper.emitted('update:format')).toEqual([['DMS']]);

    await toggle('DD');
    expect(latText()).toBe(DD_LAT);
  });

  it('cannot deselect the active format', async () => {
    const { wrapper, latText, toggle } = setup({}, { coordinateFormat: 'DMS' });
    await toggle('DMS');
    expect(latText()).toBe(DMS_LAT);
    expect(wrapper.emitted('update:format')).toBeUndefined();
  });

  it('offers the locale-independent DD/DMS options', () => {
    const { wrapper } = setup({}, { locale: 'pt' });
    const labels = wrapper.findAll('button').map(b => b.text().trim());
    expect(labels).toEqual(['DD', 'DMS']);
  });
});

describe('WellLocationPicker coordinates', () => {
  it('emits parsed, clamped coordinates', async () => {
    const { wrapper } = setup();
    const [lat, lng] = wrapper.findAll('input[type="text"]');
    await lat!.setValue('91');
    await lat!.trigger('blur');
    await lng!.setValue(`48°15'0"W`);
    await lng!.trigger('keydown', { key: 'Enter' });
    expect(wrapper.emitted('update:lat')).toEqual([[90]]);
    expect(wrapper.emitted('update:lng')).toEqual([[-48.25]]);
  });
});

describe('WellLocationPicker labels', () => {
  const labels = {
    coordinates: 'Coordinate Format',
    latitude: { en: 'Latitude', pt: 'Latitude' },
    longitude: 'Longitude',
    elevation: { en: 'Elevation', pt: 'Elevação' },
    hint: { en: 'Click the map or drag the pin', pt: 'Clique no mapa' },
  };

  function labelTexts(wrapper: ReturnType<typeof setup>['wrapper']) {
    return wrapper.findAll('label').map(l => l.text());
  }

  it('renders the labels and appends the length unit to elevation', () => {
    const { wrapper } = setup({ labels });
    expect(labelTexts(wrapper)).toEqual([
      'Coordinate Format',
      'Latitude',
      'Longitude',
      'Elevation (m)',
    ]);
    expect(wrapper.text()).toContain('Click the map or drag the pin');
  });

  it('switches the elevation suffix to ft and resolves the locale', () => {
    const { wrapper } = setup(
      { labels },
      { units: { length: 'ft' }, locale: 'pt' },
    );
    expect(labelTexts(wrapper)).toContain('Elevação (ft)');
    expect(wrapper.text()).toContain('Clique no mapa');
  });

  it('shows elevation in the configured unit', () => {
    const { wrapper } = setup(
      { elevation: 10, labels },
      { units: { length: 'ft' } },
    );
    expect(
      wrapper.findComponent(InputNumber).props('modelValue') as number,
    ).toBeCloseTo(32.8084, 4);
  });

  it('renders no text for omitted labels', () => {
    const { wrapper } = setup();
    expect(wrapper.findAll('label')).toHaveLength(0);
    expect(wrapper.find('span.uppercase').exists()).toBe(false);
  });

  it('hides elevation when showElevation is false', () => {
    const { wrapper } = setup({ labels, showElevation: false });
    expect(wrapper.findComponent(InputNumber).exists()).toBe(false);
    expect(labelTexts(wrapper)).not.toContain('Elevation (m)');
  });

  it('wires the map to lat/lng', () => {
    const { wrapper } = setup({ lat: 3, lng: 4 });
    const map = wrapper.findComponent({ name: 'WellLocationMap' });
    expect(map.props('lat')).toBe(3);
    expect(map.props('lng')).toBe(4);
  });
});
