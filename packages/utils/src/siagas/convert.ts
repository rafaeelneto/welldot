import type {
  AquiferAnalysis,
  Attachment,
  BoreHole,
  Fracture,
  HistoryLogEntry,
  HoleFill,
  HydrodynamicEvent,
  Lithology,
  WaterQualityResult,
  WaterSample,
  Well,
  WellCase,
  WellScreen,
} from '@welldot/core';
import {
  WELL_FORMAT_VERSION,
  dmsToDecimalDegrees,
  inchesToMm,
} from '@welldot/core';
import { parseInches, type SiagasRecord } from './parse';
import { monthlyRimasReadings, type RimasPage } from './rimas';
import {
  mapAnnulus,
  mapDrillingMethod,
  mapLithology,
  mapNature,
  mapParameter,
  mapPipeMaterial,
  mapSlotType,
  mapStatus,
  mapWaterUse,
  norm,
  slug,
  utcOffset,
} from './vocab';
import { siagasWarning, type SiagasWarning } from './warnings';

/** SIAGAS detail page of a well. */
export const SIAGAS_PAGE_URL =
  'https://siagasweb.sgb.gov.br/layout/detalhe.php?ponto=';

/** How much of the RIMAS level series to import. */
export type RimasMode = 'none' | 'monthly' | 'all';

export interface SiagasToWellOptions {
  /** The RIMAS page of the well, when it was read. */
  rimas?: RimasPage;
  /** Level series to keep (default `monthly`). */
  rimasMode?: RimasMode;
  /** Import the RIMAS photos and documents as attachments (default true). */
  media?: boolean;
  /** When the page was read (RFC 3339); goes to `x-siagas.fetched_at`. */
  fetchedAt?: string;
}

export interface SiagasConversion {
  well: Well;
  warnings: SiagasWarning[];
}

type Interval = { from: number; to: number };

const round = (value: number, digits = 4) => {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
};

const fmtInterval = (i: { from?: number; to?: number }) =>
  `${i.from ?? '?'}–${i.to ?? '?'} m`;

/** True when `from`/`to` are numbers with `to > from`. */
function isInterval<T extends { from?: number; to?: number }>(
  row: T,
): row is T & Interval {
  return row.from !== undefined && row.to !== undefined && row.to > row.from;
}

/** Drops exact repeated rows. */
function dedupe<T>(rows: T[]): { rows: T[]; removed: number } {
  const seen = new Set<string>();
  const out = rows.filter(row => {
    const key = JSON.stringify(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { rows: out, removed: rows.length - out.length };
}

/** Pairs of overlapping intervals, as text. */
function overlaps(rows: Interval[]): string[] {
  const sorted = [...rows].sort((a, b) => a.from - b.from || a.to - b.to);
  const out: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      if (sorted[j].from >= sorted[i].to) break;
      out.push(`${fmtInterval(sorted[i])} × ${fmtInterval(sorted[j])}`);
    }
  }
  return out;
}

/** Diameter in mm: the mm column when positive, else the nominal inches. */
function diameterMm(row: { mm?: number; inches?: string }) {
  if (row.mm !== undefined && row.mm > 0) return round(row.mm, 2);
  const inches = parseInches(row.inches);
  return inches !== undefined && inches > 0
    ? round(inchesToMm(inches), 1)
    : undefined;
}

/** `GGMMSS` → decimal degrees (unsigned); `undefined` when not that shape. */
function ggmmss(value: string | undefined): number | undefined {
  const digits = (value ?? '').replace(/\D/g, '');
  if (digits.length < 5 || /^0+$/.test(digits)) return undefined;
  const degrees = Number(digits.slice(0, -4));
  const minutes = Number(digits.slice(-4, -2));
  const seconds = Number(digits.slice(-2));
  if (minutes >= 60 || seconds >= 60) return undefined;
  return dmsToDecimalDegrees({ degrees, minutes, seconds, direction: 'N' });
}

const MEDIA_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  txt: 'text/plain',
  zip: 'application/zip',
};

/** Converts a parsed SIAGAS record (and optionally its RIMAS page) to a well. */
export function siagasToWell(
  record: SiagasRecord,
  options: SiagasToWellOptions = {},
): SiagasConversion {
  const warnings: SiagasWarning[] = [];
  const warn = (...args: Parameters<typeof siagasWarning>) =>
    warnings.push(siagasWarning(...args));
  const offset = utcOffset(record.uf);
  const instant = (date: string) => `${date}T00:00:00${offset}`;
  const g = record.general;

  // ─── Identity ──────────────────────────────────────────────────────────────
  const nature = mapNature(g.nature);
  if (g.nature && !nature) {
    warn('dropped_value', { field: 'Natureza do Ponto', value: g.nature });
  }
  const purposes = new Set<string>();
  if (nature?.purpose) purposes.add(nature.purpose);
  const use = mapWaterUse(g.water_use);
  if (use) purposes.add(use);
  if (g.water_use && use === undefined) {
    warn('dropped_value', { field: 'Uso da Água', value: g.water_use });
  }

  const drilling = record.drilling[0] ?? {};
  const driller =
    drilling.driller && !/sem informa/.test(norm(drilling.driller))
      ? drilling.driller
      : undefined;

  // ─── Location ──────────────────────────────────────────────────────────────
  let location: Well['location'];
  const lat = ggmmss(g.latitude);
  const lng = ggmmss(g.longitude);
  if (lat === undefined || lng === undefined) {
    warn('missing_coordinates', undefined, 'location');
  } else {
    const north = g.utm_north !== undefined && g.utm_north < 5_000_000;
    if (g.utm_north === undefined)
      warn('hemisphere_assumed', undefined, 'location');
    const latitude = north ? lat : -lat;
    const longitude = -lng;
    const zone = Math.floor((longitude + 180) / 6) + 1;
    const hasElevation = g.elevation !== undefined && g.elevation !== 0;
    if (g.elevation === 0)
      warn('elevation_zero', undefined, 'location.elevation');
    location = {
      lat: round(latitude, 5),
      lng: round(longitude, 5),
      ...(hasElevation && { elevation: g.elevation }),
      properties: {
        crs: 'EPSG:4326',
        lat_precision: 0.0003,
        lng_precision: 0.0003,
        ...(hasElevation && { elevation_datum: 'x-imbituba' }),
        original_crs: `EPSG:${(north ? 31954 : 31960) + zone}`,
      },
    };
  }

  // ─── Depth ─────────────────────────────────────────────────────────────────
  const usefulDepth = [...record.useful_depth]
    .reverse()
    .find(u => u.depth !== undefined && u.depth > 0)?.depth;
  const drilledDepth = Math.max(0, ...record.drilling.map(d => d.to ?? 0));
  const wellDepth =
    usefulDepth ?? (drilledDepth > 0 ? drilledDepth : undefined);
  if (wellDepth === undefined) warn('no_depth', undefined, 'well_depth');

  // ─── Shared row checks ─────────────────────────────────────────────────────
  function clean<T extends { from?: number; to?: number }>(
    rows: T[],
    sectionKey: string,
  ): (T & Interval)[] {
    const { rows: unique, removed } = dedupe(rows);
    if (removed)
      warn(
        'duplicate_rows',
        { section: sectionKey, count: removed },
        sectionKey,
      );
    const invalid = unique.filter(r => !isInterval(r));
    if (invalid.length) {
      warn(
        'invalid_interval',
        { section: sectionKey, intervals: invalid.map(fmtInterval).join(', ') },
        sectionKey,
      );
    }
    return unique.filter(isInterval);
  }

  function warnOverlaps(rows: Interval[], sectionKey: string) {
    const found = overlaps(rows);
    if (found.length) {
      warn(
        'overlapping_intervals',
        { section: sectionKey, intervals: found.join('; ') },
        sectionKey,
      );
    }
  }

  function noteMaterial(
    field: string,
    value: string | undefined,
    mapped: unknown,
  ) {
    if (value && mapped === undefined) warn('unmapped_value', { field, value });
  }

  // ─── Construction ──────────────────────────────────────────────────────────
  const method = mapDrillingMethod(drilling.method);
  noteMaterial('Método de perfuração', drilling.method, method);
  const drillingMethod = method ?? drilling.method;

  const boreRows = clean(record.diameters, 'bore_hole');
  const boreNoDiameter = boreRows.filter(r => diameterMm(r) === undefined);
  if (boreNoDiameter.length) {
    warn(
      'missing_diameter',
      {
        section: 'bore_hole',
        intervals: boreNoDiameter.map(fmtInterval).join(', '),
      },
      'bore_hole',
    );
  }
  const bore_hole: BoreHole[] = boreRows
    .filter(r => diameterMm(r) !== undefined)
    .map(r => ({
      from: r.from,
      to: r.to,
      diameter: diameterMm(r)!,
      ...(drillingMethod && { drilling_method: drillingMethod }),
    }));
  if (!bore_hole.length) warn('no_bore_hole', undefined, 'bore_hole');
  warnOverlaps(bore_hole, 'bore_hole');

  const pipe = <
    T extends { material?: string; mm?: number; inches?: string } & Interval,
  >(
    rows: T[],
    sectionKey: string,
  ) => {
    const missing = rows.filter(r => diameterMm(r) === undefined);
    if (missing.length) {
      warn(
        'missing_diameter',
        { section: sectionKey, intervals: missing.map(fmtInterval).join(', ') },
        sectionKey,
      );
    }
    return rows.filter(r => diameterMm(r) !== undefined);
  };
  const materialOf = (value: string | undefined) => {
    const mapped = mapPipeMaterial(value);
    noteMaterial('Material', value, mapped);
    return mapped ?? value ?? '';
  };

  const well_case: WellCase[] = pipe(
    clean(record.casings, 'well_case'),
    'well_case',
  ).map(r => ({
    from: r.from,
    to: r.to,
    type: materialOf(r.material),
    diameter: diameterMm(r)!,
  }));

  const slotMissing: string[] = [];
  const well_screen: WellScreen[] = pipe(
    clean(record.screens, 'well_screen'),
    'well_screen',
  ).map(r => {
    const slotType = mapSlotType(r.material);
    if (!(r.slot !== undefined && r.slot > 0)) slotMissing.push(fmtInterval(r));
    return {
      from: r.from,
      to: r.to,
      type: materialOf(r.material),
      diameter: diameterMm(r)!,
      screen_slot: r.slot !== undefined && r.slot > 0 ? r.slot : 0,
      ...(slotType && { slot_type: slotType }),
    };
  });
  if (slotMissing.length)
    warn(
      'screen_slot_missing',
      { intervals: slotMissing.join(', ') },
      'well_screen',
    );
  warnOverlaps([...well_case, ...well_screen], 'pipes');

  // Stick-up: the latest wellhead height goes to the casing at the surface.
  const wellhead = [...record.wellhead]
    .filter(w => w.height !== undefined && w.height > 0)
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
    .pop();
  if (wellhead?.height) {
    const surface = [...well_case, ...well_screen]
      .filter(p => p.from === 0)
      .sort((a, b) => b.to - a.to)[0];
    if (surface) surface.from = -wellhead.height;
    else warn('stick_up_not_applied', { height: wellhead.height }, 'well_case');
  }

  const annulus = clean(record.annulus, 'hole_fill');
  const fillNoDiameter: string[] = [];
  const hole_fill: HoleFill[] = annulus.map(r => {
    const type = mapAnnulus(r.material);
    noteMaterial('Espaço Anular', r.material, type);
    const covering = bore_hole.filter(b => b.from < r.to && b.to > r.from);
    const diameter = covering.length
      ? Math.max(...covering.map(b => b.diameter))
      : 0;
    if (!covering.length) fillNoDiameter.push(fmtInterval(r));
    return {
      from: r.from,
      to: r.to,
      type: type ?? 'gravel_pack',
      diameter,
      description: r.material ?? '',
    };
  });
  if (fillNoDiameter.length) {
    warn(
      'hole_fill_no_diameter',
      { intervals: fillNoDiameter.join(', ') },
      'hole_fill',
    );
  }
  warnOverlaps(hole_fill, 'hole_fill');

  const fractures: Fracture[] = [...new Set(record.water_entries)]
    .sort((a, b) => a - b)
    .map(depth => ({
      depth,
      water_intake: true,
      description: "Entrada d'água (SIAGAS)",
      swarm: false,
      azimuth: 0,
      dip: 0,
    }));

  // ─── Geology ───────────────────────────────────────────────────────────────
  const formations = record.formations.filter(isInterval);
  const aquifers = record.aquifers.filter(a => a.type);
  const aquiferAt = (depth: number) =>
    aquifers.find(
      a =>
        a.top !== undefined &&
        a.base !== undefined &&
        a.base > 0 &&
        depth >= a.top &&
        depth <= a.base,
    ) ??
    (aquifers.length === 1 && !(aquifers[0].base! > 0)
      ? aquifers[0]
      : undefined);

  const mismatches: string[] = [];
  const unmappedLithology = new Set<string>();
  const lithology: Lithology[] = clean(record.lithology, 'lithology').map(r => {
    const mid = (r.from + r.to) / 2;
    const style = mapLithology(r.lithology);
    if (r.lithology && !style) unmappedLithology.add(r.lithology);
    // The descriptions abbreviate (`AREN.ARGIL.`), so only the first four
    // letters of the lithology's main word are looked for.
    if (r.lithology && r.description && !/^idem\b/.test(norm(r.description))) {
      const stem = norm(r.lithology).split(/\s+/)[0].slice(0, 4);
      if (stem.length === 4 && !norm(r.description).includes(stem)) {
        mismatches.push(`${fmtInterval(r)} (${r.lithology})`);
      }
    }
    const aquifer = aquiferAt(mid);
    return {
      from: r.from,
      to: r.to,
      description: r.description ?? r.lithology ?? '',
      color: style?.color ?? '#c8c2b4',
      texture: style
        ? { code: style.code, vocabulary: 'fgdc' }
        : { code: slug(r.lithology ?? 'unknown'), vocabulary: 'x-siagas' },
      geologic_unit:
        formations.find(f => mid >= f.from && mid <= f.to)?.name ?? '',
      aquifer_unit: aquifer?.type ?? '',
    };
  });
  for (const value of unmappedLithology)
    warn('unmapped_lithology', { value }, 'lithology');
  if (mismatches.length)
    warn(
      'lithology_mismatch',
      { intervals: mismatches.join('; ') },
      'lithology',
    );
  warnOverlaps(lithology, 'lithology');

  for (const a of aquifers) {
    if (
      a.base &&
      wellDepth &&
      Math.abs(a.base - wellDepth) > 0.5 &&
      a.base > wellDepth
    ) {
      warn('aquifer_base_mismatch', { base: a.base, depth: wellDepth });
    }
  }

  // ─── Pumping test ──────────────────────────────────────────────────────────
  const constructionDate = drilling.date ?? g.installation_date;
  const hydrodynamic_events: HydrodynamicEvent[] = [];
  const aquifer_analysis: AquiferAnalysis[] = [];
  const t = record.test;
  const positive = (v: number | undefined) =>
    v !== undefined && v > 0 ? v : undefined;
  const flowRate = positive(t.flow_rate);
  const dynamicLevel = positive(t.dynamic_level);
  const transmissivity = positive(t.transmissivity);
  const hasTest =
    flowRate !== undefined ||
    dynamicLevel !== undefined ||
    transmissivity !== undefined ||
    (t.static_level !== undefined && t.static_level !== 0);

  if (hasTest) {
    for (const [field, value] of [
      ['Vazão', t.flow_rate],
      ['Nível dinâmico', t.dynamic_level],
      ['Transmissividade', t.transmissivity],
    ] as const) {
      if (value !== undefined && value < 0)
        warn('negative_value', { field, value });
    }
    let staticLevel = t.static_level;
    const flowing = norm(t.flowing ?? '') === 's';
    if (staticLevel === 0)
      warn('static_level_zero', undefined, 'hydrodynamic_events');
    if (staticLevel !== undefined && flowing && staticLevel > 0)
      staticLevel = -staticLevel;
    if (staticLevel !== undefined && staticLevel < 0 && !flowing) {
      warn('flowing_without_flag', undefined, 'hydrodynamic_events');
    }

    const date = t.date ?? constructionDate;
    if (!t.date && date)
      warn('test_date_from_construction', undefined, 'hydrodynamic_events');
    if (!date) {
      warn('test_without_date', undefined, 'hydrodynamic_events');
    } else {
      const notes = [
        t.test_type && `Tipo do teste: ${t.test_type}`,
        t.method && `Método: ${t.method}`,
        t.equipment && `Equipamento: ${t.equipment}`,
        positive(t.free_flow_rate) && `Vazão livre: ${t.free_flow_rate} m³/h`,
        'Teste registrado no SIAGAS com nível estático, nível final e vazão; sem leituras intermediárias.',
      ].filter(Boolean);
      const duration = positive(t.duration);
      hydrodynamic_events.push({
        id: 'siagas-test',
        type: 'constant_rate',
        datetime: instant(date),
        ...(staticLevel !== undefined && { static_level: staticLevel }),
        ...(flowRate !== undefined && {
          steps: [
            {
              rate: flowRate,
              ...(duration !== undefined && { duration }),
              ...(duration !== undefined &&
                dynamicLevel !== undefined && {
                  readings: [{ elapsed: duration, depth: dynamicLevel }],
                }),
            },
          ],
        }),
        ...(t.equipment && { equipment: t.equipment }),
        notes: notes.join('. '),
      } as HydrodynamicEvent);

      let specificCapacity = positive(t.specific_capacity);
      if (
        flowRate !== undefined &&
        dynamicLevel !== undefined &&
        staticLevel !== undefined &&
        dynamicLevel > staticLevel
      ) {
        const computed = round(flowRate / (dynamicLevel - staticLevel), 3);
        if (
          specificCapacity !== undefined &&
          Math.abs(computed - specificCapacity) / computed > 0.05
        ) {
          warn(
            'specific_capacity_mismatch',
            { stored: specificCapacity, computed },
            'aquifer_analysis',
          );
        }
        specificCapacity = computed;
      }
      const top = aquifers[0]?.top;
      const base = positive(aquifers[0]?.base);
      const thickness =
        top !== undefined && base !== undefined && base > top
          ? round(base - top, 2)
          : undefined;
      const permeability = positive(t.permeability);
      const methodKey = norm(t.method ?? '');
      if (
        dynamicLevel !== undefined ||
        flowRate !== undefined ||
        transmissivity !== undefined
      ) {
        aquifer_analysis.push({
          id: 'siagas-test-analysis',
          datetime: instant(date),
          source_event_ids: ['siagas-test'],
          method: /jacob/.test(methodKey)
            ? 'cooper_jacob'
            : /theis/.test(methodKey)
              ? 'theis'
              : 'x-specific_capacity',
          ...(staticLevel !== undefined && {
            static_level: staticLevel,
            static_level_source_id: 'siagas-test',
          }),
          ...(dynamicLevel !== undefined && { dynamic_level: dynamicLevel }),
          ...(flowRate !== undefined && { flow_rate: flowRate }),
          ...(specificCapacity !== undefined && {
            specific_capacity: specificCapacity,
          }),
          ...(transmissivity !== undefined && { transmissivity }),
          ...(positive(t.storativity) !== undefined && {
            storativity: t.storativity,
          }),
          ...(permeability !== undefined &&
            thickness !== undefined && {
              hydraulic_conductivity: permeability,
              aquifer_thickness: thickness,
            }),
          notes: 'Valores do teste de bombeamento registrado no SIAGAS.',
        });
      }
    }
  }

  // ─── Water level and RIMAS series ──────────────────────────────────────────
  const level = record.water_level;
  if (level.date && level.level !== undefined) {
    if (norm(level.pumping ?? '') === 's') {
      warn('water_level_pumping', undefined, 'hydrodynamic_events');
    } else {
      if (level.level === 0)
        warn('water_level_zero', undefined, 'hydrodynamic_events');
      hydrodynamic_events.push({
        id: 'siagas-level',
        type: 'spot_measurement',
        datetime: instant(level.date),
        static_level: level.level,
        notes: 'Último nível da água registrado no SIAGAS.',
      });
    }
  }

  const rimasMode = options.rimasMode ?? 'monthly';
  const readings = options.rimas?.readings ?? [];
  if (rimasMode !== 'none' && readings.length) {
    const kept =
      rimasMode === 'monthly' ? monthlyRimasReadings(readings) : readings;
    if (kept.length < readings.length) {
      warn(
        'rimas_monthly',
        { kept: kept.length, total: readings.length },
        'hydrodynamic_events',
      );
    }
    for (const r of kept) {
      hydrodynamic_events.push({
        id: `rimas-${r.date.replace(/-/g, '')}`,
        type: 'spot_measurement',
        datetime: instant(r.date),
        static_level: r.level,
        measurement_method: 'pressure_transducer',
        operator: 'RIMAS/SGB',
      });
    }
  }

  // ─── Water quality ─────────────────────────────────────────────────────────
  const water_samples: WaterSample[] = [];
  const a = record.analysis;
  const results: WaterQualityResult[] = [];
  const zeros: string[] = [];
  const unmappedParams: string[] = [];

  /** A numeric result; 0 is "not analysed", negative is "below the limit". */
  function numeric(
    parameter: WaterQualityResult['parameter'],
    value: number | undefined,
    label: string,
    extra: Partial<WaterQualityResult> = {},
  ) {
    if (value === undefined) return;
    if (value === 0) {
      zeros.push(label);
      return;
    }
    results.push({
      parameter,
      value: Math.abs(value),
      ...(value < 0 && { qualifier: '<' as const }),
      ...extra,
    });
  }
  const welldot = (code: string) => ({ code, vocabulary: 'welldot' });
  const xSiagas = (name: string) => ({
    code: slug(name),
    vocabulary: 'x-siagas',
  });

  numeric(welldot('specific_conductance'), a.conductivity, 'Condutividade', {
    measured_in: 'field',
  });
  numeric(welldot('temperature'), a.temperature, 'Temperatura', {
    measured_in: 'field',
  });
  numeric(welldot('ph'), a.ph, 'pH', { measured_in: 'field' });
  numeric(welldot('turbidity_ntu'), a.turbidity, 'Turbidez');
  numeric(welldot('apparent_color'), a.color, 'Cor');
  numeric(
    welldot('total_suspended_solids'),
    a.suspended_solids,
    'Sólidos suspensos',
  );
  numeric(
    xSiagas('Sólidos sedimentáveis'),
    a.settleable_solids,
    'Sólidos sedimentáveis',
    { unit: 'mg/L' },
  );
  if (a.odor) results.push({ parameter: welldot('odor'), text: a.odor });
  if (a.taste) results.push({ parameter: welldot('taste'), text: a.taste });

  for (const r of a.results) {
    const code = mapParameter(r.parameter);
    const unitKey = norm(r.unit ?? '');
    const isMgL = !unitKey || unitKey.startsWith('mg/l');
    if (code && (code === 'ph' || isMgL)) {
      numeric(welldot(code), r.value, r.parameter, { measured_in: 'lab' });
    } else {
      unmappedParams.push(r.parameter);
      numeric(xSiagas(r.parameter), r.value, r.parameter, {
        measured_in: 'lab',
        unit: r.unit?.replace(/\s*\(ppm\)\s*$/i, '') || 'mg/L',
      });
    }
  }

  if (results.length) {
    if (!a.date) {
      warn('analysis_without_date', undefined, 'water_samples');
    } else {
      if (zeros.length)
        warn('zero_results', { parameters: zeros.join(', ') }, 'water_samples');
      if (unmappedParams.length) {
        warn(
          'unmapped_parameters',
          { parameters: unmappedParams.join(', ') },
          'water_samples',
        );
      }
      const notes = [
        a.sample && `Amostra SIAGAS: ${a.sample}`,
        a.appearance && `Aspecto natural: ${a.appearance}`,
        'Última coleta registrada no SIAGAS.',
      ].filter(Boolean);
      water_samples.push({
        id: 'siagas-sample',
        datetime: instant(a.date),
        sample_type: 'routine',
        notes: notes.join('. '),
        results,
      });
    }
  }

  // ─── Status history ────────────────────────────────────────────────────────
  const history_logs: HistoryLogEntry[] = [];
  record.status.forEach((s, i) => {
    if (!s.date) {
      warn('status_without_date', { value: s.status }, 'history_logs');
      return;
    }
    const status = mapStatus(s.status);
    if (!status) warn('unmapped_value', { field: 'Situação', value: s.status });
    history_logs.push({
      id: `siagas-status-${i + 1}`,
      datetime: instant(s.date),
      category: 'status_change',
      ...(status && { status }),
      description: `Situação no SIAGAS: ${s.status}`,
    });
  });

  // ─── Attachments ───────────────────────────────────────────────────────────
  const url = `${SIAGAS_PAGE_URL}${record.code}`;
  const attachments: Attachment[] = [
    {
      id: 'siagas-record',
      uri: url,
      media_type: 'text/html',
      document_type: 'registry_record',
      description: `Ficha do poço ${record.code} no SIAGAS (SGB)`,
    },
  ];
  if (options.media !== false) {
    let photo = 0;
    let doc = 0;
    for (const m of options.rimas?.media ?? []) {
      const ext = m.filename.split('.').pop()?.toLowerCase() ?? '';
      attachments.push({
        id:
          m.kind === 'photo' ? `rimas-photo-${++photo}` : `rimas-doc-${++doc}`,
        uri: m.url,
        media_type: MEDIA_TYPES[ext] ?? 'application/octet-stream',
        ...(m.kind === 'photo' && { document_type: 'photo' }),
        filename: m.filename,
        ...(m.title && { description: m.title }),
      });
    }
  }

  // ─── Assemble ──────────────────────────────────────────────────────────────
  const place = [
    record.locality ?? g.locality,
    record.municipality && `${record.municipality}/${record.uf ?? ''}`,
  ]
    .filter(Boolean)
    .join(', ');
  const aquiferText = aquifers
    .map(q =>
      [
        `Aquífero ${q.type}`,
        q.condition && `condição ${q.condition.toLowerCase()}`,
        q.intake && `captação ${q.intake.toLowerCase()}`,
        q.penetration && `penetração ${q.penetration.toLowerCase()}`,
        q.top !== undefined &&
          positive(q.base) &&
          `topo ${q.top} m, base ${q.base} m`,
      ]
        .filter(Boolean)
        .join(', '),
    )
    .join('; ');
  const obs = [
    `Importado do SIAGAS (ponto ${record.code}).`,
    g.owner && `Proprietário: ${g.owner}.`,
    place && `Local: ${place}.`,
    g.water_use && `Uso da água: ${g.water_use}.`,
    (g.basin || g.sub_basin) &&
      `Bacia: ${[g.basin, g.sub_basin].filter(Boolean).join(' / ')}.`,
    record.geomorphology && `Feição geomorfológica: ${record.geomorphology}.`,
    aquiferText && `${aquiferText}.`,
  ].filter(Boolean);

  const well = {
    version: WELL_FORMAT_VERSION,
    well_id: [{ authority: 'SIAGAS', id: record.code, primary: true }],
    ...(nature?.type && { well_type: nature.type }),
    ...(purposes.size && { well_purpose: [...purposes] }),
    name: g.name ?? `SIAGAS ${record.code}`,
    ...(driller && { well_driller: driller }),
    ...(constructionDate && { construction_date: constructionDate }),
    obs: obs.join('\n'),
    ...(location && { location }),
    ...(wellDepth !== undefined && { well_depth: wellDepth }),
    bore_hole,
    well_case,
    reduction: [],
    well_screen,
    surface_case: [],
    hole_fill,
    lithology,
    fractures,
    caves: [],
    ...(hydrodynamic_events.length && { hydrodynamic_events }),
    ...(aquifer_analysis.length && { aquifer_analysis }),
    ...(history_logs.length && { history_logs }),
    attachments,
    ...(water_samples.length && { water_samples }),
    'x-siagas': {
      ponto: record.code,
      url,
      ...(options.fetchedAt && { fetched_at: options.fetchedAt }),
      ...(options.rimas && {
        rimas: { readings: readings.length, mode: rimasMode },
      }),
      record,
    },
  } as Well;

  return { well, warnings };
}
