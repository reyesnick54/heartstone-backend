import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  PHASE_13E_MODEL_NAMES,
  PHASE_13G_ENUM_NAMES,
  PHASE_13G_MODEL_NAMES,
} from './production-readiness-schema.constants';

describe('Phase 13G schema guards', () => {
  const schema = readFileSync(join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8');

  it.each(PHASE_13E_MODEL_NAMES)('defines model %s exactly once', (modelName) => {
    const pattern = new RegExp(`model ${modelName} \\{`, 'g');
    expect(schema.match(pattern)?.length).toBe(1);
  });

  it.each(PHASE_13G_MODEL_NAMES)('defines model %s exactly once', (modelName) => {
    const pattern = new RegExp(`model ${modelName} \\{`, 'g');
    expect(schema.match(pattern)?.length).toBe(1);
  });

  it.each(PHASE_13G_ENUM_NAMES)('defines enum %s exactly once', (enumName) => {
    const pattern = new RegExp(`enum ${enumName} \\{`, 'g');
    expect(schema.match(pattern)?.length).toBe(1);
  });
});
