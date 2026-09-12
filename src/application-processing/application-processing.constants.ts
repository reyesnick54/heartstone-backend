export const NON_PRODUCTION_APPLICATION_PROCESSING_FIXTURE_MARKER =
  'NON_PRODUCTION_APPLICATION_PROCESSING_TEST_ONLY';

export const APPLICATION_NUMBER_PREFIX = 'APP';
export const CASE_NUMBER_PREFIX = 'CASE';
export const SUBMISSION_NUMBER_PREFIX = 'SUB';

export const PHASE_6_BOUNDARY_DISCLAIMER =
  'Phase 6 processes applications and cases through administrative review. It does not make final government decisions or issue instruments.';

export const FORBIDDEN_PHASE_7_MODELS = [
  'GovernmentDecision',
  'IssuedLicense',
  'IssuedPermit',
  'IssuedCertificate',
  'EvidenceVault',
  'MasterAdministrativeFile',
] as const;

export const FORBIDDEN_CLIENT_CASE_STATUSES = ['DECIDED', 'ISSUED', 'APPROVED', 'REFUSED'] as const;
