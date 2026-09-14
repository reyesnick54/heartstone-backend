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
