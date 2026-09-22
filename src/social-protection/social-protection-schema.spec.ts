import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { SOCIAL_PROTECTION_INVARIANTS } from './social-protection.constants';
import {
  SOCIAL_PROTECTION_FOUNDATION_ENUM_NAMES,
  SOCIAL_PROTECTION_FOUNDATION_MODEL_NAMES,
} from './social-protection-schema.constants';

const schemaPath = join(__dirname, '../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

describe('Social protection schema guard', () => {
  for (const modelName of SOCIAL_PROTECTION_FOUNDATION_MODEL_NAMES) {
    it(`defines model ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of SOCIAL_PROTECTION_FOUNDATION_ENUM_NAMES) {
    it(`defines enum ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  it('keeps benefit application profiles from creating awards at link time', () => {
    expect(schema).toMatch(
      /model BenefitApplicationProfile[\s\S]*doesNotCreateBenefitAward\s+Boolean\s+@default\(true\)/,
    );
  });

  it('keeps eligibility assessments from implicitly creating awards', () => {
    expect(schema).toMatch(
      /model BenefitEligibilityAssessment[\s\S]*doesNotCreateBenefitAward\s+Boolean\s+@default\(true\)/,
    );
  });

  it('preserves benefit award version history rows', () => {
    expect(schema).toContain('model BenefitAwardVersion');
  });

  it('documents social protection invariants in constants', () => {
    expect(SOCIAL_PROTECTION_INVARIANTS.applicationNotAward).toBe(true);
    expect(SOCIAL_PROTECTION_INVARIANTS.appealPreservesOriginalDecision).toBe(true);
  });
});
