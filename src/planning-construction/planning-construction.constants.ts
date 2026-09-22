export const PLANNING_CONSTRUCTION_RULE_ENVIRONMENT = 'NON_PRODUCTION' as const;

export const PLANNING_CONSTRUCTION_SERVICE_PACK_ID = 'template-planning-construction' as const;

export const PLANNING_CONSTRUCTION_SERVICE_FAMILY_CODE = 'TEMPLATE-FAMILY-PLANNING-CONSTRUCTION';

export const PLANNING_CONSTRUCTION_DEPARTMENT_CODE = 'TEMPLATE-DEPARTMENT-PLANNING-CONSTRUCTION';

export const PLANNING_PERMIT_REFERENCE_PREFIX = 'DEVPERMIT';

export const PLANNING_PROJECT_REFERENCE_PREFIX = 'DEVPROJ';

export const PLANNING_AUTHORITY = {
  intake: 'TEMPLATE-AUTH-PLANNING-INTAKE',
  review: 'TEMPLATE-AUTH-PLANNING-REVIEW',
  zoningDecide: 'TEMPLATE-AUTH-ZONING-DETERMINE',
  permitIssue: 'TEMPLATE-AUTH-PLANNING-PERMIT-ISSUE',
  professionalReview: 'TEMPLATE-AUTH-PROFESSIONAL-REVIEW',
  externalReferral: 'TEMPLATE-AUTH-EXTERNAL-REFERRAL',
  inspectionConduct: 'TEMPLATE-AUTH-INSPECTION-VERIFY',
  occupancyIssue: 'TEMPLATE-AUTH-PLANNING-OCCUPANCY-ISSUE',
  appealDecide: 'TEMPLATE-AUTH-PLANNING-APPEAL-DECIDE',
} as const;

export const PLANNING_BOUNDARY_DISCLAIMER =
  'Development portal projections summarize case and permit workflow state. They do not constitute permit issuance, zoning determination, or occupancy authorization.';

export const PLANNING_PAYMENT_BOUNDARY_DISCLAIMER =
  'Fee payment records financial settlement only; payment does not approve or issue permits.';

export const PLANNING_METRICS_DISCLAIMER =
  'Planning and construction metrics are operational indicators only and do not constitute legal determinations or compliance findings.';

export const FORBIDDEN_AI_PLANNING_ACTIONS = [
  'ISSUE_DEVELOPMENT_PERMIT',
  'ISSUE_OCCUPANCY_CERTIFICATE',
  'DECIDE_ZONING',
  'DECIDE_PLANNING_APPEAL',
] as const;

export const PLANNING_REASON_CODES = {
  CROSS_APPLICANT_ACCESS_DENIED: 'PLANNING_CROSS_APPLICANT_ACCESS_DENIED',
  CROSS_ORGANIZATION_ACCESS_DENIED: 'PLANNING_CROSS_ORGANIZATION_ACCESS_DENIED',
  APPLICANT_CANNOT_SELF_ISSUE_PERMIT: 'PLANNING_APPLICANT_CANNOT_SELF_ISSUE_PERMIT',
  PROFESSIONAL_CANNOT_SELF_APPROVE: 'PLANNING_PROFESSIONAL_CANNOT_SELF_APPROVE',
  PAYMENT_DOES_NOT_APPROVE: 'PLANNING_PAYMENT_DOES_NOT_APPROVE',
  EXTERNAL_DEPENDENCY_BLOCKS: 'PLANNING_EXTERNAL_DEPENDENCY_BLOCKS',
  INSPECTION_FAILURE_LOCKED: 'PLANNING_INSPECTION_FAILURE_LOCKED',
  OCCUPANCY_REQUIRES_DECISION: 'PLANNING_OCCUPANCY_REQUIRES_DECISION',
  PERMIT_AUTHORITY_NOT_CONFIGURED: 'PLANNING_PERMIT_AUTHORITY_NOT_CONFIGURED',
  AI_CANNOT_ISSUE_PERMIT: 'PLANNING_AI_CANNOT_ISSUE_PERMIT',
} as const;

export const PLANNING_TEMPLATE_SERVICE_DEFINITIONS = [
  {
    key: 'PLANNING-DEVELOPMENT-APPLICATION',
    name: 'Planning / Development Application',
    serviceType: 'APPLICATION',
  },
  { key: 'ZONING-LAND-USE', name: 'Zoning / Land-Use Determination', serviceType: 'DETERMINATION' },
  { key: 'BUILDING-PERMIT', name: 'Building Permit', serviceType: 'PERMIT' },
  { key: 'RENOVATION-PERMIT', name: 'Renovation Permit', serviceType: 'PERMIT' },
  { key: 'DEMOLITION-PERMIT', name: 'Demolition Permit', serviceType: 'PERMIT' },
  {
    key: 'INFRASTRUCTURE-UTILITY-PERMIT',
    name: 'Infrastructure / Utility Works Permit',
    serviceType: 'PERMIT',
  },
  {
    key: 'SUBMIT-PROFESSIONAL-PLANS',
    name: 'Submit Professional Plans',
    serviceType: 'SUBMISSION',
  },
  {
    key: 'REQUEST-CONSTRUCTION-INSPECTION',
    name: 'Request Construction Inspection',
    serviceType: 'INSPECTION',
  },
  { key: 'SUBMIT-CORRECTIVE-ACTION', name: 'Submit Corrective Action', serviceType: 'COMPLIANCE' },
  { key: 'REQUEST-REINSPECTION', name: 'Request Reinspection', serviceType: 'INSPECTION' },
  { key: 'PERMIT-AMENDMENT', name: 'Permit Amendment', serviceType: 'AMENDMENT' },
  { key: 'PERMIT-EXTENSION', name: 'Permit Extension', serviceType: 'AMENDMENT' },
  { key: 'COMPLETION-SUBMISSION', name: 'Completion Submission', serviceType: 'SUBMISSION' },
  {
    key: 'OCCUPANCY-COMPLETION-CERTIFICATE',
    name: 'Occupancy / Completion Certificate',
    serviceType: 'CERTIFICATE',
  },
  { key: 'PLANNING-APPEAL', name: 'Planning Appeal', serviceType: 'REDRESS' },
] as const;
