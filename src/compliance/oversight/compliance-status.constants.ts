export const COMPLIANCE_PROJECTION_DISCLAIMER =
  'This compliance status is a derived operational projection. It is not a new legal determination, violation finding, or enforcement decision.';

export const COMPLIANCE_ALERT_DISCLAIMER =
  'Alerts support oversight and prioritization only. An alert is not a violation and is not an enforcement decision.';

export const COMPLIANCE_RISK_SCORE_DISCLAIMER =
  'Risk scores are prioritization aids only. They do not establish legal status and cannot trigger automatic sanctions.';

export const FORBIDDEN_CLIENT_COMPLIANCE_STATUS_FIELDS = [
  'status',
  'projectionVersion',
  'lastDerivedAt',
  'instrumentStatusSnapshot',
] as const;

export const HOLDER_DASHBOARD_RESTRICTED_FIELDS = [
  'internalInvestigationStrategy',
  'internalPrivilegedNotes',
  'thirdPartyProtectedData',
  'confidentialReferralStrategy',
] as const;

export const PHASE_9G_MODEL_NAMES = [
  'ComplianceStatusProjection',
  'ComplianceIndicator',
  'ComplianceMonitoringEvent',
  'MonitoringRule',
  'ComplianceAlert',
  'ComplianceRevalidationRecord',
] as const;

export const PHASE_9G_STATUS_VALUES = [
  'NO_CURRENT_ASSESSMENT',
  'MONITORING',
  'SATISFACTORY',
  'ACTION_REQUIRED',
  'UNDER_CORRECTIVE_ACTION',
  'UNDER_INSPECTION',
  'UNDER_REVIEW',
  'ESCALATED',
  'REFERRED_EXTERNALLY',
  'SUSPENDED_BY_SEPARATE_DECISION',
  'REVOKED_BY_SEPARATE_DECISION',
  'EXPIRED',
  'CLOSED',
  'UNRESOLVED',
] as const;
