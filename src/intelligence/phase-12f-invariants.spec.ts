import {
  FORBIDDEN_AI_TWIN_FINAL_ACTIONS,
  FORBIDDEN_CLIENT_TWIN_FIELDS,
  FORBIDDEN_SIMULATION_LIVE_ACTIONS,
  FORBIDDEN_SIMULATION_LIVE_MUTATIONS,
  INTELLIGENCE_REASON_CODES,
  PHASE_12F_BOUNDARY_DISCLAIMER,
} from './intelligence.constants';
import { PHASE_12F_INVARIANTS } from './phase-12f-invariants.constants';

describe('Phase 12F invariants', () => {
  it('documents boundary disclaimer', () => {
    expect(PHASE_12F_BOUNDARY_DISCLAIMER).toContain('Digital Twin != Real Object');
    expect(PHASE_12F_BOUNDARY_DISCLAIMER).toContain('Scenario != Prediction');
    expect(PHASE_12F_BOUNDARY_DISCLAIMER).toContain('Twin Output != Decision');
    expect(PHASE_12F_BOUNDARY_DISCLAIMER).toContain('APPROVED_LIVE_REFERENCE');
  });

  it('defines numbered invariants for required test scenarios', () => {
    expect(PHASE_12F_INVARIANTS).toHaveLength(17);
    expect(PHASE_12F_INVARIANTS.map((item) => item.id)).toEqual(
      Array.from({ length: 17 }, (_, index) => index + 1),
    );
  });

  it('forbids simulation live mutations', () => {
    expect(FORBIDDEN_SIMULATION_LIVE_MUTATIONS).toContain('GovernmentDecision');
    expect(FORBIDDEN_SIMULATION_LIVE_MUTATIONS).toContain('Case');
    expect(FORBIDDEN_SIMULATION_LIVE_MUTATIONS).toContain('OfficialInstrument');
  });

  it('forbids simulation live actions', () => {
    expect(FORBIDDEN_SIMULATION_LIVE_ACTIONS).toContain('ISSUE_LICENSE');
    expect(FORBIDDEN_SIMULATION_LIVE_ACTIONS).toContain('CHANGE_PROJECT_STAGE');
    expect(FORBIDDEN_SIMULATION_LIVE_ACTIONS).toContain('SEND_PUBLIC_EVENT_NOTICE');
  });

  it('forbids AI final consequential actions', () => {
    expect(FORBIDDEN_AI_TWIN_FINAL_ACTIONS).toContain('FINAL_DECIDE');
    expect(FORBIDDEN_AI_TWIN_FINAL_ACTIONS).toContain('AUTHORIZE_LIVE_TRANSITION');
  });

  it('forbids client protected fields', () => {
    expect(FORBIDDEN_CLIENT_TWIN_FIELDS).toContain('isAuthoritativeRecord');
    expect(FORBIDDEN_CLIENT_TWIN_FIELDS).toContain('presentedAsPrediction');
    expect(FORBIDDEN_CLIENT_TWIN_FIELDS).toContain('liveActivationAuthorized');
  });

  it('includes reason codes for required gates', () => {
    expect(INTELLIGENCE_REASON_CODES.STALE_TWIN_BLOCKS_USE).toBeDefined();
    expect(INTELLIGENCE_REASON_CODES.ROLLBACK_REQUIRED).toBeDefined();
    expect(INTELLIGENCE_REASON_CODES.TECHNICAL_SUCCESS_NOT_ACTIVATION).toBeDefined();
  });
});
