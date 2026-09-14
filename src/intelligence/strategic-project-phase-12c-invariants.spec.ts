import {
  FORBIDDEN_AI_STRATEGIC_PROJECT_ACTIONS,
  PHASE_12C_INVARIANTS,
  PROJECT_PROJECTION_DISCLAIMER,
  RISK_SCORE_DISCLAIMER,
  SECTOR_OBSERVATION_DISCLAIMER,
} from './intelligence.constants';

describe('Phase 12C strategic project invariants', () => {
  it('declares all required invariants', () => {
    expect(PHASE_12C_INVARIANTS).toHaveLength(14);
    expect(PHASE_12C_INVARIANTS).toContain('inquiry is not qualified application');
    expect(PHASE_12C_INVARIANTS).toContain('project announcement is not operational');
    expect(PHASE_12C_INVARIANTS).toContain('planned milestone is not completed');
    expect(PHASE_12C_INVARIANTS).toContain('reported milestone is not verified');
    expect(PHASE_12C_INVARIANTS).toContain('proposed capital is not committed');
    expect(PHASE_12C_INVARIANTS).toContain('committed capital is not deployed');
    expect(PHASE_12C_INVARIANTS).toContain('employment forecast is not verified employment');
    expect(PHASE_12C_INVARIANTS).toContain(
      'dashboard status is not proof of infrastructure completion',
    );
    expect(PHASE_12C_INVARIANTS).toContain('applicant assertion is not independent verification');
    expect(PHASE_12C_INVARIANTS).toContain('government dependency owner is preserved');
    expect(PHASE_12C_INVARIANTS).toContain('risk score cannot change project approval');
    expect(PHASE_12C_INVARIANTS).toContain('AI cannot promote project stage autonomously');
    expect(PHASE_12C_INVARIANTS).toContain('adverse project status is preserved');
    expect(PHASE_12C_INVARIANTS).toContain('public economic claim requires claim review');
  });

  it('forbids consequential AI strategic project actions', () => {
    expect(FORBIDDEN_AI_STRATEGIC_PROJECT_ACTIONS).toContain('PROMOTE_PROJECT_STAGE');
    expect(FORBIDDEN_AI_STRATEGIC_PROJECT_ACTIONS).toContain('SET_MILESTONE_COMPLETED');
    expect(FORBIDDEN_AI_STRATEGIC_PROJECT_ACTIONS).toContain('ESCALATE_CAPITAL_CLASSIFICATION');
    expect(FORBIDDEN_AI_STRATEGIC_PROJECT_ACTIONS).toContain('COUNT_FORECAST_AS_EMPLOYMENT');
    expect(FORBIDDEN_AI_STRATEGIC_PROJECT_ACTIONS).toContain(
      'VERIFY_INFRASTRUCTURE_FROM_DASHBOARD',
    );
    expect(FORBIDDEN_AI_STRATEGIC_PROJECT_ACTIONS).toContain(
      'PUBLISH_ECONOMIC_CLAIM_WITHOUT_REVIEW',
    );
    expect(FORBIDDEN_AI_STRATEGIC_PROJECT_ACTIONS).toContain('CLEAR_ADVERSE_STATUS');
  });

  it('includes projection and sector disclaimers', () => {
    expect(PROJECT_PROJECTION_DISCLAIMER).toContain('not an approval decision');
    expect(SECTOR_OBSERVATION_DISCLAIMER).toContain('national economic causation');
    expect(RISK_SCORE_DISCLAIMER).toContain('prioritization aids only');
  });
});
