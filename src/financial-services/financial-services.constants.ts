export const FINANCIAL_REGULATED_ENTITY_REFERENCE_PREFIX = 'FSRE';
export const FINANCIAL_LICENCE_APPLICATION_PROFILE_PREFIX = 'FSAP';
export const FINANCIAL_LICENCE_NUMBER_PREFIX = 'FSLC';
export const FINANCIAL_OPERATIONAL_SNAPSHOT_PREFIX = 'FSOP';

export const FINANCIAL_SERVICES_SERVICE_PACK_ID = 'template-financial-services' as const;

export const FINANCIAL_SERVICES_SERVICE_FAMILY_CODE = 'TEMPLATE-FAMILY-FINANCIAL-SERVICES';

export const FINANCIAL_SERVICES_DEPARTMENT_CODE = 'TEMPLATE-DEPARTMENT-FINANCIAL-SERVICES';

export const FINANCIAL_SERVICES_BOUNDARY_DISCLAIMER =
  'Financial regulatory projections and application profiles record workflow state and submitted information only; they do not constitute a licence, supervisory determination, or national regulatory approval.';

export const FINANCIAL_SERVICES_DELEGATION_BOUNDARY_DISCLAIMER =
  'Delegated ABSEZ licensing functions remain INACTIVE until a governing delegation instrument is configured and in force; absence of delegation does not permit final licensing action.';

export const FINANCIAL_SERVICES_EXTERNAL_BOUNDARY_DISCLAIMER =
  'Retained national or external regulator determinations cannot be manufactured or spoofed as ABSEZ approvals.';

export const FINANCIAL_SERVICES_EXPERIENCE_RULE_ENVIRONMENT = 'NON_PRODUCTION' as const;

export const FORBIDDEN_AI_FINANCIAL_SERVICES_ACTIONS = [
  'ISSUE_FINANCIAL_LICENCE',
  'SUSPEND_FINANCIAL_LICENCE',
  'REVOKE_FINANCIAL_LICENCE',
  'FINALIZE_REGULATORY_DECISION',
  'RECORD_NATIONAL_APPROVAL',
] as const;

export const FINANCIAL_SERVICES_INVARIANTS = {
  applicationNotLicence: true,
  paymentNotApproval: true,
  delegatedInactiveBlocksIssuance: true,
  externalDeterminationNotAbsezApproval: true,
  beneficialOwnershipReferenceNotDuplication: true,
  inspectionFindingNotFinalEnforcement: true,
  aiRecommendationNotDecision: true,
  licenceHistoryPreserved: true,
} as const;

export const FINANCIAL_SERVICES_AUTHORITY = {
  intake: 'TEMPLATE-AUTH-FINANCIAL-INTAKE',
  review: 'TEMPLATE-AUTH-FINANCIAL-REVIEW',
  decide: 'TEMPLATE-AUTH-FINANCIAL-DECIDE',
  issue: 'TEMPLATE-AUTH-FINANCIAL-LICENCE-ISSUE',
  suspend: 'TEMPLATE-AUTH-FINANCIAL-LICENCE-SUSPEND',
  revoke: 'TEMPLATE-AUTH-FINANCIAL-LICENCE-REVOKE',
  inspect: 'TEMPLATE-AUTH-FINANCIAL-INSPECT',
  enforce: 'TEMPLATE-AUTH-FINANCIAL-ENFORCE',
  externalCoord: 'TEMPLATE-AUTH-FINANCIAL-EXTERNAL-COORD',
  delegatedIssue: 'TEMPLATE-AUTH-FINANCIAL-DELEGATED-ISSUE',
} as const;

export const FINANCIAL_SERVICES_AUTHORITY_FUNCTION_CODES = {
  LICENCE_ISSUE: 'FINANCIAL-SERVICES-LICENCE-ISSUE',
  LICENCE_SUSPEND: 'FINANCIAL-SERVICES-LICENCE-SUSPEND',
  LICENCE_REVOKE: 'FINANCIAL-SERVICES-LICENCE-REVOKE',
} as const;

export const FINANCIAL_SERVICES_REASON_CODES = {
  CROSS_ENTITY_ACCESS_DENIED: 'FINANCIAL_SERVICES_CROSS_ENTITY_ACCESS_DENIED',
  REGULATORY_FILE_ACCESS_DENIED: 'FINANCIAL_SERVICES_REGULATORY_FILE_ACCESS_DENIED',
  LICENCE_AUTHORITY_NOT_CONFIGURED: 'FINANCIAL_SERVICES_LICENCE_AUTHORITY_NOT_CONFIGURED',
  DELEGATED_FUNCTION_INACTIVE: 'FINANCIAL_SERVICES_DELEGATED_FUNCTION_INACTIVE',
  EXTERNAL_DEPENDENCY_BLOCKS: 'FINANCIAL_SERVICES_EXTERNAL_DEPENDENCY_BLOCKS',
  NATIONAL_APPROVAL_CANNOT_BE_SPOOFED: 'FINANCIAL_SERVICES_NATIONAL_APPROVAL_CANNOT_BE_SPOOFED',
  APPLICANT_CANNOT_SELF_ISSUE: 'FINANCIAL_SERVICES_APPLICANT_CANNOT_SELF_ISSUE',
  AI_CANNOT_ISSUE_LICENCE: 'FINANCIAL_SERVICES_AI_CANNOT_ISSUE_LICENCE',
  SUSPENSION_AUTHORITY_REQUIRED: 'FINANCIAL_SERVICES_SUSPENSION_AUTHORITY_REQUIRED',
  CLIENT_LICENCE_FIELDS_FORBIDDEN: 'FINANCIAL_SERVICES_CLIENT_LICENCE_FIELDS_FORBIDDEN',
} as const;

export interface FinancialTemplateServiceDefinition {
  key: string;
  name: string;
  serviceType: string;
  requiresExternal?: boolean;
}

export const FINANCIAL_TEMPLATE_SERVICE_DEFINITIONS: FinancialTemplateServiceDefinition[] = [
  { key: 'REGULATED-ENTITY-PROFILE', name: 'Regulated Entity Profile', serviceType: 'REGISTRATION' },
  { key: 'LICENCE-APPLICATION', name: 'Financial Licence Application', serviceType: 'APPLICATION' },
  { key: 'LICENCE-RENEWAL', name: 'Financial Licence Renewal', serviceType: 'RENEWAL' },
  { key: 'LICENCE-AMENDMENT', name: 'Financial Licence Amendment', serviceType: 'AMENDMENT' },
  { key: 'COMPLIANCE-RETURN', name: 'Regulatory Compliance Return', serviceType: 'COMPLIANCE' },
  { key: 'INSPECTION-REQUEST', name: 'Regulatory Inspection Request', serviceType: 'INSPECTION' },
  {
    key: 'NATIONAL-LICENCE-COORDINATION',
    name: 'National Regulator Licence Coordination',
    serviceType: 'EXTERNAL_COORDINATION',
    requiresExternal: true,
  },
];
