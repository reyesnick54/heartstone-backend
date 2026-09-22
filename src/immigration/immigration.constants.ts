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

/** NON_PRODUCTION immigration service-pack vertical markers — not verified law or authority. */
export const IMMIGRATION_NON_PRODUCTION_MARKER = 'NON_PRODUCTION_IMMIGRATION_TEMPLATE';

export const IMMIGRATION_SERVICE_PACK_ID = 'non-production-immigration-residency-citizenship';

export const IMMIGRATION_SERVICE_FAMILY_CODE = 'NON_PRODUCTION-FAMILY-IMMIGRATION';

export const IMMIGRATION_INSTITUTION_CODE = 'NON_PRODUCTION-IMM';

export const IMMIGRATION_DEPARTMENT_CODE = 'NON_PRODUCTION-IMM-OPS';

export const IMMIGRATION_SERVICE_CODE_PREFIX = 'NON_PRODUCTION-IMM-';

/** Field keys that must never appear in citizen experience projections. */
export const IMMIGRATION_RESTRICTED_CITIZEN_FIELDS = [
  'externalSecurityCheckStatus',
  'externalCriminalCheckResult',
  'externalWatchlistMatch',
  'classifiedExternalDetermination',
  'internalRiskScore',
] as const;

export const IMMIGRATION_EXTERNAL_RESTRICTED_DEPENDENCY_TYPES = [
  'EXTERNAL_SECURITY_CHECK',
  'EXTERNAL_CRIMINAL_CHECK',
  'EXTERNAL_WATCHLIST',
] as const;

export const IMMIGRATION_TEMPLATE_SERVICE_DEFINITIONS = [
  { key: 'VISITOR-VISA', name: 'Visitor Visa Application', serviceType: 'APPLICATION' },
  { key: 'VISA-EXTENSION', name: 'Visa Extension', serviceType: 'RENEWAL' },
  { key: 'RESIDENCY-APPLICATION', name: 'Residency Application', serviceType: 'APPLICATION' },
  { key: 'RESIDENCY-RENEWAL', name: 'Residency Renewal', serviceType: 'RENEWAL' },
  {
    key: 'DEPENDENT-RESIDENCY',
    name: 'Dependent Residency Application',
    serviceType: 'APPLICATION',
  },
  {
    key: 'LONG-TERM-RESIDENCY',
    name: 'Long-Term Residency Application',
    serviceType: 'APPLICATION',
  },
  {
    key: 'WORK-LINKED-RESIDENCY',
    name: 'Work-Linked Residency Application',
    serviceType: 'APPLICATION',
  },
  { key: 'CITIZENSHIP-APPLICATION', name: 'Citizenship Application', serviceType: 'APPLICATION' },
  {
    key: 'CITIZENSHIP-CERTIFICATE',
    name: 'Citizenship Status / Certificate Request',
    serviceType: 'REQUEST',
  },
  {
    key: 'STATUS-CORRECTION',
    name: 'Immigration Status Correction / Review',
    serviceType: 'APPLICATION',
  },
  { key: 'APPEAL-REDRESS', name: 'Immigration Appeal / Redress', serviceType: 'REDRESS' },
  {
    key: 'BIOMETRIC-INTERVIEW',
    name: 'Biometric / Interview Appointment',
    serviceType: 'SCHEDULING',
  },
] as const;
