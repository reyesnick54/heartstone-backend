export const NON_PRODUCTION_PHASE_8D_FIXTURE_MARKER = 'NON_PRODUCTION_PHASE_8D_TEST_ONLY';

export const SIGNATURE_SEAL_BOUNDARY_DISCLAIMER =
  'A cryptographic credential does not create institutional signing authority. Valid credential does not equal valid authority. Signature image does not equal secure electronic signature. Seal image does not equal valid institutional seal application.';

export const FORBIDDEN_CLIENT_SIGNATURE_FIELDS = [
  'signatureValue',
  'privateKey',
  'certificatePrivateKey',
  'signatureStatus',
  'sealStatus',
  'validationResult',
  'documentHash',
  'integrityEvidence',
] as const;

export const SIGNATURE_EXPLANATION_CODES = {
  CREDENTIAL_WITHOUT_AUTHORITY: 'CREDENTIAL_WITHOUT_AUTHORITY',
  AUTHORITY_WITHOUT_CREDENTIAL: 'AUTHORITY_WITHOUT_CREDENTIAL',
  EXPIRED_APPOINTMENT: 'EXPIRED_APPOINTMENT',
  REVOKED_DELEGATION: 'REVOKED_DELEGATION',
  REVOKED_CERTIFICATE: 'REVOKED_CERTIFICATE',
  WRONG_INSTRUMENT_TYPE: 'WRONG_INSTRUMENT_TYPE',
  HASH_MISMATCH: 'HASH_MISMATCH',
  IMAGE_ONLY_SIGNATURE: 'IMAGE_ONLY_SIGNATURE',
  IMAGE_ONLY_SEAL: 'IMAGE_ONLY_SEAL',
  SERVICE_IDENTITY_CANNOT_SIGN: 'SERVICE_IDENTITY_CANNOT_SIGN',
  AI_CANNOT_SIGN: 'AI_CANNOT_SIGN',
  ADMIN_CANNOT_SIGN: 'ADMIN_CANNOT_SIGN',
  SELF_APPROVAL_DENIED: 'SELF_APPROVAL_DENIED',
  REVOKED_SEAL: 'REVOKED_SEAL',
  CUSTODIAN_NOT_UNLIMITED: 'CUSTODIAN_NOT_UNLIMITED',
  SIGNING_EVENT_APPEND_ONLY: 'SIGNING_EVENT_APPEND_ONLY',
  PRIVATE_KEY_NEVER_PERSISTED: 'PRIVATE_KEY_NEVER_PERSISTED',
  HISTORICAL_SIGNATURE_PRESERVED: 'HISTORICAL_SIGNATURE_PRESERVED',
  DOCUMENT_STATE_DENIED: 'DOCUMENT_STATE_DENIED',
  IDENTITY_ASSURANCE_INSUFFICIENT: 'IDENTITY_ASSURANCE_INSUFFICIENT',
  MFA_REQUIRED: 'MFA_REQUIRED',
  AUTHORIZATION_EXCEEDS_AUTHORITY: 'AUTHORIZATION_EXCEEDS_AUTHORITY',
} as const;

export const PHASE_8D_MODEL_NAMES = [
  'ElectronicSignatureAuthorization',
  'ElectronicSignatureCredentialReference',
  'ElectronicSignatureRecord',
  'ElectronicSignatureValidationRecord',
  'ElectronicSealDefinition',
  'ElectronicSealCustodyAssignment',
  'ElectronicSealUseAuthorization',
  'ElectronicSealUseRecord',
  'SignableInstrumentBinding',
] as const;

export const FORBIDDEN_PRIVATE_KEY_PATTERNS = [
  /BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/i,
  /privateKey/i,
  /pkcs8/i,
] as const;
