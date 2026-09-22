import {
  FORBIDDEN_AI_PROPERTY_ACTIONS,
  PROPERTY_REASON_CODES,
  PROPERTY_REGISTRY_BOUNDARY_DISCLAIMER,
  PROPERTY_TRANSFER_BOUNDARY_DISCLAIMER,
} from './property-registry.constants';
import { FORBIDDEN_PROPERTY_CLIENT_FIELDS } from './property-registry-schema.constants';

describe('Property registry invariants', () => {
  it('distinguishes applications from title mutations', () => {
    expect(PROPERTY_TRANSFER_BOUNDARY_DISCLAIMER).toContain('not a registry mutation');
    expect(PROPERTY_REGISTRY_BOUNDARY_DISCLAIMER).toContain('do not by themselves alter title');
  });

  it('forbids protected client fields', () => {
    expect(FORBIDDEN_PROPERTY_CLIENT_FIELDS).toContain('registryVersion');
    expect(FORBIDDEN_PROPERTY_CLIENT_FIELDS).toContain('internalParcelIdentifier');
  });

  it('forbids AI consequential property actions', () => {
    expect(FORBIDDEN_AI_PROPERTY_ACTIONS).toContain('ALTER_TITLE');
    expect(FORBIDDEN_AI_PROPERTY_ACTIONS).toContain('ISSUE_PROPERTY_CERTIFICATE');
  });

  it('defines mandatory reason codes', () => {
    expect(PROPERTY_REASON_CODES.TRANSFER_DECISION_REQUIRED).toBeDefined();
    expect(PROPERTY_REASON_CODES.CROSS_PARCEL_ACCESS_DENIED).toBeDefined();
    expect(PROPERTY_REASON_CODES.CERTIFICATE_REQUIRES_REGISTRY_VERSION).toBeDefined();
  });
});
