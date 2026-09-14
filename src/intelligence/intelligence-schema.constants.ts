export const PHASE_12F_MODEL_NAMES = [
  'DigitalTwinDefinition',
  'DigitalTwinVersion',
  'DigitalTwinSource',
  'DigitalTwinRelationship',
  'DigitalTwinModeRecord',
  'DigitalTwinSnapshot',
  'SimulationScenario',
  'SimulationRun',
  'SimulationInput',
  'SimulationOutput',
  'SimulationAssumption',
  'SimulationUncertainty',
  'SimulationReview',
  'ConsequentialUseReview',
  'SimulationToLiveTransitionRecord',
] as const;

export const PHASE_12F_ENUM_NAMES = [
  'DigitalTwinType',
  'DigitalTwinDefinitionStatus',
  'DigitalTwinPrivacyClassification',
  'DigitalTwinMode',
  'DigitalTwinSourceStatus',
  'DigitalTwinRelationshipType',
  'SimulationScenarioStatus',
  'SimulationRunStatus',
  'SimulationReviewOutcome',
  'ConsequentialUseReviewDecision',
  'ConsequentialUseImpactArea',
  'SimulationToLiveTransitionStatus',
] as const;

export const PHASE_12E_ANALYSIS_MODEL_NAMES = [
  'AnalysisRequest',
  'AnalysisRun',
  'AnalysisSource',
  'AnalysisFinding',
  'AnalysisOption',
  'AnalysisUncertainty',
  'AnalysisHumanReview',
] as const;

export const PHASE_12E_MONITORING_MODEL_NAMES = [
  'IntelligenceMonitoringRule',
  'IntelligenceMonitoringObservation',
  'IntelligenceMonitoringAlert',
  'IntelligenceAlertVerification',
  'IntelligenceAlertDisposition',
] as const;

export const PHASE_12E_RISK_MODEL_NAMES = [
  'RiskDefinition',
  'RiskAssessment',
  'RiskFactor',
  'RiskMitigation',
  'RiskReview',
] as const;

export const PHASE_12E_MODEL_NAMES = [
  ...PHASE_12E_ANALYSIS_MODEL_NAMES,
  ...PHASE_12E_MONITORING_MODEL_NAMES,
  ...PHASE_12E_RISK_MODEL_NAMES,
] as const;

export const PHASE_12E_ENUM_NAMES = [
  'AnalysisFunctionType',
  'AnalysisRequestStatus',
  'AnalysisRunStatus',
  'AnalysisSourceStatus',
  'IntelligenceMonitoringObjectType',
  'ForbiddenMonitoringSubjectType',
  'IntelligenceMonitoringRuleStatus',
  'IntelligenceMonitoringFrequency',
  'IntelligenceAlertStatus',
  'RiskEvidenceBasis',
  'RiskDefinitionStatus',
  'RiskAssessmentStatus',
  'RiskMitigationStatus',
] as const;

export const PHASE_12B_MODEL_NAMES = [
  'DashboardStatusDictionaryEntry',
  'DashboardDefinition',
  'DashboardVersion',
  'DashboardWidgetDefinition',
  'DashboardIndicatorDefinition',
  'DashboardIndicatorProjection',
  'DashboardDrilldownReference',
  'DashboardSnapshot',
  'DashboardQueryAudit',
  'DashboardAccessPolicy',
] as const;

export const PHASE_12B_ENUM_NAMES = [
  'DashboardConsoleType',
  'DashboardDefinitionStatus',
  'DashboardVersionStatus',
  'DashboardWidgetType',
  'DashboardIndicatorCategory',
  'DashboardColorSemantic',
  'DashboardDataQuality',
  'DashboardStalenessState',
  'DashboardSourceAvailability',
  'DashboardAccessPurpose',
  'DashboardSensitivityLevel',
  'DashboardFilterDimension',
  'DashboardDrilldownReferenceType',
  'DashboardQueryAuditResult',
  'DashboardStatusDictionaryOwnerType',
] as const;

export const EXECUTIVE_INDICATOR_CATEGORIES = [
  'SERVICE_VOLUMES',
  'PENDING_DECISIONS',
  'APPROACHING_DEADLINES',
  'STRATEGIC_PROJECTS',
  'AUTHORITY_QUESTIONS',
  'GOVERNMENT_DEPENDENCIES',
  'APPROVAL_BOTTLENECKS',
  'EVIDENCE_DEFICIENCIES',
  'COMPLIANCE_OBLIGATIONS',
  'CORRECTIVE_ACTIONS',
  'WORKFORCE_CONSTRAINTS',
  'FINANCIAL_DEPENDENCIES',
  'INTEGRATION_CONDITIONS',
  'SECURITY_CONDITIONS',
  'CONTINUITY_ISSUES',
  'REDRESS_BACKLOG',
  'INSTITUTIONAL_PERFORMANCE',
  'EXECUTIVE_ESCALATION',
] as const;

export const DEPARTMENTAL_INDICATOR_CATEGORIES = [
  'ASSIGNED_CASES',
  'UNASSIGNED_CASES',
  'INTAKE',
  'COMPLETENESS',
  'EVIDENCE_DEFICIENCIES',
  'REVIEWS',
  'INSPECTIONS',
  'GOVERNMENT_REFERRALS',
  'PROFESSIONAL_REPORTS',
  'DECISION_PACKETS',
  'CONDITIONS',
  'COMPLIANCE_MATTERS',
  'APPEALS',
  'RENEWALS',
  'SERVICE_DEADLINES',
  'STAFF_WORKLOAD',
  'DEPENDENCIES',
  'CORRECTIVE_ACTIONS',
] as const;

export const DASHBOARD_FILTER_DIMENSIONS = [
  'DEPARTMENT',
  'SERVICE',
  'PROJECT',
  'SECTOR',
  'GEOGRAPHY',
  'OWNER',
  'AUTHORITY_STATUS',
  'RISK_LEVEL',
  'DEADLINE',
  'EVIDENCE_STATUS',
  'DECISION_GATE',
  'EXTERNAL_DEPENDENCY',
] as const;
