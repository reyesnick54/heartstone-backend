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
