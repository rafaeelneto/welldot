import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const schema = JSON.parse(
  readFileSync(
    new URL('../../../spec/schema/v2/well.schema.json', import.meta.url),
    'utf8',
  ),
);

describe('published JSON Schema', () => {
  it('lives in spec/ and is identified by its welldot.org URL', () => {
    expect(schema.$id).toBe('https://welldot.org/schema/v2/well.schema.json');
  });

  it('uses the 2020-12 dialect', () => {
    expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
  });
});
