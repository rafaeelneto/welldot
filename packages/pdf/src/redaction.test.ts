import type { Well, WellVisibility } from '@welldot/core';
import { redactWell } from '@welldot/core';
import { describe, expect, it } from 'vitest';
import { buildDocDefinition } from './buildDocDefinition';
import { baseWell, keyLabels, makeTestContext } from './test-utils';

// The PDF has no visibility logic of its own: callers pass a `redactWell`
// result and every builder skips what is empty. These tests pin that
// contract for each redactable part of a well.

function fullWell(): Well {
  return baseWell({
    name: 'Marker Well',
    well_driller: 'Marker Driller',
    location: { lat: -1.5, lng: -48.5, elevation: 12 },
    obs: 'Marker observation',
    bore_hole: [{ from: 0, to: 50, diameter: 250 }],
    well_case: [{ from: 0, to: 40, diameter: 150, type: 'pvc' }],
    well_screen: [
      { from: 40, to: 50, diameter: 150, type: 'pvc', screen_slot_mm: 0.75 },
    ],
    lithology: [
      {
        from: 0,
        to: 50,
        description: 'Marker sand',
        color: '#ffcc00',
        fgdc_texture: '607',
        geologic_unit: 'Marker unit',
        aquifer_unit: '',
      },
    ],
    hydrodynamic_events: [
      {
        id: 'ev1',
        type: 'constant_rate',
        datetime: '2024-05-01T10:00:00-03:00',
        static_level: 12.5,
        operator: 'Marker Operator',
        steps: [{ rate: 8, readings: [{ elapsed: 60, depth: 15.2 }] }],
      },
    ],
    history_logs: [
      {
        id: 'h1',
        datetime: '2024-05-01T10:00:00-03:00',
        category: 'inspection',
        description: 'Marker inspection',
      },
    ],
    pump_installations: [
      {
        id: 'p1',
        installed_at: '2024-01-01T10:00:00-03:00',
        type: 'submersible',
        manufacturer: 'MarkerPump',
      },
    ],
    meters: [
      {
        id: 'm1',
        installed_at: '2024-01-01T10:00:00-03:00',
        type: 'electromagnetic',
        serial: 'MARKER-SN',
      },
    ],
    operating_regime: [
      {
        id: 'r1',
        effective_from: '2024-01-01T00:00:00-03:00',
        flow_rate: 12,
        notes: 'Marker regime',
      },
    ],
    production: [
      {
        id: 'e1',
        type: 'meter_reading',
        datetime: '2024-01-01T00:00:00-03:00',
        meter_id: 'm1',
        reading: 100,
      },
      {
        id: 'e2',
        type: 'meter_reading',
        datetime: '2024-06-01T00:00:00-03:00',
        meter_id: 'm1',
        reading: 900,
      },
    ],
    permits: [
      {
        id: 'o1',
        type: 'abstraction_permit',
        authority: 'MARKER-AUTH',
        identifier: '1234/2025',
        issued_at: '2025-02-10',
        valid_until: '2029-02-10',
      },
    ],
    water_samples: [
      {
        id: 's1',
        datetime: '2024-03-10T09:00:00-03:00',
        sample_type: 'routine',
        campaign: 'MARKER-CAMPAIGN',
        results: [],
      },
    ],
  } as unknown as Partial<Well>);
}

/** Serialized PDF content for the well with `visibility` applied. */
function render(visibility: WellVisibility = {}): string {
  const well = redactWell(fullWell(), visibility);
  const doc = buildDocDefinition(
    well,
    [],
    null,
    makeTestContext({ metadataPosition: 'before' }, keyLabels),
  );
  return JSON.stringify(doc.content);
}

/** What each redactable part leaves in the PDF (keys are label paths, since `keyLabels` echoes them). */
const MARKERS: Record<string, string> = {
  identification: 'Marker Driller',
  location: 'general.coordinates',
  obs: 'Marker observation',
  bore_hole: 'construction.boreHole.title',
  well_case: 'construction.wellCase.title',
  well_screen: 'construction.wellScreen.title',
  hydrodynamic_events: 'hydrodynamicEvents.title',
  history: 'historyLog.logs.title',
  pump_installations: 'operation.pump.title',
  meters: 'operation.meter.title',
  operating_regime: 'operation.regime.title',
  production: 'operation.production.title',
  permits: 'operation.permit.title',
  water_quality: 'MARKER-CAMPAIGN',
};

describe('PDF output follows redactWell visibility', () => {
  it('renders every marker when nothing is hidden', () => {
    const content = render();
    for (const marker of Object.values(MARKERS)) {
      expect(content).toContain(marker);
    }
  });

  for (const [key, marker] of Object.entries(MARKERS)) {
    it(`drops only "${key}" when it is hidden`, () => {
      const content = render({ [key]: false });
      expect(content).not.toContain(marker);
      for (const [other, otherMarker] of Object.entries(MARKERS)) {
        if (other !== key) expect(content).toContain(otherMarker);
      }
    });
  }

  it('drops every operation part when the whole section is hidden', () => {
    const content = render({ operation: false });
    for (const key of [
      'pump_installations',
      'meters',
      'operating_regime',
      'production',
      'permits',
    ]) {
      expect(content).not.toContain(MARKERS[key]);
    }
    expect(content).toContain(MARKERS.history);
  });

  it('keeps production but falls back to the raw meter id when meters are hidden', () => {
    const content = render({ meters: false });
    expect(content).toContain(MARKERS.production);
    expect(content).not.toContain('MARKER-SN');
    expect(content).toContain('m1');
  });
});
