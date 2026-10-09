import { writeFileSync } from 'fs';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { WellSchema } from '../src/validators/well.validators';

const SCHEMA_DIALECT = 'https://json-schema.org/draft/2020-12/schema';

/**
 * Canonical location of this schema. Third-party implementations `$ref` it, so
 * it must stay stable across releases — version the *format* via the `version`
 * field inside a `.well` file and the `v2/` path segment, not this URL.
 */
const SCHEMA_ID =
  'https://raw.githubusercontent.com/rafaeelneto/welldot/main/packages/core/docs/schema/v2/well.schema.json';

const schema = zodToJsonSchema(WellSchema, {
  $schemaUrl: SCHEMA_DIALECT,
  target: 'jsonSchema2020-12',
  name: undefined,
});

/**
 * `zod-to-json-schema` still emits the draft-07 tuple form (`items: [...]`) in
 * places where it de-duplicates a union member behind a `$ref`. Under
 * 2020-12 `items` must be a single schema and tuples use `prefixItems`, so a
 * validator rejects the document outright. Normalise both cases in place.
 */
function normalizeItems(node: unknown): void {
  if (Array.isArray(node)) {
    node.forEach(normalizeItems);
    return;
  }
  if (node === null || typeof node !== 'object') return;

  const obj = node as Record<string, unknown>;
  if (Array.isArray(obj.items)) {
    obj.items =
      obj.items.length === 1
        ? // Homogeneous single-schema array — the object form is equivalent.
          obj.items[0]
        : // A genuine tuple: 2020-12 spells this `prefixItems`.
          undefined;
    if (obj.items === undefined) {
      obj.prefixItems = (node as { items?: unknown[] }).items;
      delete obj.items;
    }
  }
  Object.values(obj).forEach(normalizeItems);
}

normalizeItems(schema);

/**
 * `zod-to-json-schema` also emits draft-04 boolean bounds for `.positive()`
 * and friends (`minimum: 0, exclusiveMinimum: true`). Under 2020-12 the
 * exclusive bound is itself the number, and a boolean makes the schema
 * invalid. Rewrite both directions in place.
 */
function normalizeExclusiveBounds(node: unknown): void {
  if (Array.isArray(node)) {
    node.forEach(normalizeExclusiveBounds);
    return;
  }
  if (node === null || typeof node !== 'object') return;

  const obj = node as Record<string, unknown>;
  for (const [bound, exclusive] of [
    ['minimum', 'exclusiveMinimum'],
    ['maximum', 'exclusiveMaximum'],
  ] as const) {
    if (typeof obj[exclusive] !== 'boolean') continue;
    if (obj[exclusive] && typeof obj[bound] === 'number') {
      obj[exclusive] = obj[bound];
      delete obj[bound];
    } else {
      delete obj[exclusive];
    }
  }
  Object.values(obj).forEach(normalizeExclusiveBounds);
}

normalizeExclusiveBounds(schema);

// `zodToJsonSchema` does not emit `$schema`/`$id` for an anonymous root schema,
// so attach them here. Key order matters only for readability of the diff.
const document = {
  $schema: SCHEMA_DIALECT,
  $id: SCHEMA_ID,
  title: 'well',
  description:
    'The .well open format — a JSON standard for water well data. Depths in meters, diameters in millimeters, measured from ground level.',
  ...schema,
};

writeFileSync(
  new URL('../docs/schema/v2/well.schema.json', import.meta.url),
  `${JSON.stringify(document, null, 2)}\n`,
);
