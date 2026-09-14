export const PHASE_12_METRICS_MODEL_NAMES = [
  'PerformanceFramework',
  'MetricDefinition',
  'MetricDefinitionVersion',
  'MetricBaseline',
  'MetricCalculationRun',
  'MetricObservation',
  'MetricDataQualityAssessment',
  'PerformanceClaim',
  'PerformanceClaimReview',
  'PerformanceClaimRevalidation',
] as const;

export const PHASE_12_DASHBOARD_MODEL_NAMES = [
  'DashboardDefinition',
  'DashboardVersion',
  'DashboardWidgetDefinition',
  'DashboardIndicatorDefinition',
  'DashboardIndicatorProjection',
  'DashboardSnapshot',
  'DashboardStatusDictionaryEntry',
] as const;

export const PHASE_12_STRATEGIC_PROJECT_MODEL_NAMES = [
  'StrategicProjectProfile',
  'StrategicProjectMilestone',
  'CapitalEvidenceRecord',
  'EmploymentEvidenceRecord',
  'InfrastructureDeliveryRecord',
  'ProjectStatusProjection',
] as const;

export const PHASE_12_AI_MODEL_NAMES = [
  'AIModelDefinition',
  'AIModelVersion',
  'AIUseCase',
  'AIUseCaseVersion',
  'AIAgentDefinition',
  'AIAgentVersion',
  'AIDataEntitlement',
  'AIToolEntitlement',
  'AIEvaluation',
  'AIIncident',
  'AISuspensionRecord',
  'AIExecutionRecord',
  'AIHumanDisposition',
] as const;

export const PHASE_12_ANALYSIS_MONITORING_MODEL_NAMES = [
  'AnalysisRequest',
  'AnalysisRun',
  'AnalysisFinding',
  'AnalysisOption',
  'MonitoringObservation',
  'MonitoringAlert',
  'AlertVerification',
  'RiskAssessment',
] as const;

export const PHASE_12_TWIN_SIMULATION_MODEL_NAMES = [
  'DigitalTwinDefinition',
  'DigitalTwinVersion',
  'DigitalTwinSnapshot',
  'SimulationScenario',
  'SimulationRun',
  'SimulationOutput',
  'ConsequentialUseReview',
  'SimulationToLiveTransitionRecord',
] as const;

export const PHASE_12_REPORT_MODEL_NAMES = [
  'ReportDefinition',
  'ReportGenerationRun',
  'ReportClaim',
  'ReportReview',
  'ReportApproval',
  'ReportPublication',
  'ReportCorrection',
  'EvidenceDashboardDecisionTrace',
] as const;

export const PHASE_12_MODEL_NAMES = [
  ...PHASE_12_METRICS_MODEL_NAMES,
  ...PHASE_12_DASHBOARD_MODEL_NAMES,
  ...PHASE_12_STRATEGIC_PROJECT_MODEL_NAMES,
  ...PHASE_12_AI_MODEL_NAMES,
  ...PHASE_12_ANALYSIS_MONITORING_MODEL_NAMES,
  ...PHASE_12_TWIN_SIMULATION_MODEL_NAMES,
  ...PHASE_12_REPORT_MODEL_NAMES,
] as const;

export const PHASE_12_METRICS_ENUM_NAMES = [
  'MetricDefinitionStatus',
  'MetricCalculationRunStatus',
  'MetricDataQualityStatus',
  'PerformanceClaimStatus',
  'PerformanceClaimReviewOutcome',
] as const;

export const PHASE_12_DASHBOARD_ENUM_NAMES = [
  'DashboardDefinitionStatus',
  'DashboardIndicatorStatus',
] as const;

export const PHASE_12_STRATEGIC_PROJECT_ENUM_NAMES = ['StrategicProjectMilestoneStatus'] as const;

export const PHASE_12_AI_ENUM_NAMES = [
  'AIModelStatus',
  'AIUseCaseStatus',
  'AIAgentStatus',
  'AIExecutionStatus',
  'AISuspensionReason',
  'AIHumanDispositionType',
] as const;

export const PHASE_12_ANALYSIS_MONITORING_ENUM_NAMES = [
  'AnalysisRequestStatus',
  'AnalysisRunStatus',
  'MonitoringAlertStatus',
  'AlertVerificationOutcome',
  'RiskAssessmentStatus',
] as const;

export const PHASE_12_TWIN_SIMULATION_ENUM_NAMES = [
  'DigitalTwinStatus',
  'SimulationRunStatus',
  'SimulationOutputType',
] as const;

export const PHASE_12_REPORT_ENUM_NAMES = [
  'ReportDefinitionStatus',
  'ReportGenerationRunStatus',
  'ReportClaimStatus',
  'ReportPublicationStatus',
  'ProcessingTimeComponent',
] as const;

export const PHASE_12_ENUM_NAMES = [
  ...PHASE_12_METRICS_ENUM_NAMES,
  ...PHASE_12_DASHBOARD_ENUM_NAMES,
  ...PHASE_12_STRATEGIC_PROJECT_ENUM_NAMES,
  ...PHASE_12_AI_ENUM_NAMES,
  ...PHASE_12_ANALYSIS_MONITORING_ENUM_NAMES,
  ...PHASE_12_TWIN_SIMULATION_ENUM_NAMES,
  ...PHASE_12_REPORT_ENUM_NAMES,
] as const;
