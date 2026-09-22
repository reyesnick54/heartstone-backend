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

  it('links student profiles to Identity without duplicate person tables', () => {
    expect(schema).toMatch(
      /model StudentEducationProfile[\s\S]*studentIdentityId[\s\S]*@relation\("EducationStudentProfile"/,
    );
    expect(schema).not.toMatch(/model EducationPerson\b/);
  });

  it('keeps admission application profiles from creating enrollment at link time', () => {
    expect(schema).toMatch(
      /model EducationAdmissionApplicationProfile[\s\S]*doesNotCreateEnrollment\s+Boolean\s+@default\(true\)/,
    );
  });

  it('keeps institution registration distinct from accreditation', () => {
    expect(schema).toMatch(
      /model EducationInstitutionRegistration[\s\S]*registrationDoesNotAccredit\s+Boolean\s+@default\(true\)/,
    );
    expect(schema).toContain('model EducationInstitutionAccreditation');
  });

  it('preserves transcript correction history', () => {
    expect(schema).toContain('model TranscriptRecordCorrectionHistory');
  });

  it('documents education invariants in constants', () => {
    expect(EDUCATION_INVARIANTS.applicationNotEnrollment).toBe(true);
    expect(EDUCATION_INVARIANTS.institutionCannotSelfAccredit).toBe(true);
  });
});
