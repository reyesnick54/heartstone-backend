import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  HEALTHCARE_FOUNDATION_ENUM_NAMES,
  HEALTHCARE_FOUNDATION_MODEL_NAMES,
} from './healthcare-schema.constants';

describe('Healthcare schema constants', () => {
  const schema = readFileSync(join(process.cwd(), 'prisma/schema.prisma'), 'utf8');

  it('declares healthcare foundation models in Prisma schema', () => {
    for (const model of HEALTHCARE_FOUNDATION_MODEL_NAMES) {
      expect(schema).toContain(`model ${model}`);
    }
  });

  it('declares healthcare foundation enums in Prisma schema', () => {
    for (const enumName of HEALTHCARE_FOUNDATION_ENUM_NAMES) {
      expect(schema).toContain(`enum ${enumName}`);
    }
  });
});
