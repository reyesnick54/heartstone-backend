import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { HEALTHCARE_DATA_CATEGORIES } from './healthcare.constants';
import { HEALTHCARE_ENUM_NAMES, HEALTHCARE_MODEL_NAMES } from './healthcare-schema.constants';

const schemaPath = join(__dirname, '../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

describe('Healthcare domain schema guard', () => {
  for (const modelName of HEALTHCARE_MODEL_NAMES) {
    it(`defines model ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of HEALTHCARE_ENUM_NAMES) {
    it(`defines enum ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  for (const category of HEALTHCARE_DATA_CATEGORIES) {
    it(`supports health data category ${category}`, () => {
      expect(schema).toContain(category);
    });
  }

  it('requires authority evaluation for official healthcare registry entries', () => {
    expect(schema).toMatch(
      /model HealthcareRegistryEntry[\s\S]*authorityEvaluationRecordId String\s+@db\.Uuid/,
    );
  });

  it('stores jurisdiction privacy hooks without embedding medical privacy law', () => {
    expect(schema).toMatch(
      /model HealthcareJurisdictionPrivacyHook[\s\S]*externalPolicyPackReference/,
    );
  });

  it('models break-glass sessions with expiration and review flags', () => {
    expect(schema).toMatch(
      /model HealthcareBreakGlassAccessSession[\s\S]*expiresAt[\s\S]*requiresPostAccessReview/,
    );
  });

  it('links professional licenses to government workflow artifacts', () => {
    expect(schema).toMatch(
      /model HealthcareProfessionalLicense[\s\S]*governmentDecisionId[\s\S]*issuanceEventId/,
    );
  });
});
