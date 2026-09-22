export const IMMIGRATION_PROFILE_NUMBER_PREFIX = 'IMMP';
export const VISA_APPLICATION_PROFILE_NUMBER_PREFIX = 'VAP';
export const RESIDENCY_APPLICATION_PROFILE_NUMBER_PREFIX = 'RAP';
export const CITIZENSHIP_APPLICATION_PROFILE_NUMBER_PREFIX = 'CAP';
export const VISA_PERMISSION_NUMBER_PREFIX = 'VPR';
export const RESIDENCY_PERMIT_NUMBER_PREFIX = 'RPM';
export const IMMIGRATION_SPONSORSHIP_NUMBER_PREFIX = 'IMSP';
export const IMMIGRATION_ASSESSMENT_NUMBER_PREFIX = 'IMRA';
export const IMMIGRATION_EXTERNAL_CHECK_PREFIX = 'IMXC';

export const IMMIGRATION_BOUNDARY_DISCLAIMER =
  'Immigration application submission records a request only; it does not grant visa, residency, or citizenship.';

export const FORBIDDEN_AI_IMMIGRATION_ACTIONS = [
  'APPROVE_VISA',
  'APPROVE_RESIDENCY',
  'APPROVE_CITIZENSHIP',
  'ISSUE_VISA_PERMISSION',
  'ISSUE_RESIDENCY_PERMIT',
  'RECORD_CITIZENSHIP_STATUS',
  'FINALIZE_IMMIGRATION_DECISION',
] as const;

export const FORBIDDEN_APPLICANT_EXTERNAL_CHECK_FIELDS = [
  'isAuthenticated',
  'determinationStatus',
  'authenticatedPayloadHash',
  'recordedBy',
] as const;

export const SPONSOR_ALLOWED_SCOPE_KEYS = [
  'viewCaseStatus',
  'viewDependents',
  'submitSponsorEvidence',
] as const;

export type SponsorAuthorizedScope = Partial<
  Record<(typeof SPONSOR_ALLOWED_SCOPE_KEYS)[number], boolean>
>;

export const IMMIGRATION_INVARIANTS = {
  applicationNotStatus: true,
  paymentNotApproval: true,
  eligibilityGuidanceNotDecision: true,
  entryNotCitizenship: true,
  residencyNotCitizenship: true,
  workPermitNotResidencyUnlessLinked: true,
  investmentNotCitizenshipApproval: true,
  aiRecommendationNotDecision: true,
  statusHistoryPreserved: true,
  externalDeterminationNotOwned: true,
} as const;
