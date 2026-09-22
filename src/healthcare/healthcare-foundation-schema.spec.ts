import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { HEALTHCARE_FOUNDATION_MODEL_NAMES } from './healthcare-foundation-schema.constants';

describe('Healthcare foundation schema constants', () => {
  const schema = readFileSync(join(process.cwd(), 'prisma/schema.prisma'), 'utf8');

  it('declares healthcare foundation models in Prisma schema', () => {
    for (const model of HEALTHCARE_FOUNDATION_MODEL_NAMES) {
      expect(schema).toContain(`model ${model}`);
    }
  });
});
