import { describe, expect, it } from 'vitest';

import { monthlyRimasReadings, parseRimasPage } from './rimas';
import { rimasPage } from './test-utils';

describe('parseRimasPage', () => {
  it('reads the level series, the photos and the documents', () => {
    const page = parseRimasPage(
      rimasPage(
        [
          ['2012-07-13', '19.992'],
          ['2012-07-12', '19.993'],
        ],
        [['3100020782_3.jpg', 'Foto 3 - Poço de Monitoramento em Datas/MG']],
        [['3100020782_perfil.pdf', 'Perfil construtivo']],
      ),
    );
    expect(page.readings).toEqual([
      { date: '2012-07-12', level: 19.993 },
      { date: '2012-07-13', level: 19.992 },
    ]);
    expect(page.media).toEqual([
      {
        kind: 'photo',
        url: 'https://rimasweb.sgb.gov.br/documentos/3100020782_3.jpg',
        filename: '3100020782_3.jpg',
        title: 'Foto 3 - Poço de Monitoramento em Datas/MG',
      },
      {
        kind: 'document',
        url: 'https://rimasweb.sgb.gov.br/documentos/3100020782_perfil.pdf',
        filename: '3100020782_perfil.pdf',
        title: 'Perfil construtivo',
      },
    ]);
  });

  it('returns nothing for a well outside the network', () => {
    expect(parseRimasPage(rimasPage())).toEqual({ readings: [], media: [] });
  });
});

describe('monthlyRimasReadings', () => {
  it('keeps the last reading of each month', () => {
    expect(
      monthlyRimasReadings([
        { date: '2020-01-31', level: 3 },
        { date: '2020-01-02', level: 1 },
        { date: '2020-02-10', level: 2 },
      ]),
    ).toEqual([
      { date: '2020-01-31', level: 3 },
      { date: '2020-02-10', level: 2 },
    ]);
  });
});
