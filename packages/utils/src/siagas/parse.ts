import { SiagasError } from './errors';
import { cleanText, labelKey, readRows, type Row } from './html';

/**
 * The content of a SIAGAS detail page (`detalhe.php`), as written there.
 *
 * Texts are trimmed and empty texts are left out. Numbers are parsed (decimal
 * comma accepted) but not interpreted: a `0` stays `0`, because whether it
 * means "no data" depends on the field (see `siagasToWell`). Dates are
 * `YYYY-MM-DD`.
 */
export interface SiagasRecord {
  code: string;
  uf?: string;
  municipality?: string;
  locality?: string;
  general: {
    name?: string;
    installation_date?: string;
    owner?: string;
    nature?: string;
    water_use?: string;
    elevation?: number;
    locality?: string;
    utm_north?: number;
    utm_east?: number;
    /** `GGMMSS`, unsigned, as written. */
    latitude?: string;
    /** `GGMMSS`, unsigned, as written. */
    longitude?: string;
    basin?: string;
    sub_basin?: string;
  };
  status: { date?: string; status: string }[];
  drilling: {
    date?: string;
    from?: number;
    to?: number;
    driller?: string;
    method?: string;
  }[];
  diameters: SiagasDiameterRow[];
  casings: SiagasPipeRow[];
  screens: (SiagasPipeRow & { slot?: number })[];
  annulus: { from?: number; to?: number; material?: string }[];
  wellhead: { date?: string; height?: number; inches?: string; mm?: number }[];
  water_entries: number[];
  useful_depth: { date?: string; depth?: number }[];
  geomorphology?: string;
  formations: { from?: number; to?: number; name?: string }[];
  lithology: {
    from?: number;
    to?: number;
    lithology?: string;
    description?: string;
  }[];
  aquifers: {
    type?: string;
    top?: number;
    base?: number;
    intake?: string;
    condition?: string;
    penetration?: string;
  }[];
  water_level: {
    date?: string;
    level?: number;
    pumping?: string;
    flow_rate?: number;
  };
  test: {
    date?: string;
    flowing?: string;
    static_level?: number;
    /** Test duration in minutes (from `HH:MM`, or whole hours). */
    duration?: number;
    dynamic_level?: number;
    specific_capacity?: number;
    storativity?: number;
    free_flow_rate?: number;
    /** m/s */
    permeability?: number;
    /** m²/s */
    transmissivity?: number;
    flow_rate?: number;
    test_type?: string;
    method?: string;
    /** "Unidade" on the page: the pumping equipment. */
    equipment?: string;
  };
  analysis: {
    sample?: string;
    date?: string;
    conductivity?: number;
    color?: number;
    taste?: string;
    odor?: string;
    temperature?: number;
    turbidity?: number;
    suspended_solids?: number;
    settleable_solids?: number;
    appearance?: string;
    ph?: number;
    results: { parameter: string; value?: number; unit?: string }[];
  };
}

export interface SiagasDiameterRow {
  from?: number;
  to?: number;
  /** Nominal size as written, e.g. `17 1/2`. */
  inches?: string;
  mm?: number;
}

export interface SiagasPipeRow extends SiagasDiameterRow {
  material?: string;
}

/** Text or `undefined` when empty. */
function str(value: string | undefined): string | undefined {
  const text = cleanText(value ?? '');
  return text ? text : undefined;
}

/** Number with `.` or `,` as decimal separator; `undefined` when empty. */
export function parseSiagasNumber(
  value: string | undefined,
): number | undefined {
  const text = cleanText(value ?? '').replace(',', '.');
  if (!text) return undefined;
  const n = Number(text);
  return Number.isFinite(n) ? n : undefined;
}

/** `dd/mm/yyyy` → `yyyy-mm-dd`; `undefined` when empty or not a real date. */
export function parseSiagasDate(value: string | undefined): string | undefined {
  const m = cleanText(value ?? '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return undefined;
  const [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return undefined;
  return `${m[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Nominal inches as written (`17 1/2`, `9 5/8`, `8`) → number. */
export function parseInches(value: string | undefined): number | undefined {
  const text = cleanText(value ?? '').replace(',', '.');
  const m = text.match(/^(\d+(?:\.\d+)?)?\s*(?:(\d+)\/(\d+))?$/);
  if (!text || !m || (!m[1] && !m[2])) return undefined;
  const whole = m[1] ? Number(m[1]) : 0;
  const frac = m[2] ? Number(m[2]) / Number(m[3]) : 0;
  return whole + frac;
}

/** Test duration: `HH:MM` → minutes; a bare number is hours. */
export function parseDuration(value: string | undefined): number | undefined {
  const text = cleanText(value ?? '');
  const hm = text.match(/^(\d+):(\d{1,2})$/);
  if (hm) return Number(hm[1]) * 60 + Number(hm[2]);
  const hours = parseSiagasNumber(text);
  return hours === undefined ? undefined : hours * 60;
}

/** Splits the page at its tab panels, using the last copy of the block. */
function splitPage(html: string): { header: string; tabs: string[] } {
  const start = html.lastIndexOf('<div id="tabs-1">');
  const headerAt = html.lastIndexOf('Po&ccedil;o:', start);
  if (start < 0 || headerAt < 0) {
    throw new SiagasError('not_found', 'SIAGAS page has no well data');
  }
  const header = html.slice(html.lastIndexOf('<table', headerAt), start);
  const tabs: string[] = [];
  for (let k = 1; k <= 6; k++) {
    const a = html.indexOf(`<div id="tabs-${k}">`, start);
    const next = k < 6 ? html.indexOf(`<div id="tabs-${k + 1}">`, a) : -1;
    tabs.push(a < 0 ? '' : html.slice(a, next < 0 ? html.length : next));
  }
  return { header, tabs };
}

/** `[label key, value]` pairs of the two-cell label rows, in order. */
function labelPairs(rows: Row[]): [string, string][] {
  return rows
    .filter(r => r.table >= 0 && !r.bold && r.cells.length >= 2)
    .map(r => [labelKey(r.cells[0]), r.cells[1]] as [string, string]);
}

function pairValue(pairs: [string, string][], key: string): string | undefined {
  return str(pairs.find(([k]) => k === key)?.[1]);
}

/** Index of the heading row whose text matches `key` (from `start`). */
function headingIndex(rows: Row[], key: string, start = 0): number {
  return rows.findIndex(
    (r, i) => i >= start && r.table === -1 && labelKey(r.cells[0]) === key,
  );
}

/**
 * The data rows of the section under a heading, keyed by the column labels
 * of its header row. Rows stop at the end of the header's table.
 */
function sectionRecords(
  rows: Row[],
  heading: string,
): Record<string, string>[] {
  const at = headingIndex(rows, heading);
  if (at < 0) return [];
  let j = at + 1;
  while (j < rows.length && (rows[j].bold || rows[j].table === -1)) j++;
  const header = rows[j];
  if (!header) return [];
  const keys = header.cells.map(labelKey);
  const records: Record<string, string>[] = [];
  for (let i = j + 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.table !== header.table || row.bold) break;
    if (row.cells.every(c => !c)) continue;
    const record: Record<string, string> = {};
    keys.forEach((key, c) => {
      if (key) record[key] = row.cells[c] ?? '';
    });
    records.push(record);
  }
  return records;
}

function parseHeader(fragment: string) {
  const out: Record<string, string> = {};
  for (const row of readRows(fragment)) {
    if (row.table === -1) continue;
    for (const cell of row.cells) {
      const i = cell.indexOf(':');
      if (i > 0) out[labelKey(cell.slice(0, i))] = cell.slice(i + 1);
    }
  }
  return out;
}

function parseGeneral(rows: Row[]) {
  const pairs = labelPairs(rows);
  const situationAt = headingIndex(rows, 'situacao');
  const before = situationAt < 0 ? rows : rows.slice(0, situationAt);
  const after = situationAt < 0 ? [] : rows.slice(situationAt + 1);
  const general = labelPairs(before);
  const n = (key: string) => parseSiagasNumber(pairValue(general, key));

  const status: SiagasRecord['status'] = [];
  let date: string | undefined;
  for (const [key, value] of labelPairs(after)) {
    if (key === 'data') date = parseSiagasDate(value);
    else if (key === 'situacao') {
      const text = str(value);
      if (text) status.push({ ...(date && { date }), status: text });
      date = undefined;
    }
  }

  return {
    general: {
      name: pairValue(general, 'nome'),
      installation_date: parseSiagasDate(
        pairValue(general, 'data da instalacao'),
      ),
      owner: pairValue(general, 'proprietario'),
      nature: pairValue(general, 'natureza do ponto'),
      water_use: pairValue(general, 'uso da agua'),
      elevation: n('cota do terreno (m)'),
      locality: pairValue(general, 'localidade'),
      utm_north: n('utm (norte/sul)'),
      utm_east: n('utm (leste/oeste)'),
      latitude: pairValue(general, 'latitude (ggmmss)'),
      longitude: pairValue(general, 'longitude (ggmmss)'),
      basin: pairValue(general, 'bacia hidrografica'),
      sub_basin: pairValue(general, 'subbacia hidrografica'),
    },
    status,
    pairs,
  };
}

function pipe(r: Record<string, string>): SiagasPipeRow {
  return {
    from: parseSiagasNumber(r['de (m)']),
    to: parseSiagasNumber(r['ate (m)']),
    material: str(r['material']),
    inches: str(r['diametro (pol)']),
    mm: parseSiagasNumber(r['diametro (mm)']),
  };
}

function parseConstruction(rows: Row[]) {
  return {
    drilling: sectionRecords(rows, 'perfuracao').map(r => ({
      date: parseSiagasDate(r['data']),
      from: parseSiagasNumber(r['profundidade inicial (m)']),
      to: parseSiagasNumber(r['profundidade final (m)']),
      driller: str(r['perfurador']),
      method: str(r['metodo']),
    })),
    diameters: sectionRecords(rows, 'diametro').map(r => ({
      from: parseSiagasNumber(r['de (m)']),
      to: parseSiagasNumber(r['ate (m)']),
      inches: str(r['polegadas']),
      mm: parseSiagasNumber(r['milimetros']),
    })),
    casings: sectionRecords(rows, 'revestimento').map(pipe),
    screens: sectionRecords(rows, 'filtro').map(r => ({
      ...pipe(r),
      slot: parseSiagasNumber(r['ranhura']),
    })),
    annulus: sectionRecords(rows, 'espaco anular').map(r => ({
      from: parseSiagasNumber(r['de (m)']),
      to: parseSiagasNumber(r['ate (m)']),
      material: str(r['material']),
    })),
    wellhead: sectionRecords(rows, 'boca do tubo').map(r => ({
      date: parseSiagasDate(r['data']),
      height: parseSiagasNumber(r['altura(m)']),
      inches: str(r['diametro (pol)']),
      mm: parseSiagasNumber(r['diametro (mm)']),
    })),
    water_entries: sectionRecords(rows, "entrada d'agua")
      .map(r => parseSiagasNumber(r['profundidade(m)']))
      .filter((d): d is number => d !== undefined),
    useful_depth: sectionRecords(rows, 'profundidade util').map(r => ({
      date: parseSiagasDate(r['data']),
      depth: parseSiagasNumber(r['profundidade util']),
    })),
  };
}

function parseGeology(rows: Row[]) {
  const geomorphology = (() => {
    const at = headingIndex(rows, 'feicao geomorfologica');
    const end = headingIndex(rows, 'formacao geologica');
    if (at < 0) return undefined;
    const slice = rows.slice(at + 1, end < 0 ? undefined : end);
    return pairValue(labelPairs(slice), 'descricao');
  })();
  return {
    geomorphology,
    formations: sectionRecords(rows, 'formacao geologica').map(r => ({
      from: parseSiagasNumber(r['profundidade inicial (m)']),
      to: parseSiagasNumber(r['profundidade final (m)']),
      name: str(r['tipo de formacao']),
    })),
    lithology: sectionRecords(rows, 'dados litologicos').map(r => ({
      from: parseSiagasNumber(r['de (m)']),
      to: parseSiagasNumber(r['ate (m)']),
      lithology: str(r['litologia']),
      description: str(r['descricao litologica']),
    })),
  };
}

function parseHydrogeology(rows: Row[]) {
  const levelAt = headingIndex(rows, 'nivel da agua');
  const aquiferRows = levelAt < 0 ? rows : rows.slice(0, levelAt);
  const levelRows = levelAt < 0 ? [] : rows.slice(levelAt + 1);

  // The aquifer cell ("Aquífero: Poroso") closes after the nested table of
  // its properties, so the properties come first.
  const aquifers: SiagasRecord['aquifers'] = [];
  let props: [string, string][] = [];
  for (const row of aquiferRows) {
    if (row.table === -1) continue;
    const first = row.cells[0] ?? '';
    if (labelKey(first).startsWith('aquifero')) {
      const type = str(first.slice(first.indexOf(':') + 1));
      aquifers.push({
        type,
        top: parseSiagasNumber(pairValue(props, 'topo (m)')),
        base: parseSiagasNumber(pairValue(props, 'base (m)')),
        intake: pairValue(props, 'captacao'),
        condition: pairValue(props, 'condicao'),
        penetration: pairValue(props, 'penetracao'),
      });
      props = [];
    } else if (row.cells.length >= 2) {
      props.push([labelKey(first), row.cells[1]]);
    }
  }

  const level = labelPairs(levelRows);
  return {
    aquifers,
    water_level: {
      date: parseSiagasDate(pairValue(level, 'data')),
      level: parseSiagasNumber(pairValue(level, 'nivel da agua (m)')),
      pumping: pairValue(level, 'nivel medido bombeando (s/n)?'),
      flow_rate: parseSiagasNumber(pairValue(level, 'vazao (m3/h)')),
    },
  };
}

function parseTest(rows: Row[]): SiagasRecord['test'] {
  // A grid of label rows, each followed by its value row.
  const grid = rows.filter(r => r.table >= 0 && !r.bold && r.cells.length >= 4);
  const values: Record<string, string> = {};
  for (let i = 0; i + 1 < grid.length; i += 2) {
    grid[i].cells.forEach((label, c) => {
      const key = labelKey(label);
      if (key) values[key] = grid[i + 1].cells[c] ?? '';
    });
  }
  const n = (key: string) => parseSiagasNumber(values[key]);
  return {
    date: parseSiagasDate(values['data']),
    flowing: str(values['surgencia']),
    static_level: n('nivel estatico (m)'),
    duration: parseDuration(values['duracao do teste (h)']),
    dynamic_level: n('nivel dinamico (m)'),
    specific_capacity: n('vazao especifica (m3/h/m)'),
    storativity: n('coeficiente de armazenamento'),
    free_flow_rate: n('vazao livre (m3/h)'),
    permeability: n('permeabilidade (m/s)'),
    transmissivity: n('transmissividade (m2/s)'),
    flow_rate: n('vazao apos estabilizacao (m3/h)'),
    test_type: str(values['tipo do teste']),
    method: str(values['metodo']),
    equipment: str(values['unidade']),
  };
}

function parseAnalysis(rows: Row[]): SiagasRecord['analysis'] {
  const resultsAt = headingIndex(
    rows,
    'resultados analiticos da ultima coleta',
  );
  const fields = labelPairs(resultsAt < 0 ? rows : rows.slice(0, resultsAt));
  const n = (key: string) => parseSiagasNumber(pairValue(fields, key));
  return {
    sample: pairValue(fields, 'amostra'),
    date: parseSiagasDate(pairValue(fields, 'data da coleta')),
    conductivity: n('condutividade eletrica (µs/cm)'),
    color: n('qualidade da agua (pt/co)'),
    taste: pairValue(fields, 'sabor da agua'),
    odor: pairValue(fields, 'qualidade da agua (odor)'),
    temperature: n('temperatura (cº)'),
    turbidity: n('turbides (ntu)'),
    suspended_solids: n('solidos suspensos (mg/l)'),
    settleable_solids: n('solidos sedimentaveis (mg/l)'),
    appearance: pairValue(fields, 'aspecto natural'),
    ph: n('ph'),
    results: sectionRecords(rows, 'resultados analiticos da ultima coleta')
      .filter(r => str(r['parametro']))
      .map(r => ({
        parameter: str(r['parametro'])!,
        value: parseSiagasNumber(r['concentracao']),
        unit: str(r['unidade']),
      })),
  };
}

/** Removes `undefined` members so the record serializes compactly. */
function compact<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Reads a SIAGAS detail page (`siagasweb.sgb.gov.br/layout/detalhe.php`).
 *
 * @param html The page, decoded as UTF-8 (the page's own meta tag says
 *   ISO-8859-1, but its data is UTF-8).
 * @throws {SiagasError} `not_found` when the page holds no well (SIAGAS
 *   answers 200 with an empty template or `Erro 01-Sem parametros`).
 */
export function parseSiagasPage(html: string): SiagasRecord {
  if (/^\s*Erro\s+\d/.test(html)) {
    throw new SiagasError('not_found', `SIAGAS: ${cleanText(html)}`);
  }
  const { header, tabs } = splitPage(html);
  const head = parseHeader(header);
  const code = (head['poco'] ?? '').replace(/\D/g, '');
  if (!code) throw new SiagasError('not_found', 'SIAGAS page has no well code');

  const { general, status } = parseGeneral(readRows(tabs[0]));
  return compact({
    code,
    uf: str(head['uf']),
    municipality: str(head['municipio']),
    locality: str(head['localidade']),
    general,
    status,
    ...parseConstruction(readRows(tabs[1])),
    ...parseGeology(readRows(tabs[2])),
    ...parseHydrogeology(readRows(tabs[3])),
    test: parseTest(readRows(tabs[4])),
    analysis: parseAnalysis(readRows(tabs[5])),
  });
}
