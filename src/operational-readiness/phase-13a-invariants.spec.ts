import {
  FORBIDDEN_AI_MATURITY_ACTIONS,
  FORBIDDEN_CLIENT_DEPENDENCY_FIELDS,
  FORBIDDEN_CLIENT_MATURITY_FIELDS,
  FORBIDDEN_CLIENT_READINESS_FIELDS,
  MATURITY_ADVANCEMENT_PATH,
  PHASE_13A_BOUNDARY_DISCLAIMER,
} from './operational-readiness.constants';
import { PHASE_13A_ENUM_NAMES, PHASE_13A_MODEL_NAMES } from './operational-readiness-schema.constants';

describe('Phase 13A invariants', () => {
  it('declares core boundary disclaimer separating authority, readiness, acceptance, and activation', () => {
    expect(PHASE_13A_BOUNDARY_DISCLAIMER).toContain('Authority does not equal activation');
    expect(PHASE_13A_BOUNDARY_DISCLAIMER).toContain('Technical completion does not equal production readiness');
    expect(PHASE_13A_BOUNDARY_DISCLAIMER).toContain('Production readiness does not equal institutional acceptance');
    expect(PHASE_13A_BOUNDARY_DISCLAIMER).toContain(
      'Institutional acceptance does not equal operational activation',
    );
  });

  it('forbids client mutation of maturity state fields', () => {
    expect(FORBIDDEN_CLIENT_MATURITY_FIELDS).toContain('currentMaturityState');
    expect(FORBIDDEN_CLIENT_MATURITY_FIELDS).toContain('isOperational');
  });

  it('forbids client mutation of derived readiness status fields', () => {
    expect(FORBIDDEN_CLIENT_READINESS_FIELDS).toContain('overallStatus');
  });

  it('forbids client mutation of verified dependency readiness fields', () => {
    expect(FORBIDDEN_CLIENT_DEPENDENCY_FIELDS).toContain('isReady');
    expect(FORBIDDEN_CLIENT_DEPENDENCY_FIELDS).toContain('verificationStatus');
  });

  it('forbids AI from consequential maturity actions', () => {
    expect(FORBIDDEN_AI_MATURITY_ACTIONS).toContain('ADVANCE_MATURITY');
    expect(FORBIDDEN_AI_MATURITY_ACTIONS).toContain('RECORD_INSTITUTIONAL_ACCEPTANCE');
    expect(FORBIDDEN_AI_MATURITY_ACTIONS).toContain('RECORD_OPERATIONAL_ACTIVATION');
    expect(FORBIDDEN_AI_MATURITY_ACTIONS).toContain('ACCEPT_RESIDUAL_RISK');
  });

  it('defines a linear maturity advancement path without arbitrary terminal shortcuts', () => {
    expect(MATURITY_ADVANCEMENT_PATH[0]).toBe('CONCEPTUAL');
    expect(MATURITY_ADVANCEMENT_PATH.at(-1)).toBe('OPERATIONALLY_ACTIVATED');
    expect(MATURITY_ADVANCEMENT_PATH).toHaveLength(8);
  });

  it('defines all required Phase 13A models', () => {
    expect(PHASE_13A_MODEL_NAMES).toHaveLength(13);
    expect(PHASE_13A_MODEL_NAMES).toContain('CapabilityMaturityHistory');
    expect(PHASE_13A_MODEL_NAMES).toContain('CapabilityRevalidationRequirement');
  });

  it('defines all required Phase 13A enums including readiness domains and safe halt triggers', () => {
    expect(PHASE_13A_ENUM_NAMES).toContain('ProductionReadinessDomain');
    expect(PHASE_13A_ENUM_NAMES).toContain('SafeHaltTriggerType');
    expect(PHASE_13A_ENUM_NAMES).toContain('CapabilityRevalidationTrigger');
  });
});
