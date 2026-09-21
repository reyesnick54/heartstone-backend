export const DEPARTMENT_EXPERIENCE_API_TAG = 'Department Management Experience';

export const DEPARTMENT_AUTHORITY_DISCLAIMER =
  'Department management dashboard visibility is operational information only. It does not confer department-head authority, case disposition authority, or enforcement power. Each consequential action requires separate authority evaluation at execution time.';

export const DEPARTMENT_AGGREGATE_DISCLAIMER =
  'Aggregated counts and summaries are derived from authoritative records for management oversight. Aggregate views do not create case disposition, legal findings, or enforcement decisions.';

export const DEPARTMENT_ALERT_DISCLAIMER =
  'Operational alerts surface verified or relevant warnings for management attention. An alert is not an enforcement finding or legal violation determination.';

export const DEPARTMENT_STALE_METRICS_DISCLAIMER =
  'Stale or cached metric values remain visible with explicit staleness markers. Cached values are never presented as live operational data.';

export const DEPARTMENT_MANAGEMENT_ACCESS_PURPOSE = 'DEPARTMENT_MANAGEMENT' as const;

export const DEPARTMENT_ALERT_TYPES = {
  SERVICE_OUTAGE: 'service-outage',
  BACKLOG: 'backlog',
  SLA_BREACH_RISK: 'sla-breach-risk',
  INTEGRATION_OUTAGE: 'integration-outage',
  DATA_QUALITY: 'data-quality',
  EXTERNAL_DEPENDENCY: 'external-dependency',
  COMPLIANCE_BACKLOG: 'compliance-backlog',
} as const;

export type DepartmentAlertType =
  (typeof DEPARTMENT_ALERT_TYPES)[keyof typeof DEPARTMENT_ALERT_TYPES];
