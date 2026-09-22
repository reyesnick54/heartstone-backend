import {
  FORBIDDEN_AI_PLANNING_ACTIONS,
  PLANNING_BOUNDARY_DISCLAIMER,
  PLANNING_METRICS_DISCLAIMER,
  PLANNING_PAYMENT_BOUNDARY_DISCLAIMER,
  PLANNING_REASON_CODES,
} from './planning-construction.constants';
import {
  FORBIDDEN_CLIENT_OCCUPANCY_FIELDS,
  FORBIDDEN_CLIENT_PERMIT_ISSUANCE_FIELDS,
} from './planning-construction-schema.constants';

describe('Planning & construction invariants', () => {
  it('distinguishes portal projections from permit issuance', () => {
    expect(PLANNING_BOUNDARY_DISCLAIMER).toMatch(/do not constitute permit issuance/i);
  });

  it('distinguishes payment from permit approval', () => {
    expect(PLANNING_PAYMENT_BOUNDARY_DISCLAIMER).toMatch(/does not approve or issue permits/i);
  });

  it('states metrics are not legal determinations', () => {
    expect(PLANNING_METRICS_DISCLAIMER).toMatch(/do not constitute legal determinations/i);
  });

  it('forbids client protected permit issuance fields', () => {
    expect(FORBIDDEN_CLIENT_PERMIT_ISSUANCE_FIELDS).toContain('issuedByOfficeholderId');
    expect(FORBIDDEN_CLIENT_PERMIT_ISSUANCE_FIELDS).toContain('status');
  });

  it('forbids client protected occupancy fields', () => {
    expect(FORBIDDEN_CLIENT_OCCUPANCY_FIELDS).toContain('governmentDecisionId');
  });

  it('forbids AI consequential planning actions', () => {
    expect(FORBIDDEN_AI_PLANNING_ACTIONS).toContain('ISSUE_DEVELOPMENT_PERMIT');
    expect(FORBIDDEN_AI_PLANNING_ACTIONS).toContain('ISSUE_OCCUPANCY_CERTIFICATE');
  });

  it('defines reason codes for mandatory scenarios', () => {
    expect(PLANNING_REASON_CODES.APPLICANT_CANNOT_SELF_ISSUE_PERMIT).toBeDefined();
    expect(PLANNING_REASON_CODES.PAYMENT_DOES_NOT_APPROVE).toBeDefined();
    expect(PLANNING_REASON_CODES.EXTERNAL_DEPENDENCY_BLOCKS).toBeDefined();
    expect(PLANNING_REASON_CODES.PERMIT_AUTHORITY_NOT_CONFIGURED).toBeDefined();
  });
});
