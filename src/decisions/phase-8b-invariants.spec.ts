import { FORBIDDEN_AI_DECISION_ACTIONS, FORBIDDEN_PHASE_8C_MODELS } from './decisions.constants';

describe('Phase 8B invariants', () => {
  it('AI cannot perform consequential decision actions', () => {
    expect(FORBIDDEN_AI_DECISION_ACTIONS).toContain('APPROVE');
    expect(FORBIDDEN_AI_DECISION_ACTIONS).toContain('ISSUE');
    expect(FORBIDDEN_AI_DECISION_ACTIONS).toContain('SIGN');
    expect(FORBIDDEN_AI_DECISION_ACTIONS).toContain('SEAL');
  });

  it('stops before Phase 8C issuance models', () => {
    expect(FORBIDDEN_PHASE_8C_MODELS).toContain('IssuedLicense');
    expect(FORBIDDEN_PHASE_8C_MODELS).toContain('IssuedPermit');
    expect(FORBIDDEN_PHASE_8C_MODELS).not.toContain('GovernmentDecision');
  });

  it('decision does not equal issuance', () => {
    expect(FORBIDDEN_PHASE_8C_MODELS).not.toContain('GovernmentDecision');
  });
});
