import {
  FORBIDDEN_AI_IMMIGRATION_ACTIONS,
  IMMIGRATION_BOUNDARY_DISCLAIMER,
  IMMIGRATION_INVARIANTS,
} from './immigration.constants';

describe('Immigration invariants registry', () => {
  it('distinguishes application from immigration status', () => {
    expect(IMMIGRATION_INVARIANTS.applicationNotStatus).toBe(true);
    expect(IMMIGRATION_BOUNDARY_DISCLAIMER).toContain('does not grant');
  });

  it('distinguishes payment from approval', () => {
    expect(IMMIGRATION_INVARIANTS.paymentNotApproval).toBe(true);
  });

  it('forbids AI from consequential immigration approvals', () => {
    expect(FORBIDDEN_AI_IMMIGRATION_ACTIONS).toContain('APPROVE_VISA');
    expect(FORBIDDEN_AI_IMMIGRATION_ACTIONS).toContain('APPROVE_RESIDENCY');
    expect(FORBIDDEN_AI_IMMIGRATION_ACTIONS).toContain('APPROVE_CITIZENSHIP');
  });

  it('preserves status history and external ownership boundaries', () => {
    expect(IMMIGRATION_INVARIANTS.statusHistoryPreserved).toBe(true);
    expect(IMMIGRATION_INVARIANTS.externalDeterminationNotOwned).toBe(true);
  });
});
