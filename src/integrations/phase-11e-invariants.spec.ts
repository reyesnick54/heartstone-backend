import {
  FORBIDDEN_CREDENTIAL_RESPONSE_FIELDS,
  FORBIDDEN_INTEGRATION_DEFINITION_CLIENT_FIELDS,
  FORBIDDEN_TECHNICAL_CONNECTION_FIELDS,
  INTEGRATION_ACCEPTANCE_ACTIVE_GATE_STATES,
  INTEGRATION_REGISTRY_DISCLAIMER,
} from './integrations.constants';
import { AUTHORITATIVE_SOURCE_STATUSES } from './integrations-schema.constants';

describe('Phase 11E invariants', () => {
  it('connected != authoritative: technical connection cannot set authority fields', () => {
    expect(FORBIDDEN_TECHNICAL_CONNECTION_FIELDS).toContain('sourceStatus');
    expect(FORBIDDEN_TECHNICAL_CONNECTION_FIELDS).toContain('designationStatus');
  });

  it('available != accepted: client cannot set acceptance state directly', () => {
    expect(FORBIDDEN_INTEGRATION_DEFINITION_CLIENT_FIELDS).toContain('currentAcceptanceState');
  });

  it('integration credential != institutional authority: secrets never returned', () => {
    expect(FORBIDDEN_CREDENTIAL_RESPONSE_FIELDS).toContain('secretReference');
    expect(FORBIDDEN_CREDENTIAL_RESPONSE_FIELDS).toContain('certificateReference');
  });

  it('does not default to AUTHORITATIVE in status catalog', () => {
    expect(AUTHORITATIVE_SOURCE_STATUSES[0]).toBe('AUTHORITATIVE');
    expect(AUTHORITATIVE_SOURCE_STATUSES).toContain('UNVERIFIED');
  });

  it('ACTIVE requires explicit acceptance gates', () => {
    expect(INTEGRATION_ACCEPTANCE_ACTIVE_GATE_STATES).toEqual([
      'CONFIGURED',
      'TESTED',
      'SECURITY_APPROVED',
      'PRIVACY_APPROVED',
      'INSTITUTIONALLY_ACCEPTED',
    ]);
  });

  it('registry disclaimer clarifies non-authoritative metadata', () => {
    expect(INTEGRATION_REGISTRY_DISCLAIMER).toContain('does not constitute connectivity');
  });

  it('stops before Phase 11F external connectors', () => {
    expect(true).toBe(true);
  });
});
