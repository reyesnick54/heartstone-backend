export const DIGITAL_ASSETS_RULE_ENVIRONMENT = 'NON_PRODUCTION' as const;

export const DIGITAL_ASSETS_SERVICE_PACK_ID = 'template-digital-assets-administration';
export const DIGITAL_ASSETS_SERVICE_FAMILY_CODE = 'TEMPLATE-FAMILY-DIGITAL-ASSETS';
export const DIGITAL_ASSETS_DEPARTMENT_CODE = 'TEMPLATE-DEPARTMENT-DIGITAL-ASSETS';
export const DIGITAL_ASSETS_INSTITUTION_CODE = 'TEMPLATE-INSTITUTION';
export const DIGITAL_ASSETS_SERVICE_CODE_PREFIX = 'TEMPLATE-DA-';

export const DIGITAL_ASSETS_AUTHORITY = {
  intake: 'TEMPLATE-AUTH-DA-INTAKE',
  technicalReview: 'TEMPLATE-AUTH-DA-TECHNICAL-REVIEW',
  professionalReview: 'TEMPLATE-AUTH-DA-PROFESSIONAL-REVIEW',
  externalReferral: 'TEMPLATE-AUTH-DA-EXTERNAL-REFERRAL',
  decide: 'TEMPLATE-AUTH-DA-DECIDE',
  issue: 'TEMPLATE-AUTH-DA-ISSUE',
  complianceReview: 'TEMPLATE-AUTH-DA-COMPLIANCE-REVIEW',
} as const;

export const DIGITAL_ASSETS_REGULATED_ENTITY_PREFIX = 'DARE';
export const DIGITAL_ASSETS_AUTHORIZATION_PREFIX = 'DAUT';
export const DIGITAL_ASSETS_EXTERNAL_DEPENDENCY_PREFIX = 'DAED';

export const DIGITAL_ASSETS_BOUNDARY_DISCLAIMER =
  'Digital-asset regulatory filings and technical submissions record submitted materials only; they do not constitute authorization to operate or issue virtual asset services.';

export const DIGITAL_ASSETS_BLOCKCHAIN_SEPARATION_DISCLAIMER =
  'Platform hash, timestamp, or blockchain verification services attest record integrity only; they do not substitute for a government authorization decision and are consumed—not owned—by the digital-assets regulatory domain.';

export const FORBIDDEN_AI_DIGITAL_ASSETS_ACTIONS = [
  'APPROVE_DIGITAL_ASSETS_AUTHORIZATION',
  'ISSUE_DIGITAL_ASSETS_LICENCE',
  'FINALIZE_REGULATORY_DECISION',
  'RECORD_OFFICIAL_AUTHORIZATION',
] as const;

export const DIGITAL_ASSETS_INVARIANTS = {
  applicationNotAuthorization: true,
  technicalReviewNotApproval: true,
  paymentNotApproval: true,
  blockchainEventNotApproval: true,
  externalDependencyBlocksWhenRequired: true,
  organizationNotDuplicated: true,
  beneficialOwnershipReferenceOnly: true,
  aiRecommendationNotDecision: true,
  consumesPlatformBlockchainVerification: true,
  noDuplicateGenericLicenceEngine: true,
} as const;

export const DIGITAL_ASSETS_REASON_CODES = {
  CROSS_ORGANIZATION_ACCESS_DENIED: 'DIGITAL_ASSETS_CROSS_ORGANIZATION_ACCESS_DENIED',
  CONFIDENTIAL_TECHNICAL_ACCESS_DENIED: 'DIGITAL_ASSETS_CONFIDENTIAL_TECHNICAL_ACCESS_DENIED',
  BENEFICIAL_OWNERSHIP_ACCESS_DENIED: 'DIGITAL_ASSETS_BENEFICIAL_OWNERSHIP_ACCESS_DENIED',
  AUTHORIZATION_AUTHORITY_NOT_CONFIGURED: 'DIGITAL_ASSETS_AUTHORIZATION_AUTHORITY_NOT_CONFIGURED',
  EXTERNAL_DEPENDENCY_BLOCKS: 'DIGITAL_ASSETS_EXTERNAL_DEPENDENCY_BLOCKS',
  APPLICANT_CANNOT_SELF_AUTHORIZE: 'DIGITAL_ASSETS_APPLICANT_CANNOT_SELF_AUTHORIZE',
} as const;

export const DIGITAL_ASSETS_TEMPLATE_SERVICE_DEFINITIONS = [
  {
    key: 'VASP-REGISTRATION',
    name: 'Digital Asset Service Provider Registration',
    serviceType: 'REGISTRATION',
    requiresExternal: true,
    requiresTechnicalReview: false,
  },
  {
    key: 'VASP-LICENCE',
    name: 'Digital Asset Service Provider Licence Application',
    serviceType: 'APPLICATION',
    requiresExternal: true,
    requiresTechnicalReview: true,
  },
  {
    key: 'VASP-LICENCE-RENEWAL',
    name: 'Digital Asset Service Provider Licence Renewal',
    serviceType: 'RENEWAL',
    requiresExternal: false,
    requiresTechnicalReview: true,
  },
  {
    key: 'ACTIVITY-VARIATION',
    name: 'Regulated Activity Variation',
    serviceType: 'AMENDMENT',
    requiresExternal: false,
    requiresTechnicalReview: true,
  },
  {
    key: 'TECHNICAL-SECURITY-SUBMISSION',
    name: 'Technical and Security Materials Submission',
    serviceType: 'SUBMISSION',
    requiresExternal: false,
    requiresTechnicalReview: true,
  },
  {
    key: 'COMPLIANCE-REPORT',
    name: 'Periodic Compliance Reporting',
    serviceType: 'COMPLIANCE',
    requiresExternal: false,
    requiresTechnicalReview: false,
  },
  {
    key: 'REGULATORY-INSPECTION',
    name: 'Regulatory Inspection / Review',
    serviceType: 'INSPECTION',
    requiresExternal: false,
    requiresTechnicalReview: false,
  },
] as const;
