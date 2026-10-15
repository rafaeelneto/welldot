import type { SiagasRecord } from './parse';

/**
 * Builders of SIAGAS / RIMAS pages for the tests. They reproduce the markup
 * of the real pages (as of 2026): labels as HTML entities, values after
 * `&nbsp;`, no `<th>`, bold section headings inside or between tables, the
 * missing `<tr>` before "Situação", the aquifer cell closing after its
 * nested table, `<sub>` in parameter names and a Latin-1 byte in a comment.
 */

type Cells = (string | number)[];

const td = (v: string | number) =>
  `<td width='15%' bgcolor='#F9F9F9' align='center'>&nbsp;${v}</td>`;
const labelTd = (l: string) =>
  `<td width='20%' bgcolor='#F9F9F9'>&nbsp;<font face='arial' size='2'>${l}</font></td>`;
const valueTd = (v: string | number) =>
  `<td width='80%' bgcolor='#F9F9F9'>&nbsp;<font face='arial' size='2'>&nbsp;${v}</font></td>`;
const heading = (h: string) =>
  `<tr><td width='20%'><font face='arial' size='2'><b>${h}</b></font></td><td width='80%'></td></tr>`;

/** A Construtivos-style table: bold heading row, label row, data rows. */
function section(name: string, labels: string[], rows: Cells[]): string {
  return `<table border='0' width='100%'>${heading(name)}
<tr>${labels.map(labelTd).join('')}</tr>
${rows.map(r => `<tr>${r.map(td).join('')}</tr>`).join('\n')}
</table></tr>`;
}

/** A Geológicos-style table: loose bold heading, then label and data rows. */
function looseSection(name: string, labels: string[], rows: Cells[]): string {
  return `<font face='arial' size='2'><b>${name}</b></font>
<table border='0' width='100%'><tr>${labels.map(labelTd).join('')}</tr>
${rows.map(r => `<tr>${r.map(td).join('')}</tr>`).join('\n')}</table>`;
}

const pairs = (rows: [string, string | number][]) =>
  rows.map(([l, v]) => `<tr>${labelTd(l)}${valueTd(v)}</tr>`).join('\n');

const tab = (k: number, body: string) =>
  `<div id="tabs-${k}"><TABLE id='newsContent'><TBODY><TR><TD width=5></TD><TD width='100%'>${body}</TD></TR></TBODY></TABLE></div>`;

export interface PageSpec {
  code?: string;
  uf?: string;
  municipality?: string;
  elevation?: number;
  name?: string;
  nature?: string;
  use?: string;
  latitude?: string;
  longitude?: string;
  utmNorth?: number;
  status?: [string, string][];
  drilling?: Cells[];
  diameters?: Cells[];
  casings?: Cells[];
  screens?: Cells[];
  annulus?: Cells[];
  wellhead?: Cells[];
  waterEntries?: number[];
  usefulDepth?: Cells[];
  formations?: Cells[];
  lithology?: Cells[];
  aquifer?: { type: string; top: number; base: number; condition?: string };
  level?: [string, number, string, number];
  /** Data, Surgência, NE, Duração, ND, Q/s, S, Q livre, K, T, Q, tipo, método, unidade. */
  test?: Cells;
  analysis?: {
    sample?: string;
    date?: string;
    ce?: number;
    color?: number | string;
    temp?: number;
    turbidity?: string;
    ph?: number;
  };
  results?: [string, number | string, string][];
}

/** A SIAGAS detail page (`detalhe.php`) for the spec. */
export function siagasPage(spec: PageSpec = {}): string {
  const s = {
    code: '1500000136',
    uf: 'PA',
    municipality: 'Santarém',
    elevation: 0,
    name: '4ST-05-PA',
    nature: 'Poço tubular',
    use: '',
    latitude: '022619',
    longitude: '544414',
    utmNorth: 9730246,
    status: [],
    drilling: [],
    diameters: [],
    casings: [],
    screens: [],
    annulus: [],
    wellhead: [],
    waterEntries: [],
    usefulDepth: [],
    formations: [],
    lithology: [],
    level: ['', 0, '', 0],
    test: ['', '', 0, '', 0, 0, 0, 0, 0, 0, 0, '', '', ''],
    analysis: {},
    results: [],
    ...spec,
  } as Required<PageSpec>;
  const t = s.test;
  const a = s.analysis;

  const general = `<table border='0' width='100%'>${heading('Dados Gerais:')}
${pairs([
  ['Nome:', s.name],
  ['Data da Instala&ccedil;&atilde;o:', '01/06/1978'],
  ['Propriet&aacute;rio:', 'CIA. DE SANEAMENTO DO PARÁ - COSANPA'],
  ['Natureza do Ponto:', s.nature],
  ['Uso da &Aacute;gua:', s.use],
  ['Cota do Terreno (m):', s.elevation],
])}
${heading('Localiza&ccedil;&atilde;o:')}
${pairs([
  ['UTM (Norte/Sul):', s.utmNorth],
  ['Latitude (GGMMSS):', s.latitude],
  ['Longitude (GGMMSS):', s.longitude],
  ['Bacia Hidrogr&aacute;fica:', 'Rio Amazonas'],
])}
${heading('Situa&ccedil;&atilde;o:')}
<!-- Imprime os campos Data e Situação -->
${s.status
  .map(
    ([date, status]) =>
      `<tr>${labelTd('Data:')}${valueTd(date)}</tr>\n${labelTd('Situa&ccedil;&atilde;o:')}${valueTd(status)}</tr>`,
  )
  .join('\n')}
</table>`;

  const construction = `${[
    section(
      'Perfura&ccedil;&atilde;o:',
      [
        'Data:',
        'Profundidade Inicial (m):',
        'Profundidade Final (m):',
        'Perfurador:',
        'M&eacute;todo:',
      ],
      s.drilling,
    ),
    section(
      'Di&acirc;metro:',
      ['De (m):', 'At&eacute; (m):', 'Polegadas:', 'Mil&iacute;metros:'],
      s.diameters,
    ),
    section(
      'Revestimento:',
      [
        'De (m):',
        'At&eacute; (m):',
        'Material:',
        'Di&acirc;metro (pol):',
        'Di&acirc;metro (mm):',
      ],
      s.casings,
    ),
    section(
      'Filtro:',
      [
        'De (m):',
        'At&eacute; (m):',
        'Material:',
        'Di&acirc;metro (pol):',
        'Di&acirc;metro (mm):',
        'Ranhura',
      ],
      s.screens,
    ),
    section(
      'Espa&ccedil;o Anular:',
      ['De (m):', 'At&eacute; (m):', 'Material:'],
      s.annulus,
    ),
    section(
      'Boca do Tubo:',
      ['Data:', 'Altura(m):', 'Di&acirc;metro (pol):', 'Di&acirc;metro (mm):'],
      s.wellhead,
    ),
    section(
      "Entrada d'&aacute;gua:",
      ['Profundidade(m):'],
      s.waterEntries.map(d => [d]),
    ),
    section(
      'Profundidade &Uacute;til:',
      ['Data:', 'Profundidade &Uacute;til:'],
      s.usefulDepth,
    ),
  ].join('\n')}</table>`;

  const geology = [
    `<font face='arial' size='2'><b>Fei&ccedil;&atilde;o Geomorfol&oacute;gica:</b></font><table>${pairs([['Descri&ccedil;&atilde;o:', 'Pediplano']])}</table>`,
    looseSection(
      'Forma&ccedil;&atilde;o Geol&oacute;gica:',
      [
        'Profundidade Inicial (m):',
        'Profundidade Final (m):',
        'Tipo de Forma&ccedil;&atilde;o:',
      ],
      s.formations,
    ),
    looseSection(
      'Dados Litol&oacute;gicos:',
      [
        'De (m):',
        'At&eacute; (m):',
        'Litologia:',
        'Descri&ccedil;&atilde;o Litol&oacute;gica:',
      ],
      s.lithology,
    ),
  ].join('\n');

  const aq = s.aquifer;
  const hydrogeology = `&nbsp;<font face='arial' size='2'><b>Aqu&iacute;fero no Ponto</b></font>
${
  aq
    ? `<table><tr><td width='40%' bgcolor='#F9F9F9'>&nbsp;<font face='arial' size='2'>Aqu&iacute;fero: ${aq.type}</td>
<td width='60%'><table>
<tr>${labelTd('Topo (m):')}<td>${aq.top}</td></tr>
<tr>${labelTd('Base (m):')}<td>${aq.base}</td></tr>
<tr>${labelTd('Condi&ccedil;&atilde;o:')}<td>${aq.condition ?? ''}</td></tr>
</table></td></tr></table>`
    : ''
}
<font face='arial' size='2'><b>N&iacute;vel da &Aacute;gua:</b></font>
<table>${pairs([
    ['Data:', s.level[0]],
    ['N&iacute;vel da &Aacute;gua (m):', s.level[1]],
    ['N&iacute;vel Medido Bombeando (S/N)?', s.level[2]],
    ['Vaz&atilde;o (m3/h):', s.level[3]],
  ])}</table>`;

  const grid = (labels: string[], values: Cells) =>
    `<tr>${labels.map(labelTd).join('')}</tr><tr>${values.map(td).join('')}</tr>`;
  const pumping = `<font face='arial' size='2'><b>Teste de Bombeamento:</b></font><table>
${grid(['Data:', 'Surg&ecirc;ncia:', 'N&iacute;vel Est&aacute;tico (m):', 'Dura&ccedil;&atilde;o do Teste (h):'], t.slice(0, 4))}
${grid(['N&iacute;vel Din&acirc;mico (m):', 'Vaz&atilde;o Espec&iacute;fica (m3/h/m):', 'Coeficiente de Armazenamento:', 'Vaz&atilde;o Livre (m3/h):'], t.slice(4, 8))}
${grid(['Permeabilidade (m/s):', 'Transmissividade (m2/s):', 'Vaz&atilde;o Ap&oacute;s Estabiliza&ccedil;&atilde;o (m3/h):', 'Tipo do Teste:'], t.slice(8, 12))}
${grid(['M&eacute;todo:', 'Unidade:', '', ''], [...t.slice(12, 14), '', ''])}
</table>`;

  const chemistry = `<table>${heading('An&aacute;lises Qu&iacute;micas:')}
${pairs([
  ['Amostra:', a.sample ?? ''],
  ['Data da Coleta:', a.date ?? ''],
  ['Condutividade El&eacute;trica (&micro;S/cm): ', a.ce ?? 0],
  ['Qualidade da &Aacute;gua (PT/CO): ', a.color ?? 0],
  ['Temperatura (C&ordm;):', a.temp ?? 0],
  ['Turbides (NTU):', a.turbidity ?? ''],
  ['Ph', a.ph ?? 0],
])}</table>
<font face='arial' size='2'><b>Resultados Anal&iacute;ticos da &Uacute;ltima Coleta:</b></font>
<table><tr>${['Par&acirc;metro:', 'Concentra&ccedil;&atilde;o:', 'Unidade:'].map(labelTd).join('')}</tr>
${s.results.map(r => `<tr>${r.map(td).join('')}</tr>`).join('\n')}</table>`;

  return `<html><head><meta http-equiv="Content-Type" content="text/html; charset=ISO-8859-1" /></head><body>
<table bgcolor='#E0DDD8'><tr>
<td width='20%'><FONT SIZE='-1'><B>Po&ccedil;o:  ${s.code}</B></FONT></td>
<td width='20%'><FONT SIZE='-1'><B>UF: ${s.uf}</B></FONT></td>
<td width='20%'><FONT SIZE='-1'><B>Munic&iacute;pio:  ${s.municipality}</B></FONT></td>
<td width='70%'><FONT SIZE='-1'><B>Localidade: SANTAREM </B></FONT></td>
</tr></table>
<div id="tabs"><ul><li><a href="#tabs-1">Gerais</a></li></ul>
${tab(1, general)}
${tab(2, construction)}
${tab(3, geology)}
${tab(4, hydrogeology)}
${tab(5, pumping)}
${tab(6, chemistry)}
</div></body></html>`;
}

/** A flowing well modeled on SIAGAS 1500000136 (Santarém/PA). */
export const FLOWING_WELL: PageSpec = {
  status: [['19/02/1996', 'Abandonado']],
  drilling: [['04/11/1977', 0, 160, 'CPRM', 'Rotativo']],
  diameters: [
    [0, 16, 22, '558.8000'],
    [16, 66, '17 1/2', '444.5000'],
    [66, 160, 15, '381.0000'],
  ],
  casings: [
    [0, 88.01, 'Aço galvanizado com rosca e luva', 12, 304.8],
    [0, 16, 'Aço galvanizado com rosca e luva', 12, 304.8],
    [115.01, 133.66, 'Aço galvanizado com rosca e luva', '9 5/8', 244.47],
  ],
  screens: [[88.01, 115.01, 'Espiralado perfil trapez. inox', 8, 203.2, 0.5]],
  annulus: [
    [0, 16, 'Cimentação'],
    [0, 16, 'Cimentação'],
    [16, 160, 'Areia quartzosa de 1,00 a 3,00 mm'],
  ],
  wellhead: [['01/01/1978', 0.42, 12, 304.8]],
  usefulDepth: [['', 160]],
  formations: [
    [0, 27, 'Aluviões'],
    [27, 160, 'Formação Alter do Chão'],
  ],
  lithology: [
    [0, 2, 'Areia Argilosa', 'AREIA ARGILOSA DE NATUREZA ORGÂNICA.'],
    [2, 10, 'Argila Arenosa', 'ARGILA ARENOSA DE COLORAÇÃO CLARA'],
    [10, 27, 'Areia Média', 'AREIA MÉDIA A CONGLOMERÁTICA.'],
    [27, 30, 'Areia Calcífera', 'Calcarenito cinza claro.'],
  ],
  aquifer: { type: 'Poroso', top: 10, base: 27, condition: 'Livre' },
  test: [
    '21/02/1978',
    'S',
    3.98,
    '52:00',
    44.9,
    2.588,
    0,
    8,
    0,
    0.003,
    126.5,
    'Rebaixamento',
    'Jacob',
    'Sarilho',
  ],
  analysis: {
    sample: 'AA-403/95',
    date: '03/05/2010',
    ce: 0,
    color: -5,
    temp: 28.4,
    turbidity: '2,0',
    ph: 4.8,
  },
  results: [
    ['Cloreto (Cl)', 0, 'mg/L (ppm)'],
    ['Nitratos (NO<sub>3</sub>)', -0.2, 'mg/L (ppm)'],
    ['Brometo', 0.02, 'mg/L (ppm)'],
    ['pH', 7.36, ''],
  ],
};

/** The empty template SIAGAS serves for a nonexistent code. */
export const NOT_FOUND_PAGE = `<html><body><table><tr><td><b>Perfura&ccedil;&atilde;o:</b></td></tr>
<tr><td>Data:</td><td>Profundidade Inicial (m):</td></tr></table></body></html>`;

/** What SIAGAS answers for a malformed code. */
export const INVALID_CODE_PAGE = 'Erro 01-Sem parametros';

/** A RIMAS page (`detalhe_poco.php`): `d1` level series and the media tab. */
export function rimasPage(
  readings: [string, string][] = [],
  photos: [string, string][] = [],
  documents: [string, string][] = [],
): string {
  const series = readings.length
    ? `d1 =[${readings.map(([d, l]) => `["${Date.parse(`${d}T00:00:00Z`)}","${l}"]`).join(',')}];`
    : 'd1 = 0;';
  return `<html><body><script type="text/javascript">
d1 = new String();
${series}
</script>
<div id="tabs-7">
${photos
  .map(
    ([file, title]) =>
      `<a href="../documentos/${file}" data-lightbox="roadtrip" class="apaga_applet example-image-link" data-title="${title}"><img class="example-image" src="../documentos/${file}" /></a>`,
  )
  .join('\n')}
<div>Demais documentos</div>
${documents.map(([file, title]) => `<a href="../documentos/${file}">${title}</a>`).join('\n')}
</div></body></html>`;
}

/** A record with nothing but a code, for building cases by hand. */
export function emptyRecord(
  overrides: Partial<SiagasRecord> = {},
): SiagasRecord {
  return {
    code: '1234567890',
    uf: 'MG',
    general: {},
    status: [],
    drilling: [],
    diameters: [],
    casings: [],
    screens: [],
    annulus: [],
    wellhead: [],
    water_entries: [],
    useful_depth: [],
    formations: [],
    lithology: [],
    aquifers: [],
    water_level: {},
    test: {},
    analysis: { results: [] },
    ...overrides,
  };
}
