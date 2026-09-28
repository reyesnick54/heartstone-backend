export const CARBON_MANAGEMENT_RULE_ENVIRONMENT = 'NON_PRODUCTION' as const;

export const CARBON_MANAGEMENT_SERVICE_PACK_ID = 'template-carbon-management-administration';
export const CARBON_MANAGEMENT_SERVICE_FAMILY_CODE = 'TEMPLATE-FAMILY-CARBON-MANAGEMENT';
export const CARBON_MANAGEMENT_DEPARTMENT_CODE = 'TEMPLATE-DEPARTMENT-CARBON-MANAGEMENT';
export const CARBON_MANAGEMENT_INSTITUTION_CODE = 'TEMPLATE-INSTITUTION';
export const CARBON_MANAGEMENT_SERVICE_CODE_PREFIX = 'TEMPLATE-CM-';

export const CARBON_MANAGEMENT_AUTHORITY = {
  intake: 'TEMPLATE-AUTH-CM-INTAKE',
  programmeReview: 'TEMPLATE-AUTH-CM-PROGRAMME-REVIEW',
  externalVerification: 'TEMPLATE-AUTH-CM-EXTERNAL-VERIFICATION',
  decide: 'TEMPLATE-AUTH-CM-DECIDE',
  issue: 'TEMPLATE-AUTH-CM-ISSUE',
  complianceReview: 'TEMPLATE-AUTH-CM-COMPLIANCE-REVIEW',
} as const;

export const CARBON_PROGRAMME_PREFIX = 'CPRG';
export const CARBON_PROJECT_PREFIX = 'CPRJ';
export const CARBON_AUTHORIZATION_PREFIX = 'CAUT';
export const CARBON_REGISTRY_PREFIX = 'CREG';

export const CARBON_MANAGEMENT_BOUNDARY_DISCLAIMER =
  'Carbon programme and project administration records submitted materials and verification evidence only; they do not constitute government approval, registration, or authorization to trade credits unless issued through a governed decision and official instrument.';

export const CARBON_MARKET_MECHANICS_EXTENSION_DEFAULT = 'NOT_CONFIGURED' as const;

export const FORBIDDEN_AI_CARBON_MANAGEMENT_ACTIONS = [
  'APPROVE_CARBON_ADMINISTRATIVE_AUTHORIZATION',
  'ISSUE_CARBON_REGISTRATION',
  'FINALIZE_CARBON_GOVERNMENT_DECISION',
  'RECORD_OFFICIAL_CARBON_AUTHORIZATION',
] as const;

export const CARBON_MANAGEMENT_INVARIANTS = {
  applicationNotAuthorization: true,
  externalVerificationNotApproval: true,
  registryReferenceNotApproval: true,
  paymentNotApproval: true,
  externalVerificationBlocksWhenRequired: true,
  organizationNotDuplicated: true,
  strategicProjectLinkNotApproval: true,
  aiRecommendationNotDecision: true,
  marketMechanicsRemainConfigurable: true,
  noDuplicateGenericLicenceEngine: true,
} as const;

export const CARBON_MANAGEMENT_REASON_CODES = {
  CROSS_ORGANIZATION_ACCESS_DENIED: 'CARBON_MANAGEMENT_CROSS_ORGANIZATION_ACCESS_DENIED',
  COMMERCIAL_CONFIDENTIAL_ACCESS_DENIED: 'CARBON_MANAGEMENT_COMMERCIAL_CONFIDENTIAL_ACCESS_DENIED',
  TECHNICAL_EVIDENCE_ACCESS_DENIED: 'CARBON_MANAGEMENT_TECHNICAL_EVIDENCE_ACCESS_DENIED',
  AUTHORIZATION_AUTHORITY_NOT_CONFIGURED: 'CARBON_MANAGEMENT_AUTHORIZATION_AUTHORITY_NOT_CONFIGURED',
  EXTERNAL_VERIFICATION_BLOCKS: 'CARBON_MANAGEMENT_EXTERNAL_VERIFICATION_BLOCKS',
  APPLICANT_CANNOT_SELF_AUTHORIZE: 'CARBON_MANAGEMENT_APPLICANT_CANNOT_SELF_AUTHORIZE',
} as const;

export const CARBON_MANAGEMENT_TEMPLATE_SERVICE_DEFINITIONS = [
  {
    key: 'PROGRAMME-REGISTRATION',
    name: 'Carbon Programme Registration',
    serviceType: 'REGISTRATION',
    requiresExternalVerification: false,
  },
  {
    key: 'PROJECT-REGISTRATION',
    name: 'Carbon Project Registration',
    serviceType: 'REGISTRATION',
    requiresExternalVerification: true,
  },
  {
    key: 'PROJECT-AMENDMENT',
    name: 'Carbon Project Amendment',
    serviceType: 'AMENDMENT',
    requiresExternalVerification: true,
  },
  {
    key: 'VERIFICATION-SUBMISSION',
    name: 'External Verification Evidence Submission',
    serviceType: 'SUBMISSION',
    requiresExternalVerification: true,
  },
  {
    key: 'REGISTRY-REFERENCE',
    name: 'External Registry Reference Recording',
    serviceType: 'SUBMISSION',
    requiresExternalVerification: false,
  },
  {
    key: 'COMPLIANCE-REPORT',
    name: 'Carbon Programme Compliance Reporting',
    serviceType: 'COMPLIANCE',
    requiresExternalVerification: false,
  },
  {
    key: 'PERIODIC-REVIEW',
    name: 'Carbon Project Periodic Review',
    serviceType: 'RENEWAL',
    requiresExternalVerification: true,
  },
] as const;
