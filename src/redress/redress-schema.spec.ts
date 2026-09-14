import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PHASE_10E_ENUM_NAMES, PHASE_10E_MODEL_NAMES } from './redress-schema.constants';

describe('Phase 10E schema guard', () => {
  const schema = readFileSync(join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8');

  for (const modelName of PHASE_10E_MODEL_NAMES) {
    it(`defines model ${modelName}`, () => {
      expect(schema).toContain(`model ${modelName}`);
    });
  }

  for (const enumName of PHASE_10E_ENUM_NAMES) {
    it(`defines enum ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }
});
