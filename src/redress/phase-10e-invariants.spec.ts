import {
  AUTHORIZED_RECONSIDERATION_STANDARDS,
  FORBIDDEN_AI_REVIEW_ACTIONS,
  FORBIDDEN_CLIENT_REVIEW_FIELDS,
  INTERNAL_REVIEW_GROUNDS,
  PHASE_10E_BOUNDARY_DISCLAIMER,
  REDRESS_REASON_CODES,
  REVIEWER_INDEPENDENCE_OUTCOMES,
} from './redress.constants';

describe('Phase 10E invariants', () => {
  it('documents boundary disclaimer', () => {
    expect(PHASE_10E_BOUNDARY_DISCLAIMER).toContain(
      'does not alter the original government decision',
    );
    expect(PHASE_10E_BOUNDARY_DISCLAIMER).toContain('non-final');
    expect(PHASE_10E_BOUNDARY_DISCLAIMER).toContain(
      'Technical permission never creates review authority',
    );
  });

  it('forbids client-supplied protected fields including admin override', () => {
    expect(FORBIDDEN_CLIENT_REVIEW_FIELDS).toContain('isFinal');
    expect(FORBIDDEN_CLIENT_REVIEW_FIELDS).toContain('systemAdministratorOverride');
    expect(FORBIDDEN_CLIENT_REVIEW_FIELDS).toContain('independenceOverride');
  });

  it('defines authorized reconsideration standards without inventing new ones', () => {
    expect(AUTHORIZED_RECONSIDERATION_STANDARDS).toEqual([
      'ORIGINAL_RECORD_ONLY',
      'ORIGINAL_PLUS_PERMITTED_NEW_EVIDENCE',
      'ERROR_REVIEW',
      'MERITS_RECONSIDERATION',
      'OTHER_AUTHORIZED_STANDARD',
    ]);
  });

  it('defines reviewer independence outcomes', () => {
    expect(REVIEWER_INDEPENDENCE_OUTCOMES).toContain('INDEPENDENT');
    expect(REVIEWER_INDEPENDENCE_OUTCOMES).toContain('REQUIRES_RECUSAL');
    expect(REVIEWER_INDEPENDENCE_OUTCOMES).toContain('UNRESOLVED');
  });

  it('defines internal review grounds', () => {
    expect(INTERNAL_REVIEW_GROUNDS).toContain('AUTHORITY_ERROR');
    expect(INTERNAL_REVIEW_GROUNDS).toContain('PROCEDURAL_ERROR');
    expect(INTERNAL_REVIEW_GROUNDS).toContain('AUTOMATION_DEFECT');
  });

  it('forbids AI from final review dispositions', () => {
    expect(FORBIDDEN_AI_REVIEW_ACTIONS).toContain('affirm');
    expect(FORBIDDEN_AI_REVIEW_ACTIONS).toContain('reverse');
    expect(FORBIDDEN_AI_REVIEW_ACTIONS).toContain('set_aside');
    expect(FORBIDDEN_AI_REVIEW_ACTIONS).toContain('decide_appeal');
  });

  it('includes reason codes for required test scenarios', () => {
    expect(REDRESS_REASON_CODES.ORIGINAL_DECISION_MAKER_BLOCKED).toBeDefined();
    expect(REDRESS_REASON_CODES.MATERIAL_INVOLVEMENT_BLOCKED).toBeDefined();
    expect(REDRESS_REASON_CODES.SYSTEM_ROLE_CANNOT_SATISFY_INDEPENDENCE).toBeDefined();
    expect(REDRESS_REASON_CODES.EXPIRED_APPOINTMENT).toBeDefined();
    expect(REDRESS_REASON_CODES.REVOKED_DELEGATION).toBeDefined();
    expect(REDRESS_REASON_CODES.WRONG_JURISDICTION).toBeDefined();
    expect(REDRESS_REASON_CODES.ADMIN_OVERRIDE_FORBIDDEN).toBeDefined();
    expect(REDRESS_REASON_CODES.OPENING_REVIEW_DOES_NOT_ALTER_DECISION).toBeDefined();
  });
});
