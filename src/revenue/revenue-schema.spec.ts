import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PHASE_REVENUE_ENUM_NAMES, PHASE_REVENUE_MODEL_NAMES } from './revenue-schema.constants';

const schemaPath = join(__dirname, '../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

describe('Revenue & tax administration schema guard', () => {
  for (const modelName of PHASE_REVENUE_MODEL_NAMES) {
    it(`defines model ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of PHASE_REVENUE_ENUM_NAMES) {
    it(`defines enum ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }
});
