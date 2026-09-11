/**
 * Identity models that must remain semantically distinct from Phase 2 government entities.
 */
export const IDENTITY_MODEL_NAMES = [
  'Person',
  'UserAccount',
  'Identity',
  'Credential',
  'Organization',
  'OrganizationMembership',
  'RepresentativeAuthority',
  'AuthenticationMethod',
  'Session',
] as const;

/**
 * Phase 2 government models that must not be duplicated in the identity domain.
 */
export const GOVERNMENT_MODEL_NAMES = [
  'Jurisdiction',
  'Institution',
  'GovernmentBody',
  'Department',
  'Office',
  'Officeholder',
  'Appointment',
  'Delegation',
  'ExternalAuthority',
  'InstitutionExternalAuthority',
] as const;

/**
 * Authority-evaluation fields that must never appear on identity primitives.
 */
export const FORBIDDEN_IDENTITY_AUTHORITY_FIELDS = [
  'isGovernmentAuthority',
  'canApprove',
  'canIssueLicense',
  'canIssuePermit',
  'decisionAuthority',
  'legalAuthority',
] as const;
