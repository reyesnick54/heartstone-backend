import { HealthcareDataAccessPurpose, HealthcareDataCategory } from '@prisma/client';

export const HEALTHCARE_BOUNDARY_DISCLAIMER =
  'Healthcare registry and privacy projections summarize authorized clinical and regulatory state. Platform login, organization membership, and provider registration do not by themselves grant clinical access or professional licensure.';

export const HEALTHCARE_LICENSING_BOUNDARY_DISCLAIMER =
  'Healthcare professional and facility licenses are issued only through governed government service workflows (application, authority evaluation, decision, and issuance).';

export const HEALTHCARE_BREAK_GLASS_DISCLAIMER =
  'Emergency break-glass access is time-bound, purpose-specific, and fully audited. It is not unlimited administrative access.';

export const PLATFORM_ADMIN_ROLE_MARKER = 'PLATFORM_ADMINISTRATIVE_ACCESS';

export const TECHNICAL_ADMIN_ROLE_MARKER = 'TECHNICAL_ADMIN';

export const AI_ACTOR_MARKER = 'AI_ASSISTANCE';

export const FORBIDDEN_AI_HEALTHCARE_ACTIONS = [
  'REGISTER_AS_HEALTHCARE_PROFESSIONAL',
  'ISSUE_PROFESSIONAL_LICENSE',
  'ISSUE_FACILITY_LICENSE',
  'READ_PATIENT_CLINICAL_DATA',
  'ACTIVATE_BREAK_GLASS',
] as const;

export const FORBIDDEN_CLIENT_PATIENT_IDENTITY_FIELDS = [
  'linkedPlatformIdentityId',
  'patientReference',
  'personId',
] as const;

export const FORBIDDEN_CLIENT_PROFESSIONAL_LICENSE_FIELDS = [
  'status',
  'issuedAt',
  'expiresAt',
  'governmentDecisionId',
  'authorityEvaluationRecordId',
  'issuanceEventId',
] as const;

export const FORBIDDEN_CLIENT_FACILITY_LICENSE_FIELDS = [
  'status',
  'issuedAt',
  'expiresAt',
  'governmentDecisionId',
  'authorityEvaluationRecordId',
  'issuanceEventId',
] as const;

export const FORBIDDEN_CLIENT_ORGANIZATION_SELF_LICENSE_FIELDS = [
  'status',
  'licenseReference',
  'governmentDecisionId',
] as const;

export const HEALTHCARE_REASON_CODES = {
  CROSS_PATIENT_ACCESS_DENIED: 'HEALTHCARE_CROSS_PATIENT_ACCESS_DENIED',
  PLATFORM_ADMIN_NO_CLINICAL_ACCESS: 'HEALTHCARE_PLATFORM_ADMIN_NO_CLINICAL_ACCESS',
  ORG_MEMBERSHIP_INSUFFICIENT: 'HEALTHCARE_ORG_MEMBERSHIP_INSUFFICIENT',
  UNLICENSED_PROFESSIONAL: 'HEALTHCARE_UNLICENSED_PROFESSIONAL',
  EXPIRED_PROFESSIONAL_LICENSE: 'HEALTHCARE_EXPIRED_PROFESSIONAL_LICENSE',
  PATIENT_IDENTITY_CLIENT_SUBSTITUTION: 'HEALTHCARE_PATIENT_IDENTITY_CLIENT_SUBSTITUTION',
  BREAK_GLASS_REASON_REQUIRED: 'HEALTHCARE_BREAK_GLASS_REASON_REQUIRED',
  BREAK_GLASS_EXPIRED: 'HEALTHCARE_BREAK_GLASS_EXPIRED',
  CLASSIFICATION_PURPOSE_DENIED: 'HEALTHCARE_CLASSIFICATION_PURPOSE_DENIED',
  SELF_LICENSING_DENIED: 'HEALTHCARE_SELF_LICENSING_DENIED',
  AI_NOT_HEALTHCARE_PROFESSIONAL: 'HEALTHCARE_AI_NOT_HEALTHCARE_PROFESSIONAL',
  LOGIN_NOT_PROFESSIONAL_RECORD: 'HEALTHCARE_LOGIN_NOT_PROFESSIONAL_RECORD',
  REGISTRATION_NOT_LICENSE: 'HEALTHCARE_REGISTRATION_NOT_LICENSE',
} as const;

export const HEALTHCARE_DATA_CATEGORIES: HealthcareDataCategory[] = [
  HealthcareDataCategory.GENERAL_HEALTH,
  HealthcareDataCategory.CLINICAL,
  HealthcareDataCategory.MEDICATION,
  HealthcareDataCategory.LABORATORY,
  HealthcareDataCategory.IMAGING,
  HealthcareDataCategory.GENETIC,
  HealthcareDataCategory.REPRODUCTIVE,
  HealthcareDataCategory.MENTAL_HEALTH,
  HealthcareDataCategory.SUBSTANCE_USE,
  HealthcareDataCategory.RESEARCH,
  HealthcareDataCategory.HIGHLY_RESTRICTED,
];

export const HEALTHCARE_DATA_ACCESS_PURPOSES: HealthcareDataAccessPurpose[] = [
  HealthcareDataAccessPurpose.PATIENT_SELF,
  HealthcareDataAccessPurpose.GUARDIAN_OR_LEGAL_REPRESENTATIVE,
  HealthcareDataAccessPurpose.TREATING_PROVIDER,
  HealthcareDataAccessPurpose.CARE_TEAM,
  HealthcareDataAccessPurpose.CLINICAL_RESEARCH,
  HealthcareDataAccessPurpose.REGULATORY_OVERSIGHT,
  HealthcareDataAccessPurpose.EMERGENCY_BREAK_GLASS,
  HealthcareDataAccessPurpose.EXPLICIT_PURPOSE_BOUND,
  HealthcareDataAccessPurpose.OTHER_CONFIGURED,
];

export const HIGHLY_RESTRICTED_HEALTH_DATA_CATEGORIES: HealthcareDataCategory[] = [
  HealthcareDataCategory.GENETIC,
  HealthcareDataCategory.MENTAL_HEALTH,
  HealthcareDataCategory.SUBSTANCE_USE,
  HealthcareDataCategory.HIGHLY_RESTRICTED,
];

export const HEALTHCARE_API_TAG = 'healthcare';
