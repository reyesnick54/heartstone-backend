export const CANNABIS_RULE_ENVIRONMENT = 'NON_PRODUCTION' as const;

export const CANNABIS_ADMINISTRATION_SERVICE_PACK_ID = 'template-cannabis-administration';
export const CANNABIS_SERVICE_FAMILY_CODE = 'TEMPLATE-FAMILY-CANNABIS-ADMIN';
export const CANNABIS_DEPARTMENT_CODE = 'TEMPLATE-DEPARTMENT-CANNABIS-ADMIN';
export const CANNABIS_INSTITUTION_CODE = 'TEMPLATE-INSTITUTION';
export const CANNABIS_SERVICE_CODE_PREFIX = 'TEMPLATE-CA-';

export const CANNABIS_AUTHORITY = {
  intake: 'TEMPLATE-AUTH-CA-INTAKE',
  dueDiligence: 'TEMPLATE-AUTH-CA-DUE-DILIGENCE',
  siteReview: 'TEMPLATE-AUTH-CA-SITE-REVIEW',
  consultation: 'TEMPLATE-AUTH-CA-CONSULTATION',
  decide: 'TEMPLATE-AUTH-CA-DECIDE',
  issue: 'TEMPLATE-AUTH-CA-ISSUE',
  complianceReview: 'TEMPLATE-AUTH-CA-COMPLIANCE-REVIEW',
  inspect: 'TEMPLATE-AUTH-CA-INSPECT',
  suspend: 'TEMPLATE-AUTH-CA-SUSPEND',
  revoke: 'TEMPLATE-AUTH-CA-REVOKE',
  appeal: 'TEMPLATE-AUTH-CA-APPEAL',
} as const;

export const CANNABIS_REGULATED_ENTITY_PREFIX = 'CARE';
export const CANNABIS_LICENCE_NUMBER_PREFIX = 'CALC';

export const CANNABIS_BOUNDARY_DISCLAIMER =
  'Cannabis administration records capture submitted information and workflow state only; they do not establish that cannabis activity is lawful, that ABSEZ may license it, or that any licence category exists until governing instruments and authority records are configured and in force.';

export const FORBIDDEN_AI_CANNABIS_ACTIONS = [
  'ISSUE_CANNABIS_LICENCE',
  'APPROVE_CANNABIS_LICENCE',
  'SUSPEND_CANNABIS_LICENCE',
  'REVOKE_CANNABIS_LICENCE',
  'FINALIZE_REGULATORY_DECISION',
] as const;

export const FORBIDDEN_UNSUPPORTED_CANNABIS_REGULATORY_FEATURES = [
  'SEED_TO_SALE_TRACKING',
  'PLANT_INVENTORY',
  'PRODUCT_TRACKING',
  'QUOTA_ALLOCATION',
  'POTENCY_CONTROL_RULE',
  'DISPENSING_RULE_ENGINE',
] as const;

export const CANNABIS_INVARIANTS = {
  applicationNotLicence: true,
  paymentNotApproval: true,
  delegatedInactiveBlocksIssuance: true,
  organizationNotDuplicated: true,
  siteReferenceNotLandCreation: true,
  inspectionFindingNotFinalSanction: true,
  aiRecommendationNotDecision: true,
  licenceUsesCanonicalInstrument: true,
  categoriesFromConfigurationOnly: true,
  noUnsupportedRegulatoryEngines: true,
} as const;

export const CANNABIS_REASON_CODES = {
  SERVICE_NOT_OPERATIONALLY_ACTIVE: 'CANNABIS_SERVICE_NOT_OPERATIONALLY_ACTIVE',
  GOVERNING_AUTHORITY_NOT_CONFIGURED: 'CANNABIS_GOVERNING_AUTHORITY_NOT_CONFIGURED',
  LICENCE_CATEGORY_NOT_CONFIGURED: 'CANNABIS_LICENCE_CATEGORY_NOT_CONFIGURED',
  CROSS_ENTITY_ACCESS_DENIED: 'CANNABIS_CROSS_ENTITY_ACCESS_DENIED',
  REGULATORY_FILE_ACCESS_DENIED: 'CANNABIS_REGULATORY_FILE_ACCESS_DENIED',
  LICENCE_AUTHORITY_NOT_CONFIGURED: 'CANNABIS_LICENCE_AUTHORITY_NOT_CONFIGURED',
  DELEGATED_FUNCTION_INACTIVE: 'CANNABIS_DELEGATED_FUNCTION_INACTIVE',
  EXTERNAL_DEPENDENCY_BLOCKS: 'CANNABIS_EXTERNAL_DEPENDENCY_BLOCKS',
  APPLICANT_CANNOT_SELF_ISSUE: 'CANNABIS_APPLICANT_CANNOT_SELF_ISSUE',
  AI_CANNOT_ISSUE_LICENCE: 'CANNABIS_AI_CANNOT_ISSUE_LICENCE',
  SUSPENSION_AUTHORITY_REQUIRED: 'CANNABIS_SUSPENSION_AUTHORITY_REQUIRED',
  CLIENT_LICENCE_FIELDS_FORBIDDEN: 'CANNABIS_CLIENT_LICENCE_FIELDS_FORBIDDEN',
  BENEFICIAL_OWNERSHIP_ACCESS_DENIED: 'CANNABIS_BENEFICIAL_OWNERSHIP_ACCESS_DENIED',
} as const;

export const CANNABIS_AUTHORITY_FUNCTION_CODES = {
  LICENCE_ISSUE: 'CANNABIS-ADMIN-LICENCE-ISSUE',
  LICENCE_SUSPEND: 'CANNABIS-ADMIN-LICENCE-SUSPEND',
  LICENCE_REVOKE: 'CANNABIS-ADMIN-LICENCE-REVOKE',
} as const;

export const CANNABIS_TEMPLATE_SERVICE_DEFINITIONS = [
  {
    key: 'LICENCE-APPLICATION',
    name: 'Cannabis Licence Application',
    serviceType: 'APPLICATION',
    requiresConsultation: true,
    requiresSiteEvidence: true,
  },
  {
    key: 'LICENCE-RENEWAL',
    name: 'Cannabis Licence Renewal',
    serviceType: 'RENEWAL',
    requiresConsultation: false,
    requiresSiteEvidence: false,
  },
  {
    key: 'ACTIVITY-VARIATION',
    name: 'Licensed Activity Variation',
    serviceType: 'AMENDMENT',
    requiresConsultation: false,
    requiresSiteEvidence: true,
  },
  {
    key: 'COMPLIANCE-REPORT',
    name: 'Periodic Compliance Reporting',
    serviceType: 'COMPLIANCE',
    requiresConsultation: false,
    requiresSiteEvidence: false,
  },
  {
    key: 'REGULATORY-INSPECTION',
    name: 'Regulatory Inspection',
    serviceType: 'INSPECTION',
    requiresConsultation: false,
    requiresSiteEvidence: false,
  },
  {
    key: 'SUSPENSION-REVIEW',
    name: 'Suspension or Revocation Review',
    serviceType: 'ENFORCEMENT_COORDINATION',
    requiresConsultation: false,
    requiresSiteEvidence: false,
  },
] as const;
