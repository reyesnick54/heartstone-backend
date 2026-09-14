import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  CONSEQUENTIAL_USE_IMPACT_AREAS,
  DIGITAL_TWIN_MODES,
  DIGITAL_TWIN_SOURCE_STATUSES,
  DIGITAL_TWIN_TYPES,
} from './intelligence.constants';
import { PHASE_12F_ENUM_NAMES, PHASE_12F_MODEL_NAMES } from './intelligence-schema.constants';

const schemaPath = join(__dirname, '../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

describe('Phase 12F schema guard', () => {
  for (const modelName of PHASE_12F_MODEL_NAMES) {
    it(`defines model ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of PHASE_12F_ENUM_NAMES) {
    it(`defines enum ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  for (const twinType of DIGITAL_TWIN_TYPES) {
    it(`supports digital twin type ${twinType}`, () => {
      expect(schema).toContain(twinType);
    });
  }

  for (const mode of DIGITAL_TWIN_MODES) {
    it(`supports digital twin mode ${mode}`, () => {
      expect(schema).toContain(mode);
    });
  }

  for (const sourceStatus of DIGITAL_TWIN_SOURCE_STATUSES) {
    it(`supports digital twin source status ${sourceStatus}`, () => {
      expect(schema).toContain(sourceStatus);
    });
  }

  for (const impactArea of CONSEQUENTIAL_USE_IMPACT_AREAS) {
    it(`supports consequential use impact area ${impactArea}`, () => {
      expect(schema).toContain(impactArea);
    });
  }

  it('marks twin as non-authoritative by default', () => {
    expect(schema).toContain('isAuthoritativeRecord');
    expect(schema).toContain('@default(false)');
  });

  it('requires rollback plan for live transition', () => {
    expect(schema).toContain('rollbackPlanReference');
  });

  it('keeps snapshots immutable', () => {
    expect(schema).toContain('isImmutable');
  });
});
