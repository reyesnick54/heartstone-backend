export const PHASE_9F_MODEL_NAMES = [
  'ComplianceAssessment',
  'NoncomplianceFinding',
  'ComplianceEscalation',
  'EnforcementReferral',
  'ProtectiveActionRecommendation',
  'EmergencyInterimActionRecord',
] as const;

export const PHASE_9F_ENUM_NAMES = [
  'ComplianceAssessmentStatus',
  'ComplianceRecommendedNextStep',
  'NoncomplianceFindingStatus',
  'NoncomplianceSeverity',
  'NoncomplianceRepetition',
  'NoncomplianceMateriality',
  'ComplianceEscalationType',
  'ComplianceEscalationStatus',
  'EnforcementReferralStatus',
  'RetainedEnforcementAuthorityClass',
  'ProtectiveActionRecommendationType',
  'ProtectiveActionRecommendationStatus',
  'EmergencyInterimActionStatus',
] as const;

export const COMPLIANCE_ESCALATION_TYPES = [
  'INTERNAL_SUPERVISORY',
  'DEPARTMENT_HEAD',
  'ONE_STOP_ADMINISTRATION',
  'MANAGEMENT_COMMITTEE',
  'PROFESSIONAL_REFERRAL',
  'GOVERNMENT_REFERRAL',
  'EMERGENCY_REVIEW',
  'PHASE_8_SUSPENSION_REVIEW',
  'PHASE_8_REVOCATION_REVIEW',
] as const;

export const PROTECTIVE_ACTION_RECOMMENDATION_TYPES = [
  'ENHANCED_MONITORING',
  'REINSPECTION',
  'CONDITION_REVIEW',
  'TEMPORARY_OPERATIONAL_RESTRICTION_REVIEW',
  'SUSPENSION_REVIEW',
  'REVOCATION_REVIEW',
  'GOVERNMENT_REFERRAL',
  'EMERGENCY_REVIEW',
] as const;

export const NONCOMPLIANCE_FINDING_STATUSES = [
  'DRAFT',
  'PROPOSED',
  'CONFIRMED',
  'DISPUTED',
  'WITHDRAWN',
  'SUPERSEDED',
] as const;
