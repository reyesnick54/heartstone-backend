import {
  FORBIDDEN_AI_COMPLIANCE_ACTIONS,
  FORBIDDEN_COMPLIANCE_REVIEW_CLIENT_FIELDS,
  FORBIDDEN_COMPLIANCE_SUBMISSION_CLIENT_FIELDS,
  PHASE_9B_BOUNDARY_DISCLAIMER,
} from './compliance.constants';
import { FORBIDDEN_COMPLIANCE_REVIEW_STATUSES } from './compliance-schema.constants';

describe('Phase 9B invariants', () => {
  it('receipt is distinguished from compliance determination', () => {
    expect(PHASE_9B_BOUNDARY_DISCLAIMER).toContain('receipt');
    expect(PHASE_9B_BOUNDARY_DISCLAIMER).not.toContain('verified compliant');
  });

  it('forbids client-set submission status that would imply verification', () => {
    expect(FORBIDDEN_COMPLIANCE_SUBMISSION_CLIENT_FIELDS).toContain('status');
  });

  it('forbids client-set review finalization fields', () => {
    expect(FORBIDDEN_COMPLIANCE_REVIEW_CLIENT_FIELDS).toContain('status');
    expect(FORBIDDEN_COMPLIANCE_REVIEW_CLIENT_FIELDS).toContain('finalizedAt');
  });

  it('AI cannot perform consequential compliance actions', () => {
    expect(FORBIDDEN_AI_COMPLIANCE_ACTIONS).toContain('DECLARE_VIOLATION');
    expect(FORBIDDEN_AI_COMPLIANCE_ACTIONS).toContain('DECLARE_LEGAL_COMPLIANCE');
    expect(FORBIDDEN_AI_COMPLIANCE_ACTIONS).toContain('FINALIZE_REVIEW');
    expect(FORBIDDEN_AI_COMPLIANCE_ACTIONS).toContain('CHANGE_DEADLINE');
  });

  it('does not expose VERIFIED_COMPLIANT or LEGALLY_COMPLIANT review statuses', () => {
    expect(FORBIDDEN_COMPLIANCE_REVIEW_STATUSES).toContain('VERIFIED_COMPLIANT');
    expect(FORBIDDEN_COMPLIANCE_REVIEW_STATUSES).toContain('LEGALLY_COMPLIANT');
  });
});
