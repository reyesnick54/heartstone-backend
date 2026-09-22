export const PUBLIC_SAFETY_RULE_ENVIRONMENT = 'NON_PRODUCTION' as const;

export const PUBLIC_SAFETY_SERVICE_PACK_ID = 'template-public-safety-emergency' as const;

export const PUBLIC_SAFETY_SERVICE_FAMILY_CODE = 'TEMPLATE-FAMILY-PUBLIC-SAFETY';

export const PUBLIC_SAFETY_DEPARTMENT_CODE = 'TEMPLATE-DEPARTMENT-PUBLIC-SAFETY';

export const PUBLIC_SAFETY_ENGAGEMENT_REFERENCE_PREFIX = 'PSENG';

export const PUBLIC_SAFETY_INCIDENT_REFERENCE_PREFIX = 'PSINC';

export const PUBLIC_SAFETY_RECOVERY_REFERENCE_PREFIX = 'PSRCV';

export const PUBLIC_SAFETY_NOTICE_REFERENCE_PREFIX = 'PSNOT';

export const PUBLIC_SAFETY_AUTHORITY = {
  intake: 'TEMPLATE-AUTH-PUBLIC-SAFETY-INTAKE',
  verify: 'TEMPLATE-AUTH-PUBLIC-SAFETY-VERIFY',
  assistanceReview: 'TEMPLATE-AUTH-PUBLIC-SAFETY-ASSISTANCE-REVIEW',
  inspectionSchedule: 'TEMPLATE-AUTH-PUBLIC-SAFETY-INSPECTION-SCHEDULE',
  inspectionVerify: 'TEMPLATE-AUTH-PUBLIC-SAFETY-INSPECTION-VERIFY',
  noticeApprove: 'TEMPLATE-AUTH-PUBLIC-SAFETY-NOTICE-APPROVE',
  noticePublish: 'TEMPLATE-AUTH-PUBLIC-SAFETY-NOTICE-PUBLISH',
  recoveryDetermine: 'TEMPLATE-AUTH-PUBLIC-SAFETY-RECOVERY-DETERMINE',
  appealDecide: 'TEMPLATE-AUTH-PUBLIC-SAFETY-APPEAL-DECIDE',
  externalCoord: 'TEMPLATE-AUTH-PUBLIC-SAFETY-EXTERNAL-COORD',
  referral: 'TEMPLATE-AUTH-PUBLIC-SAFETY-REFERRAL',
} as const;

export const PUBLIC_SAFETY_BOUNDARY_DISCLAIMER =
  'Public safety experience projections summarize submitted reports, assistance requests, and operational indicators. They do not constitute an emergency declaration, enforcement finding, or operational command.';

export const PUBLIC_SAFETY_METRICS_DISCLAIMER =
  'Department and executive public safety metrics are informational aggregates only and must not be treated as verified impact findings or emergency declarations.';

export const PUBLIC_SAFETY_NOTICE_DISCLAIMER =
  'Only published government notices contain officially approved public content. Draft and approved-not-yet-published notices are not public emergency alerts.';

export const PLATFORM_ADMIN_PUBLIC_SAFETY_ROLE_MARKER = 'PLATFORM_ADMIN';

export const FORBIDDEN_AI_PUBLIC_SAFETY_ACTIONS = [
  'ISSUE_PUBLIC_EMERGENCY_DECLARATION',
  'PUBLISH_EMERGENCY_ALERT',
  'DECLARE_EMERGENCY',
  'AUTHORIZE_EMERGENCY_POWERS',
] as const;

export const FORBIDDEN_CITIZEN_PUBLIC_SAFETY_ACTIONS = [
  'ISSUE_PUBLIC_EMERGENCY_ALERT',
  'PUBLISH_GOVERNMENT_NOTICE',
  'DECLARE_EMERGENCY',
] as const;

export const PUBLIC_SAFETY_REASON_CODES = {
  CROSS_REPORTER_ACCESS_DENIED: 'PUBLIC_SAFETY_CROSS_REPORTER_ACCESS_DENIED',
  CROSS_ORGANIZATION_ACCESS_DENIED: 'PUBLIC_SAFETY_CROSS_ORGANIZATION_ACCESS_DENIED',
  CITIZEN_CANNOT_ISSUE_ALERT: 'PUBLIC_SAFETY_CITIZEN_CANNOT_ISSUE_PUBLIC_ALERT',
  UNAUTHORIZED_NOTICE_PUBLISH: 'PUBLIC_SAFETY_UNAUTHORIZED_NOTICE_PUBLISH',
  PLATFORM_ADMIN_CANNOT_CREATE_EMERGENCY_AUTHORITY:
    'PUBLIC_SAFETY_PLATFORM_ADMIN_CANNOT_CREATE_EMERGENCY_AUTHORITY',
  AI_CANNOT_DECLARE_EMERGENCY: 'PUBLIC_SAFETY_AI_CANNOT_DECLARE_EMERGENCY',
  DASHBOARD_MUTATION_FORBIDDEN: 'PUBLIC_SAFETY_DASHBOARD_MUTATION_FORBIDDEN',
  RECOVERY_MUST_NOT_MERGE_INCIDENT: 'PUBLIC_SAFETY_RECOVERY_MUST_NOT_MERGE_INCIDENT',
  NOTICE_PUBLISH_REQUIRES_APPROVED_CONTENT:
    'PUBLIC_SAFETY_NOTICE_PUBLISH_REQUIRES_APPROVED_CONTENT',
  PUBLIC_NOTICE_DRAFT_LEAK: 'PUBLIC_SAFETY_PUBLIC_NOTICE_DRAFT_LEAK',
} as const;

export const PUBLIC_SAFETY_TEMPLATE_SERVICE_DEFINITIONS = [
  {
    key: 'SUBMIT-INCIDENT-REPORT',
    name: 'Submit Public Safety Incident Report',
    serviceType: 'REPORT',
  },
  {
    key: 'REQUEST-EMERGENCY-ASSISTANCE',
    name: 'Request Emergency Government Assistance',
    serviceType: 'ASSISTANCE',
  },
  {
    key: 'DISASTER-IMPACT-REPORT',
    name: 'Disaster Impact Report',
    serviceType: 'REPORT',
  },
  { key: 'DISASTER-RELIEF-INTAKE', name: 'Disaster Relief Intake', serviceType: 'INTAKE' },
  {
    key: 'PUBLIC-SAFETY-PERMIT',
    name: 'Public Safety Permit Application',
    serviceType: 'PERMIT',
  },
  {
    key: 'FIRE-SAFETY-INSPECTION',
    name: 'Fire Safety Inspection Request',
    serviceType: 'INSPECTION',
  },
  {
    key: 'EMERGENCY-INSPECTION',
    name: 'Emergency Inspection Request',
    serviceType: 'INSPECTION',
  },
  {
    key: 'EMERGENCY-DOCUMENT-REPLACEMENT',
    name: 'Emergency Document Replacement Request',
    serviceType: 'APPLICATION',
  },
  {
    key: 'INFRASTRUCTURE-DISRUPTION',
    name: 'Infrastructure Disruption Report',
    serviceType: 'REPORT',
  },
  {
    key: 'SHELTER-ASSISTANCE-INFO',
    name: 'Emergency Shelter / Assistance Information',
    serviceType: 'INFORMATION',
  },
  {
    key: 'RECOVERY-ASSISTANCE',
    name: 'Recovery Assistance Application',
    serviceType: 'ASSISTANCE',
  },
  {
    key: 'DECISION-REVIEW-APPEAL',
    name: 'Public Safety Decision Review / Appeal',
    serviceType: 'REDRESS',
  },
] as const;

export const PUBLIC_SAFETY_INVARIANTS = {
  unverifiedReportsLabeled: true,
  reporterPrivacyPreserved: true,
  recoverySeparateFromIncidentReport: true,
  dashboardDoesNotAlterIncidentState: true,
  citizenCannotIssuePublicEmergencyAlert: true,
  noticeLifecycleSeparated: true,
} as const;
