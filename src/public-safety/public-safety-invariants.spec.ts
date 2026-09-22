import {
  PUBLIC_SAFETY_BOUNDARY_DISCLAIMER,
  PUBLIC_SAFETY_INVARIANTS,
  PUBLIC_SAFETY_METRICS_DISCLAIMER,
  PUBLIC_SAFETY_NOTICE_DISCLAIMER,
  PUBLIC_SAFETY_REASON_CODES,
  PUBLIC_SAFETY_TEMPLATE_SERVICE_DEFINITIONS,
} from './public-safety.constants';
import {
  FORBIDDEN_CLIENT_EMERGENCY_DECLARATION_FIELDS,
  FORBIDDEN_CLIENT_INCIDENT_VERIFICATION_FIELDS,
} from './public-safety-schema.constants';

describe('Public safety invariants', () => {
  it('declares twelve template services', () => {
    expect(PUBLIC_SAFETY_TEMPLATE_SERVICE_DEFINITIONS).toHaveLength(12);
  });

  it('distinguishes projections from emergency declarations', () => {
    expect(PUBLIC_SAFETY_BOUNDARY_DISCLAIMER).toMatch(
      /do not constitute an emergency declaration/i,
    );
  });

  it('states metrics are not verified impact findings', () => {
    expect(PUBLIC_SAFETY_METRICS_DISCLAIMER).toMatch(/informational aggregates/i);
  });

  it('separates notice lifecycle stages', () => {
    expect(PUBLIC_SAFETY_NOTICE_DISCLAIMER).toMatch(/Only published government notices/i);
  });

  it('forbids client incident verification forgery fields', () => {
    expect(FORBIDDEN_CLIENT_INCIDENT_VERIFICATION_FIELDS).toContain('verificationStatus');
  });

  it('forbids client emergency authority fields', () => {
    expect(FORBIDDEN_CLIENT_EMERGENCY_DECLARATION_FIELDS).toContain('isOfficialDeclaration');
  });

  it('defines mandatory reason codes', () => {
    expect(PUBLIC_SAFETY_REASON_CODES.CITIZEN_CANNOT_ISSUE_ALERT).toBeDefined();
    expect(
      PUBLIC_SAFETY_REASON_CODES.PLATFORM_ADMIN_CANNOT_CREATE_EMERGENCY_AUTHORITY,
    ).toBeDefined();
    expect(PUBLIC_SAFETY_REASON_CODES.RECOVERY_MUST_NOT_MERGE_INCIDENT).toBeDefined();
  });

  it('declares pack invariants', () => {
    expect(PUBLIC_SAFETY_INVARIANTS.unverifiedReportsLabeled).toBe(true);
    expect(PUBLIC_SAFETY_INVARIANTS.recoverySeparateFromIncidentReport).toBe(true);
    expect(PUBLIC_SAFETY_INVARIANTS.dashboardDoesNotAlterIncidentState).toBe(true);
  });
});
