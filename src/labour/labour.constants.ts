export const EMPLOYER_REGISTRY_NUMBER_PREFIX = 'EMPR';
export const WORKER_PROFILE_REFERENCE_PREFIX = 'WKPR';
export const EMPLOYMENT_RELATIONSHIP_NUMBER_PREFIX = 'EMRL';
export const WORK_PERMIT_APPLICATION_PROFILE_PREFIX = 'WPAP';
export const WORK_PERMIT_NUMBER_PREFIX = 'WKPM';
export const EMPLOYMENT_SPONSORSHIP_NUMBER_PREFIX = 'EMSP';
export const EMPLOYMENT_COMPLAINT_PREFIX = 'EMCP';
export const EMPLOYMENT_DECLARATION_PREFIX = 'EMDL';

export const LABOUR_BOUNDARY_DISCLAIMER =
  'Employer declarations and employment contracts record submitted information only; they do not constitute government work authorization or verified labour facts.';

export const LABOUR_IMMIGRATION_COORDINATION_DISCLAIMER =
  'Labour work authorization and immigration status are coordinated through separate channels; immigration determination does not automatically create labour authorization and vice versa.';

export const LABOUR_EXPERIENCE_RULE_ENVIRONMENT = 'NON_PRODUCTION' as const;

export const FORBIDDEN_AI_LABOUR_ACTIONS = [
  'APPROVE_WORK_PERMIT',
  'ISSUE_WORK_PERMIT',
  'AUTHORIZE_EMPLOYMENT',
  'RECORD_WORK_AUTHORIZATION',
  'FINALIZE_LABOUR_DECISION',
] as const;

export const FORBIDDEN_EMPLOYER_SELF_AUTHORIZATION_ACTIONS = [
  'SELF_AUTHORIZE_WORKER',
  'ISSUE_WORK_PERMIT',
  'RECORD_WORK_AUTHORIZATION',
] as const;

export const LABOUR_WORKFORCE_SCOPE_KEYS = [
  'viewWorkforceSummary',
  'viewWorkPermitStatus',
  'submitEmployerDeclaration',
  'viewInspectionFindings',
] as const;

export type LabourEmployerWorkforceScope = Partial<
  Record<(typeof LABOUR_WORKFORCE_SCOPE_KEYS)[number], boolean>
>;

export const LABOUR_INVARIANTS = {
  employmentRelationshipNotWorkAuthorization: true,
  employmentContractNotWorkPermit: true,
  employerDeclarationNotVerifiedFact: true,
  workPermitNotResidency: true,
  residencyNotWorkPermit: true,
  paymentNotApproval: true,
  sponsorshipNotAuthorization: true,
  complaintNotViolation: true,
  inspectionFindingNotFinalDecision: true,
  aiRecommendationNotDecision: true,
  relationshipHistoryPreserved: true,
  workPermitHistoryPreserved: true,
} as const;

export const LABOUR_AUTHORITY_FUNCTION_CODES = {
  WORK_PERMIT_APPROVE: 'LABOUR-WORK-PERMIT-APPROVE',
} as const;

export const LABOUR_REASON_CODES = {
  CROSS_WORKER_ACCESS_DENIED: 'LABOUR_CROSS_WORKER_ACCESS_DENIED',
  CROSS_EMPLOYER_ACCESS_DENIED: 'LABOUR_CROSS_EMPLOYER_ACCESS_DENIED',
  REPRESENTATIVE_AUTHORITY_REQUIRED: 'LABOUR_REPRESENTATIVE_AUTHORITY_REQUIRED',
  REVOKED_REPRESENTATION_BLOCKED: 'LABOUR_REVOKED_REPRESENTATION_BLOCKED',
} as const;
