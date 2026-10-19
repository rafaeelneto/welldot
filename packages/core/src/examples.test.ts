import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { serializeWell } from './utils/well.utils';
import { parseWell } from './validators/well.validators';

interface IndexEntry {
  slug: string;
  file: string;
  thumbnail: string;
  categories: string[];
}

interface ExamplesIndex {
  categories: { id: string }[];
  examples: IndexEntry[];
}

const EXAMPLES_DIR = join(__dirname, '..', 'examples');
const index = JSON.parse(
  readFileSync(join(EXAMPLES_DIR, 'index.json'), 'utf-8'),
) as ExamplesIndex;

const withoutVersion = (value: object) => {
  const { version: _version, ...rest } = value as Record<string, unknown>;
  return rest;
};

describe('examples', () => {
  it.each(index.examples.map(e => [e.slug, e] as const))(
    '%s parses, round-trips and has its files',
    (_slug, entry) => {
      expect(existsSync(join(EXAMPLES_DIR, entry.file))).toBe(true);
      expect(existsSync(join(EXAMPLES_DIR, entry.thumbnail))).toBe(true);

      const text = readFileSync(join(EXAMPLES_DIR, entry.file), 'utf-8');
      const well = parseWell(text);
      const again = parseWell(serializeWell(well));
      expect(withoutVersion(again)).toEqual(withoutVersion(well));
    },
  );

  it('every example declares version "2.4"', () => {
    for (const entry of index.examples) {
      const raw = JSON.parse(
        readFileSync(join(EXAMPLES_DIR, entry.file), 'utf-8'),
      ) as { version: unknown };
      expect(raw.version, entry.slug).toBe('2.4');
    }
  });

  it('every example whose permits have fulfillments declares location.properties.timezone', () => {
    for (const entry of index.examples) {
      const raw = JSON.parse(
        readFileSync(join(EXAMPLES_DIR, entry.file), 'utf-8'),
      ) as {
        permits?: { conditions?: { fulfillments?: unknown[] }[] }[];
        location?: { properties?: { timezone?: string } };
      };
      const hasFulfillments = (raw.permits ?? []).some(p =>
        (p.conditions ?? []).some(c => (c.fulfillments ?? []).length > 0),
      );
      if (hasFulfillments) {
        expect(raw.location?.properties?.timezone, entry.slug).toBeTruthy();
      }
    }
  });

  it('the Complete Example in object-schemas.md parses as v2.4', () => {
    const doc = readFileSync(
      join(__dirname, '..', 'docs', 'spec', 'v2', 'object-schemas.md'),
      'utf-8',
    );
    const after = doc.slice(doc.indexOf('## Complete Example'));
    const match = /```json\n([\s\S]*?)\n```/.exec(after);
    expect(match).not.toBeNull();
    const well = parseWell(match![1]);
    expect(well.version).toBe('2.4');
  });

  it('no .well file writes a null value', () => {
    const files = readdirSync(EXAMPLES_DIR).filter(f => f.endsWith('.well'));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const text = readFileSync(join(EXAMPLES_DIR, file), 'utf-8');
      expect(text, file).not.toContain(': null');
    }
  });

  it('every category is used by at least three entries', () => {
    for (const category of index.categories) {
      const count = index.examples.filter(e =>
        e.categories.includes(category.id),
      ).length;
      expect(count, category.id).toBeGreaterThanOrEqual(3);
    }
  });
});
