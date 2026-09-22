import {
  EDUCATION_AI_BOUNDARY_DISCLAIMER,
  EDUCATION_BOUNDARY_DISCLAIMER,
  EDUCATION_INVARIANTS,
  EDUCATION_PAYMENT_BOUNDARY_DISCLAIMER,
  EDUCATION_REASON_CODES,
  FORBIDDEN_AI_EDUCATION_ACTIONS,
} from './education.constants';
import {
  FORBIDDEN_CLIENT_ACADEMIC_CREDENTIAL_FIELDS,
  PUBLIC_EDUCATION_VERIFICATION_FORBIDDEN_RESPONSE_KEYS,
} from './education-schema.constants';

describe('Education invariants', () => {
  it('distinguishes application from enrollment', () => {
    expect(EDUCATION_BOUNDARY_DISCLAIMER).toContain('do not confer');
    expect(EDUCATION_INVARIANTS.applicationNotEnrollment).toBe(true);
  });

  it('distinguishes payment from admission', () => {
    expect(EDUCATION_PAYMENT_BOUNDARY_DISCLAIMER).toContain('does not create admission');
  });

  it('forbids AI consequential education actions', () => {
    expect(FORBIDDEN_AI_EDUCATION_ACTIONS).toContain('ISSUE_ACADEMIC_CREDENTIAL');
  });

  it('defines reason codes for mandatory scenarios', () => {
    expect(EDUCATION_REASON_CODES.CROSS_STUDENT_ACCESS_DENIED).toBeDefined();
    expect(EDUCATION_REASON_CODES.GUARDIAN_ACCESS_REVOKED).toBeDefined();
  });

  it('restricts public verification response keys', () => {
    expect(PUBLIC_EDUCATION_VERIFICATION_FORBIDDEN_RESPONSE_KEYS).toContain('transcript');
    expect(PUBLIC_EDUCATION_VERIFICATION_FORBIDDEN_RESPONSE_KEYS).toContain('grades');
  });

  it('forbids client forged academic credential fields', () => {
    expect(FORBIDDEN_CLIENT_ACADEMIC_CREDENTIAL_FIELDS).toContain('governmentDecisionId');
  });

  it('documents AI boundary disclaimer', () => {
    expect(EDUCATION_AI_BOUNDARY_DISCLAIMER).toContain('cannot approve admission');
  });
});
