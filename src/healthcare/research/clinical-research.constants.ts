export const CLINICAL_TRIAL_NUMBER_PREFIX = 'CTRI';
export const CLINICAL_RESEARCH_PARTICIPANT_PREFIX = 'CRPP';
export const CLINICAL_TRIAL_ENROLLMENT_PREFIX = 'CTEN';

export const CLINICAL_RESEARCH_BOUNDARY_DISCLAIMER =
  'Clinical trial listings support discovery and coordination only; they do not constitute regulatory authorization, medical advice, or a recommendation to participate.';

export const CLINICAL_RESEARCH_MATCHING_DISCLAIMER =
  'Preliminary trial matching is informational only and is not a clinical eligibility, safety, or treatment determination.';

export const CLINICAL_RESEARCH_PARTICIPATION_DISCLAIMER =
  'Research participation is distinct from routine medical treatment; enrollment records coordination under an approved protocol and consent, not treatment success.';

export const FORBIDDEN_AI_CLINICAL_RESEARCH_ACTIONS = [
  'FINALIZE_ELIGIBILITY',
  'DETERMINE_CLINICAL_ELIGIBILITY',
  'APPROVE_ENROLLMENT',
  'APPROVE_ETHICS',
  'AUTHORIZE_REGULATORY_STATUS',
  'RECORD_PROFESSIONAL_SCREENING_DECISION',
] as const;

export const FORBIDDEN_SPONSOR_ETHICS_SELF_APPROVAL_ACTIONS = [
  'SELF_APPROVE_ETHICS',
  'MARK_ETHICS_APPROVED',
  'RECORD_ETHICS_COMMITTEE_DECISION',
] as const;

export const PRELIMINARY_MATCH_OUTCOME_LABELS = {
  POTENTIAL_MATCH: 'Potential match (preliminary — not clinical eligibility)',
  NOT_ENOUGH_INFORMATION: 'Not enough information',
  LIKELY_NOT_MATCH: 'Likely not a match (preliminary — not clinical eligibility)',
} as const;

export const FORBIDDEN_PRELIMINARY_MATCH_OUTCOMES = [
  'ELIGIBLE',
  'CLINICALLY_ELIGIBLE',
  'INELIGIBLE',
] as const;

export const CLINICAL_RESEARCH_INVARIANTS = {
  trialListingNotRegulatoryApproval: true,
  discoveryNotRecommendation: true,
  preliminaryMatchNotClinicalEligibility: true,
  patientInterestNotEnrollment: true,
  consentNotEnrollment: true,
  eligibilityNotEnrollment: true,
  enrollmentNotTreatmentSuccess: true,
  researchParticipationNotMedicalTreatment: true,
  aiMatchingNotClinicalDecision: true,
  ethicsApprovalNotRegulatoryApproval: true,
  sponsorCannotSelfApproveEthics: true,
  protocolVersionImmutableAfterActivation: true,
  withdrawalPreservesHistory: true,
  participantDataIsolated: true,
} as const;

export const CLINICAL_RESEARCH_REASON_CODES = {
  CROSS_PARTICIPANT_ACCESS_DENIED: 'CLINICAL_RESEARCH_CROSS_PARTICIPANT_ACCESS_DENIED',
  SPONSOR_SELF_ETHICS_DENIED: 'CLINICAL_RESEARCH_SPONSOR_SELF_ETHICS_DENIED',
  AI_CANNOT_FINALIZE_ELIGIBILITY: 'CLINICAL_RESEARCH_AI_CANNOT_FINALIZE_ELIGIBILITY',
  CONSENT_ALONE_INSUFFICIENT: 'CLINICAL_RESEARCH_CONSENT_ALONE_INSUFFICIENT',
  ELIGIBILITY_ALONE_INSUFFICIENT: 'CLINICAL_RESEARCH_ELIGIBILITY_ALONE_INSUFFICIENT',
  ETHICS_BLOCKS_ENROLLMENT: 'CLINICAL_RESEARCH_ETHICS_BLOCKS_ENROLLMENT',
  TRIAL_SUSPENDED_BLOCKS_ENROLLMENT: 'CLINICAL_RESEARCH_TRIAL_SUSPENDED_BLOCKS_ENROLLMENT',
  PROTOCOL_VERSION_IMMUTABLE: 'CLINICAL_RESEARCH_PROTOCOL_VERSION_IMMUTABLE',
} as const;

export const PUBLIC_TRIAL_DISCOVERY_FORBIDDEN_RESPONSE_KEYS = [
  'participantProfileId',
  'subjectIdentityId',
  'enrollmentReference',
  'screeningDataReference',
  'participantReference',
  'enrollments',
  'screenings',
  'interests',
] as const;

export const CLINICAL_RESEARCH_AUTHORITY_FUNCTION_CODES = {
  ETHICS_APPROVAL: 'CLINICAL-RESEARCH-ETHICS-APPROVE',
} as const;
