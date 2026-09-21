import { DashboardIndicatorCategory, DashboardSensitivityLevel } from '@prisma/client';

export const EXECUTIVE_EXPERIENCE_API_TAG = 'executive-experience';

export const EXECUTIVE_AUTHORITY_DISCLAIMER =
  'Executive dashboard visibility is informational only. Visibility does not create command authority, legal authority, or permission to approve, override, waive, or force issuance.';

export const EXECUTIVE_DASHBOARD_IS_NOT_COMMAND_AUTHORITY =
  'Executive dashboard != command authority. Metric != verified legal fact. Projection != guarantee. Risk score != sanction.';

export const EXECUTIVE_DEFAULT_SENSITIVITY = DashboardSensitivityLevel.RESTRICTED;

export const EXECUTIVE_GOVERNMENT_OPERATIONS_CATEGORIES: DashboardIndicatorCategory[] = [
  DashboardIndicatorCategory.SERVICE_VOLUMES,
  DashboardIndicatorCategory.PENDING_DECISIONS,
  DashboardIndicatorCategory.APPROACHING_DEADLINES,
  DashboardIndicatorCategory.ASSIGNED_CASES,
  DashboardIndicatorCategory.UNASSIGNED_CASES,
  DashboardIndicatorCategory.INTAKE,
  DashboardIndicatorCategory.COMPLETENESS,
  DashboardIndicatorCategory.REVIEWS,
  DashboardIndicatorCategory.DECISION_PACKETS,
  DashboardIndicatorCategory.INSTITUTIONAL_PERFORMANCE,
  DashboardIndicatorCategory.APPROVAL_BOTTLENECKS,
];

export const EXECUTIVE_SERVICES_CATEGORIES: DashboardIndicatorCategory[] = [
  DashboardIndicatorCategory.SERVICE_VOLUMES,
];

export const EXECUTIVE_DEPARTMENTS_CATEGORIES: DashboardIndicatorCategory[] = [
  DashboardIndicatorCategory.WORKFORCE_CONSTRAINTS,
  DashboardIndicatorCategory.INSTITUTIONAL_PERFORMANCE,
  DashboardIndicatorCategory.ASSIGNED_CASES,
  DashboardIndicatorCategory.UNASSIGNED_CASES,
];

export const EXECUTIVE_INVESTMENT_CATEGORIES: DashboardIndicatorCategory[] = [
  DashboardIndicatorCategory.STRATEGIC_PROJECTS,
  DashboardIndicatorCategory.FINANCIAL_DEPENDENCIES,
];

export const EXECUTIVE_PROJECTS_CATEGORIES: DashboardIndicatorCategory[] = [
  DashboardIndicatorCategory.STRATEGIC_PROJECTS,
  DashboardIndicatorCategory.GOVERNMENT_DEPENDENCIES,
];

export const EXECUTIVE_COMPLIANCE_CATEGORIES: DashboardIndicatorCategory[] = [
  DashboardIndicatorCategory.COMPLIANCE_OBLIGATIONS,
  DashboardIndicatorCategory.CORRECTIVE_ACTIONS,
  DashboardIndicatorCategory.COMPLIANCE_MATTERS,
  DashboardIndicatorCategory.INSPECTIONS,
  DashboardIndicatorCategory.CONDITIONS,
];

export const EXECUTIVE_REDRESS_CATEGORIES: DashboardIndicatorCategory[] = [
  DashboardIndicatorCategory.REDRESS_BACKLOG,
  DashboardIndicatorCategory.APPEALS,
];

export const EXECUTIVE_DIGITAL_GOVERNMENT_CATEGORIES: DashboardIndicatorCategory[] = [
  DashboardIndicatorCategory.INTEGRATION_CONDITIONS,
  DashboardIndicatorCategory.SECURITY_CONDITIONS,
  DashboardIndicatorCategory.CONTINUITY_ISSUES,
];

export const EXECUTIVE_RISK_CATEGORIES: DashboardIndicatorCategory[] = [
  DashboardIndicatorCategory.AUTHORITY_QUESTIONS,
  DashboardIndicatorCategory.GOVERNMENT_DEPENDENCIES,
  DashboardIndicatorCategory.EVIDENCE_DEFICIENCIES,
  DashboardIndicatorCategory.EXECUTIVE_ESCALATION,
];

export const VERIFIED_MILESTONE_STATUSES = new Set([
  'VERIFIED',
  'ACCEPTED',
  'COMPLETED',
  'REVALIDATED',
]);

export const REPORTED_MILESTONE_STATUSES = new Set([
  'REPORTED',
  'SUBMITTED',
  'REVIEWED',
  'PLANNED',
]);
