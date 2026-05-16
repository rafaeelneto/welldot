import { writeFileSync } from 'fs';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { WellSchema } from '../src/validators/well.validators';

const schema = zodToJsonSchema(WellSchema, {
  $schemaUrl: 'https://json-schema.org/draft/2020-12/schema',
  target: 'jsonSchema2020-12',
  name: undefined,
});

writeFileSync(
  new URL('../docs/schema/v2/well.schema.json', import.meta.url),
  JSON.stringify(schema, null, 2),
);
