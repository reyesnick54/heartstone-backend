import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { EDUCATION_INVARIANTS } from './education.constants';
import {
  EDUCATION_FOUNDATION_ENUM_NAMES,
  EDUCATION_FOUNDATION_MODEL_NAMES,
} from './education-schema.constants';

const schemaPath = join(__dirname, '../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

describe('Education schema guard', () => {
  for (const modelName of EDUCATION_FOUNDATION_MODEL_NAMES) {
    it(`defines model ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of EDUCATION_FOUNDATION_ENUM_NAMES) {
    it(`defines enum ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  it('keeps enrollment applications from granting enrollment at link time', () => {
    expect(schema).toMatch(
      /model EducationEnrollmentApplicationProfile[\s\S]*doesNotGrantEnrollment\s+Boolean\s+@default\(true\)/,
    );
  });

  it('keeps scholarship applications from creating awards at link time', () => {
    expect(schema).toMatch(
      /model ScholarshipApplicationProfile[\s\S]*doesNotCreateAward\s+Boolean\s+@default\(true\)/,
    );
  });

  it('requires scholarship awards to reference decision workflow', () => {
    expect(schema).toMatch(
      /model ScholarshipAwardRecord[\s\S]*requiresDecisionWorkflow\s+Boolean\s+@default\(true\)/,
    );
  });

  it('preserves education record correction history rows', () => {
    expect(schema).toContain('model EducationRecordCorrectionHistory');
  });

  it('documents education invariants in constants', () => {
    expect(EDUCATION_INVARIANTS.recommendationNotAward).toBe(true);
    expect(EDUCATION_INVARIANTS.institutionCannotSelfAccredit).toBe(true);
  });
});
