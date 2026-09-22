import {
  FORBIDDEN_AI_HEALTHCARE_ACTIONS,
  HEALTHCARE_BOUNDARY_DISCLAIMER,
  HEALTHCARE_INTEROP_BOUNDARY_DISCLAIMER,
  HEALTHCARE_RESEARCH_BOUNDARY_DISCLAIMER,
  HEALTHCARE_SAFETY_BOUNDARY_DISCLAIMER,
} from './healthcare.constants';
import { FORBIDDEN_HEALTHCARE_CLIENT_AUTH_FIELDS } from './healthcare-schema.constants';

describe('Healthcare invariants', () => {
  it('documents consent is not universal permission', () => {
    expect(HEALTHCARE_BOUNDARY_DISCLAIMER).toContain('not universal permission');
  });

  it('documents research access boundaries', () => {
    expect(HEALTHCARE_RESEARCH_BOUNDARY_DISCLAIMER).toContain('minimum-necessary');
  });

  it('documents safety report vs causality distinction', () => {
    expect(HEALTHCARE_SAFETY_BOUNDARY_DISCLAIMER).toContain('does not by itself establish');
  });

  it('forbids AI establishing causality', () => {
    expect(FORBIDDEN_AI_HEALTHCARE_ACTIONS).toContain('ESTABLISH_ADVERSE_EVENT_CAUSALITY');
  });

  it('forbids client-supplied causality and success fields', () => {
    expect(FORBIDDEN_HEALTHCARE_CLIENT_AUTH_FIELDS).toContain('causalityEstablished');
    expect(FORBIDDEN_HEALTHCARE_CLIENT_AUTH_FIELDS).toContain('succeeded');
  });

  it('documents interoperability capability vs compliance', () => {
    expect(HEALTHCARE_INTEROP_BOUNDARY_DISCLAIMER).toContain('do not assert standards compliance');
  });
});
