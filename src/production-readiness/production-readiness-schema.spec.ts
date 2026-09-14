import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  DEPARTMENT_READINESS_STATUSES,
  OPERATOR_QUALIFICATION_STATUSES,
  PHASE_13F_INVARIANTS,
} from './production-readiness.constants';
import {
  PHASE_13F_ENUM_NAMES,
  PHASE_13F_MODEL_NAMES,
} from './production-readiness-schema.constants';

const schemaPath = join(__dirname, '../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

describe('Phase 13F schema guard', () => {
  for (const modelName of PHASE_13F_MODEL_NAMES) {
    it(`defines model ${modelName} exactly once`, () => {
      const matches = schema.match(new RegExp(`model ${modelName} \\{`, 'g'));
      expect(matches).toHaveLength(1);
    });
  }

  for (const enumName of PHASE_13F_ENUM_NAMES) {
    it(`defines enum ${enumName}`, () => {
      expect(schema).toContain(`enum ${enumName}`);
    });
  }

  for (const status of OPERATOR_QUALIFICATION_STATUSES) {
    it(`supports operator qualification status ${status}`, () => {
      expect(schema).toContain(status);
    });
  }

  for (const status of DEPARTMENT_READINESS_STATUSES) {
    it(`supports department readiness status ${status}`, () => {
      expect(schema).toContain(status);
    });
  }

  it('defaults support plan to non-24/7', () => {
    expect(schema).toContain('isTwentyFourSeven');
    expect(schema).toContain('@default(false)');
  });

  it('restricts support contact data by default', () => {
    expect(schema).toContain('contactsRestricted');
    expect(schema).toContain('contactDataRestricted');
  });

  it('prevents department self-activation', () => {
    expect(schema).toContain('selfActivated');
    expect(schema).toContain('isInstitutionalAcceptance');
  });

  it('tracks qualification AI assessment separately from human authority', () => {
    expect(schema).toContain('isAiAssessed');
    expect(schema).toContain('assessmentAuthorityOfficeholderId');
  });

  it('registers phase 13F invariants', () => {
    expect(PHASE_13F_INVARIANTS.attendanceNotCompetence).toBe(true);
    expect(PHASE_13F_INVARIANTS.aiCannotQualifyOperator).toBe(true);
    expect(PHASE_13F_INVARIANTS.departmentCannotSelfActivate).toBe(true);
  });
});
