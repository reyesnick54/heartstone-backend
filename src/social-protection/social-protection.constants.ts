export const BENEFIT_APPLICANT_PROFILE_PREFIX = 'BNPF';
export const HOUSEHOLD_RECORD_PREFIX = 'HSHD';
export const BENEFIT_APPLICATION_PROFILE_PREFIX = 'BAPP';
export const BENEFIT_ELIGIBILITY_ASSESSMENT_PREFIX = 'BNEL';
export const BENEFIT_AWARD_NUMBER_PREFIX = 'BNAD';
export const EXTERNAL_ELIGIBILITY_DETERMINATION_PREFIX = 'EXEL';
export const SOCIAL_PROTECTION_APPEAL_PREFIX = 'SPAP';

export const PLATFORM_ADMIN_SOCIAL_PROTECTION_ROLE_MARKER = 'PLATFORM_TECHNICAL_ADMIN';

export const FORBIDDEN_AI_SOCIAL_PROTECTION_ACTIONS = [
  'CREATE_BENEFIT_AWARD',
  'TERMINATE_BENEFIT',
  'SUSPEND_BENEFIT',
  'FINALIZE_ELIGIBILITY',
  'RECORD_AUTHORITATIVE_AWARD',
] as const;

export const SOCIAL_PROTECTION_INVARIANTS = {
  applicationNotAward: true,
  eligibilityNotAward: true,
  awardNotPayment: true,
  paymentNotEligibility: true,
  riskScoreNotFraud: true,
  riskScoreNotTermination: true,
  selfDeclarationNotVerifiedFact: true,
  aiRecommendationNotDecision: true,
  householdNotFamily: true,
  awardVersionHistoryPreserved: true,
  appealPreservesOriginalDecision: true,
} as const;

export const SOCIAL_PROTECTION_REASON_CODES = {
  CROSS_HOUSEHOLD_ACCESS_DENIED: 'SOCIAL_PROTECTION_CROSS_HOUSEHOLD_ACCESS_DENIED',
  REPRESENTATIVE_SCOPE_DENIED: 'SOCIAL_PROTECTION_REPRESENTATIVE_SCOPE_DENIED',
  CROSS_PROGRAM_ACCESS_DENIED: 'SOCIAL_PROTECTION_CROSS_PROGRAM_ACCESS_DENIED',
  SUSPENSION_AUTHORITY_REQUIRED: 'SOCIAL_PROTECTION_SUSPENSION_AUTHORITY_REQUIRED',
} as const;

export type RepresentativeBenefitScope = Partial<
  Record<'viewHousehold' | 'submitDeclaration' | 'viewAwardStatus', boolean>
>;
