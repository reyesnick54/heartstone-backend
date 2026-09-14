export const PROJECT_PROJECTION_DISCLAIMER =
  'This project status is a derived operational projection. It is not an approval decision, operational certification, or independent verification of sponsor assertions.';

export const SECTOR_OBSERVATION_DISCLAIMER =
  'Sector observations do not establish national economic causation attributable to platform deployment.';

export const RISK_SCORE_DISCLAIMER =
  'Risk scores are prioritization aids only. They do not affect project approval status.';

export const FORBIDDEN_AI_STRATEGIC_PROJECT_ACTIONS = [
  'PROMOTE_PROJECT_STAGE',
  'SET_MILESTONE_COMPLETED',
  'ESCALATE_CAPITAL_CLASSIFICATION',
  'COUNT_FORECAST_AS_EMPLOYMENT',
  'VERIFY_INFRASTRUCTURE_FROM_DASHBOARD',
  'PUBLISH_ECONOMIC_CLAIM_WITHOUT_REVIEW',
  'CLEAR_ADVERSE_STATUS',
] as const;

export const FORBIDDEN_CLIENT_PROJECT_STATUS_FIELDS = [
  'currentStage',
  'derivedStage',
  'projectionVersion',
  'lastDerivedAt',
  'adverseStatusPreserved',
] as const;

export const FORBIDDEN_CLIENT_MILESTONE_FIELDS = ['status'] as const;

export const FORBIDDEN_CLIENT_CAPITAL_FIELDS = ['classification'] as const;

export const CAPITAL_CLASSIFICATION_ORDER = [
  'PROPOSED',
  'INDICATED',
  'COMMITTED',
  'CONTRACTED',
  'FUNDED',
  'AVAILABLE',
  'DEPLOYED',
  'VERIFIED_DEPLOYED',
] as const;

export const EMPLOYMENT_VERIFIED_CLASSIFICATIONS = ['ACTIVE_VERIFIED'] as const;

export const EMPLOYMENT_FORECAST_CLASSIFICATIONS = ['FORECAST'] as const;

export const MILESTONE_COMPLETED_STATUSES = ['COMPLETED', 'ACCEPTED'] as const;

export const MILESTONE_VERIFIED_STATUSES = [
  'VERIFIED',
  'ACCEPTED',
  'COMPLETED',
  'REVALIDATED',
] as const;

export const STAGE_APPROVAL_STAGES = [
  'APPROVED',
  'PRE_IMPLEMENTATION',
  'IMPLEMENTATION',
  'PARTIALLY_OPERATIONAL',
  'OPERATIONAL',
] as const;

export const PUBLIC_ECONOMIC_CLAIM_REVIEW_STATUSES = ['VERIFIED', 'PUBLIC'] as const;

export const PHASE_12A_MODEL_NAMES = ['PerformanceClaim'] as const;

export const PHASE_12A_ENUM_NAMES = [
  'PerformanceClaimCategory',
  'PerformanceClaimReviewStatus',
] as const;

export const PHASE_12C_MODEL_NAMES = [
  'StrategicProjectProfile',
  'StrategicProjectStage',
  'StrategicProjectMilestone',
  'StrategicProjectDependency',
  'StrategicProjectRisk',
  'StrategicProjectEconomicClaim',
  'CapitalEvidenceRecord',
  'EmploymentEvidenceRecord',
  'InfrastructureDeliveryRecord',
  'SectorDevelopmentObservation',
  'ProjectStatusProjection',
] as const;

export const PHASE_12C_ENUM_NAMES = [
  'StrategicProjectLifecycleStage',
  'StrategicProjectMilestoneStatus',
  'CapitalEvidenceClassification',
  'EmploymentEvidenceClassification',
  'InfrastructureDeliveryStage',
  'StrategicProjectDependencyType',
  'StrategicProjectDependencyOwnerType',
  'StrategicProjectRiskLevel',
  'ProjectStatusProjectionAudience',
] as const;

export const PHASE_12C_INVARIANTS = [
  'inquiry is not qualified application',
  'project announcement is not operational',
  'planned milestone is not completed',
  'reported milestone is not verified',
  'proposed capital is not committed',
  'committed capital is not deployed',
  'employment forecast is not verified employment',
  'dashboard status is not proof of infrastructure completion',
  'applicant assertion is not independent verification',
  'government dependency owner is preserved',
  'risk score cannot change project approval',
  'AI cannot promote project stage autonomously',
  'adverse project status is preserved',
  'public economic claim requires claim review',
] as const;

export const STRATEGIC_PROJECT_LIFECYCLE_STAGES = [
  'INQUIRY',
  'QUALIFICATION',
  'APPLICATION',
  'UNDER_REVIEW',
  'CONDITIONALLY_ADVANCING',
  'APPROVED',
  'PRE_IMPLEMENTATION',
  'IMPLEMENTATION',
  'PARTIALLY_OPERATIONAL',
  'OPERATIONAL',
  'SUSPENDED',
  'CLOSED',
] as const;

export const STRATEGIC_PROJECT_DEPENDENCY_TYPES = [
  'GOVERNMENT',
  'PROFESSIONAL',
  'UTILITY',
  'FINANCE',
  'LAND',
  'PLANNING',
  'ENVIRONMENTAL',
  'CUSTOMS',
  'IMMIGRATION',
  'LABOUR',
  'SECURITY',
  'TECHNOLOGY',
  'SUPPLIER',
  'INFRASTRUCTURE',
] as const;
