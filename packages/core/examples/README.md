# `.well` example wells

Fourteen complete `.well` v2.3 files that serve as a reference for the format. Each one stays valid and covers a different situation. The profiler offers them when the editor is empty or has just been cleared, and serves them at `https://welldot.org/examples/<file>`. They also ship with `@welldot/core` (`@welldot/core/examples/<file>`).

`src/examples.test.ts` checks that every file passes `WellSchema`, round-trips through `deserializeWell` / `serializeWell`, and matches `index.json`.

## Data provenance

Each example is **illustrative**. It is built on a real well from SIAGAS (Serviço Geológico do Brasil), but it is not that well's record.

- **From SIAGAS (the physical base):** region and approximate coordinates, geology and lithology, construction (hole and pipe diameters, casing, screens, annulus, depths), aquifer type, and the order of magnitude of test values (static and dynamic level, flow rate, specific capacity, transmissivity).
- **Invented, but consistent with the base:** well names and codes, owners, drillers, `well_id`s, permits and their conditions, meters, production, operating regime, pumps, history, water analyses, and pumping-test readings. The readings are synthesized with Cooper-Jacob / Theis-recovery shapes fitted to the base's static level, final drawdown and flow rate.

Every file says so at the root:

```json
"x-welldot-example": {
  "illustrative": true,
  "based_on": "https://siagasweb.sgb.gov.br/layout/detalhe.php?ponto=3100020129"
}
```

The authorities are the real ones for each state (IGAM/MG, SP Águas/SP, SEMAS-PA, SEMA-RS, CNARH/ANA). The identifiers they issued in these files are invented. The files contain no names of real individuals.

## The examples

| File                                          | Place              | What it shows                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `coluna-mg-cristalino-abastecimento.well`     | Coluna/MG          | Fractured granite under 66 m of saprolite. Telescoping hole (12"→6"), Nold screens alternating with casing, stick-up, centralizers, water-bearing fractures. 24 h test with recovery and a Cooper-Jacob analysis. Three permits (granted → renewed → renewal `requested`) with conditions and fulfillments. Meter replacement (mechanical → telemetered electromagnetic), semiannual then telemetered production, operating regime, two samples. |
| `sete-lagoas-mg-carste-industrial.well`       | Sete Lagoas/MG     | Bambuí karst with a cave (`caves`) and a solution-widened fracture. An old test with only the final reading. A 1989 analysis. Status runs active → inactive → decommissioned.                                                                                                                                                                                                                                                                    |
| `minas-novas-mg-cadastro-incompleto.well`     | Minas Novas/MG     | Incomplete record: construction and lithology only. No test, sample or status (status unknown).                                                                                                                                                                                                                                                                                                                                                  |
| `rinopolis-sp-estratigrafico-guarani.well`    | Rinópolis/SP       | 1561 m stratigraphic well through 1092 m of basalt into the confined Guarani. Flowing (negative `static_level`), with alkaline thermal water. Stress test for render scale.                                                                                                                                                                                                                                                                      |
| `estrela-doeste-sp-bauru-serra-geral.well`    | Estrela d'Oeste/SP | Five hole diameters (18"→6"), five screens, surface casing, mixed intake from Bauru sandstone and Serra Geral basalt. Pump in the open hole. Nitrate time series approaching the potability limit.                                                                                                                                                                                                                                               |
| `gastao-vidigal-sp-dados-inconsistentes.well` | Gastão Vidigal/SP  | Inconsistencies kept on purpose: casing starts at 0.7 m, grouting recorded twice, a test with 0.2 m of drawdown, static levels that disagree.                                                                                                                                                                                                                                                                                                    |
| `belem-pa-pirabas-abastecimento.well`         | Belém/PA           | 265 m urban supply well. 36"/24"/17½" hole, 14"→8" `reduction`, stainless wire-wrap screens, gravel pack and bottom plug, 25 lithology layers (Barreiras over Pirabas). Step-drawdown test with Jacob B/C and efficiency. Redevelopment, permit, telemetered production, a sample with high iron.                                                                                                                                                |
| `belem-pa-condominio-outorga.well`            | Belém/PA           | Current regulatory path for a condominium well: CNARH registration, permit with conditions (one fulfilled late), meter, monthly readings.                                                                                                                                                                                                                                                                                                        |
| `belem-pa-qualidade-agua-acida.well`          | Icoaraci, Belém/PA | Water quality: acidic Barreiras water (pH < 5), censored results (`<`, `not_detected`, `estimated` with DL/QL), purge readings, field duplicate and field blank, a bacterial contamination incident with disinfection.                                                                                                                                                                                                                           |
| `belem-pa-poco-colmatado.well`                | Belém/PA           | Clogging: specific capacity drops over time, camera inspection, acid treatment and air-lift that do not recover it, then decommissioning.                                                                                                                                                                                                                                                                                                        |
| `belem-pa-poco-raso-abandonado.well`          | Belém/PA           | 12 m jetted well (`x-jetting`) with a high yield, contaminated by sewage, abandoned without being plugged.                                                                                                                                                                                                                                                                                                                                       |
| `santarem-pa-jorrante-alter-do-chao.well`     | Santarém/PA        | Flowing well (head 3.98 m above ground) in the Alter do Chão aquifer. 52 h test with high well loss and Jacob transmissivity.                                                                                                                                                                                                                                                                                                                    |
| `sao-gabriel-rs-cacimba.well`                 | São Gabriel/RS     | Hand-dug well (`hand_dug`, Ø 1.2 m, brick lining). Levels during the 2022–23 drought and after the 2024 flood, coliforms, disinfection, registration as insignificant use.                                                                                                                                                                                                                                                                       |
| `belem-pa-monitoramento-posto.well`           | Belém/PA           | 2" monitoring well at a fuel station. Low-flow sampling with purge stabilization. BTEX by CAS code (`vocabulary: "cas"`) declining during remediation.                                                                                                                                                                                                                                                                                           |

`index.json` lists the same set for applications: `slug`, `file`, `title` and `summary` in `pt`/`en`, `tags`, `well_depth`, `well_type`, `place` and `thumbnail`.

## Thumbnails

`thumbs/<slug>.svg` is a 120 × 248 drawing of each well made by `@welldot/render`: lithology and construction, with no labels, legend or axis. The editor's example list shows it. The files are generated, not drawn by hand:

```bash
pnpm --filter @welldot/core build && pnpm --filter @welldot/render build
pnpm --filter @welldot/render thumbnails:examples
```

The script ([`packages/render/scripts/generate-example-thumbnails.mjs`](../../render/scripts/generate-example-thumbnails.mjs)) draws each example in jsdom. It then merges duplicate texture patterns, drops text and classes, and renames ids so a rerun only changes what was really redrawn. Run it again after adding or changing an example, or when the renderer's drawing changes.

## Mapping rules used for the physical base

- **Coordinates:** SIAGAS latitude/longitude (GGMMSS, south/west) → negative decimal degrees, with `original_crs` set to the SIRGAS 2000 UTM zone. A SIAGAS elevation (`cota`) of 0 means unknown. Where an elevation is given, it is orthometric (`elevation_datum: "x-imbituba"`).
- **Zero means missing:** SIAGAS writes 0 for an unknown value. It is never copied as 0.
- **Diameters:** hole diameters use the bit size in mm. Pipes use the real outer diameter of the nominal size (6" steel → 168 mm, 8" → 219 mm, 14" → 356 mm).
- **Stick-up:** the SIAGAS "altura da boca" becomes a negative `from` on the first casing.
- **Annulus:** grouting → `hole_fill` `seal`; gravel and sand → `gravel_pack`.
- **Lithology:** each SIAGAS layer, plus `geologic_unit` from "Formação Geológica" and `aquifer_unit` from "Aquífero no Ponto". `color` and FGDC `texture` are taken from the description.
- **Water entries** → `fractures` with `water_intake: true`.
- **Censored results:** SIAGAS writes values below the detection limit as negatives. They become `qualifier: "<"` with the absolute value.
- **Flowing wells:** when SIAGAS shows "Surgência: S", the static level is written negative (head above ground).
- **SIAGAS status** (Parado, Fechado, Colmatado, Abandonado, Equipado) → a `status_change` entry in `history_logs`.

## Adding an example

1. Add the `.well` file here. Name it `<place>-<state>-<scenario>.well` in lowercase ASCII.
2. Add its entry to `index.json`, with `"thumbnail": "thumbs/<slug>.svg"`.
3. Generate its thumbnail (see [Thumbnails](#thumbnails)).
4. Run `pnpm test` in `packages/core`.
5. Check that `getOperationWarnings`, `getPermitWarnings`, `getPumpInstallationWarnings` and `getWaterSampleWarnings` from `@welldot/utils` return no warnings. All current examples are warning-free, including the inconsistent one: its problems are ones these helpers don't detect yet.
