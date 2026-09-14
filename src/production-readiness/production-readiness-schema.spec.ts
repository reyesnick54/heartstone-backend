import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PLATFORM_ENVIRONMENT_CLASSIFICATIONS } from './production-readiness.constants';
import {
  PHASE_13E_ENUM_NAMES,
  PHASE_13E_MODEL_NAMES,
} from './production-readiness-schema.constants';

const schemaPath = join(__dirname, '../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

describe('Phase 13E schema guard', () => {
  for (const modelName of PHASE_13E_MODEL_NAMES) {
    it(`defines model ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of PHASE_13E_ENUM_NAMES) {
    it(`defines enum ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  for (const classification of PLATFORM_ENVIRONMENT_CLASSIFICATIONS) {
    it(`supports environment classification ${classification}`, () => {
      expect(schema).toContain(classification);
    });
  }
});
