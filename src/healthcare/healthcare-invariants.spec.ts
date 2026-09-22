import {
  FORBIDDEN_AI_HEALTHCARE_ACTIONS,
  HEALTHCARE_BOUNDARY_DISCLAIMER,
  HEALTHCARE_BREAK_GLASS_DISCLAIMER,
  HEALTHCARE_LICENSING_BOUNDARY_DISCLAIMER,
  HEALTHCARE_REASON_CODES,
} from './healthcare.constants';

describe('Healthcare architecture invariants', () => {
  it('distinguishes platform identity from patient health identity', () => {
    expect(HEALTHCARE_BOUNDARY_DISCLAIMER).toContain('Platform login');
    expect(HEALTHCARE_BOUNDARY_DISCLAIMER).toContain('professional licensure');
  });

  it('documents licensing as government service workflow', () => {
    expect(HEALTHCARE_LICENSING_BOUNDARY_DISCLAIMER).toContain('government service workflows');
  });

  it('documents break-glass as bounded emergency access', () => {
    expect(HEALTHCARE_BREAK_GLASS_DISCLAIMER).toContain('not unlimited administrative access');
  });

  it('defines reason codes for mandatory scenarios', () => {
    expect(HEALTHCARE_REASON_CODES.CROSS_PATIENT_ACCESS_DENIED).toBeDefined();
    expect(HEALTHCARE_REASON_CODES.BREAK_GLASS_REASON_REQUIRED).toBeDefined();
    expect(HEALTHCARE_REASON_CODES.AI_NOT_HEALTHCARE_PROFESSIONAL).toBeDefined();
  });

  it('forbids AI from becoming a healthcare professional', () => {
    expect(FORBIDDEN_AI_HEALTHCARE_ACTIONS).toContain('REGISTER_AS_HEALTHCARE_PROFESSIONAL');
  });
});
