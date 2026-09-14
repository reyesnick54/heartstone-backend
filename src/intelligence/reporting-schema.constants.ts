export const PHASE_12_FOUNDATION_MODEL_NAMES = [
  'MetricDefinition',
  'MetricCalculationRun',
  'InstitutionalMetricClaim',
  'ReportingDashboardIndicator',
  'ReportingDashboardSnapshot',
] as const;

export const PHASE_12G_MODEL_NAMES = [
  'ReportDefinition',
  'ReportDefinitionVersion',
  'ReportGenerationRun',
  'ReportSection',
  'ReportClaim',
  'ReportEvidenceManifest',
  'ReportReview',
  'ReportApproval',
  'ReportPublication',
  'ReportCorrection',
  'EvidenceDashboardDecisionTrace',
] as const;

export const PHASE_12G_ENUM_NAMES = [
  'ReportType',
  'ReportDefinitionStatus',
  'ReportClassification',
  'ReportFrequency',
  'ReportDefinitionVersionStatus',
  'ReportGenerationRunStatus',
  'ReportOutcomeClassification',
  'ReportClaimStatus',
  'ReportReviewType',
  'ReportReviewStatus',
  'ReportApprovalStatus',
  'ReportPublicationStatus',
  'ReportCorrectionStatus',
  'ReportRevalidationTrigger',
  'InstitutionalMetricClaimStatus',
  'InstitutionalMetricClaimRevalidationState',
  'MetricCalculationRunStatus',
] as const;

export const REPORT_TYPES = [
  'INTERNAL_OPERATIONAL',
  'DEPARTMENTAL',
  'EXECUTIVE',
  'MANAGEMENT_COMMITTEE',
  'ASSURANCE',
  'PERFORMANCE',
  'COMPLIANCE',
  'AI_GOVERNANCE',
  'SECURITY',
  'CONTINUITY',
  'ECONOMIC_DEVELOPMENT',
  'PUBLIC',
  'GOVERNMENT_SUBMISSION',
  'OTHER_APPROVED',
] as const;

export const REPORT_OUTCOME_CLASSIFICATIONS = [
  'POSITIVE',
  'NEUTRAL',
  'ADVERSE',
  'MIXED',
  'INCONCLUSIVE',
] as const;
