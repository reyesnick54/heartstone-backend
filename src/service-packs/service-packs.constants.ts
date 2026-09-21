export const SERVICE_PACK_BOUNDARY_DISCLAIMER =
  'Service pack validation assesses manifest structure and references only. Validation does not create legal authority, institutional acceptance, deployment, or operational activation.';

export const SERVICE_PACK_REASON_CODES = {
  MALFORMED_MANIFEST: 'MALFORMED_MANIFEST',
  UNSUPPORTED_MANIFEST_VERSION: 'UNSUPPORTED_MANIFEST_VERSION',
  DUPLICATE_CODE: 'DUPLICATE_CODE',
  EXECUTABLE_CODE_FORBIDDEN: 'EXECUTABLE_CODE_FORBIDDEN',
  AUTHORITY_AUTO_VALID_FORBIDDEN: 'AUTHORITY_AUTO_VALID_FORBIDDEN',
  ACCEPTED_VERSION_IMMUTABLE: 'ACCEPTED_VERSION_IMMUTABLE',
  NEW_VERSION_REQUIRED: 'NEW_VERSION_REQUIRED',
  DEPENDENCY_REFERENCE_INVALID: 'DEPENDENCY_REFERENCE_INVALID',
  EXTERNAL_DEPENDENCY_FALSELY_CONTROLLED: 'EXTERNAL_DEPENDENCY_FALSELY_CONTROLLED',
  VALIDATION_NOT_ACTIVATION: 'VALIDATION_NOT_ACTIVATION',
  VALIDATION_NOT_DECISION: 'VALIDATION_NOT_DECISION',
  CLIENT_STATUS_FORBIDDEN: 'CLIENT_STATUS_FORBIDDEN',
  CLIENT_IMMUTABLE_FORBIDDEN: 'CLIENT_IMMUTABLE_FORBIDDEN',
  MANIFEST_AUTHORITY_NOT_TRUSTED: 'MANIFEST_AUTHORITY_NOT_TRUSTED',
} as const;

export const FORBIDDEN_CLIENT_SERVICE_PACK_FIELDS = [
  'status',
  'immutable',
  'acceptedAt',
  'acceptedByIdentityId',
  'manifestValidationStatus',
] as const;

export const FORBIDDEN_MANIFEST_EXECUTABLE_KEYS = [
  'script',
  'eval',
  'javascript',
  'jsCode',
  'functionBody',
  'executable',
  'vm',
  'require',
  'module',
  'expressionLanguage',
  'customLogic',
] as const;

export const FORBIDDEN_MANIFEST_AUTHORITY_TRUST_FIELDS = [
  'isValid',
  'authorityValid',
  'automaticallyValid',
  'autoValid',
  'trustedAuthority',
  'governingSourceAuthenticated',
  'lifecycleStatus',
  'classification',
  'functionClass',
] as const;

export const EXECUTABLE_CODE_PATTERNS = [
  /\beval\s*\(/i,
  /\bnew\s+Function\s*\(/i,
  /\brequire\s*\(/i,
  /\bimport\s*\(/i,
  /=>/,
  /function\s*\(/i,
] as const;

export const SERVICE_PACK_MANIFEST_VALIDATION_STATUSES = [
  'DRAFT',
  'VALIDATING',
  'INVALID',
  'VALIDATED',
  'PENDING_REVIEW',
] as const;

export const SERVICE_PACK_VERSION_ACCEPTANCE_STATUSES = ['ACCEPTED'] as const;
