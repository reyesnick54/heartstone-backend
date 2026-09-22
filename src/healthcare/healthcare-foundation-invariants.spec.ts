import {
  FORBIDDEN_AI_HEALTHCARE_ACTIONS,
  HEALTHCARE_CONSENT_BOUNDARY_DISCLAIMER,
  HEALTHCARE_INTEROP_BOUNDARY_DISCLAIMER,
  HEALTHCARE_RESEARCH_DATASET_BOUNDARY_DISCLAIMER,
  HEALTHCARE_SAFETY_BOUNDARY_DISCLAIMER,
} from './healthcare.constants';

describe('Healthcare foundation invariants', () => {
  it('documents consent is not universal permission', () => {
    expect(HEALTHCARE_CONSENT_BOUNDARY_DISCLAIMER).toContain('not universal permission');
  });

  it('forbids AI establishing causality', () => {
    expect(FORBIDDEN_AI_HEALTHCARE_ACTIONS).toContain('ESTABLISH_ADVERSE_EVENT_CAUSALITY');
  });

  it('documents safety report vs causality distinction', () => {
    expect(HEALTHCARE_SAFETY_BOUNDARY_DISCLAIMER).toContain('does not by itself establish');
  });

  it('documents interoperability capability vs compliance', () => {
    expect(HEALTHCARE_INTEROP_BOUNDARY_DISCLAIMER).toContain('do not assert standards compliance');
  });

  it('documents research dataset boundaries', () => {
    expect(HEALTHCARE_RESEARCH_DATASET_BOUNDARY_DISCLAIMER).toContain('minimum-necessary');
  });
});
