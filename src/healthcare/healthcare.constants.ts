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
  'ESTABLISH_ADVERSE_EVENT_CAUSALITY',
  'BYPASS_HEALTHCARE_ACCESS_POLICY',
  'SILENTLY_DELETE_SAFETY_RECORD',
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
  CONSENT_REVOKED: 'HEALTHCARE_CONSENT_REVOKED',
  PURPOSE_MISMATCH: 'HEALTHCARE_CONSENT_PURPOSE_MISMATCH',
  RESEARCH_ACCESS_EXPIRED: 'HEALTHCARE_RESEARCH_ACCESS_EXPIRED',
  ARBITRARY_PATIENT_BROWSE_DENIED: 'HEALTHCARE_ARBITRARY_PATIENT_BROWSE_DENIED',
  CLASSIFICATION_DENIED: 'HEALTHCARE_CLASSIFICATION_ACCESS_DENIED',
  PLATFORM_ADMIN_BYPASS_DENIED: 'HEALTHCARE_PLATFORM_ADMIN_BYPASS_DENIED',
  EXTERNAL_PROVIDER_SCOPE_DENIED: 'HEALTHCARE_EXTERNAL_PROVIDER_SCOPE_DENIED',
  BULK_ENUMERATION_DENIED: 'HEALTHCARE_BULK_ENUMERATION_DENIED',
  AI_CAUSALITY_DENIED: 'HEALTHCARE_AI_CAUSALITY_DENIED',
  SAFETY_SILENT_DELETE_DENIED: 'HEALTHCARE_SAFETY_SILENT_DELETE_DENIED',
  INTEGRATION_FAILURE_NOT_SUCCESS: 'HEALTHCARE_INTEGRATION_FAILURE_NOT_SUCCESS',
  DISCREPANCY_NOT_SILENT_OVERWRITE: 'HEALTHCARE_DISCREPANCY_NOT_SILENT_OVERWRITE',
} as const;

export const PLATFORM_ADMIN_HEALTHCARE_ROLE_MARKER = PLATFORM_ADMIN_ROLE_MARKER;

export const HEALTHCARE_CONSENT_BOUNDARY_DISCLAIMER =
  'Healthcare consent grants purpose-bound access only; consent is not universal permission.';

export const HEALTHCARE_RESEARCH_DATASET_BOUNDARY_DISCLAIMER =
  'Researcher dataset access is minimum-necessary and does not authorize unrestricted patient browsing.';

export const HEALTHCARE_SAFETY_BOUNDARY_DISCLAIMER =
  'An adverse event report records an allegation; it does not by itself establish treatment causality.';

export const HEALTHCARE_INTEROP_BOUNDARY_DISCLAIMER =
  'Adapter declarations describe capability intent; they do not assert standards compliance or successful clinical transactions.';

export const RESTRICTED_HEALTHCARE_RECORD_CLASSIFICATIONS = [
  'GENETIC',
  'MENTAL_HEALTH',
  'HIV',
  'SUBSTANCE_USE',
  'REPRODUCTIVE',
  'SEALED',
] as const;

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
