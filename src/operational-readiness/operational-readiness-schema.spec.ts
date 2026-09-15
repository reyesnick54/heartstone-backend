import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  PHASE_13A_ENUM_NAMES,
  PHASE_13A_MODEL_NAMES,
} from './operational-readiness-schema.constants';

describe('Operational readiness schema (Phase 13A)', () => {
  const schema = readFileSync(join(process.cwd(), 'prisma/schema.prisma'), 'utf8');

  for (const modelName of PHASE_13A_MODEL_NAMES) {
    it(`defines ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of PHASE_13A_ENUM_NAMES) {
    it(`defines ${enumName} exactly once`, () => {
      const matches = schema.match(new RegExp(`enum ${enumName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  it('does not expose a generic activate-production route in the controller', () => {
    const controller = readFileSync(
      join(process.cwd(), 'src/operational-readiness/operational-readiness.controller.ts'),
      'utf8',
    );
    expect(controller).not.toMatch(/activate-production/i);
    expect(controller).not.toMatch(/@Post\(['"]activate['"]\)/);
  });
});
