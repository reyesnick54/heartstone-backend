import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  PHASE_PROPERTY_REGISTRY_ENUM_NAMES,
  PHASE_PROPERTY_REGISTRY_MODEL_NAMES,
} from './property-registry-schema.constants';

const SCHEMA_PATH = join(__dirname, '../../prisma/schema.prisma');

describe('Property registry schema guard', () => {
  const schema = readFileSync(SCHEMA_PATH, 'utf-8');

  it.each(PHASE_PROPERTY_REGISTRY_MODEL_NAMES)('defines model %s', (modelName) => {
    expect(schema).toContain(`model ${modelName}`);
  });

  it.each(PHASE_PROPERTY_REGISTRY_ENUM_NAMES)('defines enum %s', (enumName) => {
    expect(schema).toContain(`enum ${enumName}`);
  });
});
