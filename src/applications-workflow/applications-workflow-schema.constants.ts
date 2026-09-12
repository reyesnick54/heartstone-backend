export const PHASE_6F_FOUNDATION_MODEL_NAMES = ['Case', 'CaseWorkflowStep'] as const;

export const PHASE_6F_MODEL_NAMES = [
  'CaseAssignment',
  'CaseReferral',
  'CaseReferralResponse',
  'CaseSlaClock',
  'CaseSlaPause',
  'CaseEscalation',
  'CaseIssue',
] as const;

export const CASE_ASSIGNMENT_TYPES = [
  'CASE_MANAGER',
  'REVIEWER',
  'SPECIALIST',
  'COORDINATOR',
  'INSPECTOR_PLACEHOLDER',
  'OTHER_APPROVED_ROLE',
] as const;

export const CASE_REFERRAL_TYPES = [
  'INTERNAL_DEPARTMENT',
  'GOVERNMENT_AUTHORITY',
  'PROFESSIONAL',
  'PARTNER',
  'OTHER_APPROVED_EXTERNAL',
] as const;

export const CASE_SLA_CLOCK_TYPES = [
  'ABSEZ_PROCESSING_TIME',
  'APPLICANT_TIME',
  'EXTERNAL_DEPENDENCY_TIME',
  'PROFESSIONAL_DEPENDENCY_TIME',
  'PAUSED_AUTHORIZED',
  'SYSTEM_DISRUPTION',
] as const;

export const CASE_ESCALATION_ROUTES = [
  'DEPARTMENT',
  'ONE_STOP_ADMINISTRATION',
  'SENIOR_ADMINISTRATIVE',
  'MANAGEMENT_COMMITTEE',
  'COMPETENT_EXTERNAL_AUTHORITY',
] as const;

export const FORBIDDEN_PHASE_7_BOUNDARY_MODELS = [
  'GovernmentDecision',
  'IssuedLicense',
  'IssuedPermit',
  'EvidencePacket',
  'PaymentTransaction',
  'InspectionCase',
] as const;
