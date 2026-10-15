import { parseWell } from '@welldot/core';
import { describe, expect, it } from 'vitest';

import { SiagasError } from './errors';
import { importSiagasWell, normalizeSiagasCode } from './import';
import {
  FLOWING_WELL,
  INVALID_CODE_PAGE,
  NOT_FOUND_PAGE,
  rimasPage,
  siagasPage,
} from './test-utils';

/** A `fetch` serving test pages; `rimas` controls the RIMAS answer. */
function fakeFetch(rimas: 'ok' | 'down' = 'ok') {
  const calls: string[] = [];
  const fn = (async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    const code = url.match(/ponto=(\w+)/)?.[1] ?? '';
    if (url.includes('rimasweb')) {
      if (rimas === 'down') return new Response('', { status: 503 });
      return new Response(
        rimasPage([['2015-05-11', '11.162']], [[`${code}_1.jpg`, 'Foto 1']]),
      );
    }
    if (code === '9999999999') return new Response(NOT_FOUND_PAGE);
    if (!/^\d{10}$/.test(code)) return new Response(INVALID_CODE_PAGE);
    return new Response(siagasPage({ ...FLOWING_WELL, code }));
  }) as typeof fetch;
  return { fn, calls };
}

describe('normalizeSiagasCode', () => {
  it('accepts a code or a detail URL', () => {
    expect(normalizeSiagasCode(' 1500000136 ')).toBe('1500000136');
    expect(normalizeSiagasCode('15.0000.0136')).toBe('1500000136');
    expect(
      normalizeSiagasCode(
        'https://siagasweb.sgb.gov.br/layout/detalhe.php?ponto=3100020782',
      ),
    ).toBe('3100020782');
    expect(
      normalizeSiagasCode(
        'https://rimasweb.sgb.gov.br/layout/detalhe_poco.php?ponto=3100020782',
      ),
    ).toBe('3100020782');
  });

  it('rejects anything else', () => {
    expect(normalizeSiagasCode('abc')).toBeNull();
    expect(normalizeSiagasCode('123')).toBeNull();
    expect(normalizeSiagasCode('15000001361')).toBeNull();
  });
});

describe('importSiagasWell', () => {
  it('fetches, converts, validates and serializes', async () => {
    const { fn, calls } = fakeFetch();
    const result = await importSiagasWell('1500005635', { fetch: fn });
    expect(calls).toHaveLength(2);
    expect(parseWell(result.json).name).toBe('4ST-05-PA');
    expect(result.well.attachments).toHaveLength(2);
    expect(result.source).toMatchObject({
      url: 'https://siagasweb.sgb.gov.br/layout/detalhe.php?ponto=1500005635',
      rimas_url:
        'https://rimasweb.sgb.gov.br/layout/detalhe_poco.php?ponto=1500005635',
    });
    expect((result.well as Record<string, unknown>)['x-siagas']).toMatchObject({
      fetched_at: result.source.fetched_at,
    });
  });

  it('skips RIMAS when neither the series nor the media are wanted', async () => {
    const { fn, calls } = fakeFetch();
    await importSiagasWell('1500000136', {
      fetch: fn,
      rimas: 'none',
      media: false,
    });
    expect(calls).toEqual([
      'https://siagasweb.sgb.gov.br/layout/detalhe.php?ponto=1500000136',
    ]);
  });

  it('turns a RIMAS failure into a warning', async () => {
    const { fn } = fakeFetch('down');
    const result = await importSiagasWell('1500000136', { fetch: fn });
    expect(result.warnings.map(w => w.code)).toContain('rimas_unavailable');
  });

  it.each([
    ['abc', 'invalid_code'],
    ['9999999999', 'not_found'],
  ])('rejects %s with %s', async (input, kind) => {
    const { fn } = fakeFetch();
    await expect(importSiagasWell(input, { fetch: fn })).rejects.toMatchObject({
      kind,
    });
  });

  it('reports an unreachable server as upstream', async () => {
    const fn = (async () => {
      throw new TypeError('fetch failed');
    }) as typeof fetch;
    const error = await importSiagasWell('1500000136', { fetch: fn }).catch(
      e => e,
    );
    expect(error).toBeInstanceOf(SiagasError);
    expect(error.kind).toBe('upstream');
  });
});
