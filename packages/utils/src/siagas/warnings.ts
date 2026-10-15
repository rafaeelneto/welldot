import type { LanguageText } from '@welldot/core';

/** Something the importer could not carry over as is, or had to decide. */
export interface SiagasWarning {
  code: SiagasWarningCode;
  /** `.well` path the warning is about, when there is one (e.g. `well_case`). */
  path?: string;
  params?: Record<string, string | number>;
  /** Ready-to-show text. */
  message: LanguageText<'en' | 'pt'>;
}

type Params = Record<string, string | number>;
type Messages = (p: Params) => LanguageText<'en' | 'pt'>;

const SECTION: Record<string, { en: string; pt: string }> = {
  bore_hole: { en: 'drilling diameters', pt: 'diâmetros de perfuração' },
  well_case: { en: 'casing', pt: 'revestimento' },
  well_screen: { en: 'screens', pt: 'filtros' },
  hole_fill: { en: 'annulus', pt: 'espaço anular' },
  lithology: { en: 'lithology', pt: 'litologia' },
  pipes: { en: 'casing and screens', pt: 'revestimento e filtros' },
};

const section = (p: Params, lang: 'en' | 'pt') =>
  SECTION[String(p.section)]?.[lang] ?? String(p.section);

const MESSAGES = {
  missing_coordinates: () => ({
    en: 'SIAGAS has no coordinates for this well; the location was left out.',
    pt: 'O SIAGAS não tem coordenadas deste poço; a localização ficou de fora.',
  }),
  hemisphere_assumed: () => ({
    en: 'SIAGAS does not give the hemisphere and there is no UTM northing; the latitude was taken as south.',
    pt: 'O SIAGAS não informa o hemisfério e não há UTM Norte; a latitude foi considerada sul.',
  }),
  elevation_zero: () => ({
    en: 'Ground elevation is 0 in SIAGAS, which is how it writes "unknown"; the elevation was left out.',
    pt: 'A cota do terreno é 0 no SIAGAS, que é como ele escreve "desconhecida"; a elevação ficou de fora.',
  }),
  no_depth: () => ({
    en: 'SIAGAS has no useful or drilled depth; well_depth was left out.',
    pt: 'O SIAGAS não tem profundidade útil nem perfurada; well_depth ficou de fora.',
  }),
  no_bore_hole: () => ({
    en: 'SIAGAS has no drilling diameters; the borehole is empty.',
    pt: 'O SIAGAS não tem diâmetros de perfuração; o furo ficou vazio.',
  }),
  duplicate_rows: (p: Params) => ({
    en: `Removed ${p.count} repeated row(s) of ${section(p, 'en')}.`,
    pt: `${p.count} linha(s) repetida(s) de ${section(p, 'pt')} removida(s).`,
  }),
  overlapping_intervals: (p: Params) => ({
    en: `Overlapping intervals in ${section(p, 'en')}: ${p.intervals}. Kept as recorded.`,
    pt: `Intervalos sobrepostos em ${section(p, 'pt')}: ${p.intervals}. Mantidos como no registro.`,
  }),
  invalid_interval: (p: Params) => ({
    en: `Skipped ${section(p, 'en')} rows without a valid depth interval: ${p.intervals}.`,
    pt: `Linhas de ${section(p, 'pt')} sem intervalo de profundidade válido ignoradas: ${p.intervals}.`,
  }),
  missing_diameter: (p: Params) => ({
    en: `Skipped ${section(p, 'en')} rows without a diameter: ${p.intervals}.`,
    pt: `Linhas de ${section(p, 'pt')} sem diâmetro ignoradas: ${p.intervals}.`,
  }),
  unmapped_value: (p: Params) => ({
    en: `"${p.value}" (${p.field}) has no match in the .well vocabulary; kept as written.`,
    pt: `"${p.value}" (${p.field}) não tem correspondência no vocabulário .well; mantido como escrito.`,
  }),
  dropped_value: (p: Params) => ({
    en: `"${p.value}" (${p.field}) has no match in the .well vocabulary and was left out (it stays in x-siagas).`,
    pt: `"${p.value}" (${p.field}) não tem correspondência no vocabulário .well e ficou de fora (continua em x-siagas).`,
  }),
  unmapped_lithology: (p: Params) => ({
    en: `No FGDC texture for lithology "${p.value}"; it is drawn with a plain color.`,
    pt: `Sem textura FGDC para a litologia "${p.value}"; ela é desenhada só com cor.`,
  }),
  lithology_mismatch: (p: Params) => ({
    en: `The SIAGAS lithology and its description disagree at ${p.intervals}. The description was kept.`,
    pt: `A litologia do SIAGAS e a descrição não batem em ${p.intervals}. A descrição foi mantida.`,
  }),
  screen_slot_missing: (p: Params) => ({
    en: `Screen slot is 0 or missing at ${p.intervals}; written as 0.`,
    pt: `Ranhura 0 ou ausente em ${p.intervals}; gravada como 0.`,
  }),
  hole_fill_no_diameter: (p: Params) => ({
    en: `No drilling diameter covers the annulus at ${p.intervals}; diameter written as 0.`,
    pt: `Nenhum diâmetro de perfuração cobre o espaço anular em ${p.intervals}; diâmetro gravado como 0.`,
  }),
  stick_up_not_applied: (p: Params) => ({
    en: `Wellhead height ${p.height} m was not applied: there is no casing starting at the surface.`,
    pt: `A altura da boca do tubo (${p.height} m) não foi aplicada: não há revestimento começando na superfície.`,
  }),
  aquifer_base_mismatch: (p: Params) => ({
    en: `Aquifer base (${p.base} m) differs from the well depth (${p.depth} m).`,
    pt: `A base do aquífero (${p.base} m) difere da profundidade do poço (${p.depth} m).`,
  }),
  static_level_zero: () => ({
    en: 'The test static level is 0 while the test has other data; kept as 0, but it may be missing data.',
    pt: 'O nível estático do teste é 0, mas o teste tem outros dados; mantido como 0, mas pode ser falta de dado.',
  }),
  flowing_without_flag: () => ({
    en: 'The static level is negative (head above ground) but SIAGAS says "Surgência: N"; kept as negative.',
    pt: 'O nível estático é negativo (carga acima do terreno), mas o SIAGAS diz "Surgência: N"; mantido negativo.',
  }),
  negative_value: (p: Params) => ({
    en: `Negative ${p.field} (${p.value}) in the pumping test; kept as recorded.`,
    pt: `${p.field} negativo (${p.value}) no teste de bombeamento; mantido como no registro.`,
  }),
  test_date_from_construction: () => ({
    en: 'The pumping test has no date; the construction date was used.',
    pt: 'O teste de bombeamento não tem data; foi usada a data de construção.',
  }),
  test_without_date: () => ({
    en: 'The pumping test has no date and neither does the well; it was left out of the events (it stays in x-siagas).',
    pt: 'O teste de bombeamento não tem data e o poço também não; ficou fora dos eventos (continua em x-siagas).',
  }),
  specific_capacity_mismatch: (p: Params) => ({
    en: `SIAGAS specific capacity (${p.stored} m³/h/m) does not match Q/(ND−NE) = ${p.computed}; the computed value was used.`,
    pt: `A vazão específica do SIAGAS (${p.stored} m³/h/m) não bate com Q/(ND−NE) = ${p.computed}; foi usado o valor calculado.`,
  }),
  water_level_zero: () => ({
    en: 'The water level reading is 0 m; kept, but it may be missing data.',
    pt: 'A leitura de nível da água é 0 m; mantida, mas pode ser falta de dado.',
  }),
  water_level_pumping: () => ({
    en: 'The water level was measured while pumping, so it is not a static level; it was left out (it stays in x-siagas).',
    pt: 'O nível da água foi medido bombeando, então não é nível estático; ficou de fora (continua em x-siagas).',
  }),
  analysis_without_date: () => ({
    en: 'The chemical analysis has no collection date; it was left out (it stays in x-siagas).',
    pt: 'A análise química não tem data de coleta; ficou de fora (continua em x-siagas).',
  }),
  zero_results: (p: Params) => ({
    en: `Results equal to 0 were left out, since SIAGAS writes 0 for "not analysed": ${p.parameters}.`,
    pt: `Resultados iguais a 0 ficaram de fora, pois o SIAGAS escreve 0 para "não analisado": ${p.parameters}.`,
  }),
  unmapped_parameters: (p: Params) => ({
    en: `Parameters without a welldot code, written with x-siagas codes: ${p.parameters}.`,
    pt: `Parâmetros sem código welldot, gravados com códigos x-siagas: ${p.parameters}.`,
  }),
  status_without_date: (p: Params) => ({
    en: `Status "${p.value}" has no date; it was left out of the history (it stays in x-siagas).`,
    pt: `A situação "${p.value}" não tem data; ficou fora do histórico (continua em x-siagas).`,
  }),
  rimas_monthly: (p: Params) => ({
    en: `RIMAS series: kept the last reading of each month (${p.kept} of ${p.total}).`,
    pt: `Série RIMAS: mantida a última leitura de cada mês (${p.kept} de ${p.total}).`,
  }),
  rimas_unavailable: (p: Params) => ({
    en: `The RIMAS page could not be read (${p.reason}); the level series and media were not imported.`,
    pt: `A página do RIMAS não pôde ser lida (${p.reason}); a série de níveis e as mídias não foram importadas.`,
  }),
} satisfies Record<string, Messages>;

export type SiagasWarningCode = keyof typeof MESSAGES;

/** Builds a warning with its en/pt message. */
export function siagasWarning(
  code: SiagasWarningCode,
  params?: Params,
  path?: string,
): SiagasWarning {
  return {
    code,
    ...(path && { path }),
    ...(params && { params }),
    message: (MESSAGES[code] as Messages)(params ?? {}),
  };
}
