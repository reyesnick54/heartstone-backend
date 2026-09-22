import { CivilRegistryAccessClassification } from '@prisma/client';

export const CIVIL_REGISTRY_API_TAG = 'civil-registry';

export const VITAL_EVENT_REFERENCE_PREFIX = 'VE';

export const CIVIL_REGISTRY_ENTRY_REFERENCE_PREFIX = 'CRE';

export const CIVIL_CORRECTION_REQUEST_REFERENCE_PREFIX = 'CCR';

export const CERTIFICATE_EXTRACT_REFERENCE_PREFIX = 'VCE';

export const PLATFORM_ADMIN_ROLE_MARKER = 'PLATFORM_ADMINISTRATIVE_ACCESS';

export const TECHNICAL_ADMIN_ROLE_MARKER = 'TECHNICAL_ADMIN';

export const FORBIDDEN_CLIENT_VITAL_EVENT_FIELDS = [
  'registrationStatus',
  'verificationState',
  'registrationDate',
  'registrarOfficeholderId',
  'registrarIdentityId',
] as const;

export const FORBIDDEN_CLIENT_REGISTRY_ENTRY_FIELDS = [
  'status',
  'accessClassification',
  'currentVersionNumber',
  'registeredAt',
  'governmentDecisionId',
  'authorityEvaluationRecordId',
] as const;

export const OFFICIAL_VITAL_EVENT_STATUSES = ['REGISTERED_OFFICIAL'] as const;

export const OFFICIAL_REGISTRY_ENTRY_STATUSES = ['OFFICIAL', 'AMENDED'] as const;

export const FORBIDDEN_AI_CIVIL_REGISTRY_ACTIONS = [
  'REGISTER_VITAL_EVENT',
  'AMEND_REGISTRY_ENTRY',
  'RECORD_OFFICIAL_ENTRY',
  'ISSUE_CERTIFICATE_EXTRACT',
] as const;

export const HIGHLY_PROTECTED_ACCESS_CLASSIFICATIONS: CivilRegistryAccessClassification[] = [
  CivilRegistryAccessClassification.RESTRICTED,
  CivilRegistryAccessClassification.SEALED,
];

export const CIVIL_REGISTRY_ACCESS_CLASSIFICATIONS = [
  'PUBLIC_VERIFICATION_ONLY',
  'SUBJECT_ACCESS',
  'AUTHORIZED_GOVERNMENT',
  'RESTRICTED',
  'SEALED',
] as const;

/** NON_PRODUCTION template pack identity for civil identity & vital records. */
export const CIVIL_REGISTRY_SERVICE_PACK_ID = 'template-civil-identity-vital-records';

export const CIVIL_REGISTRY_SERVICE_PACK_LABEL = 'NON_PRODUCTION' as const;

export const CIVIL_REGISTRY_SERVICE_FAMILY_CODE = 'TEMPLATE-FAMILY-CIVIL-REGISTRY';

export const CIVIL_REGISTRY_INSTITUTION_CODE = 'TEMPLATE-CIVIL-REGISTRY';

export const CIVIL_REGISTRY_AUTHORITY_FUNCTION_CODES = {
  EVENT_INTAKE: 'TEMPLATE-AUTH-CIVIL-EVENT-INTAKE',
  EVENT_REGISTER: 'TEMPLATE-AUTH-CIVIL-EVENT-REGISTER',
  CERTIFICATE_ISSUE: 'TEMPLATE-AUTH-CIVIL-CERTIFICATE-ISSUE',
  RECORD_AMEND: 'TEMPLATE-AUTH-CIVIL-RECORD-AMEND',
  CORRECTION_APPROVE: 'TEMPLATE-AUTH-CIVIL-CORRECTION-APPROVE',
  VERIFICATION_ATTEST: 'TEMPLATE-AUTH-CIVIL-VERIFICATION-ATTEST',
} as const;

export const CIVIL_REGISTRY_SERVICE_SLUGS = {
  REGISTER_BIRTH: 'template-register-birth',
  REQUEST_BIRTH_CERTIFICATE: 'template-request-birth-certificate',
  REGISTER_DEATH: 'template-register-death',
  REQUEST_DEATH_CERTIFICATE: 'template-request-death-certificate',
  REGISTER_MARRIAGE: 'template-register-marriage',
  REQUEST_MARRIAGE_CERTIFICATE: 'template-request-marriage-certificate',
  REGISTER_DIVORCE: 'template-register-divorce-civil-status-change',
  LEGAL_NAME_CHANGE: 'template-legal-name-change-application',
  RECORD_CORRECTION: 'template-civil-record-correction',
  REGISTRY_VERIFICATION: 'template-civil-registry-verification-service',
} as const;

export const CIVIL_REGISTRY_DISCLAIMERS = {
  templateOnly:
    'NON_PRODUCTION civil registry template — not verified law, policy, or operational authority.',
  submissionNotOfficial:
    'A submitted registration application does not create an official vital record until a consequential registration decision is recorded.',
  verificationMinimalDisclosure:
    'Public verification confirms issuance metadata only and never exposes underlying vital record contents or source evidence.',
  noDirectRecordDownload:
    'Civil records are not exposed through direct download bypasses; certificate requests must use governed GovernmentService applications.',
} as const;

export const VITAL_EVENT_TYPES = [
  'BIRTH',
  'DEATH',
  'MARRIAGE',
  'DIVORCE',
  'LEGAL_NAME_CHANGE',
  'CIVIL_STATUS_CORRECTION',
  'ADOPTION_UPDATE',
  'CIVIL_IDENTITY_REGISTRATION',
] as const;
